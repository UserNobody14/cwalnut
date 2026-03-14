import { describe, expect, it } from "@jest/globals";
import {
	type LLVar,
	LNom,
	LSuspension,
	type LTerm,
} from "./terms";
import {
	makeList,
	makeLiteral,
	makeLvar,
	makeTie,
	qlvar,
	qnom,
} from "./makelvar";
import { emptyState, type State } from "./State";
import { ezIn } from "./ezeq";

function emptyUnify0(a: LTerm, b: LTerm) {
	const uu = emptyState.unify(a, b);
	if (!uu) return null;
	return uu.reify(a);
}

function emptyUnify00(a: LTerm, b: LTerm) {
	const uu = emptyState.unify(a, b);
	if (!uu) return null;
	return uu.reify(a);
}

function emptyUnify1(a: LTerm, b: LTerm) {
	const uu = emptyState
		.unify(a, qlvar.result)
		?.unify(b, qlvar.result);
	if (!uu) return null;
	return uu.reify(qlvar.result);
}
function emptyUnifyPermute1(
	a: LTerm,
	left: "left" | "right" = "left",
) {
	return (s: State) =>
		left === "left"
			? s.unify(a, qlvar.result)
			: s.unify(qlvar.result, a);
}

function emptyUnifyPermute2(
	a: LTerm,
	aleft: "left" | "right",
	b: LTerm,
	bleft: "left" | "right",
) {
	const s1 = emptyUnifyPermute1(a, aleft)(emptyState);
	if (!s1) return null;
	return emptyUnifyPermute1(b, bleft)(s1);
}

function emptyUnify(
	a1: LTerm,
	aleft: "left" | "right",
	b1: LTerm,
	bleft: "left" | "right",
	swapTerms: "swap" | "noswap" = "noswap",
) {
	const a = swapTerms === "swap" ? b1 : a1;
	const b = swapTerms === "swap" ? a1 : b1;
	return (
		emptyUnifyPermute2(a, aleft, b, bleft)?.reify(
			qlvar.result,
		) ?? null
	);
}

function dispUnify(
	a1: LTerm,
	aleft: "left" | "right",
	b1: LTerm,
	bleft: "left" | "right",
	swapTerms: "swap" | "noswap" = "noswap",
) {
	const a = swapTerms === "swap" ? b1 : a1;
	const b = swapTerms === "swap" ? a1 : b1;
	const aString =
		aleft === "left"
			? `${a.toString()} = V`
			: `V = ${a.toString()}`;
	const bString =
		bleft === "left"
			? `${b.toString()} = V`
			: `V = ${b.toString()}`;
	return `[${aString}] ;; [${bString}]`;
}

function* swapSets(): Iterable<
	["swap" | "noswap", "left" | "right", "left" | "right"]
> {
	const swaps = ["swap", "noswap"] as const;
	const lefts = ["left", "right"] as const;
	for (const swap of swaps) {
		for (const left of lefts) {
			for (const left2 of lefts) {
				yield [swap, left, left2] as const;
			}
		}
	}
}

function makeSusp(
	a: [string | LNom, string | LNom][],
	b: LLVar,
): LSuspension | LLVar {
	if (a.length === 0) {
		return b;
	}
	const [[af1, af2], ...aRest] = a;
	// const aFirst = ;
	return new LSuspension(
		[
			af1 instanceof LNom ? af1 : new LNom(af1),
			af2 instanceof LNom ? af2 : new LNom(af2),
		],
		makeSusp(aRest, b),
	);
}

