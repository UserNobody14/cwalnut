import Parser from 'tree-sitter';
import CrystalWalnut from 'tree-sitter-crystal-walnut';
import { LVar, Package, SLogic, Stream } from './logic';
import { setKeyValue } from './Guard';
import { Pattern, match } from 'ts-pattern';

/**
 * TODO:
 * - setup type system
 * - ensure recursion works
 * - figure out async?
 * - setup file system connection (& grammar connection?)
 */

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

const sourceCode = `

val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;


const tree = parser.parse(sourceCode);

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


/////////////////////
// const is_simple_type = (t: TypeValue): t is SimpleTypeValue => t.type === 'simple',
//     is_complex_type = (t: TypeValue): t is ComplexType => t.type === 'complex';

export const is_lvar_ast = (e: Expression): e is LVarAst => e.type === 'lvar',
    is_literal_ast = (e: Expression): e is LiteralAst => e.type === 'literal',
    is_attribute_ast = (e: Expression): e is AttributeAst => e.type === 'attribute',
    is_binary_operator_ast = (e: Expression): e is BinaryOperatorAst => e.type === 'binary_operator',
    is_unary_operator_ast = (e: Expression): e is UnaryOperatorAst => e.type === 'unary_operator',
    is_list_ast = (e: Expression): e is ListAst => e.type === 'list',
    is_dictionary_ast = (e: Expression): e is DictionaryAst => e.type === 'dictionary',
    is_predicate_ast = (e: Expression): e is PredicateDefinitionAst => e.type === 'predicate_definition';

const is_conjunction = (t: Term): t is Conjunction => t.type === 'conjunction',
    is_disjunction = (t: Term): t is Disjunction => t.type === 'disjunction',
    is_unification = (t: Term): t is Unification => t.type === 'unification',
    is_predicate = (t: Term): t is PredicateCall => t.type === 'predicate_call';
    // is_type_signature = (t: TypeValue): t is TypeSignature => t.type === 'type_signature';

const is_expression = (e: any): e is Expression => is_lvar_ast(e) || is_literal_ast(e) || is_attribute_ast(e) || is_binary_operator_ast(e) || is_unary_operator_ast(e) || is_list_ast(e) || is_dictionary_ast(e) || is_predicate_ast(e);
// const is_type_value = (t: any): t is TypeValue => is_simple_type(t) || is_complex_type(t) || is_type_signature(t);

/////////////////////

const make_conjunction = (...children: Term[]): Conjunction => ({
    type: 'conjunction',
    children,
}),
    make_disjunction = (...children: Term[]): Disjunction => ({
        type: 'disjunction',
        children,
    }),
    make_unification = (left: Expression, kind: '=' | '!=' | '<<' | '>>' | '==', right: Expression): Unification => ({
        type: 'unification',
        left,
        kind,
        right,
    }),
    make_predicate = (
        source: Expression, 
        args: Expression[]
    ): PredicateCall => ({
        type: 'predicate_call',
        source,
        args,
    });

const make_lvar_ast = (name: string): LVarAst => ({
    type: 'lvar',
    name,
}),
    make_literal_ast = (value: string | number): LiteralAst => ({
        type: 'literal',
        value,
    }),
    make_attribute_ast = (object: Expression, attribute: string): AttributeAst => ({
        type: 'attribute',
        object,
        attribute,
    }),
    make_binary_operator_ast = (operator: string, left: Expression, right: Expression): BinaryOperatorAst => ({
        type: 'binary_operator',
        operator,
        left,
        right,
    }),
    make_unary_operator_ast = (operator: string, operand: Expression): UnaryOperatorAst => ({
        type: 'unary_operator',
        operator,
        operand,
    }),
    make_list_ast = (elements: Expression[]): ListAst => ({
        type: 'list',
        elements,
    }),
    make_dictionary_ast = (entries: [Expression, Expression][]): DictionaryAst => ({
        type: 'dictionary',
        entries,
    }),
    make_predicate_fn = (args: string[], children: Conjunction): PredicateDefinitionAst => ({
        type: 'predicate_definition',
        args,
        children,
    });


export function toAst(node: Parser.SyntaxNode): Term {
    if (filterEmptyCompoundLogic(node) === false) {
        // throw new Error('Empty compound logic');
        console.warn('Empty compound logic', node.type, node.text);
    }
    switch (node.type) {
        case 'module':
            // return SLogic.and(...node.children.map((nc) => toAst(nc, lm)));
            return buildCompoundLogic(node, 'conjunction');
        case 'either_statement':
            // disjunction
            if (filterEmptyCompoundLogic(node.children[2]) === false) {
                // throw new Error('Empty compound logic');
                console.warn('Empty compound logic', node.children[2].type, node.children[2].text);
            }
            return buildCompoundLogic(node.children[2], 'disjunction');
            
        case 'all_statement':
            // conjunction
            if (filterEmptyCompoundLogic(node.children[2]) === false) {
                // throw new Error('Empty compound logic');
                console.warn('Empty compound logic', node.children[2].type, node.children[2].text);
            }
            return buildCompoundLogic(node.children[2], 'conjunction');
        case 'unification':
            const aaa = expressionToAst(node.children[0]);
            const bbb = expressionToAst(node.children[2]);
            const inputKind = node.children[1].text as '=' | '!=' | '<<' | '>>' | '==';
            const eqnqeq = Pattern.union('=', '!=', '==');
            const eqnq = Pattern.union('=', '!=');
            const eq_or_in = Pattern.union('=', '!=', '<<');
            const eq_or_out = Pattern.union('=', '!=', '>>');
            const in_or_inout = Pattern.union('in', 'inout');
            const out_or_inout = Pattern.union('out', 'inout');
            const unification = (a: Expression, k: '==' | '<<' | '>>', b: Expression, disj: '!=' | string) => {
                if (disj === '!=') {
                    return make_unification(a, '!=', b);
                }
                return make_unification(a, k, b);
            };
            return unification(aaa, node.children[1].text as '==' | '<<' | '>>', bbb, node.children[1].text as '!=' | string);
        case 'predicate':
            const argActual = node.children[1];
            const arglist = argActual.children.slice(1, -1);
            const allArgs =  arglist.filter(
                nnc => nnc.grammarType !== ','
            ).map((nc) => expressionToAst(nc));
            const source = expressionToAst(node.children[0]);
            return make_predicate(
                source,
                allArgs
            );
        default:
            throw new Error(`Unrecognized node type: ${node.type}`);
    }
}

function filterEmptyCompoundLogic(node: Parser.SyntaxNode): boolean {
    // Look through node and its children and if there's any conjunction or disjunction that's empty, return false
    if (node.type === 'module' || node.type === 'either_statement' || node.type === 'all_statement') {
        if (node.children.length === 0) {
            return false;
        } else {
            return true;
        }
    } else {
        return true;
    }
}

function buildCompoundLogic(node: Parser.SyntaxNode, variety: 'conjunction' | 'disjunction'): Term {
    if (node.children.length === 0) {
        throw new Error('Empty compound logic');
    } else if (node.children.length === 1) {
        return toAst(node.children[0]);
    } else {
        const terms = node.children.slice(1).filter(filterEmptyCompoundLogic).reduce((acc, nc) => {
            const currAst: Term = toAst(nc);
            return [...acc, currAst]
        }, [toAst(node.children[0])]);
        if (variety === 'conjunction') {
            return make_conjunction(...terms);
        } else {
            return make_disjunction(...terms);
        }
    };
}

function expressionToAst(node: Parser.SyntaxNode): Expression {
    // console.log(`Direct access node: ${node.type}`);
    switch (node.type) {
        case 'predicate_definition':
            const argsList = node.children.slice(1, -3).filter(nnc => nnc.grammarType !== ',');
            console.log('nodechillen', node.children.map(nnc => nnc.grammarType));
            let selectedNode = node.children[node.children.length - 1];
            if (filterEmptyCompoundLogic(selectedNode) === false) {
                // throw new Error('Empty compound logic');
                console.warn('Empty compound logic', selectedNode.type, selectedNode.text);
                selectedNode = node.children.find(nnc => nnc.grammarType === 'block') as Parser.SyntaxNode;
                console.log('selectedNode', selectedNode.grammarType);
            }
            const argsListApplication = selectedNode.children;
            console.log('argsListApplication', argsListApplication.map(nnc => nnc.grammarType));
            const freshTerm = buildCompoundLogic(selectedNode, 'conjunction') as Conjunction;
            const pt = make_predicate_fn(
                argsList.filter(ddf => ddf.grammarType !== ',').map(nnc => nnc.text),
                freshTerm
            );
            return pt;
        case 'identifier':
            // if (lm.has(node.text)) {
            //     return [lm.getLvar(node.text) as LVarAst, lm.get(node.text) as TypeValue];
            // } else {
            //     lm.set(node.text, anyType);
            //     return [make_lvar_ast(anyType, node.text), anyType];
            // }
            return make_lvar_ast(node.text);
        case 'expression':
        case 'primary_expression':
            return expressionToAst(node.children[0]);
        case 'attribute':
            const obj1 = expressionToAst(node.children[0]);
            // const [objTyped, t] = typeExpression(obj1, unifyTypes(type1, dictionaryType(stringType, anyType, 'infinite')));
            // if (is_lvar_ast(obj1) && !lm.has(obj1.name)) {
            //     lm.set(obj1.name, t);
            // }
            const attr = node.children[2].text;
            // if (t.type !== 'complex') {
            //     console.warn(`Attribute object type is not a dictionary: ${JSON.stringify(t, null, 2)}`);
            //     return [make_attribute_ast(anyType, objTyped, attr), anyType];
            // } else {
            //     const attrType = t.generics[1];
            //     if (attrType.type === 'simple' && attrType.value === SimpleType.Any) {
            //         console.warn(`Attribute value type is Any: ${JSON.stringify(attrType, null, 2)}`);
            //     }
            //     return [make_attribute_ast(attrType, objTyped, attr), attrType];
            // }
            return make_attribute_ast(obj1, attr);
        case 'binary_operator':
            throw new Error('Not implemented');
        case 'unary_operator':
            throw new Error('Not implemented');
        case 'list':
            const listVals = node.children.slice(1, -1).filter(nnc => nnc.grammarType !== ',');
            // const [tv, expressions]: Expression[] = listVals.reduceRight<[TypeValue, Expression[]]>(([tv1, acc], nc) => {
            //     const [currAst, currT] = expressionToAst(nc, lm);
            //     const [expr1, tv2] = typeExpression(currAst, unifyTypes(tv1, currT));
            //     return [tv2, [...acc, expr1]]
            // }, [anyType, []]);
            const expressions = listVals.map((nc) => expressionToAst(nc));
            return make_list_ast(expressions);
            // return SLogic.list(listVals.map((nc) => expressionToAst(nc, lm)));
        case 'dictionary':
            const map = new Map();
            const listValsDict = node.children.slice(1, -1).filter(nnc => nnc.grammarType !== ',');
            console.log('listValsDict', listValsDict.map(nnc => `
                gtype: ${nnc.grammarType}
                txt: ${nnc.text}
                `));
            // listValsDict.forEach((nc) => {
            //     map.set(nc.children[0].text, expressionToAst(nc.children[2], lm));
            // });
            // return [make_dictionary_ast(anyType, Array.from(map.entries())), dictionaryType(stringType, anyType, 'infinite')];
            return make_dictionary_ast(listValsDict.map((nc) => [expressionToAst(nc.children[0]), expressionToAst(nc.children[2])]));
        case 'string':
            // return node.text.slice(1, -1);
            // return [make_literal_ast(node.text.slice(1, -1)), stringType];
            return make_literal_ast(node.text.slice(1, -1));
        case 'number':
            // return [make_literal_ast(parseInt(node.text, 10)), numberType];
            return make_literal_ast(parseInt(node.text, 10));
            // return parseInt(node.text, 10);
        default:
            throw new Error(`Unrecognized node type: ${node.type}`);
    }
}

export function codeToAst(code: string): Term {
    const tree = parser.parse(code);
    console.log("PARSE", tree.rootNode.toString());
    return toAst(tree.rootNode);
}