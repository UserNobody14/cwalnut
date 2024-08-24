/////////////////////
// const is_simple_type = (t: TypeValue): t is SimpleTypeValue => t.type === 'simple',
//     is_complex_type = (t: TypeValue): t is ComplexType => t.type === 'complex';

import type {
	ConjunctionGeneric,
	DisjunctionGeneric,
	ExpressionGeneric,
	FreshGeneric,
	IdentifierGeneric,
	LiteralGeneric,
	PredicateCallGeneric,
	PredicateDefinitionGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import {
	builtinList,
	type Builtin,
	builtinsByRecursiveness,
} from "./builtinList";

export type FullExpression = [
	ExpressionGeneric<undefined>,
	TermGeneric<undefined>[],
	number,
];
export type Expression =
	| [ExpressionGeneric<undefined>, TermGeneric<undefined>[]]
	| FullExpression;
export type FlexExpression = ExpressionGeneric<undefined> | Expression;

export const deflex = (
	expr: FlexExpression,
	counter = 0,
): FullExpression => {
	if (Array.isArray(expr)) {
		if (expr.length === 3) {
			return expr;
		}
		return [expr[0], expr[1], counter];
	} else {
		return [expr, [], counter];
	}
};

export const counterFn = <A, B>(
	fn: (
		x: [A, B, number | undefined] | [A, B],
	) => [A, B, number | undefined] | [A, B],
) => {
	return (
		arr: [A, B, number | undefined] | [A, B],
	): [A, B, number] => {
		if (arr.length < 3 || arr[2] === undefined) {
			throw new Error("Counter is undefined");
		}
		return arr as [A, B, number];
	};
};

export const make_conjunction = (
	...children: TermGeneric<undefined>[]
): ConjunctionGeneric<undefined> => ({
	type: "conjunction",
	terms: children,
});

export const make_disjunction = (
	...children: TermGeneric<undefined>[]
): DisjunctionGeneric<undefined> => ({
	type: "disjunction",
	terms: children,
});

export const make_unification = (
	left: FlexExpression,
	kind: "=" | "!=" | "<<" | ">>" | "==",
	right: FlexExpression,
): Expression => {
	const [l, lTerms] = deflex(left);
	const [r, rTerms] = deflex(right);
	return [
		l,
		[
			...lTerms,
			...rTerms,
			kind === "!="
				? unify_not_equal(l, r)
				: kind === "=="
					? unify_equal(l, r)
					: kind === "<<"
						? unify_left(l, r)
						: kind === ">>"
							? unify_right(l, r)
							: unify(l, r),
		],
	];
};

export const make_predicate = (
	source: IdentifierGeneric<undefined>,
	args: ExpressionGeneric<undefined>[],
): PredicateCallGeneric<undefined> => ({
	type: "predicate_call",
	source,
	args,
});

export const make_fresh = (
	newVars: IdentifierGeneric<undefined>[],
	body: ConjunctionGeneric<undefined>,
): FreshGeneric<undefined> => ({
	type: "fresh",
	newVars,
	body,
});

export const make_identifier = (
	name: string,
): IdentifierGeneric<undefined> => ({
	type: "identifier",
	value: name,
	info: undefined,
});

// Use Proxy to generate identifiers super easily

export const ezlvar: Record<string, IdentifierGeneric<undefined>> =
	new Proxy(
		{},
		{
			get: (_, prop) => make_identifier(prop.toString()),
		},
	);

export const [
	set_key_of,
	unify,
	unify_left,
	unify_right,
	unify_equal,
	unify_not_equal,
	to_slice,
	to_length,
	list,
	to_first,
	to_rest,
	to_empty,
	mk_add,
	mk_subtract,
	mk_multiply,
	mk_divide,
	mk_modulo,
	mk_negate,
	mk_internal_file,
	mk_internal_import,
	mk_cons,
	mk_internal_append,
	mk_string_to_list,
] = builtinList.map(make_identifier).map(
	(id) =>
		(...args: ExpressionGeneric<undefined>[]) =>
			make_predicate(id, args),
);

export const make_literal_ast = (
	value: string | number,
): LiteralGeneric =>
	typeof value === "string"
		? {
				type: "literal",
				kind: "string",
				value,
			}
		: {
				type: "literal",
				kind:
					typeof value === "number"
						? "number"
						: typeof value === "boolean"
							? "boolean"
							: "null",
				value: value.toString(),
			};

export const make_list_ast = (
	obj: IdentifierGeneric<undefined>,
	elements1: FlexExpression[],
): Expression => {
	const elements = elements1.map(deflex);
	const terms = elements.flatMap(([_, t]) => [...t]);
	return [
		obj,
		[...terms, list(obj, ...elements.map(([e, _]) => e))],
	];
};

export const make_internal_append = (
	l: FlexExpression,
	r: FlexExpression,
	output: FlexExpression,
): Expression => {
	const [left, leftTerms] = deflex(l);
	const [right, rightTerms] = deflex(r);
	const [out, outTerms] = deflex(output);
	return [
		out,
		[
			...leftTerms,
			...rightTerms,
			...outTerms,
			make_predicate(make_identifier("internal_append"), [
				left,
				right,
				out,
			]),
		],
	];
};

export const make_pred_expr = (
	pred: Builtin,
	out_id: FlexExpression,
	out_index: number,
	args2: FlexExpression[],
): FullExpression => {
	// splice in the id into the out_index
	const args = args2.toSpliced(
		out_index,
		0,
		deflex(out_id),
	);

	const [out, outTerms] = deflex(args[out_index]);
	const otherTerms = args
		.map(deflex)
		.flatMap(([e, t], i) => (i === out_index ? [] : t));
	const passCounter = Math.max(
		...args.map(deflex).map(
			([_, __, c]) => c ?? 0,
			// finalTerm => Array.isArray(finalTerm) && finalTerm.length === 3 ? finalTerm[2] : 0
		),
	);
	return [
		out,
		[
			...otherTerms,
			...outTerms,
			make_predicate(
				make_identifier(pred),
				args.map(deflex).map(([e, t]) => e),
			),
		],
		passCounter,
	];
};

export const ezmake = {
	// The rest of (l) is out_id, the remainder of the list
	rest: (out_id: IdentifierGeneric<undefined>, l: Expression) =>
		make_pred_expr("rest", out_id, 0, [l]),
	restRev: (out_id: IdentifierGeneric<undefined>, l: Expression) =>
		make_pred_expr("rest", out_id, 1, [l]),
	// The first of (l) is out_id
	first: (out_id: IdentifierGeneric<undefined>, l: Expression) =>
		make_pred_expr("first", out_id, 0, [l]),
	// Append a and b, result is in l
	append: (
		out_id: IdentifierGeneric<undefined>,
		a: FlexExpression,
		b: FlexExpression,
	) => make_pred_expr("internal_append", out_id, 2, [a, b]),
	// Cons a and b, result is in l
	cons: (
		out_id: IdentifierGeneric<undefined>,
		a: FlexExpression,
		b: FlexExpression,
	) => make_pred_expr("cons", out_id, 2, [a, b]),
	empty: (l: IdentifierGeneric<undefined>) =>
		make_pred_expr("empty", l, 0, []),

	rest2: (out_id: FlexExpression, l: FlexExpression) =>
		make_pred_expr("rest", out_id, 0, [l]),
	first2: (out_id: FlexExpression, l: FlexExpression) =>
		make_pred_expr("first", out_id, 0, [l]),
	append2: (
		out_id: FlexExpression,
		a: FlexExpression,
		b: FlexExpression,
	) => make_pred_expr("internal_append", out_id, 2, [a, b]),
	cons2: (
		out_id: FlexExpression,
		a: FlexExpression,
		b: FlexExpression,
	) => make_pred_expr("cons", out_id, 0, [a, b]),
};

export const make_dictionary_ast = (
	obj: IdentifierGeneric<undefined>,
	entries: [Expression, Expression][],
): Expression => {
	// convert into a bunch of set_key_of predicate calls
	const predTerms = entries.flatMap(
		([[key, keyTerms], [value, valTerms]]): TermGeneric<undefined>[] => {
			return [
				...keyTerms,
				...valTerms,
				set_key_of(obj, key, value),
			];
		},
	);
	return [obj, predTerms];
};

export const make_predicate_fn = (
	name: IdentifierGeneric<undefined>,
	args: IdentifierGeneric<undefined>[],
	children: ConjunctionGeneric<undefined>,
): PredicateDefinitionGeneric<undefined> => ({
	type: "predicate_definition",
	name,
	args,
	body: children,
});

export function unify_term(
	kind: "=" | "!=" | "<<" | ">>" | "==",
	l: ExpressionGeneric<undefined>,
	r: ExpressionGeneric<undefined>,
): TermGeneric<undefined> {
	return kind === "!="
		? unify_not_equal(l, r)
		: kind === "=="
			? unify_equal(l, r)
			: kind === "<<"
				? unify_left(l, r)
				: kind === ">>"
					? unify_right(l, r)
					: unify(l, r);
}

function scoreRecursion(t: TermGeneric<undefined>): number {
	if (t.type === "predicate_call") {
		return (
			builtinsByRecursiveness?.[
				t.source.value as Builtin
			] ?? 0
		);
	} else if (t.type === "conjunction") {
		return t.terms.reduce(
			(acc, term) => acc + scoreRecursion(term),
			0,
		);
	} else if (t.type === "disjunction") {
		const dv =
			t.terms.reduce(
				(acc, term) => acc + scoreRecursion(term),
				0,
			) / t.terms.length;
		if (Number.isNaN(dv)) {
			return 0;
		}
		return dv;
	} else if (t.type === "fresh") {
		return scoreRecursion(t.body);
	} else if (t.type === "with") {
		return scoreRecursion(t.body);
	} else {
		return 0;
	}
}

function flattenConjunctions(
	terms: TermGeneric<undefined>[],
): TermGeneric<undefined>[] {
	return terms.flatMap((term) =>
		term.type === "conjunction"
			? flattenConjunctions(term.terms)
			: [term],
	);
}

function flattenDisjunctions(
	terms: TermGeneric<undefined>[],
): TermGeneric<undefined>[] {
	return terms.flatMap((term) =>
		term.type === "disjunction"
			? flattenDisjunctions(term.terms)
			: [term],
	);
}

export function conjunction1(
	...terms: TermGeneric<undefined>[]
): ConjunctionGeneric<undefined> {
	return make_conjunction(...flattenConjunctions(terms));
	// if (terms.length === 1 && terms[0].type === 'conjunction') {
	// } else {
	//     return make_conjunction(...flattenConjunctions(terms));
	// }
}

export function disjunction1(
	...terms: TermGeneric<undefined>[]
): DisjunctionGeneric<undefined> {
	return make_disjunction(...flattenDisjunctions(terms));
	// if (terms.length === 1 && terms[0].type === 'disjunction') {
	//     return terms[0];
	// } else {
	//     return make_disjunction(...flattenDisjunctions(terms));
	// }
}

export const operate = (
	operator: string,
	left: ExpressionGeneric<undefined>,
	right: ExpressionGeneric<undefined>,
	value: IdentifierGeneric<undefined>,
): PredicateCallGeneric<undefined> => {
	const opToPredicateName: Record<string, Builtin> = {
		"+": "add",
		"-": "subtract",
		"*": "multiply",
		"/": "divide",
		"%": "modulo",
	};
	const predName = opToPredicateName?.[operator];
	if (!predName) {
		throw new Error(
			`Operator ${operator} is not supported`,
		);
	}
	return make_predicate(make_identifier(predName), [
		left,
		right,
		value,
	]);
};

export const unary_operate = (
	operator: string,
	operand: ExpressionGeneric<undefined>,
	value: IdentifierGeneric<undefined>,
): PredicateCallGeneric<undefined> => {
	const opToPredicateName: Record<string, Builtin> = {
		"-": "negate",
		file: "internal_file",
		import: "internal_import",
	};
	const predName = opToPredicateName?.[operator];
	if (!predName) {
		throw new Error(
			`Operator ${operator} is not supported`,
		);
	}
	return make_predicate(make_identifier(predName), [
		operand,
		value,
	]);
};
