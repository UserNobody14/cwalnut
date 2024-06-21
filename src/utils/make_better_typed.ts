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
} from "src/types/DsAstTyped";
import type { ComplexType, ConstraintType, SimpleType, Type, TypeVariable, UnionType } from "src/types/EzType";

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

const simple_type_dat = (
    name: string
): SimpleType => ({
    type: "simple",
    name,
});

const complex_type_dat = (
    name: string,
    fresh: TypeVariable[],
    args: Type[]
): ComplexType => ({
    type: "complex",
    name,
    fresh,
    generics: args
});

const type_variable_dat = (
    name: string
): TypeVariable => ({
    type: "variable",
    name
});

const union_type_dat = (
    ...types: Type[]
): UnionType => ({
    type: "union",
    types
});

const constraint_type_dat = (
    constrain: (s: UnionType) => boolean
): ConstraintType => ({
    type: "constraint",
    constrain
});

export const make = {
	conjunction: conjunction_dat,
	disjunction: disjunction_dat,
	fresh: fresh_dat,
	with: with_dat,
	predicate_call: predicate_call_dat,
	predicate_definition: predicate_definition_dat,
	identifier: identifier_dat,
	literal: literal_dat,
    // Types
    simple_type: simple_type_dat,
    complex_type: complex_type_dat,
    type_variable: type_variable_dat,
    union_type: union_type_dat,
    constraint_type: constraint_type_dat, 
};
