/**
 * Tree-sitter → AST: compound statements use {@link toAst1Effect} with {@link FrCounter}
 * (same pattern as {@link parseExpr} in desugar-expr-effect). Expression sub-lowering goes
 * through {@link runExpressionDesugarEffect}, which delegates to {@link runExpressionDesugarSync}
 * so fresh-name numbering matches the legacy tuple-threaded API.
 */
import { Effect, Ref } from "effect";
import Parser from "tree-sitter";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import type {
	TermGeneric,
	ExpressionGeneric,
	IdentifierGeneric,
	PredicateDefinitionGeneric,
	PredicateCallGeneric,
} from "src/types/AstGeneric";
import { conjunction1, disjunction1, make } from "src/utils/make_better_typed";
import { warnHolder, debugHolder } from "src/warnHolder";
import { parseExpr } from "./desugar-expr-effect";
import {
	FrCounter,
	allocFrCounterSlotEffect,
	mergeSynthIds,
	runExpressionDesugarEffect,
	runWithFrCounterSync,
} from "./desugar-fr";
import { type CodeLocation, tocloc } from "./codeloc";

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

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
	return runWithFrCounterSync(frCounter, toAst1Effect(node));
}

/** Statement / compound-logic desugar: fresh counter lives in {@link FrCounter}. */
function toAst1Effect(
	node: Parser.SyntaxNode,
): Effect.Effect<TermGeneric<CodeLocation>[], never, FrCounter> {
	if (filterEmptyCompoundLogic(node) === false) {
		warnHolder(
			"Empty compound logic",
			node.type,
			node.text,
		);
	}
	switch (node.type) {
		case "module":
			return buildCompoundLogicEffect(node, "conjunction");
		case "either_statement":
			logEmptyCompoundLogic(node);
			return buildCompoundLogicEffect(node.children[2], "disjunction");
		case "all_statement":
			logEmptyCompoundLogic(node);
			return buildCompoundLogicEffect(node.children[2], "conjunction");
		case "unification":
			return unificationToAstEffect(node);
		case "predicate":
			return Effect.map(
				extractPredicateEffect(node, true),
				([terms]) => terms,
			);
		case "for_control_statement":
			return Effect.gen(function* () {
				const [c, cterms, cSynth] = yield* runExpressionDesugarEffect(
					parseExpr(node.children[2]),
				);
				const [d, dterms, dSynth] = yield* runExpressionDesugarEffect(
					parseExpr(node.children[4]),
				);
				return scopeSynthFresh(mergeSynthIds(cSynth, dSynth), [
					...cterms,
					...dterms,
				]);
			});
		case "with_statement":
			return withOrWhenStatementEffect(node.children[1], node.children[3]);
		case "when_statement":
			return withOrWhenStatementEffect(node.children[1], node.children[3]);
		case "data_statement":
			return Effect.gen(function* () {
				const [c, cterms, cSynth] = yield* runExpressionDesugarEffect(
					parseExpr(node.children[1]),
				);
				const b = yield* buildCompoundLogicEffect(
					node.children[3],
					"conjunction",
				);
				const dataWith = make_predicate(
					make_identifier(tocloc(node), "data_generator"),
					[c],
				);
				return scopeSynthFresh(cSynth, [
					...cterms,
					{
						type: "with",
						name: dataWith,
						body: conjunction1(...b),
					},
				]);
			});
		case "fresh_statement":
			return Effect.gen(function* () {
				const ids = node.children.filter(
					(nc) => nc.grammarType === "identifier",
				);
				const allIds = ids.map((nc) =>
					make_identifier(tocloc(nc), nc.text),
				);
				const block = node.children[node.children.length - 1];
				let blockTerms: TermGeneric<CodeLocation>[] = [];
				for (const nc of block.children) {
					blockTerms = blockTerms.concat(yield* toAst1Effect(nc));
				}
				return [
					make_fresh(
						allIds,
						conjunction1(...blockTerms),
						node.children[1].text === "nominal",
					),
				];
			});
		case "comment":
			return Effect.succeed([]);
		case "statement_binary_operator":
			return Effect.gen(function* () {
				const a = yield* toAst1Effect(node.children[0]);
				const op = node.children[1].text;
				const b = yield* toAst1Effect(node.children[2]);
				if (op === "and") {
					return [conjunction1(...a, ...b)];
				}
				if (op === "or") {
					return [disjunction1(...a, ...b)];
				}
				throw new Error(`Unknown operator: ${op}`);
			});
		default:
			return Effect.die(
				new Error(`Unrecognized node type: ${node.type}`),
			);
	}
}

