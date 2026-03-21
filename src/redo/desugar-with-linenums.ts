// import { Term, Expression, Conjunction } from "src/types/OldAstTyped";
// import { make_unification, make_predicate, make_conjunction, make_disjunction, make_predicate_fn, make_lvar_ast, make_attribute_ast, make_list_ast, make_dictionary_ast, make_literal_ast } from "src/utils/make_unification";
import Parser from "tree-sitter";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import type {
	TermGeneric,
	ExpressionGeneric,
	IdentifierGeneric,
	PredicateDefinitionGeneric,
	WithGeneric,
	PredicateCallGeneric,
} from "src/types/AstGeneric";
import {
	conjunction1,
	disjunction1,
	ezmakeMaker,
	make,
	operate,
	set_key_of,
	to_slice,
	unary_operate,
} from "src/utils/make_better_typed";
import { warnHolder, debugHolder } from "src/warnHolder";
import { expressionToAstEffect } from "./desugar-expr-effect";
import {
	type ExprFresh,
	allocSynthIdSync,
	mergeSynthIds,
	runExpressionDesugarSync,
} from "./desugar-fr";
import {
	type CodeLocation,
	defaultCodeLocation,
	tocloc,
	mergecloc,
} from "./codeloc";

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

const ezmake = ezmakeMaker<CodeLocation>(
	defaultCodeLocation,
);

const make_fresh = make.fresh;
const make_identifier = make.identifier;
const make_literal_ast = make.literal_ast;
const make_predicate = make.predicate;
const make_predicate_fn = make.predicate_fn;
const make_unification = make.unification;

/** Bind desugar-generated logic vars with non-nominal `fresh` so the interpreter env is consistent. */
function scopeSynthFresh(
	ids: readonly IdentifierGeneric<CodeLocation>[],
	terms: TermGeneric<CodeLocation>[],
): TermGeneric<CodeLocation>[] {
	if (ids.length === 0) {
		return terms;
	}
	return [
		make_fresh([...ids], conjunction1(...terms), false),
	];
}

export function toAst(
	node: Parser.SyntaxNode,
): TermGeneric<CodeLocation>[] {
	return toAst1(node, 0)[0];
}