describe("terms", () => {
	it("LNom self equivalence", () => {
		const a = qnom.a;
		const b = qnom.a;
		expect(a.selfEquiv(b)).toBe(true);
	});

	it("LNom self equivalence 2", () => {
		const a = qnom.a;
		const b = qnom.b;
		expect(a.selfEquiv(b)).toBe(false);
	});

	it("LVar self equivalence", () => {
		const a = qlvar.a;
		const b = qlvar.a;
		expect(a.selfEquiv(b)).toBe(true);
	});

	it("More complex", () => {
		// ezTie(a, ["foo", a, 3, b]);
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qnom.b,
			]),
		);
		const example2 = emptyState.unify(exampleU, qlvar.t1);
		expect(example2).not.toBe(null);
		if (!example2) return;
		const foundItem = example2?.find(qlvar.t1);
		const fenv = example2.get("i").nominal.fenv;
		const fenv2 = example2.get("i").nominal.fenv;
		expect(fenv2).not.toBe(null);
		// expect(fenv2.size).toBe(2);
		expect(fenv).not.toBe(null);
		if (!fenv) return;
		// expect(fenv.size).toBe(1);
		// expect(fenv.get("t1")).not.toBe(undefined);
		expect(
			foundItem?.reify(example2.subst).cleanOutput(),
		).toEqual({
			name: "Nom(a)",
			term: ["foo", "Nom(a)", 3, "Nom(b)"],
		});
	});

	it("More complex2", () => {
		// ezTie(a, ["foo", a, 3, b]);
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qnom.b,
			]),
		);
		const example1 = emptyState.unify(exampleU, qlvar.t1);
		if (!example1) return;
	});

	it("Unifies Basic", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const example1 = emptyState.unify(exampleU, qlvar.t1);
		expect(example1).not.toBe(null);
		if (!example1) return;
		const foundItem = example1.find(qlvar.t1);
		expect(
			foundItem?.reify(example1.subst).cleanOutput(),
		).toEqual({
			name: "Nom(a)",
			term: ["foo", "Nom(a)", 3, "?b"],
		});
	});
});

describe("Suspensions", () => {
	it("Unifies Suspensions x LiteralsMINUS1", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		// const example1 = emptyUnify0(exampleU, exampleV);
		const example1 = exampleU.unite(emptyState, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.find(qlvar.A).toString()).toEqual("B");
	});

	it("Unifies Suspensions x LiteralsMINUS2", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		// const example1 = emptyUnify0(exampleU, exampleV);
		const example1 = exampleV.varUnifyEmptyScope(
			emptyState.extend(makeLvar("Z"), exampleU),
			makeLvar("Z"),
		);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.find(qlvar.Z).toString()).toEqual("B");
	});

	it("Unifies Suspensions x LiteralsMINUS3ddd", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		// const example1 = emptyUnify0(exampleU, exampleV);
		const minusState = emptyState.extend(
			makeLvar("Z"),
			exampleU,
		);
		const example1 = minusState.unify(
			exampleV,
			makeLvar("Z"),
		);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.reify(qlvar.Z).toString()).toEqual("B");
	});

	it("Unifies Suspensions x LiteralsMINUS3", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		// const example1 = emptyUnify0(exampleU, exampleV);
		const minusState = emptyState.extend(
			makeLvar("Z"),
			exampleU,
		);
		const example1 = minusState.unify(
			exampleV,
			makeLvar("Z"),
		);
		console.log(example1?.toString());
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.reify(qlvar.Z).toString()).toEqual("B");
	});
	it("Unifies Suspensions x LiteralsMINUS4", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.Z);
		const exampleV = makeLiteral("B");

		const example1 = emptyState.unify(
			exampleU,
			makeLvar("A"),
		);
		expect(example1).not.toBe(null);
		if (!example1) return;
		console.log(
			"EXAMPLE1LOCAL",
			JSON.stringify(example1.toClean(), null, 2),
		);
		const example2 = example1.unify(
			exampleV,
			makeLvar("A"),
		);
		expect(example2).not.toBe(null);
		if (!example2) return;
		console.log(
			"EXAMPLE2LOCAL",
			JSON.stringify(example2.toClean(), null, 2),
		);
		expect(example2.reify(qlvar.A).toString()).toEqual("B");
	});
	it("Unifies Suspensions x LiteralsMINUS5", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const example1 = emptyState.unify(
			exampleU,
			makeLvar("result"),
		);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.reify(qlvar.result).toString()).toEqual(
			"Susp([?_a -> ?_b] $A)",
		);
	});
	it("Unifies Suspensions x Literals0", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual("B");
	});

	it("Unifies Suspensions x Literals1", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeLiteral("B");
		for (const [swapTerms, aleft, bleft] of swapSets()) {
			const example1 = emptyUnify(
				exampleU,
				aleft,
				exampleV,
				bleft,
				swapTerms,
			);
			expect(example1).not.toBe(null);
			if (!example1) return;
			//`Failed on ${dispUnify(exampleU, aleft, exampleV, bleft, swapTerms)}`

			expect(example1.cleanOutput()).toEqual("B");
		}
	});

	it("Unifies Suspensions x LVars0", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = qlvar.B;
		const example1 = emptyUnify0(exampleV, exampleU);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual({
			swap: ["Nom(a)", "Nom(b)"],
			term: "?A",
		});
	});

	it("Unifies Suspensions x LVars1", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = qlvar.B;
		for (const [swapTerms, aleft, bleft] of swapSets()) {
			const example1 = emptyUnify(
				exampleU,
				aleft,
				exampleV,
				bleft,
				swapTerms,
			);
			expect(example1).not.toBe(null);
			if (!example1) return;
		}
	});

	it("Unifies Suspensions x Suspensions0", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeSusp([[qnom.a, qnom.b]], qlvar.B);
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual({
			swap: ["Nom(a)", "Nom(b)"],
			term: "?B",
		});
	});

	it("Unifies Suspensions x Ties", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeTie(
			qnom.a,
			makeList([qnom.a, qnom.b]),
		);
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual({
			name: "Nom(a)",
			term: ["Nom(a)", "Nom(b)"],
		});
	});
	it("Unifies Suspensions x Ties2", () => {
		const exampleU = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const exampleV = makeTie(
			qnom.a,
			makeList([qnom.a, qnom.b]),
		);
		const example1 = exampleU.unite(emptyState, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(
			qlvar.A.reify(example1.subst).cleanOutput(),
		).toEqual({
			name: "Nom(b)",
			term: ["Nom(b)", "Nom(a)"],
		});
	});
});

