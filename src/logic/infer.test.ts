import { describe, test, expect } from "@jest/globals";
import { either, run1 } from ".";
import {
	fresh6,
	freshNom2,
	freshNom4,
	freshNom6,
} from "./AnyFreshFn";
import {
	qtyping,
	qtyping2,
	typo,
	findModes,
	qmode,
	inferDisjunction,
	qdisj,
	qpredApp,
	qpredDef,
	qpredDef1,
	inferStates,
	inferModesForVars,
	lookupPredDef,
	inferDisjunction1,
} from "./infer";
import {
	makeEmpty,
	makeList,
	makeList2,
	makeLiteral,
	makePair,
	qlvar,
	qnom,
} from "./makelvar";
import {
	lamTie,
	lamTie2,
	qapp,
	qapp2,
	qvar,
} from "./testutils";
import { all, eq } from "../logic";

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];
describe.skip("infer", () => {
	/**
     * (testit
 (run* (q)
  (fresh (c d)
    (typo '() `(lam ,(tie c `(lam ,(tie d `(var ,c))))) q)))
 '((-> _.0 (-> _.1 _.0))))
     */
	test("infer 1", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((c, d) => {
					return typo(
						makeEmpty(),
						lamTie(c, lamTie(d, qvar(c))),
						qlvar.q,
					);
				}),
			),
		).toEqual([
			{
				q: qtyping2("?$&0", qtyping2("?$&1", "?$&0")),
			},
		]);
	});

	/**
     * (testit
  (run* (q)
    (fresh (c)
      (typo '() `(lam ,(tie c `(app (var ,c) (var ,c)))) q)))
   '())
     */

	test("infer 2", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((c) => {
					return typo(
						makeEmpty(),
						lamTie(c, qapp(qvar(c), qvar(c))),
						qlvar.q,
					);
				}),
			),
		).toEqual([]);
	});

	/**
     * (testit
 (run 3 (q) (typo '() q '(-> int int)))
 '((lam (tie-tag a.0 (var a.0)))
  (app (lam (tie-tag a.0 (var a.0)))
       (lam (tie-tag a.1 (var a.1))))
  (lam (tie-tag
         a.0
         (app (lam (tie-tag a.1 (var a.1))) (var a.0))))))
     */

	test("infer 3", () => {
		expect(
			run1(
				3,
				["q"],
				typo(
					makeEmpty(),
					qlvar.q,
					qtyping(makeLiteral("int"), makeLiteral("int")),
				),
			),
		).toEqual([
			{ q: lamTie2(a0, qvar(a0)) },
			{
				q: qapp2(
					lamTie2(a0, qvar(a0)),
					lamTie2(a1, qvar(a1)),
				),
			},
			{
				q: lamTie2(
					a0,
					qapp2(lamTie2(a1, qvar(a1)), qvar(a0)),
				),
			},
		]);
	});
});

