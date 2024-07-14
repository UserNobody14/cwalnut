// import { Term, Expression, Conjunction } from "src/types/OldAstTyped";
// import { make_unification, make_predicate, make_conjunction, make_disjunction, make_predicate_fn, make_lvar_ast, make_attribute_ast, make_list_ast, make_dictionary_ast, make_literal_ast } from "src/utils/make_unification";
import Parser from "tree-sitter";
import { Pattern } from "ts-pattern";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import type {
	TermDsAst,
	ExpressionDsAst,
	IdentifierDsAst,
	PredicateDefinitionDsAst,
	LiteralDsAst,
} from "src/types/DesugaredAst";
import {
	conjunction1,
	disjunction1,
	ezmake,
	type FlexExpression,
	type FullExpression,
	make_fresh,
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
	return toAst1(node, 0)[0];
}

/**
 * 
 *    $.data_statement,
      $.timeline_statement,
      $.when_statement,
      $.match_statement,
      $.with_statement,
      $.typedef_statement,
      $.all_statement,
      $.either_statement,
      $.for_control_statement,
      $.test_statement,
      $.fresh_statement,
	  fresh nominal??
 */

export function toAst1(
	node: Parser.SyntaxNode,
	frCounter: number,
): [TermDsAst[], number] {
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
			return buildCompoundLogic(
				node,
				"conjunction",
				frCounter,
			);
		case "either_statement":
			// disjunction
			logEmptyCompoundLogic(node);
			return buildCompoundLogic(
				node.children[2],
				"disjunction",
				frCounter,
			);
		case "all_statement":
			// conjunction
			logEmptyCompoundLogic(node);
			return buildCompoundLogic(
				node.children[2],
				"conjunction",
				frCounter,
			);
		case "unification": {
			const [a1, a1terms, frCounter2] =
				expressionToAstFRESH(node.childForFieldName("lhs"), frCounter);
			const [b1, b1terms, frCounter5] =
				expressionOrPredicateDefinitionToAst(
					// node.children[2],
					node.childForFieldName("rhs"),
					frCounter2,
					a1.type === "identifier" ? a1 : undefined,
				);
			const [b2, b2terms, frCounter3] =
				expressionOrPredicateDefinitionToAst(
					// node.children[2],
					node.childForFieldName("rhs"),
					frCounter,
				);
			const [a2, a2terms, frCounter4] =
				expressionToAstFRESH(
					node.childForFieldName("lhs"),
					// node.children[0],
					frCounter3,
					b2.type === "identifier" ? b2 : undefined,
				);
			const k = node.childForFieldName("operator")?.text as
				| "="
				| "<<"
				| ">>"
				| "!=";
			const length1 =
				a1terms.length +
				b1terms.length +
				(isSameIdentifier(a1, b1) ? 0 : 1);
			const length2 =
				a2terms.length +
				b2terms.length +
				(isSameIdentifier(a2, b2) ? 0 : 1);

			// if (length1 <= length2) {
			const [a, aterms, b, bterms, frCounter6] =
				length1 <= length2
					? [a1, a1terms, b1, b1terms, frCounter5]
					: [a2, a2terms, b2, b2terms, frCounter4];
			if (b.type === "predicate_definition") {
				if (a.type !== "identifier") {
					throw new Error(
						"Source of predicate must be an identifier",
					);
				}
				return [[...aterms, { ...b, name: a }], frCounter6];
			}
			const unifT = isSameIdentifier(a, b)
				? []
				: make_unification(a, k, b)[1];
			return [[...aterms, ...bterms, ...unifT], frCounter6];
		}
		case "predicate": {
			const argActual = node.children[1];
			const arglist = argActual.children.slice(1, -1);
			const [allArgs, frCounter2] = arglist
				.filter((nnc) => nnc.grammarType !== ",")
				.reduce<[[ExpressionDsAst, TermDsAst[]][], number]>(
					(acc, nc) => {
						const [arg, argTerms, frPlus] =
							expressionToAstFRESH(nc, acc[1]);
						return [
							acc[0].concat([[arg, argTerms]]),
							frPlus,
						];
					},
					[[], frCounter],
				);
			const [source, sourceTerms, frCounter3] =
				expressionToAstFRESH(node.children[0], frCounter2);
			if (source.type !== "identifier") {
				throw new Error(
					"Source of predicate must be an identifier",
				);
			}
			const allArgs2 = allArgs.flatMap((aa) => aa[1]);
			// validate that it is all termsdsast
			for (const aa of allArgs2) {
				// if (aa.type === "predicate_definition") {
				// 	throw new Error("Cannot have predicate in predicate");
				// }
				if (aa === undefined) {
					throw new Error("Undefined term");
				}
				if (typeof aa === "number") {
					throw new Error("Number term!");
				}
				if (Array.isArray(aa)) {
					throw new Error("Array term");
				}
			}
			return [
				[
					...allArgs2,
					...sourceTerms,
					make_predicate(
						source,
						allArgs.map((aa) => aa[0]),
					),
				],
				frCounter3,
			];
		}
		case "for_control_statement": {
			const ctrltype = node.children[1].text;
			const [c, cterms, fr1] = expressionToAstFRESH(
				node.children[2],
				frCounter,
			);
			const [d, dterms, fr3] = expressionToAstFRESH(
				node.children[4],
				fr1,
			);
			return [[...cterms, ...dterms], fr3];
		}
		case "fresh_statement": {
			const ids = node.children.filter(
				(nc) => nc.grammarType === "identifier",
			);
			const allIds = ids.map((nc) =>
				make_identifier(nc.text),
			);
			const block = node.children[node.children.length - 1];
			const [blockTerms, fr2] = block.children.reduce<
				[TermDsAst[], number]
			>(
				(acc, nc) => {
					const [newTerms, newFr] = toAst1(nc, acc[1]);
					return [acc[0].concat(newTerms), newFr];
				},
				[[], frCounter],
			);
			return [
				[make_fresh(allIds, conjunction1(...blockTerms))],
				fr2,
			];
		}
		case "comment": {
			return [[], frCounter];
		}
		case "statement_binary_operator": {
			// Produce a conjunction/disjunction of the segments
			const [a, frCounter2] = toAst1(
				node.children[0],
				frCounter,
			);
			const op = node.children[1].text;
			const [b, frCounter3] = toAst1(
				node.children[2],
				frCounter2,
			);
			if (op === "and") {
				return [[conjunction1(...a, ...b)], frCounter3];
			} else if (op === "or") {
				return [[disjunction1(...a, ...b)], frCounter3];
			} else {
				throw new Error(`Unknown operator: ${op}`);
			}
		}

		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

function isSameIdentifier(
	a: ExpressionDsAst,
	b: ExpressionDsAst | PredicateDefinitionDsAst,
) {
	if (b.type === "predicate_definition") {
		return false;
	}
	return (
		a.value === b.value &&
		a.type === b.type &&
		a.type === "identifier"
	);
}

function logEmptyCompoundLogic(node: Parser.SyntaxNode) {
	if (
		filterEmptyCompoundLogic(node.children[2]) === false
	) {
		warnHolder(
			"Empty compound logic",
			node.children[2].type,
			node.children[2].text,
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
		return node.children.length !== 0;
	}
	return true;
}

function buildCompoundLogic(
	node: Parser.SyntaxNode,
	variety: "conjunction" | "disjunction",
	frCounter: number,
): [TermDsAst[], number] {
	if (node.children.length === 0) {
		throw new Error("Empty compound logic");
	}
	if (node.children.length === 1) {
		return toAst1(node.children[0], frCounter);
	}
	const [cnj1, nm] = toAst1(node.children[0], frCounter);
	const [terms, fr4] = node.children
		.slice(1)
		.filter(filterEmptyCompoundLogic)
		.reduce<[TermDsAst[], number]>(
			([acc, frNew], nc) => {
				const [currAst, fr2] = toAst1(nc, frNew);
				return [
					acc.concat([conjunction1(...currAst)]),
					fr2,
				];
			},
			[[conjunction1(...cnj1)], nm],
		);
	if (variety === "conjunction") {
		return [[conjunction1(...terms)], fr4];
	}
	return [[disjunction1(...terms)], fr4];
}

// biome-ignore lint/style/noVar: Need this rq
var freshCounter = 0;
function freshLvar(): IdentifierDsAst {
	return make_identifier(`__fresh_${freshCounter++}`);
}

function freshLvar2(frCounter: number): IdentifierDsAst {
	return make_identifier(`__fresh_${frCounter}`);
}

const toExprIdent = (
	i: IdentifierDsAst | undefined,
	n: number,
): [IdentifierDsAst, number] => {
	if (i === undefined) {
		return [freshLvar2(n), n + 1];
	} else {
		return [i, n];
	}
};

function expressionOrPredicateDefinitionToAst(
	node: Parser.SyntaxNode | null,
	frCounter: number,
	unifyVar?: IdentifierDsAst,
): [
	ExpressionDsAst | PredicateDefinitionDsAst,
	TermDsAst[],
	number,
] {
	if (node === null) {
		throw new Error("Node is null");
	}
	switch (node.type) {
		case "predicate_definition": {
			const argsList = node.children
				.slice(1, -3)
				.filter((nnc) => nnc.grammarType !== ",");
			// TODO: add verification 1
			let selectedNode =
				node.children[node.children.length - 1];
			selectedNode = handleEmptyCompoundLogic(
				selectedNode,
				node,
			);
			const [freshTerm, n] = buildCompoundLogic(
				selectedNode,
				"conjunction",
				frCounter,
			);
			const frshName = unifyVar ?? freshLvar2(n);
			const pt = make_predicate_fn(
				frshName,
				argsList
					.filter((ddf) => ddf.grammarType !== ",")
					.map((nnc) => make_identifier(nnc.text)),
				conjunction1(...freshTerm),
			);
			return [pt, [], n];
		}
		default: {
			const [c1, c2, c3] = expressionToAstFRESH(
				node,
				frCounter,
				unifyVar,
			);
			if (c1 === undefined) {
				if (c2 === undefined) {
					throw new Error("Both c1 and c2 are undefined");
				}
				if (c2.length === 0) {
					throw new Error("c2 is empty");
				}
			}
			return [c1, c2, c3];
		}
	}
}

function expressionToAstFRESH(
	node1: Parser.SyntaxNode | null | undefined,
	frCounter: number,
	unifyVar?: IdentifierDsAst,
): [ExpressionDsAst, TermDsAst[], number] {
	if (node1 === undefined || node1 === null) {
		throw new Error("Node is undefined");
	}
	const node = node1;
	switch (node.type) {
		case "keyword_identifier":
		case "identifier":
			return [make_identifier(node.text), [], frCounter];
		case "destructuring_expression":
			console.debug(`Destructuring expression: ${node.text}`);
			return expressionToAstFRESH(
				node.children[0],
				frCounter,
				unifyVar,
			);
		case "expression":
		case "primary_expression":
			return expressionToAstFRESH(
				node.children[0],
				frCounter,
				unifyVar,
			);
		case "attribute": {
			const [obj1, objTerms, fr0] = expressionToAstFRESH(
				node.children[0],
				frCounter,
			);
			const attr = node.children[2].text;
			const [val, fr0Plus] = toExprIdent(unifyVar, fr0);
			return [
				val,
				[
					...objTerms,
					set_key_of(obj1, make_literal_ast(attr), val),
				],
				fr0Plus,
			];
		}
		case "binary_operator": {
			const [aaa, aaTerms, frC2] = expressionToAstFRESH(
				node.children[0],
				frCounter,
				unifyVar,
			);
			const op = node.children[1].text;
			const [bbb, bbTerms, frC3] = expressionToAstFRESH(
				node.children[2],
				frC2,
				unifyVar,
			);
			const [val, frC3Plus] = toExprIdent(unifyVar, frC3);
			return [
				val,
				[
					...aaTerms,
					...bbTerms,
					operate(op, aaa, bbb, val),
				],
				frC3Plus,
			];
		}
		case "unary_operator": {
			const [aaa, aaTerms, frC2] = expressionToAstFRESH(
				node.children[1],
				frCounter,
				unifyVar,
			);
			const op = node.children[0].text;
			const [val, frC2Plus] = toExprIdent(unifyVar, frC2);
			return [
				val,
				[...aaTerms, unary_operate(op, aaa, val)],
				frC2Plus,
			];
		}
		case "list": {
			const listVals = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const [lst1, lstterms, ntt] = listValsToList(
				listVals,
				frCounter,
				unifyVar,
			);
			if (lst1 === undefined) {
				throw new Error("lst1 is undefined");
			}
			if (lstterms === undefined) {
				throw new Error("lstterms is undefined");
			}
			return [lst1, lstterms, ntt];
		}
		case "dictionary": {
			const listValsDict = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const [objv, fr3] = toExprIdent(unifyVar, frCounter);
			type ReductionType = [
				[ExpressionDsAst, ExpressionDsAst][],
				TermDsAst[],
				number,
			];
			const [lvd, lvdterms, fr4] =
				listValsDict.reduce<ReductionType>(
					(acc, nc) => {
						const [accKeyvals, accTerms, accFr] = acc;
						const [key, keyTerms, afr2] =
							expressionToAstFRESH(nc.children[0], accFr);
						const [val, valTerms, afr3] =
							expressionToAstFRESH(nc.children[2], afr2);
						return [
							accKeyvals.concat([[key, val]]),
							[...accTerms, ...keyTerms, ...valTerms],
							afr3,
						];
					},
					[
						[] as [ExpressionDsAst, ExpressionDsAst][],
						[] as TermDsAst[],
						fr3,
					] as const,
				);
			const dsta = objv;
			const dsterms = [
				...lvdterms,
				...lvd.map(([key, val]) =>
					set_key_of(objv, key, val),
				),
			];
			return [dsta, dsterms, fr4];
		}
		case "string":
			return [
				make_literal_ast(node.text.slice(1, -1)),
				[],
				frCounter,
			];
		case "number":
			return [
				make_literal_ast(Number.parseInt(node.text, 10)),
				[],
				frCounter,
			];
		case "slice": {
			const [obj1, objTerms, frCounter2] =
				expressionToAstFRESH(node.children[0], frCounter);
			const attr = node.children[2].text;
			const [val, frCounter2Plus] = toExprIdent(
				unifyVar,
				frCounter2,
			);
			return [
				val,
				[
					...objTerms,
					to_slice(obj1, make_literal_ast(attr), val),
				],
				frCounter2Plus,
			];
		}
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

const isT1 =
	<A, B>(bCheck: (b: B | A | undefined) => b is B) =>
	(rmN: [A[], B] | A[]): rmN is [A[], B] => {
		// return Array.isArray(v);
		return (
			Array.isArray(rmN) &&
			rmN.length === 2 &&
			bCheck(rmN[1])
		);
	};

// function foldF1<A>(
// 	ls: [A, number][],
// 	fn: (v: A, n: number) => ([A[], number] | A[]),
// ): [A[], number] {
// 	return ls.reduce<[A[], number]>(
// 		(acc, [v, n]) => {
// 			const rmN = fn(v, n);
// 			if (isT1(bb => typeof bb === 'number')(rmN)) {
// 				return [acc[0].concat(rmN[0]), rmN[1]];
// 			} else {
// 				return [acc[0].concat(rmN), acc[1]];
// 			}
// 		},
// 		[[], 0],
// 	);
// }

function foldF2<A, B>(
	ls: A[],
	fn: (v: A, b: B) => [A[], B] | A[],
	b: B,
	checkB: (v: [A[], B] | A[]) => v is [A[], B],
): [A[], B] {
	return ls.reduce<[A[], B]>(
		([opt, acc], v) => {
			const rmN = fn(v, acc);
			if (checkB(rmN)) {
				return [opt.concat(rmN[0]), rmN[1]];
			} else {
				return [opt.concat(rmN), acc];
			}
		},
		[[], b],
	);
}

function foldF3<A, B, C>(
	ls: A[],
	fn: (v: A, b: B) => [C[], B] | C[],
	b: B,
	checkB: (v: [C[], B] | C[]) => v is [C[], B],
): [C[], B] {
	return ls.reduce<[C[], B]>(
		([opt, acc], v) => {
			const rmN = fn(v, acc);
			if (checkB(rmN)) {
				return [opt.concat(rmN[0]), rmN[1]];
			} else {
				return [opt.concat(rmN), acc];
			}
		},
		[[], b],
	);
}

function foldF4<A, B, C, D>(
	ls: A[],
	fn: (v: A, b: B) => C,
	remap1: (d: D) => B,
	merge: (d1: C, d2: D) => D,
	d: D,
): D {
	return ls.reduceRight<D>((dacc, dcurr) => {
		const c = fn(dcurr, remap1(dacc));
		return merge(c, dacc);
	}, d);
}

const commonFold = (
	ls: Parser.SyntaxNode[],
	fn: (
		a: Parser.SyntaxNode,
		b: [ExpressionDsAst, number],
	) => FullExpression,
	ez: FullExpression,
): FullExpression => {
	return foldF4<
		Parser.SyntaxNode,
		[ExpressionDsAst, number],
		FlexExpression,
		FullExpression
	>(
		ls,
		fn,
		([dE, _, dN]) => [dE, dN],
		(c, d) => {
			if (Array.isArray(c)) {
				if (c.length === 3) {
					return [c[0], c[1].concat(d[1]), c[2]];
				} else {
					return [c[0], c[1], d[2]];
				}
			} else {
				return [c, d[1], d[2]];
			}
		},
		// ([a, b, c], [d, e, f]) => [a, b.concat(e), c],
		ez,
	);
};
const numSelector = <BB>(
	zz: BB | number | undefined,
): zz is number => typeof zz === "number";
const isT1Main = <A>() => isT1<A, number>(numSelector<A>);

function listValsToList(
	listVals: Parser.SyntaxNode[],
	frCounter1: number,
	unifyVar?: IdentifierDsAst,
): FullExpression {
	const containsSplats = listVals.some(
		(nnc) => nnc.grammarType === "splat",
	);
	// const listI = unifyVar ?? freshLvar2(frCounter);
	const [listI, frCounter] = toExprIdent(
		unifyVar,
		frCounter1,
	);
	if (containsSplats) {
		// if the splat is the last item, return conso(...<each item>, <splatvar>, <list>)
		const splatIsLast =
			listVals[listVals.length - 1].grammarType === "splat";
		const remainingNotSplats = listVals
			.slice(0, -1)
			.every((z) => z.grammarType !== "splat");
		if (splatIsLast && remainingNotSplats) {
			// const expressions = listVals.slice(0, -1).map((nc) =>
			// 	expressionToAstFRESH(nc, frCounter, unifyVar)
			// );
			const [expressions, fx2] = foldF3<
				Parser.SyntaxNode,
				number,
				Expression
			>(
				listVals.slice(0, -1),
				(v, n): [Expression[], number] => {
					const [ff1, ts, n1] = expressionToAstFRESH(v, n);
					// const nvv = ezmake.cons(freshLvar2(n1), ff1, ts);
					return [[[ff1, ts]], n1] as const;
				},
				frCounter,
				isT1Main(),
			);
			const splatVar = expressionToAstFRESH(
				listVals[listVals.length - 1].children[1],
				fx2,
			);
			return expressions.reduce(
				(acc, nc) =>
					ezmake.cons(freshLvar2(acc[2] + 1), nc, [
						acc[0],
						acc[1],
						acc[2] + 1,
					]),
				splatVar,
			);
		} else {
			// if not, recursively set internal_append(<list>, <splat>, listValsToList(rest))
			const startList = freshLvar2(frCounter);
			const [startE, stt] = ezmake.empty(startList);
			const [sc1, sc2, sc3] = commonFold(
				listVals,
				(nnc, [v1, acc]) => {
					if (nnc.grammarType === "splat") {
						const splatVar = expressionToAstFRESH(
							nnc.children[1],
							acc,
						);
						const [splatOut, frCounterOut] = toExprIdent(
							undefined,
							splatVar[2],
						);
						return ezmake.append(
							splatOut,
							[splatVar[0], splatVar[1], frCounterOut],
							[v1, []],
						);
					}
					const [ff1, ts, n1] = expressionToAstFRESH(
						nnc,
						acc,
					);
					const [consOut, frCounterOut] = toExprIdent(
						undefined,
						n1,
					);
					return ezmake.cons(
						consOut,
						[ff1, ts],
						[v1, [], frCounterOut],
					);
				},
				[startE, stt, frCounter + 1],
			);
			return [sc1, sc2, sc3];
		}
	}
	const [expressions, fx2] = foldF3<
		Parser.SyntaxNode,
		number,
		Expression
	>(
		listVals,
		(v, n): [Expression[], number] => {
			const [ff1, ts, n1] = expressionToAstFRESH(v, n);
			return [[[ff1, ts]], n1] as const;
		},
		frCounter,
		isT1Main(),
	);
	const ml1 = make_list_ast(listI, expressions);
	return [ml1[0], ml1[1], fx2];
}

function handleEmptyCompoundLogic(
	selectedNode1: Parser.SyntaxNode,
	node: Parser.SyntaxNode,
) {
	let selectedNode = selectedNode1;
	if (filterEmptyCompoundLogic(selectedNode) === false) {
		warnHolder(
			"Empty compound logic",
			selectedNode.type,
			selectedNode.text,
		);
		selectedNode = node.children.find(
			(nnc) => nnc.grammarType === "block",
		) as Parser.SyntaxNode;
		debugHolder("selectedNode", selectedNode.grammarType);
	}
	const argsListApplication = selectedNode.children;
	debugHolder(
		"argsListApplication",
		argsListApplication.map((nnc) => nnc.grammarType),
	);
	return selectedNode;
}

export function codeToAst(
	code: string,
	pprint = false,
): TermDsAst[] {
	const tree = parser.parse(code);
	debugHolder("PARSE", tree.rootNode.toString());
	const astn = toAst(tree.rootNode);
	if (pprint) {
		console.log("ASTN", pprintDsAst(astn));
	}
	// debugHolder("Linearized--------------------------");
	// debugHolder(pprintDsAst(linearize(astn)));
	// debugHolder("Freshened--------------------------");
	// debugHolder(pprintDsAst(freshenTerms(astn)));
	// debugHolder("Typed--------------------------");
	// debugHolder(pprintTermT(toBasicTypes(astn)));
	// passed through
	// const passedThrough = toBasicTypes(astn);
	// debugHolder("linear:::::::::::::::::::::::::", verifyLinear(passedThrough));
	debugHolder("Passed through--------------------------");
	// debugHolder(pprintTermT(passedThrough));
	return astn;
}
