import type { Type } from "./Types";

// Output Ast
export type TypedAst = ConjunctionTyped;

export type TermTyped =
	| ConjunctionTyped
	| DisjunctionTyped
	| PredicateCallTyped
	| PredicateDefinitionTyped;

export interface ConjunctionTyped {
	type: "conjunction";
	terms: TermTyped[];
}

export interface DisjunctionTyped {
	type: "disjunction";
	terms: TermTyped[];
}

export interface PredicateCallTyped {
	type: "predicate";
	source: IdentifierTyped;
	args: ExpressionTyped[];
}

export interface PredicateDefinitionTyped {
	type: "predicate_definition";
	name: IdentifierTyped;
	args: IdentifierTyped[];
	body: TypedAst;
}

export type ExpressionTyped =
	| IdentifierTyped
	| LiteralTyped;

export interface IdentifierTyped {
	type: "identifier";
	contextualType: Type;
	value: string;
}

export interface LiteralTyped {
	type: "literal";
	contextualType: Type;
	value: string;
}
