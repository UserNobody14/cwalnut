/**
 * Expression desugaring: return value is always an identifier or literal; goals and
 * synthetic `__fresh_*` names are appended via {@link ExpressionAcc}.
 */
import type Parser from "tree-sitter";
import { Effect, Ref } from "effect";
import type {
	ExpressionGeneric,
	IdentifierGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import {
	ezmakeMaker,
	make,
	operate,
	set_key_of,
	to_slice,
	unary_operate,
} from "src/utils/make_better_typed";
import {
	type CodeLocation,
	defaultCodeLocation,
	mergecloc,
	mergeClocs,
	tocloc,
} from "./codeloc";
import {
	allocExprSlotEffect,
	allocSynthIdSync,
	appendTermsEffect,
	type ExprFresh,
	type ExpressionDesugarServices,
	FrCounter,
	freshSynthName,
	mergeSynthIds,
	recordSynthIdsEffect,
	runExpressionDesugarSync,
} from "./desugar-fr";

const ezmake = ezmakeMaker<CodeLocation>(defaultCodeLocation);
const make_list_ast = make.list_ast;
const make_identifier = make.identifier;
const make_literal_ast = make.literal_ast;
const make_predicate = make.predicate;

type FlexExpr = [
	ExpressionGeneric<CodeLocation>,
	TermGeneric<CodeLocation>[],
];

function desugarExprSubtree(
	node: Parser.SyntaxNode,
	fr: number,
	unifyVar: IdentifierGeneric<CodeLocation> | undefined,
): ExprFresh {
	return runExpressionDesugarSync(fr, expressionToAstEffect(node, unifyVar));
}

/** List / splat lowering; threads `fr` for cons-cell scaffolding (`ezmake`). */
function listValsToList(
	listVals: Parser.SyntaxNode[],
	frCounter1: number,
	unifyVar: IdentifierGeneric<CodeLocation> | undefined,
): ExprFresh {
	const containsSplats = listVals.some(
		(nnc) => nnc.grammarType === "splat",
	);
	const [listI, frAfterListI, listISynth] = allocSynthIdSync(
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
			const pairs: FlexExpr[] = [];
			for (const v of listVals.slice(0, -1)) {
				const [ff1, ts, n1, sy] = desugarExprSubtree(v, fr, unifyVar);
				fr = n1;
				pairs.push([ff1, ts]);
				elemSynth = mergeSynthIds(elemSynth, sy);
			}
			const splatVar = desugarExprSubtree(
				listVals[listVals.length - 1].children[1],
				fr,
				unifyVar,
			);
			let accSynth = mergeSynthIds(elemSynth, splatVar[3]);
			let accE = splatVar[0];
			let accT = splatVar[1];
			let accFr = splatVar[2];
			for (const nc of pairs) {
				const stepFr = accFr + 1;
				const cellId = freshSynthName(stepFr);
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
		const startListId = freshSynthName(frAfterListI);
		const frStart = frAfterListI + 1;
		let curSynth = mergeSynthIds(listISynth, [startListId]);
		const [startE, stt] = ezmake.empty(startListId);
		let curE = startE;
		let curT = stt;
		let curFr = frStart;
		for (const nnc of listVals) {
			if (nnc.grammarType === "splat") {
				const [svE, svT, svFr, svSy] = desugarExprSubtree(
					nnc.children[1],
					curFr,
					unifyVar,
				);
				const [splatOut, frAfterSplat, splatSy] = allocSynthIdSync(
					undefined,
					svFr,
				);
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
				const [ff1, ts, n1, sy] = desugarExprSubtree(
					nnc,
					curFr,
					unifyVar,
				);
				const [consOut, cnFr, cnSy] = allocSynthIdSync(undefined, n1);
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
	const expressions: FlexExpr[] = [];
	for (const v of listVals) {
		const [ff1, ts, n1, sy] = desugarExprSubtree(v, fr, unifyVar);
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

export function expressionToAstEffect(
	node1: Parser.SyntaxNode | null | undefined,
	unifyVar?: IdentifierGeneric<CodeLocation>,
): Effect.Effect<
	ExpressionGeneric<CodeLocation>,
	never,
	ExpressionDesugarServices
> {
	if (node1 === undefined || node1 === null) {
		return Effect.die(new Error("Node is undefined"));
	}
	const node = node1;
	switch (node.type) {
		case "keyword_identifier":
		case "identifier":
			return Effect.succeed(
				make_identifier(tocloc(node), node.text),
			);
		case "destructuring_expression":
			console.debug(`Destructuring expression: ${node.text}`);
			return expressionToAstEffect(node.children[0], unifyVar);

		case "predicate_expression":
		case "predicate":
			return Effect.gen(function* () {
				const headSlot = yield* allocExprSlotEffect(unifyVar);
				const argActual = node.children[1];
				const arglist = argActual.children
					.slice(1, -1)
					.filter((nnc) => nnc.grammarType !== ",");
				const argExprs: ExpressionGeneric<CodeLocation>[] = [];
				for (const nc of arglist) {
					argExprs.push(
						yield* expressionToAstEffect(nc, unifyVar),
					);
				}
				const src = yield* expressionToAstEffect(
					node.children[0],
					unifyVar,
				);
				if (src.type !== "identifier") {
					throw new Error("Source of predicate must be an identifier");
				}
				const predicateTerm = make_predicate(src, [
					headSlot,
					...argExprs,
				]);
				yield* appendTermsEffect([predicateTerm]);
				return headSlot;
			});

		case "expression":
		case "primary_expression":
			return expressionToAstEffect(node.children[0], unifyVar);

		case "attribute":
			return Effect.gen(function* () {
				const obj = yield* expressionToAstEffect(node.children[0]);
				const attr = node.children[2].text;
				const val = yield* allocExprSlotEffect(unifyVar);
				const attrAst = make_literal_ast("string", attr);
				yield* appendTermsEffect([
					set_key_of(tocloc(node), obj, attrAst, val),
				]);
				return val;
			});

		case "binary_operator":
			return Effect.gen(function* () {
				const left = yield* expressionToAstEffect(
					node.children[0],
					unifyVar,
				);
				const op = node.children[1].text;
				const right = yield* expressionToAstEffect(
					node.children[2],
					unifyVar,
				);
				const val = yield* allocExprSlotEffect(unifyVar);
				yield* appendTermsEffect([
					operate(op, left, right, val, tocloc(node)),
				]);
				return val;
			});

		case "list": {
			const listVals = node.children
				.slice(1, -1)
				.filter((nnc) => nnc.grammarType !== ",");
			const u = unifyVar;
			return Effect.gen(function* () {
				const ref = yield* FrCounter;
				const fr0 = yield* Ref.get(ref);
				const [expr, terms, fr1, synthIds] = listValsToList(
					listVals,
					fr0,
					u,
				);
				yield* Ref.set(ref, fr1);
				yield* appendTermsEffect(terms);
				yield* recordSynthIdsEffect(synthIds);
				return expr;
			});
		}

		case "unary_operator":
			return Effect.gen(function* () {
				const inner = yield* expressionToAstEffect(
					node.children[1],
					unifyVar,
				);
				const op = node.children[0].text;
				const val = yield* allocExprSlotEffect(unifyVar);
				yield* appendTermsEffect([
					unary_operate(op, inner, val, tocloc(node)),
				]);
				return val;
			});

		case "dictionary":
			return Effect.gen(function* () {
				const listValsDict = node.children
					.slice(1, -1)
					.filter((nnc) => nnc.grammarType !== ",");
				const objv = yield* allocExprSlotEffect(unifyVar);
				type Kv = [
					ExpressionGeneric<CodeLocation>,
					ExpressionGeneric<CodeLocation>,
					CodeLocation,
				];
				const lvd: Kv[] = [];
				for (const nc of listValsDict) {
					const key = yield* expressionToAstEffect(nc.children[0]);
					const val = yield* expressionToAstEffect(nc.children[2]);
					lvd.push([
						key,
						val,
						mergecloc(
							tocloc(nc.children[0]),
							tocloc(nc.children[2]),
						),
					]);
				}
				yield* appendTermsEffect(
					lvd.map(([key, val, cl]) =>
						set_key_of(cl, objv, key, val),
					),
				);
				return objv;
			});

		case "string":
			return Effect.succeed(
				make_literal_ast("string", node.text.slice(1, -1)),
			);

		case "number":
			return Effect.succeed(
				make_literal_ast(
					"number",
					Number.parseInt(node.text, 10).toString(),
				),
			);

		case "slice":
			return Effect.gen(function* () {
				const obj = yield* expressionToAstEffect(node.children[0]);
				const attr = node.children[2].text;
				const val = yield* allocExprSlotEffect(unifyVar);
				yield* appendTermsEffect([
					to_slice(
						tocloc(node),
						obj,
						make_literal_ast("string", attr),
						val,
					),
				]);
				return val;
			});

		default:
			return Effect.die(
				new Error(`expressionToAstEffect: unsupported node type ${node.type}`),
			);
	}
}
