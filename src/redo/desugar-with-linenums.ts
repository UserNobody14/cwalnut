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
import {
	type CodeLocation,
	defaultCodeLocation,
	tocloc,
	mergecloc,
	mergeClocs,
} from "./codeloc";

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

type Expression = [
	ExpressionGeneric<CodeLocation>,
	TermGeneric<CodeLocation>[],
];

/** Expression desugar result: support terms, next fr counter, synthetic ids (allocation order). */
type ExprFresh = [
	ExpressionGeneric<CodeLocation>,
	TermGeneric<CodeLocation>[],
	number,
	readonly IdentifierGeneric<CodeLocation>[],
];

type SynthIdChunk = readonly IdentifierGeneric<CodeLocation>[];

function mergeSynthIds(
	...parts: SynthIdChunk[]
): IdentifierGeneric<CodeLocation>[] {
	const seen = new Set<string>();
	const out: IdentifierGeneric<CodeLocation>[] = [];
	for (const part of parts) {
		for (const id of part) {
			if (!seen.has(id.value)) {
				seen.add(id.value);
				out.push(id);
			}
		}
	}
	return out;
}

const ezmake = ezmakeMaker<CodeLocation>(
	defaultCodeLocation,
);

const make_fresh = make.fresh;
const make_identifier = make.identifier;
const make_list_ast = make.list_ast;
const make_literal_ast = make.literal_ast;
const make_predicate = make.predicate;
const make_predicate_fn = make.predicate_fn;
const make_unification = make.unification;

/** Reserved prefix: user code must not bind `__fresh_*` names. */
function freshLvar2(
	frCounter: number,
): IdentifierGeneric<CodeLocation> {
	return make_identifier(
		defaultCodeLocation,
		`__fresh_${frCounter}`,
	);
}

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

