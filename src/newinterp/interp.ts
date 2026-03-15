// Go from TermGeneric<CodeLocation> to logic fn which returns a stream of State

import type {
	ConjunctionGeneric,
	DisjunctionGeneric,
	ExpressionGeneric,
	FreshGeneric,
	PredicateCallGeneric,
	PredicateDefinitionGeneric,
	TermGeneric,
	WithGeneric,
} from "src/types/AstGeneric";
import type { IdentifierGeneric } from "src/types/AstGeneric";
import type { State } from "src/logic/State";
import type { CodeLocation } from "src/redo/codeloc";
import {
	all,
	either,
	run,
	eq,
	apply_pred,
	run1,
} from "src/logic";
import type { CleanOutput } from "src/logic/types";
import {
	bindStar,
	type MGoal,
	type MStream,
} from "src/logic/streams";
import { make } from "src/utils/make_better_typed";
import type { LTerm } from "src/logic/terms";
import { LLVar, LPredicate } from "src/logic/terms";
import { makelvar, makeLiteral } from "src/logic/makelvar";
import { Map as ImmMap } from "immutable";
import { freshInternal } from "src/logic/AnyFreshFn";
import { builtinGoals } from "./builtins";

/** Immutable environment: variable names -> LTerm (LLVar for fresh, any LTerm for predicate args) */
export type Env = ImmMap<string, LTerm>;

/** Create an env mapping names to LLVars with those names (for input/extract). */
export function makeQueryEnv(names: string[]): Env {
	return names.reduce(
		(acc, n) => acc.set(n, new LLVar(n) as LTerm),
		emptyEnv(),
	);
}

export type InterpOptions = {
	/** Vars to use for top-level fresh; names must match AST. Omit to allocate fresh. */
	vars?: string[];
};

export type InterpResult = Record<string, CleanOutput>[];

export function interp(
	numb: number,
	ast: TermGeneric<CodeLocation>[],
	options?: InterpOptions,
): InterpResult {
	const queryVars = options?.vars ?? [];
	// Use makeQueryEnv so init1/theList are the same LLVars run1 will reify by name
	const initialEnv =
		queryVars.length > 0
			? makeQueryEnv(queryVars)
			: emptyEnv();
	const [goal] = interpretOne(
		make.conjunction(ast),
		initialEnv,
	);
	const withBuiltins = all(builtinGoals(), goal);
	return run1(numb, queryVars, withBuiltins);
}

function emptyEnv(): Env {
	return ImmMap<string, LTerm>();
}

const identityGoal: MGoal = (sc: State) => [sc];

function interpretOne(
	ast: TermGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	switch (ast.type) {
		case "predicate_call":
			return [interpretCall(ast, env), env];
		case "predicate_definition":
			return [interpretDef(ast, env), env];
		case "fresh":
			return interpretFresh(ast, env);
		case "conjunction":
			return interpretConjunction(ast, env);
		case "disjunction":
			return interpretDisjunction(ast, env);
		case "with":
			return interpretWith(ast, env);
	}
}

/** Lower AST expression to LTerm (resolve identifiers, parse literals). */
function interpretExpr(
	expr: ExpressionGeneric<CodeLocation>,
	env: Env,
): LTerm {
	switch (expr.type) {
		case "identifier": {
			const resolved = env.get(expr.value);
			return resolved ?? makelvar(expr.value);
		}
		case "literal": {
			const v = parseLiteral(expr);
			return makeLiteral(v);
		}
	}
}

function parseLiteral(
	lit: ExpressionGeneric<CodeLocation> & {
		type: "literal";
		kind: string;
		value: string;
	},
): string | number | boolean {
	if (lit.kind === "number") {
		const n = Number(lit.value);
		if (Number.isNaN(n)) return lit.value;
		return n;
	}
	if (lit.kind === "boolean") {
		return lit.value === "true";
	}
	if (lit.kind === "null") {
		return lit.value;
	}
	return lit.value;
}

