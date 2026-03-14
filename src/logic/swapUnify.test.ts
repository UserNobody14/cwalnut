import { describe, expect, it } from "@jest/globals";
import { LLVar, LNom, LSuspension } from "./terms";
import { makeList, makeTie, qnom } from "./makelvar";
import { emptyState } from "./State";
import { applySwap } from "./swapUnify";
import { qlam, qvar } from "./testutils";

describe("swapUnify", () => {
	it("swap unify", () => {
		const swap1 = [qnom.a, qnom.b] as const;
		const exampleV = makeTie(
			qnom.a,
			makeList([qnom.a, qnom.b]),
		);
		const swapped = applySwap(swap1, exampleV);
		expect(swapped.cleanOutput()).toEqual({
			name: "Nom(b)",
			term: ["Nom(b)", "Nom(a)"],
		});
	});

	// it("binder unify", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.b]));
	//     const exampleU = makeTie(qnom.a, makeList([qnom.a, new LLVar("c")]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).not.toBeNull();
	//     if (swapped === null) return;
	//      ;
	//     expect(swapped.find(new LLVar("c"))).toEqual(
	//         qnom.b
	//     );
	// });

	// it("binder unify fail", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.a]));
	//     const exampleU = makeTie(qnom.a, makeList([qnom.b, new LLVar("b")]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).toBeNull();
	// });

	// it("binder unify fail 2", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.a]));
	//     const exampleU = makeTie(qnom.a, makeList([qnom.b, new LLVar("a")]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).toBeNull();
	// });

	// it("binder unify diff noms 1", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.a]));
	//     const exampleU = makeTie(qnom.b, makeList([qnom.b, new LLVar("a")]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).not.toBeNull();
	//     if (swapped === null) return;
	//      ;
	//     expect(swapped.find(new LLVar("a"))).toEqual(
	//         qnom.b
	//     );
	// });

	// it("binder unify diff noms 2", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.b]));
	//     const exampleU = makeTie(qnom.b, makeList([qnom.b, new LLVar("a")]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).toBeNull();
	//     // expect(swapped).not.toBeNull();
	//     // if (swapped === null) return;
	//     //  ;
	//     // expect(swapped.find(new LLVar("a"))).toEqual(
	//     //     qnom.a
	//     // );
	// });

	// it("binder unify diff noms 3", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.b]));
	//     const exampleU = makeTie(qnom.b, makeList([qnom.b, new LLVar("a")]));
	//     const suspAB = applySwap([qnom.a, qnom.b], exampleV.term);
	//     const unif = emptyState.unify(suspAB, exampleU.term);
	//     expect(unif).not.toBeNull();
	//     if (!unif) return;
	//     const constrained =  notFreeIn2(unif, qnom.b, exampleV.term);
	//     expect(constrained).toBeNull();
	// });

	// it("binder unify nested noms 1", () => {
	//     const exampleV = makeTie(qnom.a, makeList([qnom.a, makeTie(
	//         qnom.b, makeList([qnom.b, qnom.a])
	//     )]));
	//     const exampleU = makeTie(qnom.b, makeList([qnom.b,
	//         makeTie(qnom.d, makeList([qnom.d, new LLVar("a")]))
	//     ]));
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).not.toBeNull();
	//     if (swapped === null) return;
	//      ;
	//     expect(swapped.find(new LLVar("a"))).toEqual(
	//         qnom.b
	//     );
	// });

	// it("binder unify nested noms 2", () => {
	//     const exampleV = makeTie(qnom.a,
	//         qlam(
	//             makeTie(
	//                 qnom.b,
	//                 qvar(qnom.a)
	//             )
	//         )
	//     );
	//     const exampleU = makeTie(qnom.c,
	//         qlam(
	//             makeTie(
	//                 qnom.d,
	//                 qvar(qnom.c)
	//             )
	//         )
	//     );
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).not.toBeNull();
	//     if (swapped === null) return;
	//      ;
	//     // expect(swapped.find(new LLVar("b"))).toEqual(
	//     //     qnom.a
	//     // );
	// });

	// it("binder unify nested noms 3", () => {
	//     const exampleV = makeTie(qnom.a,
	//         qlam(
	//             makeTie(
	//                 qnom.b,
	//                 qvar(qnom.a)
	//             )
	//         )
	//     );
	//     const exampleU = makeTie(qnom.c,
	//         qlam(
	//             makeTie(
	//                 qnom.d,
	//                 qvar(qnom.d)
	//             )
	//         )
	//     );
	//     const swapped = binderUnify(emptyState, exampleV, exampleU);
	//     expect(swapped).toBeNull();
	// });
});

describe("applySwap", () => {
	it("swap unify diff noms 2", () => {
		const exampleV = makeTie(
			qnom.a,
			makeList([qnom.a, qnom.b]),
		);
		// const exampleU = makeTie(qnom.b, makeList([qnom.b, qnom.a]));
		const swapped = applySwap([qnom.a, qnom.b], exampleV);
		expect(swapped.cleanOutput()).toEqual({
			name: "Nom(b)",
			term: ["Nom(b)", "Nom(a)"],
		});
	});

	it("swap unify diff noms 3", () => {
		// const exampleV = makeTie(qnom.a, makeList([qnom.a, qnom.b]));
		const exampleU = makeTie(
			qnom.b,
			makeList([qnom.b, qnom.a]),
		);
		const swapped = applySwap([qnom.a, qnom.b], exampleU);
		expect(swapped.cleanOutput()).toEqual({
			name: "Nom(a)",
			term: ["Nom(a)", "Nom(b)"],
		});
	});

	it("swap unify diff noms 4", () => {
		const exampleV = makeTie(
			qnom.a,
			makeList([qnom.a, new LLVar("c")]),
		);
		// const exampleU = makeTie(qnom.b, makeList([qnom.b, qnom.a]));
		const swapped = applySwap([qnom.a, qnom.b], exampleV);
		expect(swapped.cleanOutput()).toEqual({
			name: "Nom(b)",
			term: [
				"Nom(b)",
				{
					swap: ["Nom(a)", "Nom(b)"],
					term: "?c",
				},
			],
		});
	});
});
