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
	WithGeneric,
} from "src/types/AstGeneric";
import type {
	ComplexType,
	ConstraintType,
	SimpleType,
	Type,
	TypeVariable,
	UnionType,
} from "src/types/EzType";
import { type Builtin, builtinList } from "./builtinList";

const conjunction_dat = <T>(
	terms: TermGeneric<T>[],
): ConjunctionGeneric<T> => ({
	type: "conjunction",
	terms,
});
const disjunction_dat = <T>(
	terms: TermGeneric<T>[],
): DisjunctionGeneric<T> => ({
	type: "disjunction",
	terms,
});
const fresh_dat = <T>(
	newVars: IdentifierGeneric<T>[],
	body: ConjunctionGeneric<T>,
): FreshGeneric<T> => ({
	type: "fresh",
	newVars,
	body,
});
const with_dat = <T>(
	name: IdentifierGeneric<T>,
	body: ConjunctionGeneric<T>,
): WithGeneric<T> => ({
	type: "with",
	name,
	body,
});
const predicate_call_dat = <T>(
	source: IdentifierGeneric<T>,
	args: ExpressionGeneric<T>[],
): PredicateCallGeneric<T> => ({
	type: "predicate_call",
	source,
	args,
});
const predicate_definition_dat = <T>(
	name: IdentifierGeneric<T>,
	args: IdentifierGeneric<T>[],
	body: ConjunctionGeneric<T>,
): PredicateDefinitionGeneric<T> => ({
	type: "predicate_definition",
	name,
	args,
	body,
});
const identifier_dat = <T>(
	info: T,
	value: string,
): IdentifierGeneric<T> => ({
	type: "identifier",
	info,
	value,
});
const literal_dat = (
	kind: "string" | "number" | "boolean" | "null",
	value: string,
): LiteralGeneric => ({
	type: "literal",
	kind,
	value,
});

// Types

const simple_type_dat = (name: string): SimpleType => ({
	type: "simple",
	name,
});

const complex_type_dat = (
	name: string,
	fresh: TypeVariable[],
	args: Type[],
): ComplexType => ({
	type: "complex",
	name,
	fresh,
	generics: args,
});

const type_variable_dat = (name: string): TypeVariable => ({
	type: "variable",
	name,
});

const union_type_dat = (...types: Type[]): UnionType => ({
	type: "union",
	types,
});

const constraint_type_dat = (
	constrain: (s: UnionType) => boolean,
): ConstraintType => ({
	type: "constraint",
	constrain,
});

const predicate_type_dat = (
	fresh: string[],
	...args: Type[]
): ComplexType => ({
	type: "complex",
	name: "predicate",
	fresh: fresh.map(type_variable_dat),
	generics: args,
});

export function flattenConjunctions<T>(
	terms: TermGeneric<T>[],
): TermGeneric<T>[] {
	return terms.flatMap((term) =>
		term.type === "conjunction"
			? flattenConjunctions(term.terms)
			: [term],
	);
}

export function flattenDisjunctions<T>(
	terms: TermGeneric<T>[],
): TermGeneric<T>[] {
	return terms.flatMap((term) =>
		term.type === "disjunction"
			? flattenDisjunctions(term.terms)
			: [term],
	);
}

function flattenUnions(types: Type[]): Type[] {
	return types.flatMap((type) =>
		type.type === "union"
			? flattenUnions(type.types)
			: [type],
	);
}

function union1(...types: Type[]): UnionType {
	return union_type_dat(...flattenUnions(types));
}

export function conjunction1<T>(
	...terms: TermGeneric<T>[]
): ConjunctionGeneric<T> {
	return make.conjunction(flattenConjunctions(terms));
}

export function disjunction1<T>(
	...terms: TermGeneric<T>[]
): DisjunctionGeneric<T> {
	return make.disjunction(flattenDisjunctions(terms));
}