describe("Suspensions2", () => {
	it("Swaps correctly", () => {
		const exampleU = makeSusp(
			[
				[qnom.a, qnom.b],
				[qnom.b, qnom.d],
			],
			qlvar.A,
		);
		if (!(exampleU instanceof LSuspension)) return;
		const swapped = exampleU.applySwaps(qnom.a);
		expect(swapped).not.toBe(null);
		if (!swapped) return;
		expect(swapped.cleanOutput()).toEqual("Nom(b)");
	});

	it("Swaps correctly2", () => {
		const exampleU = makeSusp(
			[
				[qnom.a, qnom.b],
				[qnom.b, qnom.d],
			],
			qlvar.A,
		);
		// expect(exampleU).not.toBe(null);
		if (!(exampleU instanceof LSuspension)) return;
		const swapped = exampleU.applySwaps(qnom.b);
		expect(swapped).not.toBe(null);
		if (!swapped) return;
		expect(swapped.cleanOutput()).toEqual("Nom(d)");
	});

	it("Swaps correctly4", () => {
		const exampleU = makeSusp(
			[
				[qnom.a, qnom.b],
				[qnom.b, qnom.d],
			],
			qlvar.A,
		);
		// These two are equivalent
		const exampleV = makeSusp([[qnom.b, qnom.a]], qlvar.Z);
		const swapped = exampleU.unite(emptyState, exampleV);
		expect(swapped).not.toBe(null);
		if (!swapped) return;
		expect(swapped.reify(qlvar.Z).cleanOutput()).toEqual({
			swap: ["Nom(b)", "Nom(d)"],
			term: "?A",
		});

		expect(swapped.reify(qlvar.A).cleanOutput()).toEqual(
			"?A",
		);
	});
});

