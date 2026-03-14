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
} from "src/logic";
import type { MGoal, MStream } from "src/logic/streams";
import { make } from "src/utils/make_better_typed";
import type { LTerm } from "src/logic/terms";
import { LLVar, LPredicate } from "src/logic/terms";
import { makelvar, makeLiteral } from "src/logic/makelvar";
import { Map as ImmMap } from "immutable";
import { freshInternal } from "src/logic/AnyFreshFn";
import { builtinGoals } from "./builtins";

export function interp(
	numb: number,
	ast: TermGeneric<CodeLocation>[],
): Iterable<State> {
	const env = emptyEnv();
	const [goal] = interpretOne(make.conjunction(ast), env);
	const withBuiltins = all(builtinGoals(), goal);
	return run(numb, withBuiltins);
}

/** Immutable environment: variable names (from fresh) -> LLVar */
type Env = ImmMap<string, LLVar>;

function emptyEnv(): Env {
	return ImmMap<string, LLVar>();
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

/** Compile a predicate definition into a goal that binds name -> LPredicate, and the LPredicate runs body with per-call freshened formals. */
function interpretDef(
	ast: PredicateDefinitionGeneric<CodeLocation>,
	env: Env,
): MGoal {
	const name = ast.name.value;
	const pred = new LPredicate(name, (...args: LTerm[]) => {
		return (sc: State): MStream => {
			const rrr = freshenVars(sc.number, ast.args, env);
			const unifyActuals = all(
				...args.map((arg, i) =>
					eq(arg, makelvar(ast.args[i].value, rrr)),
				),
			);
			const [bodyGoal] = interpretOne(ast.body, rrr);
			return all(unifyActuals, bodyGoal)(sc.increment());
		};
	});
	return eq(makelvar(name), pred);
}

function freshenVars(
	inc: number,
	newVars: IdentifierGeneric<CodeLocation>[],
	env: Env,
): Env {
	return newVars.reduce((acc, v) => {
		const nvl = `$${v.value}_${inc}`;
		return acc.set(v.value, new LLVar(nvl));
	}, env);
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
	const goal = foldFresh(names, (extendedEnv) => {
		const [bodyGoal] = interpretOne(ast.body, extendedEnv);
		return bodyGoal;
	});
	return [goal, env];
}

/** Build a goal that allocates fresh vars for each name (in order), extending env each time, then runs body(extendedEnv). */
function foldFresh(
	names: string[],
	body: (env: Env) => MGoal,
): MGoal {
	if (names.length === 0) return body(emptyEnv());
	const [first, ...rest] = names;
	return freshInternal((lv) => {
		const extendedEnv = emptyEnv().set(first, lv);
		return foldFreshOne(rest, extendedEnv, body);
	});
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
	let currentEnv = env;
	const goals: MGoal[] = [];
	for (const term of ast.terms) {
		const [goal, nextEnv] = interpretOne(term, currentEnv);
		goals.push(goal);
		currentEnv = nextEnv;
	}
	return [all(...goals), currentEnv];
}

function interpretDisjunction(
	ast: DisjunctionGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const [goals, _] = ast.terms.reduce(
		([acc, e]: [MGoal[], Env], term) => {
			const [g, e2] = interpretOne(term, e);
			return [[...acc, g], e2];
		},
		[[] as MGoal[], env],
	);
	return [either(...goals), env];
}

function interpretWith(
	ast: WithGeneric<CodeLocation>,
	env: Env,
): [MGoal, Env] {
	const [bodyGoal] = interpretOne(ast.body, env);
	return [bodyGoal, env];
}