export function toAst1(
	node: Parser.SyntaxNode,
	frCounter: number,
): [TermGeneric<CodeLocation>[], number] {
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
			const [a1, a1terms, frCounter2, a1Synth] =
				expressionToAstFRESH(
					node.childForFieldName("lhs"),
					frCounter,
				);
			const [b1, b1terms, frCounter5, b1Synth] =
				expressionOrPredicateDefinitionToAst(
					node.childForFieldName("rhs"),
					frCounter2,
					a1.type === "identifier" ? a1 : undefined,
				);
			const [b2, b2terms, frCounter3, b2Synth] =
				expressionOrPredicateDefinitionToAst(
					node.childForFieldName("rhs"),
					frCounter,
				);
			const [a2, a2terms, frCounter4, a2Synth] =
				expressionToAstFRESH(
					node.childForFieldName("lhs"),
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

			const [
				a,
				aterms,
				b,
				bterms,
				frCounter6,
				mergedSynth,
			] =
				length1 <= length2
					? [
							a1,
							a1terms,
							b1,
							b1terms,
							frCounter5,
							mergeSynthIds(a1Synth, b1Synth),
						]
					: [
							a2,
							a2terms,
							b2,
							b2terms,
							frCounter4,
							mergeSynthIds(a2Synth, b2Synth),
						];
			if (b.type === "predicate_definition") {
				if (a.type !== "identifier") {
					throw new Error(
						"Source of predicate must be an identifier",
					);
				}
				const predDefTerms: TermGeneric<CodeLocation>[] = [
					...aterms,
					{ ...b, name: a },
				];
				return [
					scopeSynthFresh(mergedSynth, predDefTerms),
					frCounter6,
				];
			}
			const unifT = isSameIdentifier(a, b)
				? []
				: make_unification(a, k, b, tocloc(node))[1];
			const bodyTerms = [...aterms, ...bterms, ...unifT];
			return [
				scopeSynthFresh(mergedSynth, bodyTerms),
				frCounter6,
			];
		}
		case "predicate": {
			const [aterms, , frCounter2] = extractPredicate(
				node,
				frCounter,
				true,
			);
			return [aterms, frCounter2];
		}
		case "for_control_statement": {
			const [c, cterms, fr1, cSynth] = expressionToAstFRESH(
				node.children[2],
				frCounter,
			);
			const [d, dterms, fr3, dSynth] = expressionToAstFRESH(
				node.children[4],
				fr1,
			);
			return [
				scopeSynthFresh(mergeSynthIds(cSynth, dSynth), [
					...cterms,
					...dterms,
				]),
				fr3,
			];
		}
		// With statement
		case "with_statement": {
			const [aterms, predicate, frCounter2] =
				extractPredicate(
					node.children[1],
					frCounter,
					false,
				);
			const [b, frCounter3] = buildCompoundLogic(
				node.children[3],
				"conjunction",
				frCounter2,
			);
			return [
				[
					...aterms,
					{
						type: "with",
						name: predicate,
						body: conjunction1(...b),
					},
				],
				frCounter3,
			];
		}
		// When statement (turns into a subvariety of with statements)
		case "when_statement": {
			const [aterms, predicate, frCounter2] =
				extractPredicate(
					node.children[1],
					frCounter,
					false,
				);
			const [b, frCounter3] = buildCompoundLogic(
				node.children[3],
				"conjunction",
				frCounter2,
			);
			return [
				[
					...aterms,
					{
						type: "with",
						name: predicate,
						body: conjunction1(...b),
					},
				],
				frCounter3,
			];
		}
		// Data statement
		case "data_statement": {
			const [c, cterms, fr1, cSynth] = expressionToAstFRESH(
				node.children[1],
				frCounter,
			);
			const [b, frCounter3] = buildCompoundLogic(
				node.children[3],
				"conjunction",
				fr1,
			);
			const dataWith = make_predicate(
				make_identifier(tocloc(node), "data_generator"),
				[c],
			);
			const inner: TermGeneric<CodeLocation>[] = [
				...cterms,
				{
					type: "with",
					name: dataWith,
					body: conjunction1(...b),
				},
			];
			return [scopeSynthFresh(cSynth, inner), frCounter3];
		}

		case "fresh_statement": {
			const ids = node.children.filter(
				(nc) => nc.grammarType === "identifier",
			);
			const allIds = ids.map((nc) =>
				make_identifier(tocloc(nc), nc.text),
			);
			const block = node.children[node.children.length - 1];
			const [blockTerms, fr2] = block.children.reduce<
				[TermGeneric<CodeLocation>[], number]
			>(
				(acc, nc) => {
					const [newTerms, newFr] = toAst1(nc, acc[1]);
					return [acc[0].concat(newTerms), newFr];
				},
				[[], frCounter],
			);
			return [
				[
					make_fresh(
						allIds,
						conjunction1(...blockTerms),
						node.children[1].text === "nominal",
					),
				],
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

function extractPredicate(
	node: Parser.SyntaxNode,
	frCounter: number,
	embedPredInScope: boolean,
): [
	TermGeneric<CodeLocation>[],
	PredicateCallGeneric<CodeLocation>,
	number,
] {
	const argActual = node.children[1];
	const arglist = argActual.children.slice(1, -1);
	const [allArgs, frCounter2, argsSynth] = arglist
		.filter((nnc) => nnc.grammarType !== ",")
		.reduce<
			[
				[
					ExpressionGeneric<CodeLocation>,
					TermGeneric<CodeLocation>[],
				][],
				number,
				IdentifierGeneric<CodeLocation>[],
			]
		>(
			(acc, nc) => {
				const [arg, argTerms, frPlus, sy] =
					expressionToAstFRESH(nc, acc[1]);
				return [
					acc[0].concat([[arg, argTerms]]),
					frPlus,
					mergeSynthIds(acc[2], sy),
				];
			},
			[
				[],
				frCounter,
				[] as IdentifierGeneric<CodeLocation>[],
			],
		);
	const [source, sourceTerms, frCounter3, srcSynth] =
		expressionToAstFRESH(node.children[0], frCounter2);
	if (source.type !== "identifier") {
		throw new Error(
			"Source of predicate must be an identifier",
		);
	}
	const allArgs2 = allArgs.flatMap((aa) => aa[1]);
	for (const aa of allArgs2) {
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
	const mergedSynth = mergeSynthIds(argsSynth, srcSynth);
	const pred = make_predicate(
		source,
		allArgs.map((aa) => aa[0]),
	);
	const innerTerms: TermGeneric<CodeLocation>[] =
		embedPredInScope
			? [...allArgs2, ...sourceTerms, pred]
			: [...allArgs2, ...sourceTerms];
	return [
		scopeSynthFresh(mergedSynth, innerTerms),
		pred,
		frCounter3,
	];
}

function isSameIdentifier(
	a: ExpressionGeneric<CodeLocation>,
	b:
		| ExpressionGeneric<CodeLocation>
		| PredicateDefinitionGeneric<CodeLocation>,
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
): [TermGeneric<CodeLocation>[], number] {
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
		.reduce<[TermGeneric<CodeLocation>[], number]>(
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

function expressionOrPredicateDefinitionToAst(
	node: Parser.SyntaxNode | null,
	frCounter: number,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): [
	(
		| ExpressionGeneric<CodeLocation>
		| PredicateDefinitionGeneric<CodeLocation>
	),
	TermGeneric<CodeLocation>[],
	number,
	readonly IdentifierGeneric<CodeLocation>[],
] {
	if (node === null) {
		throw new Error("Node is null");
	}
	switch (node.type) {
		case "predicate_definition": {
			const argsList = node.children
				.slice(1, -3)
				.filter((nnc) => nnc.grammarType !== ",");
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
			const [frshName, nAfter, nameSynth] = allocSynthIdSync(
				unifyVar,
				n,
			);
			const pt = make_predicate_fn(
				frshName,
				argsList
					.filter((ddf) => ddf.grammarType !== ",")
					.map((nnc) =>
						make_identifier(tocloc(nnc), nnc.text),
					),
				conjunction1(...freshTerm),
			);
			return [pt, [], nAfter, nameSynth];
		}
		default: {
			const [c1, c2, c3, c4] = expressionToAstFRESH(
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
			return [c1, c2, c3, c4];
		}
	}
}

/** Outer entry: one `runExpressionDesugarSync` per source expression (unify arm, `for_control`, etc.). */
function expressionToAstFRESH(
	node1: Parser.SyntaxNode | null | undefined,
	frCounter: number,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): ExprFresh {
	if (node1 === undefined || node1 === null) {
		throw new Error("Node is undefined");
	}
	return runExpressionDesugarSync(
		frCounter,
		expressionToAstEffect(node1, unifyVar),
	);
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
): TermGeneric<CodeLocation>[] {
	const tree = parser.parse(code);
	debugHolder("PARSE", tree.rootNode.toString());
	const astn = toAst(tree.rootNode);
	if (pprint) {
		// console.log("ASTN", pprintDsAst(astn));
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