function interpretExprList(
	args: ExpressionGeneric<CodeLocation>[],
	env: Env,
): LTerm[] {
	return args.map((e) => interpretExpr(e, env));
}

function interpretCall(
	ast: PredicateCallGeneric<CodeLocation>,
	env: Env,
): MGoal {
	const source = interpretExpr(ast.source, env);
	const args = interpretExprList(ast.args, env);
	return apply_pred(source, ...args);
}

/** Compile a predicate definition into a goal that binds name -> LPredicate.
 * Pass actual args directly as the body env (no freshening) so the caller's
 * variables (e.g. init1) stay in the substitution for run1 to extract. */
function interpretDef(
	ast: PredicateDefinitionGeneric<CodeLocation>,
	env: Env,
): MGoal {
	const name = ast.name.value;
	const pred = new LPredicate(name, (...args: LTerm[]) => {
		return (sc: State): MStream => {
			const argsEnv = ast.args.reduce(
				(acc, id, i) => acc.set(id.value, args[i]),
				emptyEnv(),
			);
			const [bodyGoal] = interpretOne(ast.body, argsEnv);
			return bodyGoal(sc);
		};
	});
	return eq(makelvar(name), pred);
}

function freshenVars(
	newVars: IdentifierGeneric<CodeLocation>[],
	env: Env,
	state: State,
): [Env, State] {
	const [newVarsOut, newStateOut] = newVars.reduce(
		(acc, v) => {
			const nvl = `$${v.value}_${state.number}`;
			return [
				acc[0].set(v.value, new LLVar(nvl)),
				acc[1].increment(),
			];
		},
		[env, state],
	);
	return [newVarsOut, newStateOut];
}

/** Allocate one fresh LLVar per name in the same scope, extend env, run body. */
function interpretFresh(
	ast: FreshGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const names = ast.newVars.map((v) => v.value);
	if (names.length === 0) {
		const [bodyGoal] = interpretOne(ast.body, env);
		return [bodyGoal, env];
	}
	const goal = foldFreshOne(names, env, (extendedEnv) => {
		const [bodyGoal] = interpretOne(ast.body, extendedEnv);
		return bodyGoal;
	});
	return [goal, env];
}

/** Build a goal that allocates fresh vars for each name (in order), extending env each time, then runs body(extendedEnv). */
function foldFresh(
	names: string[],
	env: Env,
	body: (env: Env) => MGoal,
): MGoal {
	return foldFreshOne(names, env, body);
}

function foldFreshOne(
	names: string[],
	env: Env,
	body: (env: Env) => MGoal,
): MGoal {
	if (names.length === 0) return body(env);
	const [first, ...rest] = names;
	return freshInternal((lv) => {
		const extendedEnv = env.set(first, lv);
		return foldFreshOne(rest, extendedEnv, body);
	});
}

function interpretConjunction(
	ast: ConjunctionGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const [goal, env2] = ast.terms.reduce<[MGoal, Env]>(
		([acc, e]: [MGoal, Env], term) => {
			const [g, nextEnv] = interpretOne(term, e);
			return [all(acc, g), nextEnv];
		},
		[identityGoal, env],
	);
	return [goal, env2];
}

function interpretDisjunction(
	ast: DisjunctionGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const [goals, env2]: [MGoal, Env] = ast.terms.reduce<
		[MGoal, Env]
	>(
		([acc, e]: [MGoal, Env], term) => {
			const [g, e2] = interpretOne(term, e);
			return [either(acc, g), e2];
		},
		[emptyGoal, env],
	);
	return [goals, env2];
}

function interpretWith(
	ast: WithGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const [bodyGoal] = interpretOne(ast.body, env);
	return [bodyGoal, env];
}
function zip(
	argList: (LLVar | undefined)[],
	args: LTerm[],
) {
	return argList.map((arg, i) => [arg, args[i]]);
}

function emptyGoal(m: State): MStream {
	return [];
}
