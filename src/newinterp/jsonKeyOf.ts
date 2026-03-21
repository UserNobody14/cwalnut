/**
 * Builds a goal that assigns a nested JSON value to a logic variable by
 * recursively setting each key with set_key_of (unifyKeyOf). Use with
 * builtinGoals() so "set_key_of" is bound.
 */

import { all, eq, apply_pred } from "src/logic";
import type { MGoal } from "src/logic/streams";
import type { LTerm } from "src/logic/terms";
import {
	makelvar,
	makeLiteral,
	makePair,
	makeEmpty,
} from "src/logic/makelvar";
import {
	freshInternal,
	freshInternal2,
} from "src/logic/AnyFreshFn";
import { Map as ImmMap } from "immutable";
import type {
	ConjunctionGeneric,
	TermGeneric,
	ExpressionGeneric,
} from "src/types/AstGeneric";

function isPrimitive(
	value: unknown,
): value is string | number | boolean | null {
	return value === null || typeof value !== "object";
}

function literalTerm(
	value: string | number | boolean | null,
): LTerm {
	return value === null
		? makeLiteral("null")
		: makeLiteral(value);
}

/**
 * Goal that unifies valueVar with the logic term representing the given JSON value.
 * Primitives become literals; objects become sub-objects (fresh var) with keys set;
 * arrays become list terms (pair/empty).
 */
function valueToKeyOfGoal(
	valueVar: LTerm,
	value: unknown,
): MGoal {
	if (isPrimitive(value)) {
		return eq(valueVar, literalTerm(value));
	}
	if (Array.isArray(value)) {
		return arrayToKeyOfGoal(valueVar, value);
	}
	if (typeof value === "object" && value !== null) {
		return jsonToKeyOfGoal(
			valueVar,
			value as Record<string, unknown>,
		);
	}
	return eq(
		valueVar,
		literalTerm(value as string | number | boolean),
	);
}

/**
 * Goal that unifies listVar with the list representation of the JSON array.
 */
function arrayToKeyOfGoal(
	listVar: LTerm,
	arr: unknown[],
): MGoal {
	if (arr.length === 0) {
		return eq(listVar, makeEmpty());
	}
	return freshInternal2((head, tail) =>
		all(
			eq(listVar, makePair(head, tail)),
			valueToKeyOfGoal(head, arr[0]),
			arrayToKeyOfGoal(tail, arr.slice(1)),
		),
	);
}

/**
 * Goal that sets each key of the given JSON object on objLVar via set_key_of.
 * Nested objects get fresh vars; primitives and arrays are set directly or as list.
 */
export function jsonToKeyOfGoal(
	objLVar: LTerm,
	json: Record<string, unknown>,
): MGoal {
	const keys = Object.keys(json);
	if (keys.length === 0) {
		return (sc) => [sc];
	}
	const setKeyOf = makelvar("set_key_of");
	let goal: MGoal = (sc) => [sc];
	for (const key of keys) {
		const value = json[key];
		const keyLit = makeLiteral(key);
		if (isPrimitive(value)) {
			goal = all(
				goal,
				apply_pred(
					setKeyOf,
					objLVar,
					keyLit,
					literalTerm(value),
				),
			);
		} else if (Array.isArray(value)) {
			goal = all(
				goal,
				freshInternal((listVar) =>
					all(
						apply_pred(setKeyOf, objLVar, keyLit, listVar),
						arrayToKeyOfGoal(listVar, value),
					),
				),
			);
		} else {
			goal = all(
				goal,
				freshInternal((subObj) =>
					all(
						apply_pred(setKeyOf, objLVar, keyLit, subObj),
						jsonToKeyOfGoal(
							subObj,
							value as Record<string, unknown>,
						),
					),
				),
			);
		}
	}
	return goal;
}

/** Location-free JSON shape for expressions (identifier or literal). */
function expressionToJson(
	expr: ExpressionGeneric<unknown>,
): Record<string, unknown> {
	if (expr.type === "identifier") {
		return { type: "identifier", value: expr.value };
	}
	return {
		type: "literal",
		kind: expr.kind,
		value: expr.value,
	};
}

/** Location-free JSON shape for a term (conjunction, disjunction, fresh, with, predicate_call, predicate_definition). */
function termToJson(
	term: TermGeneric<unknown>,
): Record<string, unknown> {
	switch (term.type) {
		case "conjunction":
			return {
				type: "conjunction",
				terms: term.terms.map(termToJson),
			};
		case "disjunction":
			return {
				type: "disjunction",
				terms: term.terms.map(termToJson),
			};
		case "fresh":
			return {
				type: "fresh",
				newVars: term.newVars.map((id) => ({
					type: "identifier" as const,
					value: id.value,
				})),
				body: termToJson(term.body),
			};
		case "with":
			return {
				type: "with",
				name: termToJson(term.name),
				body: termToJson(term.body),
			};
		case "predicate_call":
			return {
				type: "predicate_call",
				source: {
					type: "identifier" as const,
					value: term.source.value,
				},
				args: term.args.map(expressionToJson),
			};
		case "predicate_definition":
			return {
				type: "predicate_definition",
				name: {
					type: "identifier" as const,
					value: term.name.value,
				},
				args: term.args.map((id) => ({
					type: "identifier" as const,
					value: id.value,
				})),
				body: termToJson(term.body),
			};
	}
}

/**
 * Converts a conjunction body AST to location-free JSON suitable for jsonToKeyOfGoal.
 */
export function astBodyToJson(
	body: ConjunctionGeneric<unknown>,
): Record<string, unknown> {
	return termToJson(body);
}

/**
 * Goal that unifies bodyAstVar with the logic object representing the given body AST.
 * Use with builtinGoals() so "set_key_of" is bound.
 */
export function bodyAstToKeyOfGoal(
	bodyAstVar: LTerm,
	body: ConjunctionGeneric<unknown>,
): MGoal {
	return jsonToKeyOfGoal(bodyAstVar, astBodyToJson(body));
}

/**
 * Goal that sets each binding in env on objLVar via set_key_of: keys are variable
 * names (string literals), values are the existing LTerms. Preserves relational
 * identity of env values. Use with builtinGoals() so "set_key_of" is bound.
 */
export function envToKeyOfGoal(
	objLVar: LTerm,
	env: ImmMap<string, LTerm>,
): MGoal {
	const setKeyOf = makelvar("set_key_of");
	let goal: MGoal = (sc) => [sc];
	env.forEach((lterm, name) => {
		goal = all(
			goal,
			apply_pred(
				setKeyOf,
				objLVar,
				makeLiteral(name),
				lterm,
			),
		);
	});
	return goal;
}
