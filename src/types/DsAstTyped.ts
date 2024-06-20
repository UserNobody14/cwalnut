import { Type } from "./EzType";

export type TermGeneric<T> = ConjunctionGeneric<T> | DisjunctionGeneric<T> | FreshGeneric<T> | WithGeneric<T> | PredicateCallGeneric<T> | PredicateDefinitionGeneric<T>;

export interface ConjunctionGeneric<T> {
    type: 'conjunction';
    terms: TermGeneric<T>[];
}

export interface DisjunctionGeneric<T> {
    type: 'disjunction';
    terms: TermGeneric<T>[];
}

export interface FreshGeneric<T> {
    type: 'fresh';
    newVars: IdentifierGeneric<T>[];
    body: ConjunctionGeneric<T>;
}

export interface WithGeneric<T> {
    type: 'with';
    name: IdentifierGeneric<T>;
    body: ConjunctionGeneric<T>;
}

export interface PredicateCallGeneric<T> {
    type: 'predicate_call';
    source: IdentifierGeneric<T>;
    args: ExpressionGeneric<T>[];
}

export interface PredicateDefinitionGeneric<T> {
    type: 'predicate_definition';
    name: IdentifierGeneric<T>;
    args: IdentifierGeneric<T>[];
    body: ConjunctionGeneric<T>;
}

export type ExpressionGeneric<T> = IdentifierGeneric<T> | LiteralGeneric;

export interface IdentifierGeneric<T> {
    type: 'identifier';
    info: T;
    value: string;
}

export interface LiteralGeneric {
    type: 'literal';
    kind: 'string' | 'number' | 'boolean' | 'null';
    value: string;
}


///////////////////////////////////////
// Specific Uses
///////////////////////////////////////

export type TermT = TermGeneric<Type>;