describe("Ties", () => {
	it("Unifies Ties x Literals0", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = makeLiteral("B");
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual("B");
	});

	it("Unifies Ties x Literals1", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = makeLiteral("B");
		for (const [swapTerms, aleft, bleft] of swapSets()) {
			const example1 = emptyUnify(
				exampleU,
				aleft,
				exampleV,
				bleft,
				swapTerms,
			);
			expect(example1).toBe(null);
			// if (!example1) return;
			// expect(example1.cleanOutput()).toEqual(
			//     "B"
			// );
		}
	});

	it("Unifies Ties x LVars0", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = qlvar.B;
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual({
			name: "Nom(a)",
			term: ["foo", "Nom(a)", 3, "?b"],
		});
	});

	it("Unifies Ties x LVars1", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = qlvar.B;
		for (const [swapTerms, aleft, bleft] of swapSets()) {
			const example1 = emptyUnify(
				exampleU,
				aleft,
				exampleV,
				bleft,
				swapTerms,
			);
			expect(example1).not.toBe(null);
			if (!example1) return;
		}
	});

	it("Unifies Ties x Ties0", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1).not.toBe(null);
		if (!example1) return;
		expect(example1.cleanOutput()).toEqual({
			name: "Nom(a)",
			term: ["foo", "Nom(a)", 3, "?b"],
		});
	});

	it("Unifies Ties x Ties1", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		const exampleV = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qlvar.b,
			]),
		);
		for (const [swapTerms, aleft, bleft] of swapSets()) {
			const example1 = emptyUnify(
				exampleU,
				aleft,
				exampleV,
				bleft,
				swapTerms,
			);
			expect(example1).not.toBe(null);
			if (!example1) return;
		}
	});

	// it("Unifies Ties x Ties2", () => {
	//     const exampleU = makeTie(qnom.a, makeList([makeLiteral("foo"), qnom.a, makeLiteral(3), qnom.b]));
	//     const exampleV = makeTie(qnom.z, makeList([makeLiteral("foo"), qnom.z, makeLiteral(3), qlvar.C]));
	//     const example1 = emptyUnify0(exampleU, exampleV);
	//     expect(example1?.cleanOutput()).toEqual(
	//         {
	//             name: "Nom(a)",
	//             term: [
	//                 "foo",
	//                 "Nom(a)",
	//                 3,
	//                 "Nom(b)"
	//             ]
	//         }
	//     );
	// });

	it("Unifies Ties and Suspensions", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qnom.b,
			]),
		);
		const exampleV = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const example1 = emptyUnify0(exampleU, exampleV);
		expect(example1?.cleanOutput()).toEqual({
			name: "Nom(a)",
			term: ["foo", "Nom(a)", 3, "Nom(b)"],
		});
	});

	it("Unifies Ties and Suspensions2", () => {
		const exampleU = makeTie(
			qnom.a,
			makeList([
				makeLiteral("foo"),
				qnom.a,
				makeLiteral(3),
				qnom.b,
			]),
		);
		const exampleV = makeSusp([[qnom.a, qnom.b]], qlvar.A);
		const example1 = exampleU.unite(emptyState, exampleV);
		expect(example1?.reify(qlvar.A)?.cleanOutput()).toEqual(
			{
				name: "Nom(b)",
				term: ["foo", "Nom(b)", 3, "Nom(a)"],
			},
		);
	});

	it("Unifies Ties and Suspensions3", () => {
		const exampleU = makeTie(
			qnom.a,
			ezIn(["foo", qnom.a, 3, qnom.b]),
		);
		const exampleV = makeSusp(
			[
				[qnom.a, qnom.b],
				[qnom.c, qnom.b],
			],
			qlvar.A,
		);
		const example1 = exampleV.unite(emptyState, exampleU);
		expect(example1?.reify(qlvar.A)?.cleanOutput()).toEqual(
			{
				name: "Nom(c)",
				term: ["foo", "Nom(c)", 3, "Nom(a)"],
			},
		);
	});
});
