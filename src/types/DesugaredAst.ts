// Output Ast
// export type DsAstAst = ConjunctionDsAst;

export type TermDsAst =
	| ConjunctionDsAst
	| DisjunctionDsAst
	| FreshDsAst
	| WithDsAst
	| PredicateCallDsAst
	| PredicateDefinitionDsAst;

export interface ConjunctionDsAst {
	type: "conjunction";
	terms: TermDsAst[];
}

export interface DisjunctionDsAst {
	type: "disjunction";
	terms: TermDsAst[];
}

export interface FreshDsAst {
	type: "fresh";
	newVars: IdentifierDsAst[];
	body: ConjunctionDsAst;
}

export interface WithDsAst {
	type: "with";
	name: IdentifierDsAst;
	body: ConjunctionDsAst;
}

export interface PredicateCallDsAst {
	type: "predicate_call";
	source: IdentifierDsAst;
	args: ExpressionDsAst[];
}

export interface PredicateDefinitionDsAst {
	type: "predicate_definition";
	name: IdentifierDsAst;
	args: IdentifierDsAst[];
	body: ConjunctionDsAst;
}

export type ExpressionDsAst =
	| IdentifierDsAst
	| LiteralDsAst;

export interface IdentifierDsAst {
	type: "identifier";
	value: string;
}

export interface LiteralDsAst {
	type: "literal";
	kind: "string" | "number" | "boolean" | "null";
	value: string;
}
