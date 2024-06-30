// import { Term, Expression, Conjunction } from "src/types/OldAstTyped";
// import { make_unification, make_predicate, make_conjunction, make_disjunction, make_predicate_fn, make_lvar_ast, make_attribute_ast, make_list_ast, make_dictionary_ast, make_literal_ast } from "src/utils/make_unification";
import Parser from "tree-sitter";
import { Pattern } from "ts-pattern";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import {
	type TermDsAst,
	type ExpressionDsAst,
	LiteralDsAst,
	type IdentifierDsAst,
    type PredicateDefinitionDsAst,
} from "src/types/DesugaredAst";
import {
	make_conjunction,
	make_dictionary_ast,
	make_disjunction,
	make_identifier,
	make_list_ast,
	make_literal_ast,
	make_predicate,
	make_predicate_fn,
	make_unification,
	operate,
	set_key_of,
    to_slice,
    unary_operate,
} from "src/utils/make_desugared_ast";
import { pprintDsAst } from "./pprintast";
import { linearize } from "./linearize";
import { freshenTerms } from "./extractclosure";
import { toBasicTypes } from "src/interpret-types/type-pipe";
import { pprintGeneric, pprintTermT } from "./pprintgeneric";
import { verifyLinear } from "src/verify/verify-linear";
import { PredicateDefinitionAst } from "src/types/OldAstTyped";
import { warnHolder, debugHolder } from "src/warnHolder";

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

type Expression = [ExpressionDsAst, TermDsAst[]];

// const inputKind = node.children[1].text as '=' | '!=' | '<<' | '>>' | '==';
const eqnqeq = Pattern.union("=", "!=", "==");
const eqnq = Pattern.union("=", "!=");
const eq_or_in = Pattern.union("=", "!=", "<<");
const eq_or_out = Pattern.union("=", "!=", ">>");
const in_or_inout = Pattern.union("in", "inout");
const out_or_inout = Pattern.union("out", "inout");