function withOrWhenStatementEffect(
	predicateNode: Parser.SyntaxNode,
	bodyNode: Parser.SyntaxNode,
): Effect.Effect<TermGeneric<CodeLocation>[], never, FrCounter> {
	return Effect.gen(function* () {
		const [aterms, predicate] = yield* extractPredicateEffect(
			predicateNode,
			false,
		);
		const b = yield* buildCompoundLogicEffect(bodyNode, "conjunction");
		return [
			...aterms,
			{
				type: "with",
				name: predicate,
				body: conjunction1(...b),
			},
		];
	});
}

function buildCompoundLogicEffect(
	node: Parser.SyntaxNode,
	variety: "conjunction" | "disjunction",
): Effect.Effect<TermGeneric<CodeLocation>[], never, FrCounter> {
	if (node.children.length === 0) {
		return Effect.die(new Error("Empty compound logic"));
	}
	if (node.children.length === 1) {
		return toAst1Effect(node.children[0]);
	}
	return Effect.gen(function* () {
		const cnj1 = yield* toAst1Effect(node.children[0]);
		let terms: TermGeneric<CodeLocation>[] = [conjunction1(...cnj1)];
		for (const nc of node.children.slice(1).filter(filterEmptyCompoundLogic)) {
			const currAst = yield* toAst1Effect(nc);
			terms = terms.concat([conjunction1(...currAst)]);
		}
		if (variety === "conjunction") {
			return [conjunction1(...terms)];
		}
		return [disjunction1(...terms)];
	});
}

function extractPredicateEffect(
	node: Parser.SyntaxNode,
	embedPredInScope: boolean,
): Effect.Effect<
	readonly [TermGeneric<CodeLocation>[], PredicateCallGeneric<CodeLocation>],
	never,
	FrCounter