export function fresh1<T>(
	newVars: IdentifierGeneric<T>[],
	...terms: TermGeneric<T>[]
): FreshGeneric<T> {
	return fresh_dat(
		newVars,
		conjunction1(...terms),
	);
}


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
] = builtinList.map(
	(id) =>
		<T>(srcInfo: T,...args: ExpressionGeneric<T>[]) =>
			predicate_call_dat(identifier_dat(
				srcInfo, id
			), args),
);

export type FullExpression<T> = [
	ExpressionGeneric<T>,
	TermGeneric<T>[],
	number,
];
export type Expression<T> =
	| [ExpressionGeneric<T>, TermGeneric<T>[]]
	| FullExpression<T>;
export type FlexExpression<T> = ExpressionGeneric<T> | Expression<T>;

export const deflex = <T>(
	expr: FlexExpression<T>,
	counter = 0,
): FullExpression<T> => {
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

export const make_list_ast = <T>(
	obj: IdentifierGeneric<T>,
	elements1: FlexExpression<T>[],
	srcInfo: T,
): Expression<T> => {
	const elements = elements1.map(deflex);
	const terms = elements.flatMap(([_, t]) => [...t]);
	return [
		obj,
		[...terms, list(srcInfo, obj, ...elements.map(([e, _]) => e))],
	];
};

export const make_internal_append = <T>(
	l: FlexExpression<T>,
	r: FlexExpression<T>,
	output: FlexExpression<T>,
	srcInfo: T,
): Expression<T> => {
	const [left, leftTerms] = deflex(l);
	const [right, rightTerms] = deflex(r);
	const [out, outTerms] = deflex(output);
	return [
		out,
		[
			...leftTerms,
			...rightTerms,
			...outTerms,
			predicate_call_dat(
				identifier_dat(
					srcInfo,
					"internal_append"
				), [
				left,
				right,
				out,
			]),
		],
	];
};

export const make_pred_expr = <T>(
	pred: Builtin,
	out_id: FlexExpression<T>,
	out_index: number,
	args2: FlexExpression<T>[],
	srcInfo: T,
): FullExpression<T> => {
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
			predicate_call_dat(
				identifier_dat(
					srcInfo,
					pred
				),
				args.map(deflex).map(([e, t]) => e),
			),
		],
		passCounter,
	];
};

export const make_unification = <T>(
	left: FlexExpression<T>,
	kind: "=" | "!=" | "<<" | ">>" | "==",
	right: FlexExpression<T>,
	srcInfo: T,
): Expression<T> => {
	const [l, lTerms] = deflex(left);
	const [r, rTerms] = deflex(right);
	return [
		l,
		[
			...lTerms,
			...rTerms,
			kind === "!="
				? unify_not_equal(srcInfo, l, r)
				: kind === "=="
					? unify_equal(srcInfo, l, r)
					: kind === "<<"
						? unify_left(srcInfo, l, r)
						: kind === ">>"
							? unify_right(srcInfo, l, r)
							: unify(srcInfo, l, r),
		],
	];
};

export const operate = <T>(
	operator: string,
	left: ExpressionGeneric<T>,
	right: ExpressionGeneric<T>,
	value: IdentifierGeneric<T>,
	srcInfo: T,
): PredicateCallGeneric<T> => {
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
	return predicate_call_dat(
		identifier_dat(srcInfo, predName), [
		left,
		right,
		value,
	]);
};

export const unary_operate = <T>(
	operator: string,
	operand: ExpressionGeneric<T>,
	value: IdentifierGeneric<T>,
	srcInfo: T,
): PredicateCallGeneric<T> => {
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
	return predicate_call_dat(identifier_dat(srcInfo, predName), [
		operand,
		value,
	]);
};

