// console.log(tree.rootNode.toString());

export type Term = Conjunction | Disjunction | Unification | PredicateCall;

export interface Conjunction {
    type: 'conjunction';
    children: Term[];
}

export interface Disjunction {
    type: 'disjunction';
    children: Term[];
}

export interface Unification {
    type: 'unification';
    left: Expression;
    kind: '=' | '!=' | '<<' | '>>' | '==';
    right: Expression;
}

export interface PredicateCall {
    type: 'predicate_call';
    source: Expression;
    args: Expression[];
}

export type Expression = LVarAst | LiteralAst | AttributeAst | BinaryOperatorAst | UnaryOperatorAst | ListAst | DictionaryAst | PredicateDefinitionAst;

export interface LVarAst {
    type: 'lvar';
    name: string;
}

export interface LiteralAst {
    type: 'literal';
    value: string | number;
}

export interface AttributeAst {
    type: 'attribute';
    // assignedType: TypeValue;
    object: Expression;
    attribute: string;
}

export interface BinaryOperatorAst {
    type: 'binary_operator';
    operator: string;
    left: Expression;
    right: Expression;
}

export interface UnaryOperatorAst {
    type: 'unary_operator';
    // assignedType: TypeValue;
    operator: string;
    operand: Expression;
}

export interface ListAst {
    type: 'list';
    // assignedType: TypeValue;
    elements: Expression[];
}

export interface DictionaryAst {
    type: 'dictionary';
    // assignedType: TypeValue;
    entries: [Expression, Expression][];
}

export interface PredicateDefinitionAst {
    type: 'predicate_definition';
    // args: TypeValue[];
    args: string[];
    children: Conjunction;
}