export function toAst(
	node: Parser.SyntaxNode,
): TermDsAst[] {
	if (filterEmptyCompoundLogic(node) === false) {
		// throw new Error('Empty compound logic');
		warnHolder(
			"Empty compound logic",
			node.type,
			node.text,
		);
	}
	switch (node.type) {
		case "module":
			// return SLogic.and(...node.children.map((nc) => toAst(nc, lm)));
			return buildCompoundLogic(node, "conjunction");
		case "either_statement":
			// disjunction
			logEmptyCompoundLogic(node);
			return buildCompoundLogic(
				node.children[2],
				"disjunction",
			);

		case "all_statement":
			// conjunction
			logEmptyCompoundLogic(node);
			return buildCompoundLogic(
				node.children[2],
				"conjunction",
			);
		case "unification": {
			const [a, aterms] = expressionToAst(node.children[0]);
			const [b, bterms] = expressionOrPredicateDefinitionToAst(node.children[2]);
            if (b.type === "predicate_definition") {
                if (a.type !== "identifier") {
                    throw new Error(
                        "Source of predicate must be an identifier",
                    );
                }
                return [
                    ...aterms,
                    {
                        ...b,
                        name: a,
                    }
                ];
            }
			// const unification = (
			// 	a: Expression,
			// 	k: "==" | "<<" | ">>",
			// 	b: Expression,
			// 	disj: "!=" | string,
			// ) => {
			// 	if (disj === "!=") {
			// 		return make_unification(a, "!=", b);
			// 	}
			// 	return make_unification(a, k, b);
			// };
			// return unification(
			// 	aaa,
			// 	node.children[1].text as "==" | "<<" | ">>",
			// 	bbb,
			// 	node.children[1].text as "!=" | string,
			// )[1];
            const k = node.children[1].text as "==" | "<<" | ">>";
            if (node.children[1].text === "!=") {
                return make_unification([a, aterms], "!=", [b, bterms])[1];
            }
            return make_unification([a, aterms], k, [b, bterms])[1];
		}
		case "predicate": {
			const argActual = node.children[1];
			const arglist = argActual.children.slice(1, -1);
			const allArgs = arglist
				.filter((nnc) => nnc.grammarType !== ",")
				.map((nc) => expressionToAst(nc));
			const [source, sourceTerms] = expressionToAst(
				node.children[0],
			);
			if (source.type !== "identifier") {
				throw new Error(
					"Source of predicate must be an identifier",
				);
			}
			return [
				...allArgs.flatMap((aa) => aa[1]),
				...sourceTerms,
				make_predicate(
					source,
					allArgs.map((aa) => aa[0]),
				),
			];
		}
		case "for_control_statement": {
			// const [a, aterms] = expressionToAst(node.children[1]);
			// const [b, bterms] = expressionToAst(node.children[3]);
			const ctrltype = node.children[1].text;
			const [c, cterms] = expressionToAst(node.children[2]);
			const [d, dterms] = expressionToAst(node.children[4]);
			return [
				// ...aterms,
				// ...bterms,
				...cterms,
				...dterms,
			];
		}
		case "comment": {
			return [];
		}

		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

function logEmptyCompoundLogic(node: Parser.SyntaxNode) {
    if (filterEmptyCompoundLogic(node.children[2]) === false) {
        warnHolder(
            "Empty compound logic",
            node.children[2].type,
            node.children[2].text
        );
    }
}

function filterEmptyCompoundLogic(
	node: Parser.SyntaxNode,
): boolean {
	// Look through node and its children and if there's any conjunction or disjunction that's empty, return false
	if (
		node.type === "module" ||
		node.type === "either_statement" ||
		node.type === "all_statement"
	) {
		return node.children.length !==0;
	}
		return true;
}

function buildCompoundLogic(
	node: Parser.SyntaxNode,
	variety: "conjunction" | "disjunction",
): TermDsAst[] {
	if (node.children.length === 0) {
		throw new Error("Empty compound logic");
	}if (node.children.length === 1) {
		return toAst(node.children[0]);
	}
		const terms = node.children
			.slice(1)
			.filter(filterEmptyCompoundLogic)
			.reduce<TermDsAst[]>((acc, nc) => {
				const currAst: TermDsAst[] = toAst(nc);
				return acc.concat(currAst);
			}, toAst(node.children[0]));
		if (variety === "conjunction") {
			return [make_conjunction(...terms)];
		}
			return [make_disjunction(...terms)];
}

// biome-ignore lint/style/noVar: Need this rq
var freshCounter = 0;
function freshLvar(): IdentifierDsAst {
	return make_identifier(`__fresh_${freshCounter++}`);
}

function expressionOrPredicateDefinitionToAst(
    node: Parser.SyntaxNode
): [ExpressionDsAst | PredicateDefinitionDsAst, TermDsAst[]] {
    switch (node.type) {
        case "predicate_definition": {
			const argsList = node.children
				.slice(1, -3)
				.filter((nnc) => nnc.grammarType !== ",");
            // TODO: add verification 1
			let selectedNode =
				node.children[node.children.length - 1];
			selectedNode = handleEmptyCompoundLogic(selectedNode, node);
			const freshTerm = buildCompoundLogic(
				selectedNode,
				"conjunction",
			);
			const frshName = freshLvar();
			const pt = make_predicate_fn(
				frshName,
				argsList
					.filter((ddf) => ddf.grammarType !== ",")
					.map((nnc) => make_identifier(nnc.text)),
				make_conjunction(...freshTerm),
			);
			return [pt, [pt]];
		}
    default:
        return expressionToAst(node);
    }
}

function expressionToAst(
	node: Parser.SyntaxNode,
): [ExpressionDsAst, TermDsAst[]] {
	switch (node.type) {
		// case "predicate_definition": {
		// 	const argsList = node.children
		// 		.slice(1, -3)
		// 		.filter((nnc) => nnc.grammarType !== ",");
        //     // TODO: add verification 1
		// 	let selectedNode =
		// 		node.children[node.children.length - 1];
		// 	selectedNode = handleEmptyCompoundLogic(selectedNode, node);
		// 	const freshTerm = buildCompoundLogic(
		// 		selectedNode,
		// 		"conjunction",
		// 	);
		// 	const frshName = freshLvar();
		// 	const pt = make_predicate_fn(
		// 		frshName,
		// 		argsList
		// 			.filter((ddf) => ddf.grammarType !== ",")
		// 			.map((nnc) => make_identifier(nnc.text)),
		// 		make_conjunction(...freshTerm),
		// 	);
		// 	return [frshName, [pt]];
		// }
		case "identifier":
			return [make_identifier(node.text), []];
		case "expression":
		case "primary_expression":
			return expressionToAst(node.children[0]);
		case "attribute": {
			const [obj1, objTerms] = expressionToAst(
				node.children[0],
			);
			const attr = node.children[2].text;
			const val = freshLvar();
			return [
				val,
				[
					...objTerms,
					set_key_of(obj1, make_literal_ast(attr), val),
				],
			];
		}
		// return make_attribute_ast(obj1, attr);
		case "binary_operator": {
            const [aaa, aaTerms] = expressionToAst(node.children[0]);
            const op = node.children[1].text;
			const [bbb, bbTerms] = expressionToAst(node.children[2]);
			const val = freshLvar();
			return [
				val,
				[
					...aaTerms,
                    ...bbTerms,
					operate(op, aaa, bbb, val)
				],
			];
		}
		case "unary_operator": {
            const [aaa, aaTerms] = expressionToAst(node.children[1]);
            const op = node.children[0].text;
            const val = freshLvar();
            return [
                val,
                [
                    ...aaTerms,
                    unary_operate(op, aaa, val)
                ],
            ];
        }
		case "list": {
			const listVals = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const expressions = listVals.map((nc) =>
				expressionToAst(nc),
			);
			const listI = freshLvar();
			return make_list_ast(listI, expressions);
		}
		case "dictionary": {
			const map = new Map();
			const listValsDict = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			debugHolder(
				"listValsDict",
				listValsDict.map(
					(nnc) => `
                gtype: ${nnc.grammarType}
                txt: ${nnc.text}
                `,
				),
			);
			const objv = freshLvar();
			return make_dictionary_ast(
				objv,
				listValsDict.map((nc) => [
					expressionToAst(nc.children[0]),
					expressionToAst(nc.children[2]),
				]),
			);
		}
		case "string":
			return [make_literal_ast(node.text.slice(1, -1)), []];
		case "number":
			return [
				make_literal_ast(Number.parseInt(node.text, 10)),
				[],
			];
		case "slice": {
			const [obj1, objTerms] = expressionToAst(
				node.children[0],
			);
			const attr = node.children[2].text;
			const val = freshLvar();
			return [
				val,
				[
					...objTerms,
					to_slice(obj1, make_literal_ast(attr), val),
				],
			];
		}
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

function handleEmptyCompoundLogic(selectedNode1: Parser.SyntaxNode, node: Parser.SyntaxNode) {
    let selectedNode = selectedNode1
    if (filterEmptyCompoundLogic(selectedNode) === false) {
        warnHolder(
            "Empty compound logic",
            selectedNode.type,
            selectedNode.text
        );
        selectedNode = node.children.find(
            (nnc) => nnc.grammarType === "block"
        ) as Parser.SyntaxNode;
        debugHolder(
            "selectedNode",
            selectedNode.grammarType
        );
    }
    const argsListApplication = selectedNode.children;
    debugHolder(
        "argsListApplication",
        argsListApplication.map((nnc) => nnc.grammarType),
    );
    return selectedNode;
}

export function codeToAst(code: string): TermDsAst[] {
	const tree = parser.parse(code);
	debugHolder("PARSE", tree.rootNode.toString());
	const astn = toAst(tree.rootNode);
	debugHolder("ASTN", pprintDsAst(astn));
	// debugHolder("Linearized--------------------------");
	// debugHolder(pprintDsAst(linearize(astn)));
	// debugHolder("Freshened--------------------------");
	// debugHolder(pprintDsAst(freshenTerms(astn)));
    // debugHolder("Typed--------------------------");
    // debugHolder(pprintTermT(toBasicTypes(astn)));
    // passed through
    const passedThrough = toBasicTypes(astn);
    // debugHolder("linear:::::::::::::::::::::::::", verifyLinear(passedThrough));
    debugHolder("Passed through--------------------------");
    debugHolder(pprintTermT(passedThrough));
	return astn;
}

const source4 = `
string1_or_num = (zza) =>
	either:
		zza = "string1"
		zza = 1
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]
j = 3 + 4
j = v
j = ooo
ssa = 1
string1_or_num(ssa)

membero(qq, einput)
`;

const source5 = `

einput = [1, 2, 3, 4, 5]
j = 3
j = v
j = ooo

first(qq, einput)
`;


const source6 = `


cwal_file << file "./target/cwal"

grammar_v1 = (str, ast) =>
    either:
        all:
            str = predname + "(" + remaining + ")"
            regex("/\w+", predname)
            grammar_v1(remaining, astremaining)
            ast = {
                "type": "predicate",
                "name": predname,
                "args": astremaining
            }
        all:
            fail()

fresh_pred_type = (astv, type_map, pred_type) =>
    astv = {
        "type": "predicate_call",
        "source": name,
        "args": avargs
    }
    for all tval in avargs:
        type_ast(tval)

type_ast = (ast, type_map) =>
    either:
        all:
            ast.type = "predicate_call"
            fresh_pred_type(ast, type_map, predtype)
            predtype(ast.args)
        all:
            ast.type = "predicate_definition"
            args = ast.args
            type_ast_curried = (t) =>
                type_ast(t, type_map, tblw)
            map(args, type_ast_curried, args_typed)
			## type_map[ast.name] = pred_type
            pred_typing_closure = (args) =>
                process_pred_instance(ast.body, args)
            pred_type = {
                "type": "predicate_definition",
                "body": pred_typing_closure
            }
        all:
            ast.type = "fresh"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "with"
            type_ast(ast.body, type_map, typeval)
        all:
			ast = {
				"type": "conjunction",
				"terms": ast_terms
			}
			split_string(ast_terms, ",", termsout)
            type_ast(start_ts, type_map)
        all:
            ast = {
				"type": "disjunction",
				"terms": ast_terms
			}
			split_string(ast_terms, ",", termsout)
            type_disjunction(termsout, type_map)


type_disjunction = (disj_terms, type_map1) =>
    either:
        disj_terms = []
        all:
            first(dterm, disj_terms)
            rest(remaining_dterms, disj_terms)
            type_ast(dterm, type_map1)
            type_disjunction(remaining_dterms, type_map1)



type_map_for_file = (filestring, tmap) =>
    INTERNAL_parse_cwal(filestring, ast)
    type_ast(ast, tmap)


`;

const source65 = `


type_disjunction = (disj_terms, type_map) =>
    either:
        disj_terms = []
        all:
            first(dterm, disj_terms)
            rest(remaining_dterms, disj_terms)
            type_ast(dterm, type_map)
            type_disjunction(remaining_dterms, type_map)



type_map_for_file = (filestring, tmap) =>
    INTERNAL_parse_cwal(filestring, ast)
    type_ast(ast, tmap)


`;
const source_file = `
cwal_file << file "./target/cwal"
`
const source7 = `

grammar_v1 = (str, ast) =>
    either:
        all:
            str = predname + "(" + remaining + ")"

            regex2("/\\w+", predname)
            grammar_v1(remaining, astremaining)
            ast = {
                "type": "predicate",
                "name": predname,
                "args": astremaining
            }
        all:
            fail()
`;

const source8 = `
fresh_pred_type = (astv, type_map, pred_type) =>
    astv = {
        "type": "predicate_call",
        "source": name,
        "args": avargs
    }
    for all tval in avargs:
        type_ast(tval)

type_ast = (ast, type_map) =>
    either:
        all:
            ast.type = "predicate_call"
            fresh_pred_type(ast, type_map, predtype)
            predtype(ast.args)
        all:
            ast.type = "predicate_definition"
            args = ast.args
            type_ast_curried = (t) =>
                type_ast(t, type_map, tblw)
            map(args, type_ast_curried, args_typed)
            type_map[ast.name] << pred_type
            pred_typing_closure = (args) =>
                process_pred_instance(ast.body, args)
            pred_type = {
                "type": "predicate_definition",
                "body": pred_typing_closure
            }
        all:
            ast.type = "fresh"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "with"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "conjunction"
            termsv = ast.terms
            first(start_ts, termsv)
            type_ast(start_ts, type_map)
        all:
            ast.type = "disjunction"
            type_disjunction(ast.terms, type_map)
`;


codeToAst(source6);