export const ezmakeMaker = <T>(
	srcInfo: T,
) => ({
	// The rest of (l) is out_id, the remainder of the list
	rest: (out_id: IdentifierGeneric<T>, l: Expression<T>) =>
		make_pred_expr("rest", out_id, 0, [l], srcInfo),
	restRev: (out_id: IdentifierGeneric<T>, l: Expression<T>) =>
		make_pred_expr("rest", out_id, 1, [l], srcInfo),
	// The first of (l) is out_id
	first: (out_id: IdentifierGeneric<T>, l: Expression<T>) =>
		make_pred_expr("first", out_id, 0, [l], srcInfo),
	// Append a and b, result is in l
	append: (
		out_id: IdentifierGeneric<T>,
		a: FlexExpression<T>,
		b: FlexExpression<T>,
	) => make_pred_expr("internal_append", out_id, 2, [a, b], srcInfo),
	// Cons a and b, result is in l
	cons: (
		out_id: IdentifierGeneric<T>,
		a: FlexExpression<T>,
		b: FlexExpression<T>,
	) => make_pred_expr("cons", out_id, 2, [a, b], srcInfo),
	empty: (l: IdentifierGeneric<T>) =>
		make_pred_expr("empty", l, 0, [], srcInfo),

	rest2: (out_id: FlexExpression<T>, l: FlexExpression<T>) =>
		make_pred_expr("rest", out_id, 0, [l], srcInfo),
	first2: (out_id: FlexExpression<T>, l: FlexExpression<T>) =>
		make_pred_expr("first", out_id, 0, [l], srcInfo),
	append2: (
		out_id: FlexExpression<T>,
		a: FlexExpression<T>,
		b: FlexExpression<T>,
	) => make_pred_expr("internal_append", out_id, 2, [a, b], srcInfo),
	cons2: (
		out_id: FlexExpression<T>,
		a: FlexExpression<T>,
		b: FlexExpression<T>,
	) => make_pred_expr("cons", out_id, 0, [a, b], srcInfo),
});



// Use Proxy to generate identifiers super easily

export const ezlvar: Record<
	string,
	((<T = undefined>(t?: T) => IdentifierGeneric<T>)| (() => IdentifierGeneric<undefined>))
> = new Proxy(
	{},
	{
		get:
			(_, prop) =>
			<T = undefined>(t?: T) => {
				identifier_dat(t, prop.toString());
			},
	},
);

export function toLvar2<T = undefined>(t?: T) {
	const ezlvar2: Record<
	string,
	IdentifierGeneric<T>
> = new Proxy(
	{},
	{
		get:
			(_, prop) => identifier_dat(t, prop.toString()),
	},
	);
	return ezlvar2;
}
type PredicateCallType<T> = (...args: ExpressionGeneric<T>[]) => PredicateCallGeneric<T>;
export function toPred2_<T>(t: T) {

	const ezlvar2: Record<
	string,
	(...args: ExpressionGeneric<T>[]) => PredicateCallGeneric<T>
> = new Proxy(
	{},
	{
		get: (_, prop): PredicateCallType<T> => (...args) => predicate_call_dat(
			identifier_dat(t, prop.toString()),
			args
		),
	},
	);
	return ezlvar2;
}

export const make = {
	conjunction: conjunction_dat,
	disjunction: disjunction_dat,
	fresh: fresh_dat,
	with: with_dat,
	predicate_call: predicate_call_dat,
	predicate_definition: predicate_definition_dat,
	identifier: identifier_dat,
	lvar: ezlvar,
	lvar2: toLvar2,
	pred2: toPred2_,
	literal: literal_dat,
	// Types
	simple_type: simple_type_dat,
	complex_type: complex_type_dat,
	predicate_type: predicate_type_dat,
	type_variable: type_variable_dat,
	union_type: union_type_dat,
	constraint_type: constraint_type_dat,

	// conjunction1,
	conjunction1,
	disjunction1,
	union1,
	fresh1,

	// Added
	list_ast: make_list_ast,
	internal_append: make_internal_append,
	pred_expr: make_pred_expr,
	literal_ast: literal_dat,
	predicate: predicate_call_dat,
	predicate_fn: predicate_definition_dat,
	unification: make_unification,

};
