// import { Term, Expression, Conjunction } from "src/types/OldAstTyped";
// import { make_unification, make_predicate, make_conjunction, make_disjunction, make_predicate_fn, make_lvar_ast, make_attribute_ast, make_list_ast, make_dictionary_ast, make_literal_ast } from "src/utils/make_unification";
import Parser from "tree-sitter";
import { Pattern } from "ts-pattern";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import {TermDsAst, ExpressionDsAst, LiteralDsAst, IdentifierDsAst} from 'src/types/DesugaredAst';
import { make_conjunction, make_dictionary_ast, make_disjunction, make_identifier, make_list_ast, make_literal_ast, make_predicate, make_predicate_fn, make_unification, set_key_of } from "src/utils/make_desugared_ast";
import { pprintDsAst } from "./pprintast";
import { linearize } from "./linearize";
import { freshenTerms } from "./extractclosure";

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

type Expression = [ExpressionDsAst, TermDsAst[]];

// const inputKind = node.children[1].text as '=' | '!=' | '<<' | '>>' | '==';
const eqnqeq = Pattern.union('=', '!=', '==');
const eqnq = Pattern.union('=', '!=');
const eq_or_in = Pattern.union('=', '!=', '<<');
const eq_or_out = Pattern.union('=', '!=', '>>');
const in_or_inout = Pattern.union('in', 'inout');
const out_or_inout = Pattern.union('out', 'inout');

export function toAst(node: Parser.SyntaxNode): TermDsAst[] {
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
                console.warn('Empty compound logic', node.children[2].type, node.children[2].text);
            }
            return buildCompoundLogic(node.children[2], 'disjunction');
            
        case 'all_statement':
            // conjunction
            if (filterEmptyCompoundLogic(node.children[2]) === false) {
                console.warn('Empty compound logic', node.children[2].type, node.children[2].text);
            }
            return buildCompoundLogic(node.children[2], 'conjunction');
        case 'unification':
            const aaa = expressionToAst(node.children[0]);
            const bbb = expressionToAst(node.children[2]);
            const unification = (a: Expression, k: '==' | '<<' | '>>', b: Expression, disj: '!=' | string) => {
                if (disj === '!=') {
                    return make_unification(a, '!=', b);
                }
                return make_unification(a, k, b);
            };
            return unification(aaa, node.children[1].text as '==' | '<<' | '>>', bbb, node.children[1].text as '!=' | string)[1];
        case 'predicate':
            const argActual = node.children[1];
            const arglist = argActual.children.slice(1, -1);
            const allArgs =  arglist.filter(
                nnc => nnc.grammarType !== ','
            ).map((nc) => expressionToAst(nc));
            const [source, sourceTerms] = expressionToAst(node.children[0]);
            if (source.type !== 'identifier') {
                throw new Error('Source of predicate must be an identifier');
            }
            return [
                ...allArgs.map((aa) => aa[1]).flat(),
                ...sourceTerms,
                make_predicate(
                    source,
                    allArgs.map((aa) => aa[0])
                )
            ];
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

function buildCompoundLogic(node: Parser.SyntaxNode, variety: 'conjunction' | 'disjunction'): TermDsAst[] {
    if (node.children.length === 0) {
        throw new Error('Empty compound logic');
    } else if (node.children.length === 1) {
        return toAst(node.children[0]);
    } else {
        const terms = node.children.slice(1).filter(filterEmptyCompoundLogic).reduce<TermDsAst[]>((acc, nc) => {
            const currAst: TermDsAst[] = toAst(nc);
            return [...acc, ...currAst]
        }, toAst(node.children[0]));
        if (variety === 'conjunction') {
            return [make_conjunction(...terms)];
        } else {
            return [make_disjunction(...terms)];
        }
    };
}

var freshCounter = 0;
function freshLvar(): IdentifierDsAst {
    return make_identifier(`__fresh_${freshCounter++}`);
}

function expressionToAst(node: Parser.SyntaxNode): [ExpressionDsAst, TermDsAst[]] {
    switch (node.type) {
        case 'predicate_definition':
            const argsList = node.children.slice(1, -3).filter(nnc => nnc.grammarType !== ',');
            console.log('nodechillen', node.children.map(nnc => nnc.grammarType));
            let selectedNode = node.children[node.children.length - 1];
            if (filterEmptyCompoundLogic(selectedNode) === false) {
                console.warn('Empty compound logic', selectedNode.type, selectedNode.text);
                selectedNode = node.children.find(nnc => nnc.grammarType === 'block') as Parser.SyntaxNode;
                console.log('selectedNode', selectedNode.grammarType);
            }
            const argsListApplication = selectedNode.children;
            console.log('argsListApplication', argsListApplication.map(nnc => nnc.grammarType));
            const freshTerm = buildCompoundLogic(selectedNode, 'conjunction');
            const frshName = freshLvar();
            const pt = make_predicate_fn(
                frshName,
                argsList.filter(ddf => ddf.grammarType !== ',').map((nnc) => make_identifier(nnc.text)),
                make_conjunction(...freshTerm)
            );
            return [frshName, [pt]];
        case 'identifier':
            // TODO: make it freshen/scope the identifier?
            return [make_identifier(node.text), []];
        case 'expression':
        case 'primary_expression':
            return expressionToAst(node.children[0]);
        case 'attribute':
            const [obj1, objTerms] = expressionToAst(node.children[0]);
            const attr = node.children[2].text;
            const val = freshLvar();
            return [val, [...objTerms, 
                set_key_of(obj1, make_literal_ast(attr), val)
            ]];
            // return make_attribute_ast(obj1, attr);
        case 'binary_operator':
            throw new Error('Not implemented');
        case 'unary_operator':
            throw new Error('Not implemented');
        case 'list':
            const listVals = node.children.slice(1, -1).filter(nnc => nnc.grammarType !== ',');
            const expressions = listVals.map((nc) => expressionToAst(nc));
            const listI = freshLvar()
            return make_list_ast(listI, expressions);
        case 'dictionary':
            const map = new Map();
            const listValsDict = node.children.slice(1, -1).filter(nnc => nnc.grammarType !== ',');
            console.log('listValsDict', listValsDict.map(nnc => `
                gtype: ${nnc.grammarType}
                txt: ${nnc.text}
                `));
            const objv = freshLvar();
            return make_dictionary_ast(objv, listValsDict.map((nc) => [expressionToAst(nc.children[0]), expressionToAst(nc.children[2])]));
        case 'string':
            return [make_literal_ast(node.text.slice(1, -1)), []];
        case 'number':
            return [make_literal_ast(parseInt(node.text, 10)), []];
        default:
            throw new Error(`Unrecognized node type: ${node.type}`);
    }
}

export function codeToAst(code: string): TermDsAst[] {
    const tree = parser.parse(code);
    console.log("PARSE", tree.rootNode.toString());
    const astn = toAst(tree.rootNode);
    console.log('ASTN', pprintDsAst(astn));
    console.log('Linearized--------------------------');
    console.log(pprintDsAst(linearize(astn)))
    console.log('Freshened--------------------------');
    console.log(pprintDsAst(freshenTerms(astn)))
    return astn;
}

const source4 = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]
j = 3
j = v
j = ooo

membero(qq, einput)
`;

codeToAst(source4);