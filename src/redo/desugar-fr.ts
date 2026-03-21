/**
 * Fresh-name counter + optional expression accumulator (terms + synthetic `fresh` ids)
 * for desugaring without threading tuples through every recursive step.
 */
import { Context, Effect, Ref } from "effect";
import type {
	ExpressionGeneric,
	IdentifierGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import { make } from "src/utils/make_better_typed";
import {
	type CodeLocation,
	defaultCodeLocation,
} from "./codeloc";

/** Only the outer `expressionToAstFRESH` API uses this tuple; inner lowering uses Effect + {@link ExpressionAcc}. */
export type ExprFresh = [
	ExpressionGeneric<CodeLocation>,
	TermGeneric<CodeLocation>[],
	number,
	IdentifierGeneric<CodeLocation>[],
];

const make_identifier = make.identifier;

export class FrCounter extends Context.Tag("cwal/DesugarFrCounter")<
	FrCounter,
	Ref.Ref<number>
>() {}

/** Next integer slot for `__fresh_${n}` (mutates ref). */
export const nextFrIndex: Effect.Effect<number, never, FrCounter> =
	Effect.gen(function* () {
		const ref = yield* FrCounter;
		return yield* Ref.modify(ref, (n: number) => [n, n + 1] as const);
	});

export function freshSynthName(
	n: number,
): IdentifierGeneric<CodeLocation> {
	return make_identifier(defaultCodeLocation, `__fresh_${n}`);
}

/**
 * Allocate unify slot or next `__fresh_n` (FrCounter only). Used by sync list lowering
 * via {@link allocSynthIdSync}; does not touch {@link ExpressionAcc}.
 */
export function allocFrCounterSlotEffect(
	unifyVar: IdentifierGeneric<CodeLocation> | undefined,
): Effect.Effect<
	{
		readonly slot: IdentifierGeneric<CodeLocation>;
		readonly synthIds: readonly IdentifierGeneric<CodeLocation>[];
	},
	never,
	FrCounter
> {
	if (unifyVar !== undefined) {
		return Effect.succeed({ slot: unifyVar, synthIds: [] });
	}
	return Effect.map(nextFrIndex, (n) => {
		const id = freshSynthName(n);
		return { slot: id, synthIds: [id] };
	});
}

export type AccState = {
	readonly terms: TermGeneric<CodeLocation>[];
	readonly synthIds: IdentifierGeneric<CodeLocation>[];
};

/** Mutable sink for goals produced while lowering an expression; return value stays a var or literal. */
export class ExpressionAcc extends Context.Tag("cwal/DesugarExpressionAcc")<
	ExpressionAcc,
	Ref.Ref<AccState>
>() {}

export type SynthIdChunk = readonly IdentifierGeneric<CodeLocation>[];

export function mergeSynthIds(
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

export const appendTermsEffect = (
	ts: readonly TermGeneric<CodeLocation>[],
): Effect.Effect<void, never, ExpressionAcc> =>
	Effect.gen(function* () {
		if (ts.length === 0) {
			return;
		}
		const acc = yield* ExpressionAcc;
		yield* Ref.update(acc, (s) => ({
			terms: [...s.terms, ...ts],
			synthIds: s.synthIds,
		}));
	});

export const recordSynthIdsEffect = (
	ids: SynthIdChunk,
): Effect.Effect<void, never, ExpressionAcc> =>
	Effect.gen(function* () {
		if (ids.length === 0) {
			return;
		}
		const acc = yield* ExpressionAcc;
		yield* Ref.update(acc, (s) => ({
			terms: s.terms,
			synthIds: mergeSynthIds(s.synthIds, ids),
		}));
	});

/** Fresh slot for expression lowering; records new `__fresh_n` ids into {@link ExpressionAcc}. */
export function genFresh(): Effect.Effect<
	IdentifierGeneric<CodeLocation>,
	never,
	FrCounter | ExpressionAcc
> {
	return Effect.gen(function* () {
		const r = yield* allocFrCounterSlotEffect(undefined);
		yield* recordSynthIdsEffect(r.synthIds);
		return r.slot;
	});
}

export type ExpressionDesugarServices = FrCounter | ExpressionAcc;

export function runWithFrCounterSync<A>(
	initialFr: number,
	eff: Effect.Effect<A, never, FrCounter>,
): [A, number] {
	return Effect.runSync(
		Effect.gen(function* () {
			const ref = yield* Ref.make(initialFr);
			const a = yield* Effect.provideService(eff, FrCounter, ref);
			const fr = yield* Ref.get(ref);
			return [a, fr] as const;
		}),
	);
}

/**
 * Run expression desugar: result is always an identifier or literal; goals and synthetic
 * fresh names are collected from {@link ExpressionAcc}.
 */
export function runExpressionDesugarSync(
	initialFr: number,
	eff: Effect.Effect<
		ExpressionGeneric<CodeLocation>,
		never,
		ExpressionDesugarServices
	>,
): [
	ExpressionGeneric<CodeLocation>,
	TermGeneric<CodeLocation>[],
	number,
	IdentifierGeneric<CodeLocation>[],
] {
	return Effect.runSync(
		Effect.gen(function* () {
			const frRef = yield* Ref.make(initialFr);
			const accRef = yield* Ref.make<AccState>({
				terms: [],
				synthIds: [],
			});
			const expr = yield* Effect.provideService(
				Effect.provideService(eff, FrCounter, frRef),
				ExpressionAcc,
				accRef,
			);
			const fr = yield* Ref.get(frRef);
			const acc = yield* Ref.get(accRef);
			return [expr, acc.terms, fr, acc.synthIds] as const;
		}),
	);
}

/** Sync one-shot slot allocation (threads numeric `fr` for list lowering and legacy paths). */
export function allocSynthIdSync(
	unifyVar: IdentifierGeneric<CodeLocation> | undefined,
	fr: number,
): [
	IdentifierGeneric<CodeLocation>,
	number,
	readonly IdentifierGeneric<CodeLocation>[],
] {
	const [r, fr2] = runWithFrCounterSync(fr, allocFrCounterSlotEffect(unifyVar));
	return [r.slot, fr2, r.synthIds];
}