/** Allocate a synthetic id only when no unify slot was supplied (pure). */
function allocSynthId(
	unifyVar: IdentifierGeneric<CodeLocation> | undefined,
	fr: number,
): [
	IdentifierGeneric<CodeLocation>,
	number,
	readonly IdentifierGeneric<CodeLocation>[],
] {
	if (unifyVar !== undefined) {
		return [unifyVar, fr, []];
	}
	const id = freshLvar2(fr);
	return [id, fr + 1, [id]];
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
			const [frshName, nAfter, nameSynth] = allocSynthId(
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

function expressionToAstFRESH(
	node1: Parser.SyntaxNode | null | undefined,
	frCounter: number,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): ExprFresh {
	if (node1 === undefined || node1 === null) {
		throw new Error("Node is undefined");
	}
	const node = node1;
	switch (node.type) {
		case "keyword_identifier":
		case "identifier":
			return [
				make_identifier(tocloc(node), node.text),
				[],
				frCounter,
				[],
			];
		case "destructuring_expression":
			console.debug(
				`Destructuring expression: ${node.text}`,
			);
			return expressionToAstFRESH(
				node.children[0],
				frCounter,
				unifyVar,
			);

		case "predicate_expression":
		case "predicate": {
			const [freshVar, frCounter2, headSynth] =
				allocSynthId(unifyVar, frCounter);
			const argActual = node.children[1];
			const arglist = argActual.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const [allArgs, frCounter3, argsSynth] =
				arglist.reduce<
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
							expressionToAstFRESH(nc, acc[1], unifyVar);
						return [
							acc[0].concat([[arg, argTerms]]),
							frPlus,
							mergeSynthIds(acc[2], sy),
						];
					},
					[
						[],
						frCounter2,
						[] as IdentifierGeneric<CodeLocation>[],
					],
				);
			const [source, sourceTerms, frCounter4, srcSynth] =
				expressionToAstFRESH(
					node.children[0],
					frCounter3,
					unifyVar,
				);
			if (source.type !== "identifier") {
				throw new Error(
					"Source of predicate must be an identifier",
				);
			}
			const predicateArgs = [
				freshVar,
				...allArgs.map((aa) => aa[0]),
			];
			const predicateTerm = make_predicate(
				source,
				predicateArgs,
			);
			return [
				freshVar,
				[
					...allArgs.flatMap((aa) => aa[1]),
					...sourceTerms,
					predicateTerm,
				],
				frCounter4,
				mergeSynthIds(headSynth, argsSynth, srcSynth),
			];
		}
		case "expression":
		case "primary_expression":
			return expressionToAstFRESH(
				node.children[0],
				frCounter,
				unifyVar,
			);
		case "attribute": {
			const [obj1, objTerms, fr0, objSynth] =
				expressionToAstFRESH(node.children[0], frCounter);
			const attr = node.children[2].text;
			const [val, fr0Plus, valSynth] = allocSynthId(
				unifyVar,
				fr0,
			);
			const attrAst = make_literal_ast("string", attr);
			return [
				val,
				[
					...objTerms,
					set_key_of(tocloc(node), obj1, attrAst, val),
				],
				fr0Plus,
				mergeSynthIds(objSynth, valSynth),
			];
		}
		case "binary_operator": {
			const [aaa, aaTerms, frC2, aaSynth] =
				expressionToAstFRESH(
					node.children[0],
					frCounter,
					unifyVar,
				);
			const op = node.children[1].text;
			const [bbb, bbTerms, frC3, bbSynth] =
				expressionToAstFRESH(
					node.children[2],
					frC2,
					unifyVar,
				);
			const [val, frC3Plus, valSynth] = allocSynthId(
				unifyVar,
				frC3,
			);
			return [
				val,
				[
					...aaTerms,
					...bbTerms,
					operate(op, aaa, bbb, val, tocloc(node)),
				],
				frC3Plus,
				mergeSynthIds(aaSynth, bbSynth, valSynth),
			];
		}
		case "unary_operator": {
			const [aaa, aaTerms, frC2, aaSynth] =
				expressionToAstFRESH(
					node.children[1],
					frCounter,
					unifyVar,
				);
			const op = node.children[0].text;
			const [val, frC2Plus, valSynth] = allocSynthId(
				unifyVar,
				frC2,
			);
			return [
				val,
				[
					...aaTerms,
					unary_operate(op, aaa, val, tocloc(node)),
				],
				frC2Plus,
				mergeSynthIds(aaSynth, valSynth),
			];
		}
		case "list": {
			const listVals = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const [lst1, lstterms, ntt, lsynth] = listValsToList(
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
			return [lst1, lstterms, ntt, lsynth];
		}
		case "dictionary": {
			const listValsDict = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const [objv, fr3, objSynth] = allocSynthId(
				unifyVar,
				frCounter,
			);
			type ReductionType = [
				[
					ExpressionGeneric<CodeLocation>,
					ExpressionGeneric<CodeLocation>,
					CodeLocation,
				][],
				TermGeneric<CodeLocation>[],
				number,
				IdentifierGeneric<CodeLocation>[],
			];
			const [lvd, lvdterms, fr4, entrySynth] =
				listValsDict.reduce<ReductionType>(
					(acc, nc) => {
						const [accKeyvals, accTerms, accFr, accSy] =
							acc;
						const [key, keyTerms, afr2, ksy] =
							expressionToAstFRESH(nc.children[0], accFr);
						const [val, valTerms, afr3, vsy] =
							expressionToAstFRESH(nc.children[2], afr2);
						return [
							accKeyvals.concat([
								[
									key,
									val,
									mergecloc(
										tocloc(nc.children[0]),
										tocloc(nc.children[2]),
									),
								],
							]),
							[...accTerms, ...keyTerms, ...valTerms],
							afr3,
							mergeSynthIds(accSy, ksy, vsy),
						];
					},
					[
						[] as [
							ExpressionGeneric<CodeLocation>,
							ExpressionGeneric<CodeLocation>,
							CodeLocation,
						][],
						[] as TermGeneric<CodeLocation>[],
						fr3,
						[] as IdentifierGeneric<CodeLocation>[],
					] as const,
				);
			const dsterms = [
				...lvdterms,
				...lvd.map(([key, val, cl]) =>
					set_key_of(cl, objv, key, val),
				),
			];
			return [
				objv,
				dsterms,
				fr4,
				mergeSynthIds(objSynth, entrySynth),
			];
		}
		case "string":
			return [
				make_literal_ast("string", node.text.slice(1, -1)),
				[],
				frCounter,
				[],
			];
		case "number":
			return [
				make_literal_ast(
					"number",
					Number.parseInt(node.text, 10).toString(),
				),
				[],
				frCounter,
				[],
			];
		case "slice": {
			const [obj1, objTerms, frCounter2, oSynth] =
				expressionToAstFRESH(node.children[0], frCounter);
			const attr = node.children[2].text;
			const [val, frCounter2Plus, vSynth] = allocSynthId(
				unifyVar,
				frCounter2,
			);
			return [
				val,
				[
					...objTerms,
					to_slice(
						tocloc(node),
						obj1,
						make_literal_ast("string", attr),
						val,
					),
				],
				frCounter2Plus,
				mergeSynthIds(oSynth, vSynth),
			];
		}
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

function listValsToList(
	listVals: Parser.SyntaxNode[],
	frCounter1: number,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): ExprFresh {
	const containsSplats = listVals.some(
		(nnc) => nnc.grammarType === "splat",
	);
	const [listI, frAfterListI, listISynth] = allocSynthId(
		unifyVar,
		frCounter1,
	);
	if (containsSplats) {
		const splatIsLast =
			listVals[listVals.length - 1].grammarType === "splat";
		const remainingNotSplats = listVals
			.slice(0, -1)
			.every((z) => z.grammarType !== "splat");
		if (splatIsLast && remainingNotSplats) {
			let fr = frAfterListI;
			let elemSynth = mergeSynthIds(listISynth, []);
			const pairs: Expression[] = [];
			for (const v of listVals.slice(0, -1)) {
				const [ff1, ts, n1, sy] = expressionToAstFRESH(
					v,
					fr,
				);
				fr = n1;
				pairs.push([ff1, ts]);
				elemSynth = mergeSynthIds(elemSynth, sy);
			}
			const splatVar = expressionToAstFRESH(
				listVals[listVals.length - 1].children[1],
				fr,
			);
			let accSynth = mergeSynthIds(elemSynth, splatVar[3]);
			let accE = splatVar[0];
			let accT = splatVar[1];
			let accFr = splatVar[2];
			for (const nc of pairs) {
				const stepFr = accFr + 1;
				const cellId = freshLvar2(stepFr);
				const [outE, outT, outFr] = ezmake.cons(
					cellId,
					nc,
					[accE, accT, stepFr],
				);
				accE = outE;
				accT = outT;
				accFr = outFr;
				accSynth = mergeSynthIds(accSynth, [cellId]);
			}
			return [accE, accT, accFr, accSynth];
		}
		const startListId = freshLvar2(frAfterListI);
		const frStart = frAfterListI + 1;
		let curSynth = mergeSynthIds(listISynth, [startListId]);
		const [startE, stt] = ezmake.empty(startListId);
		let curE = startE;
		let curT = stt;
		let curFr = frStart;
		for (const nnc of listVals) {
			if (nnc.grammarType === "splat") {
				const [svE, svT, svFr, svSy] = expressionToAstFRESH(
					nnc.children[1],
					curFr,
				);
				const [splatOut, frAfterSplat, splatSy] =
					allocSynthId(undefined, svFr);
				curSynth = mergeSynthIds(curSynth, svSy, splatSy);
				const [outE, outT, outFr] = ezmake.append(
					splatOut,
					[svE, svT, frAfterSplat],
					[curE, curT],
				);
				curE = outE;
				curT = outT;
				curFr = outFr;
			} else {
				const [ff1, ts, n1, sy] = expressionToAstFRESH(
					nnc,
					curFr,
				);
				const [consOut, cnFr, cnSy] = allocSynthId(
					undefined,
					n1,
				);
				curSynth = mergeSynthIds(curSynth, sy, cnSy);
				const [outE, outT, outFr] = ezmake.cons(
					consOut,
					[ff1, ts],
					[curE, curT, cnFr],
				);
				curE = outE;
				curT = outT;
				curFr = outFr;
			}
		}
		return [curE, curT, curFr, curSynth];
	}
	let fr = frAfterListI;
	let elemSynth = mergeSynthIds(listISynth, []);
	const expressions: Expression[] = [];
	for (const v of listVals) {
		const [ff1, ts, n1, sy] = expressionToAstFRESH(v, fr);
		fr = n1;
		expressions.push([ff1, ts]);
		elemSynth = mergeSynthIds(elemSynth, sy);
	}
	const ml1 = make_list_ast(
		listI,
		expressions,
		mergeClocs(listVals.map((e) => tocloc(e))),
	);
	return [ml1[0], ml1[1], fr, elemSynth];
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
