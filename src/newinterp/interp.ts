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
	eq,
	apply_pred,
	run1,
} from "src/logic";
import type { CleanOutput } from "src/logic/types";
import type { MGoal, MStream } from "src/logic/streams";
import { make } from "src/utils/make_better_typed";
import type { LTerm } from "src/logic/terms";
import { LLVar, LPredicate } from "src/logic/terms";
import { makelvar, makeLiteral } from "src/logic/makelvar";
import { Map as ImmMap } from "immutable";
import {
	freshInternal,
	freshInternal2,
	freshNom,
} from "src/logic/AnyFreshFn";
import { builtinGoals, builtinsMap } from "./builtins";
import {
	bodyAstToKeyOfGoal,
	envToKeyOfGoal,
} from "./jsonKeyOf";
import { builtinList } from "src/utils/builtinList";

/** Immutable environment: variable names -> LTerm (LLVar for fresh, any LTerm for predicate args) */
export type Env = ImmMap<string, LTerm>;

/** Create an env mapping names to LLVars with those names (for input/extract). */
export function makeQueryEnv(names: string[]): Env {
	return names.reduce(
		(acc, n) => acc.set(n, new LLVar(n) as LTerm),
		emptyEnv(),
	);
}

/** Add all builtins to the env. */
function addBuiltinsToEnv(env: Env): Env {
	return builtinList.reduce(
		(acc, name) =>
			acc.set(
				name,
				new LPredicate(name, builtinsMap[name]),
			),
		env,
	);
}

export type InterpOptions = {
	/** Vars to use for top-level fresh; names must match AST. Omit to allocate fresh. */
	vars?: string[];
	/** Max stream length for run1 (default 1000). Use a larger value if the goal has many solutions. */
	extraNum?: number;
};

export type InterpResult = Record<string, CleanOutput>[];

/** Lower AST to MGoal (no builtins). Env supplies query variables by name. */
export function compileToGoal(
	ast: TermGeneric<CodeLocation>[],
	env: Env = emptyEnv(),
): MGoal {
	const [goal] = interpretOne(make.conjunction(ast), env);
	return goal;
}

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
	const envWithBuiltins = addBuiltinsToEnv(initialEnv);
	const goal = compileToGoal(ast, envWithBuiltins);
	const withBuiltins = all(builtinGoals(), goal);
	return run1(
		numb,
		queryVars,
		withBuiltins,
		options?.extraNum,
	);
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
			return interpretDef(ast, env);
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
			if (!resolved) {
				throw new Error(
					`Variable ${expr.value} not found in env`,
				);
			}
			return resolved;
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
): [MGoal, Env] {
	const name = ast.name.value;
	const env2 = env.set(
		name,
		new LPredicate(name, (...args: LTerm[]) => {
			return (sc: State): MStream => {
				const argsEnv = ast.args.reduce(
					(acc, id, i) => acc.set(id.value, args[i]),
					env2,
				);
				const [bodyGoal] = interpretOne(ast.body, argsEnv);
				return bodyGoal(sc);
			};
		}),
	);
	return [eq(makelvar(name), env2.get(name)!), env2];
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
	const goal = foldFreshOne(
		names,
		env,
		ast.nominal,
		(extendedEnv) => {
			const [bodyGoal] = interpretOne(
				ast.body,
				extendedEnv,
			);
			return bodyGoal;
		},
	);
	return [goal, env];
}

/** Build a goal that allocates fresh vars for each name (in order), extending env each time, then runs body(extendedEnv). */
function foldFreshOne(
	names: string[],
	env: Env,
	nominal: boolean,
	body: (env: Env) => MGoal,
): MGoal {
	if (names.length === 0) return body(env);
	const [first, ...rest] = names;
	if (nominal) {
		return freshNom((lv) => {
			const extendedEnv = env.set(first, lv);
			return foldFreshOne(rest, extendedEnv, nominal, body);
		});
	} else {
		return freshInternal((lv) => {
			const extendedEnv = env.set(first, lv);
			return foldFreshOne(rest, extendedEnv, nominal, body);
		});
	}
}

function interpretConjunction(
	ast: ConjunctionGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	if (ast.terms.length === 0) {
		return [identityGoal, env];
	} else if (ast.terms.length === 1) {
		return interpretOne(ast.terms[0], env);
	}
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
	const goals: MGoal[] = [];
	let e = env;
	for (const term of ast.terms) {
		const [g, e2] = interpretOne(term, e);
		goals.push(g);
		e = e2;
	}
	if (goals.length === 0) {
		return [emptyGoal, e];
	}
	if (goals.length === 1) {
		return [goals[0], e];
	}
	return [either(...goals), e];
}

function interpretWith(
	ast: WithGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const source = interpretExpr(ast.name.source, env);
	const remainingArgs = ast.name.args.map((a) =>
		interpretExpr(a, env),
	);
	const goal = freshInternal2((bodyAstVar, envVar) =>
		all(
			bodyAstToKeyOfGoal(bodyAstVar, ast.body),
			envToKeyOfGoal(envVar, env),
			apply_pred(
				source,
				bodyAstVar,
				envVar,
				...remainingArgs,
			),
		),
	);
	return [goal, env];
}

function emptyGoal(m: State): MStream {
	return [];
}