> {
	return Effect.gen(function* () {
		const argActual = node.children[1];
		const arglist = argActual.children
			.slice(1, -1)
			.filter((nnc) => nnc.grammarType !== ",");
		let argsSynth: IdentifierGeneric<CodeLocation>[] = [];
		const allArgs: [
			ExpressionGeneric<CodeLocation>,
			TermGeneric<CodeLocation>[],
		][] = [];
		for (const nc of arglist) {
			const [arg, argTerms, sy] = yield* runExpressionDesugarEffect(
				parseExpr(nc),
			);
			allArgs.push([arg, argTerms]);
			argsSynth = mergeSynthIds(argsSynth, sy);
		}
		const [source, sourceTerms, srcSynth] = yield* runExpressionDesugarEffect(
			parseExpr(node.children[0]),
		);
		if (source.type !== "identifier") {
			throw new Error("Source of predicate must be an identifier");
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
		const innerTerms: TermGeneric<CodeLocation>[] = embedPredInScope
			? [...allArgs2, ...sourceTerms, pred]
			: [...allArgs2, ...sourceTerms];
		return [scopeSynthFresh(mergedSynth, innerTerms), pred] as const;
	});
}

function expressionOrPredicateDefinitionToAstEffect(
	node: Parser.SyntaxNode | null,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): Effect.Effect<
	readonly [
		(
			| ExpressionGeneric<CodeLocation>
			| PredicateDefinitionGeneric<CodeLocation>
		),
		TermGeneric<CodeLocation>[],
		IdentifierGeneric<CodeLocation>[],
	],
	never,
	FrCounter
> {
	if (node === null) {
		return Effect.die(new Error("Node is null"));
	}
	switch (node.type) {
		case "predicate_definition":
			return Effect.gen(function* () {
				const argsList = node.children
					.slice(1, -3)
					.filter((nnc) => nnc.grammarType !== ",");
				let selectedNode =
					node.children[node.children.length - 1];
				selectedNode = handleEmptyCompoundLogic(
					selectedNode,
					node,
				);
				const freshTerm = yield* buildCompoundLogicEffect(
					selectedNode,
					"conjunction",
				);
				const { slot: frshName, synthIds: nameSynth } =
					yield* allocFrCounterSlotEffect(unifyVar);
				const pt = make_predicate_fn(
					frshName,
					argsList
						.filter((ddf) => ddf.grammarType !== ",")
						.map((nnc) =>
							make_identifier(tocloc(nnc), nnc.text),
						),
					conjunction1(...freshTerm),
				);
				return [pt, [], [...nameSynth]] as const;
			});
		default:
			return Effect.gen(function* () {
				const [c1, c2, c4] = yield* runExpressionDesugarEffect(
					parseExpr(node, unifyVar),
				);
				if (c1 === undefined) {
					if (c2 === undefined) {
						throw new Error("Both c1 and c2 are undefined");
					}
					if (c2.length === 0) {
						throw new Error("c2 is empty");
					}
				}
				return [c1, c2, c4] as const;
			});
	}
}

/**
 * `lhs = rhs` lowering tries two unification-variable orders (cheaper side wins).
 * Each try must start from the same fresh counter, so we snapshot / restore {@link FrCounter}.
 */
function unificationToAstEffect(
	node: Parser.SyntaxNode,
): Effect.Effect<TermGeneric<CodeLocation>[], never, FrCounter> {
	return Effect.gen(function* () {
		const frRef = yield* FrCounter;
		const startFr = yield* Ref.get(frRef);
		const lhsField = node.childForFieldName("lhs");
		const rhsField = node.childForFieldName("rhs");
		const k = node.childForFieldName("operator")?.text as
			| "="
			| "<<"
			| ">>"
			| "!=";

		type Branch = {
			readonly a: ExpressionGeneric<CodeLocation>;
			readonly aterms: TermGeneric<CodeLocation>[];
			readonly b:
				| ExpressionGeneric<CodeLocation>
				| PredicateDefinitionGeneric<CodeLocation>;
			readonly bterms: TermGeneric<CodeLocation>[];
			readonly mergedSynth: IdentifierGeneric<CodeLocation>[];
		};

		const [a1, a1terms, a1Synth] = yield* runExpressionDesugarEffect(
			parseExpr(lhsField),
		);
		const [b1, b1terms, b1Synth] =
			yield* expressionOrPredicateDefinitionToAstEffect(
				rhsField,
				a1.type === "identifier" ? a1 : undefined,
			);
		const p1: Branch = {
			a: a1,
			aterms: a1terms,
			b: b1,
			bterms: b1terms,
			mergedSynth: mergeSynthIds(a1Synth, b1Synth),
		};
		const end1 = yield* Ref.get(frRef);
		yield* Ref.set(frRef, startFr);
		const [b2, b2terms, b2Synth] =
			yield* expressionOrPredicateDefinitionToAstEffect(
				rhsField,
				undefined,
			);
		const [a2, a2terms, a2Synth] = yield* runExpressionDesugarEffect(
			parseExpr(
				lhsField,
				b2.type === "identifier" ? b2 : undefined,
			),
		);
		const p2: Branch = {
			a: a2,
			aterms: a2terms,
			b: b2,
			bterms: b2terms,
			mergedSynth: mergeSynthIds(a2Synth, b2Synth),
		};
		const end2 = yield* Ref.get(frRef);

		const cost1 =
			p1.aterms.length +
			p1.bterms.length +
			(isSameIdentifier(p1.a, p1.b) ? 0 : 1);
		const cost2 =
			p2.aterms.length +
			p2.bterms.length +
			(isSameIdentifier(p2.a, p2.b) ? 0 : 1);
		const pick1 = cost1 <= cost2;
		yield* Ref.set(frRef, pick1 ? end1 : end2);
		const { a, aterms, b, bterms, mergedSynth } = pick1 ? p1 : p2;

		if (b.type === "predicate_definition") {
			if (a.type !== "identifier") {
				throw new Error("Source of predicate must be an identifier");
			}
			return scopeSynthFresh(mergedSynth, [
				...aterms,
				{ ...b, name: a },
			]);
		}
		const unifT = isSameIdentifier(a, b)
			? []
			: make_unification(a, k, b, tocloc(node))[1];
		return scopeSynthFresh(mergedSynth, [
			...aterms,
			...bterms,
			...unifT,
		]);
	});
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