describe("Predicate inference", () => {
	test("predicate inference 1", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((c, d) => {
					return findModes(
						// modes, list of modes
						makeList([
							qmode(makeLiteral("in"), makeLiteral("out")),
						]),
						// ovars, list of variables
						makeList([c]),
						// stateLookupBefore, lookup table before this pred application
						makeList([makePair(c, makeLiteral("in"))]),
						// stateLookupAfter, lookup table after this pred application
						makeList([makePair(c, makeLiteral("out"))]),
					);
				}),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});

	test("Lookup pred def", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((c, d) => {
					const defsIn = qpredDef(
						makePair(
							c,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							d,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);
					return lookupPredDef(c, defsIn, qlvar.q);
				}),
			),
		).toEqual([
			{
				q: [
					"def1",
					[["mode", "in", "out"]],
					"?unk1",
					"?unk2",
				],
			},
		]);
	});

	// Infer a predicate application state deeper
	test("infer predicate application state 1", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom4((unifyo, membero, a) => {
					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);
					return inferModesForVars(
						qpredApp(unifyo, a),
						defsIn,
						// stateLookupBefore, lookup table before this pred application
						makeList([makePair(a, makeLiteral("in"))]),
						// stateLookupAfter, lookup table after this pred application
						// makeList([makePair(a, makeLiteral("out"))])
						qlvar.q,
					);
				}),
			),
		).toEqual([
			{
				q: [["Nom(0)", "out"], "?$&0"],
			},
		]);
	});

	// Infer a predicate application state
	test("infer predicate application state 2", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom4((unifyo, membero, a) => {
					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);
					return inferStates(
						qpredApp(unifyo, a),
						defsIn,
						// stateLookupBefore, lookup table before this pred application
						makeList([makePair(a, makeLiteral("in"))]),
						// stateLookupAfter, lookup table after this pred application
						// makeList([makePair(a, makeLiteral("out"))])
						qlvar.q,
					);
				}),
			),
		).toEqual([
			{
				q: [["Nom(0)", "out"], "?$&0"],
			},
		]);
	});

	// Infer disj1
	test("infer disj0", () => {
		expect(
			run1(
				1,
				["modes"],
				freshNom6((membero, unifyo, a, b) => {
					const ovars = makeList([a, b]);

					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);

					return fresh6((disjunct1, stIn, stOut) =>
						all(
							eq(qpredApp(unifyo, a), disjunct1),
							inferStates(disjunct1, defsIn, stIn, stOut),
							findModes(qlvar.modes, ovars, stIn, stOut),
						),
					);
				}),
				5000,
			),
		).toEqual([
			{
				modes: [
					["mode", "in", "out"],
					["mode", "?$&0", "?$&1"],
				],
			},
		]);
	});

	// Infer disj1
	test("infer disj000", () => {
		expect(
			run1(
				1,
				["modes"],
				freshNom6((membero, unifyo, a, b) => {
					const ovars = makeList([a, b]);

					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);

					return fresh6((disjunct1, stIn, stOut) =>
						all(
							eq(qpredApp(membero, a, b), disjunct1),
							inferStates(disjunct1, defsIn, stIn, stOut),
							findModes(qlvar.modes, ovars, stIn, stOut),
						),
					);
				}),
				5000,
			),
		).toEqual([
			{
				modes: [
					["mode", "out", "out"],
					["mode", "in", "out"],
				],
			},
		]);
	});

	// Infer disj1
	test("infer disj000plus", () => {
		expect(
			run1(
				1,
				["modes"],
				freshNom6((membero, unifyo, a, b) => {
					const disj = makeList([
						qpredApp(unifyo, a),
						qpredApp(membero, a, b),
					]);
					const ovars = makeList([a, b]);

					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);

					return all(
						fresh6((disjunct1, stIn, stOut) =>
							all(
								eq(qpredApp(unifyo, a), disjunct1),
								inferStates(disjunct1, defsIn, stIn, stOut),
								findModes(qlvar.modes, ovars, stIn, stOut),
							),
						),
						fresh6((disjunct1, stIn, stOut) =>
							all(
								eq(qpredApp(membero, a, b), disjunct1),
								inferStates(disjunct1, defsIn, stIn, stOut),
								findModes(qlvar.modes, ovars, stIn, stOut),
							),
						),
					);
				}),
				5000,
			),
		).toEqual([
			{
				modes: [
					["mode", "in", "out"],
					["mode", "in", "out"],
				],
			},
		]);
	});

	// Infer disj1
	test.skip("infer disj1", () => {
		expect(
			run1(
				2,
				["modes"],
				freshNom6((membero, unifyo, a, b) => {
					// const disj = makeList(
					//     [
					//         qpredApp(unifyo, a),
					//         qpredApp(membero, a, b)
					//     ]
					// );
					const disj = makeList(
						// qpredApp(unifyo, a),
						[
							makeList([
								qpredApp(unifyo, a),
								qpredApp(membero, a, b),
							]),
							qpredApp(unifyo, a),
						],
					);
					const ovars = makeList([a, b]);

					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);

					return inferDisjunction1(
						disj,
						ovars,
						qlvar.modes,
						defsIn,
						qlvar.defsOut,
					);
				}),
				5000,
			),
		).toEqual([
			{
				modes: [],
			},
		]);
	});

	// Infer a whole definition
	test.skip("infer 4", () => {
		expect(
			run1(
				1,
				["modes"],
				freshNom6((membero, unifyo, a, b) => {
					const disj = qdisj(
						// qpredApp(unifyo, a),
						makeList([
							qpredApp(unifyo, a),
							qpredApp(membero, a, b),
						]),
						qpredApp(membero, a, b),
					);
					const ovars = makeList([a, b]);

					const defsIn = qpredDef(
						makePair(
							unifyo,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk1,
								qlvar.unk2,
							),
						),
						makePair(
							membero,
							qpredDef1(
								makeList([
									qmode(
										makeLiteral("out"),
										makeLiteral("out"),
									),
									qmode(
										makeLiteral("in"),
										makeLiteral("out"),
									),
								]),
								qlvar.unk3,
								qlvar.unk4,
							),
						),
					);

					return inferDisjunction(
						disj,
						ovars,
						qlvar.modes,
						defsIn,
						qlvar.defsOut,
					);
				}),
			),
		).toEqual([
			{
				modes: [],
			},
		]);
	});
});
