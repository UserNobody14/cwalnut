
/////////////////////
// const is_simple_type = (t: TypeValue): t is SimpleTypeValue => t.type === 'simple',
//     is_complex_type = (t: TypeValue): t is ComplexType => t.type === 'complex';

import { ConjunctionDsAst, DisjunctionDsAst, ExpressionDsAst, IdentifierDsAst, LiteralDsAst, PredicateCallDsAst, PredicateDefinitionDsAst, TermDsAst } from "src/types/DesugaredAst";

type Expression = [ExpressionDsAst, TermDsAst[]];
// export const is_lvar_ast = ([e, t]: Expression): e is LVarAst => e.type === 'lvar', is_literal_ast = (e: Expression): e is LiteralAst => e.type === 'literal', is_attribute_ast = (e: Expression): e is AttributeAst => e.type === 'attribute', is_binary_operator_ast = (e: Expression): e is BinaryOperatorAst => e.type === 'binary_operator', is_unary_operator_ast = (e: Expression): e is UnaryOperatorAst => e.type === 'unary_operator', is_list_ast = (e: Expression): e is ListAst => e.type === 'list', is_dictionary_ast = (e: Expression): e is DictionaryAst => e.type === 'dictionary', is_predicate_ast = (e: Expression): e is PredicateDefinitionAst => e.type === 'predicate_definition';
// const is_conjunction = (t: Term): t is Conjunction => t.type === 'conjunction', is_disjunction = (t: Term): t is Disjunction => t.type === 'disjunction', is_unification = (t: Term): t is Unification => t.type === 'unification', is_predicate = (t: Term): t is PredicateCall => t.type === 'predicate_call';
// is_type_signature = (t: TypeValue): t is TypeSignature => t.type === 'type_signature';
// const is_expression = (e: any): e is Expression => is_lvar_ast(e) || is_literal_ast(e) || is_attribute_ast(e) || is_binary_operator_ast(e) || is_unary_operator_ast(e) || is_list_ast(e) || is_dictionary_ast(e) || is_predicate_ast(e);
// const is_type_value = (t: any): t is TypeValue => is_simple_type(t) || is_complex_type(t) || is_type_signature(t);
/////////////////////



export const make_conjunction = (...children: TermDsAst[]): ConjunctionDsAst => ({
    type: 'conjunction',
    terms: children,
}), make_disjunction = (...children: TermDsAst[]): DisjunctionDsAst => ({
    type: 'disjunction',
    terms: children,
}), make_unification = (left: Expression, kind: '=' | '!=' | '<<' | '>>' | '==', right: Expression): Expression => {
    const [l, lTerms] = left;
    const [r, rTerms] = right;
    return [
        l,
        [
            ...lTerms,
            ...rTerms,
            kind === '!=' ? unify_not_equal(l, r) : kind === '==' ? unify_equal(l, r) : kind === '<<' ? unify_left(l, r) : kind === '>>' ? unify_right(l, r) : unify(l, r)
        ]
    ];
},
 make_predicate = (
    source: IdentifierDsAst,
    args: ExpressionDsAst[]
): PredicateCallDsAst => ({
    type: 'predicate_call',
    source,
    args,
});
export const make_identifier = (name: string): IdentifierDsAst => ({
    type: 'identifier',
    value: name,
});

export const builtinList = [
    'set_key_of',
    'unify',
    'unify_left',
    'unify_right',
    'unify_equal',
    'unify_not_equal',
    'slice',
    'length',
    'list',
    'first',
    'rest',
    'empty'
];

export const [
    set_key_of,
    unify,
    unify_left,
    unify_right,
    unify_equal,
    unify_not_equal,
    to_slice,
    to_length,
    list
] = builtinList.map(make_identifier).map(
    (id) => (...args: ExpressionDsAst[]) => make_predicate(id, args)
);

/**
 * make_attribute_ast = (object: ExpressionDsAst, attribute: string): AttributeAst => ({
    type: 'attribute',
    object,
    attribute,
}), make_binary_operator_ast = (operator: string, left: Expression, right: Expression): BinaryOperatorAst => ({
    type: 'binary_operator',
    operator,
    left,
    right,
}), make_unary_operator_ast = (operator: string, operand: Expression): UnaryOperatorAst => ({
    type: 'unary_operator',
    operator,
    operand,
})
 */

export const make_literal_ast = (value: string | number): LiteralDsAst => (
    typeof value === 'string'
        ? {
            type: 'literal',
            kind: 'string',
            value
        }
        : {
            type: 'literal',
            kind: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'null',
            value: value.toString()
        }
), make_list_ast = (obj: IdentifierDsAst, elements: Expression[]): Expression => {
    const terms = elements.flatMap(([e, t]) => [...t]);
    return [
        obj,
        [
            ...terms,
            list(obj, ...elements.map(([e, _]) => e))
        ]
    ]
}, make_dictionary_ast = (obj: IdentifierDsAst, entries: [Expression, Expression][]): Expression => {
    // convert into a bunch of set_key_of predicate calls
    const predTerms = entries.flatMap(([[key, keyTerms], [value, valTerms]]): TermDsAst[] => {
        return [
            ...keyTerms,
            ...valTerms,
            set_key_of(obj, key, value)
        ]
    });
    return [
        obj,
        predTerms
    ];
}, make_predicate_fn = (name: IdentifierDsAst, args: IdentifierDsAst[], children: ConjunctionDsAst): PredicateDefinitionDsAst => ({
    type: 'predicate_definition',
    name,
    args,
    body: children,
});
export function unify_term(kind: '=' | '!=' | '<<' | '>>' | '==', l: ExpressionDsAst, r: ExpressionDsAst): TermDsAst {
    return kind === '!=' ? unify_not_equal(l, r) : kind === '==' ? unify_equal(l, r) : kind === '<<' ? unify_left(l, r) : kind === '>>' ? unify_right(l, r) : unify(l, r);
}

function flattenConjunctions(terms: TermDsAst[]): TermDsAst[] {
    return terms.flatMap(
        (term) => term.type === 'conjunction' ? flattenConjunctions(term.terms) : [term]
    );
}

function flattenDisjunctions(terms: TermDsAst[]): TermDsAst[] {
    return terms.flatMap(
        (term) => term.type === 'disjunction' ? flattenDisjunctions(term.terms) : [term]
    );
}

export function conjunction1(...terms: TermDsAst[]): ConjunctionDsAst {
    return make_conjunction(...flattenConjunctions(terms));
    // if (terms.length === 1 && terms[0].type === 'conjunction') {
    // } else {
    //     return make_conjunction(...flattenConjunctions(terms));
    // }
}

export function disjunction1(...terms: TermDsAst[]): DisjunctionDsAst {
    return make_disjunction(...flattenDisjunctions(terms));
    // if (terms.length === 1 && terms[0].type === 'disjunction') {
    //     return terms[0];
    // } else {
    //     return make_disjunction(...flattenDisjunctions(terms));
    // }
}