import { Type, SimpleType } from '../types/Types';
import { builtins, types } from './typingbuiltins';
import { ExpressionTyped, PredicateCallTyped, LiteralTyped, TermTyped, ConjunctionTyped, DisjunctionTyped, IdentifierTyped } from '../types/DesugaredAstTyped';

export const to_unify = (lhs: ExpressionTyped, rhs: ExpressionTyped): PredicateCallTyped => ({
    type: 'predicate',
    source: builtins.unify,
    args: [lhs, rhs]
}), to_set_key_of = (obj: ExpressionTyped, key: ExpressionTyped, value: ExpressionTyped): PredicateCallTyped => ({
    type: 'predicate',
    source: {
        type: 'identifier',
        value: 'set_key_of',
        contextualType: types.set_key_of
    },
    args: [obj, key, value]
}), to_literal = (value: string, t: SimpleType): LiteralTyped => ({
    type: 'literal',
    value,
    contextualType: t
}), to_conjunction = (terms: TermTyped[]): ConjunctionTyped => ({
    type: 'conjunction',
    terms
}), to_disjunction = (terms: TermTyped[]): DisjunctionTyped => ({
    type: 'disjunction',
    terms
}), to_typed_lvar = (name: string, t: Type): IdentifierTyped => ({
    type: 'identifier',
    value: name,
    contextualType: t
});
