import Parser from "tree-sitter";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import { LVar, Package, SLogic, Stream } from "./logic";
import { setKeyValue } from "./Guard";
import { Pattern, match } from "ts-pattern";
import type {
	Expression,
	Term,
	Conjunction,
} from "./types/OldAstTyped";
import {
	make_unification,
	make_predicate,
	make_conjunction,
	make_disjunction,
	make_predicate_fn,
	make_lvar_ast,
	make_attribute_ast,
	make_list_ast,
	make_dictionary_ast,
	make_literal_ast,
} from "./utils/make_unification";

/**
 * TODO:
 * - setup type system
 * - ensure recursion works
 * - figure out async?
 * - setup file system connection (& grammar connection?)
 */

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

// const inputKind = node.children[1].text as '=' | '!=' | '<<' | '>>' | '==';
const eqnqeq = Pattern.union("=", "!=", "==");
const eqnq = Pattern.union("=", "!=");
const eq_or_in = Pattern.union("=", "!=", "<<");
const eq_or_out = Pattern.union("=", "!=", ">>");
const in_or_inout = Pattern.union("in", "inout");
const out_or_inout = Pattern.union("out", "inout");

export function toAst(node: Parser.SyntaxNode): Term {
	if (filterEmptyCompoundLogic(node) === false) {
		// throw new Error('Empty compound logic');
		console.warn(
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
			if (
				filterEmptyCompoundLogic(node.children[2]) === false
			) {
				console.warn(
					"Empty compound logic",
					node.children[2].type,
					node.children[2].text,
				);
			}
			return buildCompoundLogic(
				node.children[2],
				"disjunction",
			);

		case "all_statement":
			// conjunction
			if (
				filterEmptyCompoundLogic(node.children[2]) === false
			) {
				console.warn(
					"Empty compound logic",
					node.children[2].type,
					node.children[2].text,
				);
			}
			return buildCompoundLogic(
				node.children[2],
				"conjunction",
			);
		case "unification": {
			const aaa = expressionToAst(node.children[0]);
			const bbb = expressionToAst(node.children[2]);
			const unification = (
				a: Expression,
				k: "==" | "<<" | ">>",
				b: Expression,
				disj: "!=" | string,
			) => {
				if (disj === "!=") {
					return make_unification(a, "!=", b);
				}
				return make_unification(a, k, b);
			};
			return unification(
				aaa,
				node.children[1].text as "==" | "<<" | ">>",
				bbb,
				node.children[1].text as "!=" | string,
			);
		}
		case "predicate": {
			const argActual = node.children[1];
			const arglist = argActual.children.slice(1, -1);
			const allArgs = arglist
				.filter((nnc) => nnc.grammarType !== ",")
				.map((nc) => expressionToAst(nc));
			const source = expressionToAst(node.children[0]);
			return make_predicate(source, allArgs);
		}
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
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
		if (node.children.length === 0) {
			return false;
		}
			return true;
	}
		return true;
}

function buildCompoundLogic(
	node: Parser.SyntaxNode,
	variety: "conjunction" | "disjunction",
): Term {
	if (node.children.length === 0) {
		throw new Error("Empty compound logic");
	}if (node.children.length === 1) {
		return toAst(node.children[0]);
	}
		const terms = node.children
			.slice(1)
			.filter(filterEmptyCompoundLogic)
			.reduce(
				(acc, nc) => {
					const currAst: Term = toAst(nc);
					return [...acc, currAst];
				},
				[toAst(node.children[0])],
			);
		if (variety === "conjunction") {
			return make_conjunction(...terms);
		}
			return make_disjunction(...terms);
}

function expressionToAst(
	node: Parser.SyntaxNode,
): Expression {
	switch (node.type) {
		case "predicate_definition": {
			const argsList = node.children
				.slice(1, -3)
				.filter((nnc) => nnc.grammarType !== ",");
			console.log(
				"nodechillen",
				node.children.map((nnc) => nnc.grammarType),
			);
			let selectedNode =
				node.children[node.children.length - 1];
			if (
				filterEmptyCompoundLogic(selectedNode) === false
			) {
				console.warn(
					"Empty compound logic",
					selectedNode.type,
					selectedNode.text,
				);
				selectedNode = node.children.find(
					(nnc) => nnc.grammarType === "block",
				) as Parser.SyntaxNode;
				console.log(
					"selectedNode",
					selectedNode.grammarType,
				);
			}
			const argsListApplication = selectedNode.children;
			console.log(
				"argsListApplication",
				argsListApplication.map((nnc) => nnc.grammarType),
			);
			const freshTerm = buildCompoundLogic(
				selectedNode,
				"conjunction",
			) as Conjunction;
			const pt = make_predicate_fn(
				argsList
					.filter((ddf) => ddf.grammarType !== ",")
					.map((nnc) => nnc.text),
				freshTerm,
			);
			return pt;
		}
		case "identifier":
			return make_lvar_ast(node.text);
		case "expression":
		case "primary_expression":
			return expressionToAst(node.children[0]);
		case "attribute": {
			const obj1 = expressionToAst(node.children[0]);
			const attr = node.children[2].text;
			return make_attribute_ast(obj1, attr);
		}
		case "binary_operator":
			throw new Error("Not implemented");
		case "unary_operator":
			throw new Error("Not implemented");
		case "list": {
			const listVals = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const expressions = listVals.map((nc) =>
				expressionToAst(nc),
			);
			return make_list_ast(expressions);
		}
		case "dictionary": {
			const map = new Map();
			const listValsDict = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			console.log(
				"listValsDict",
				listValsDict.map(
					(nnc) => `
                gtype: ${nnc.grammarType}
                txt: ${nnc.text}
                `,
				),
			);
			return make_dictionary_ast(
				listValsDict.map((nc) => [
					expressionToAst(nc.children[0]),
					expressionToAst(nc.children[2]),
				]),
			);
		}
		case "string":
			return make_literal_ast(node.text.slice(1, -1));
		case "number":
			return make_literal_ast(Number.parseInt(node.text, 10));
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

export function codeToAst(code: string): Term {
	const tree = parser.parse(code);
	console.log("PARSE", tree.rootNode.toString());
	return toAst(tree.rootNode);
}
