import * as kn from "./index";
import * as frf from "./AnyFreshFn";
import * as trm from "./terms";
import { describe, expect, test } from "@jest/globals";
import {
	makeEmpty,
	makeList,
	makeLiteral,
	makePair,
	makeTie,
	qlvar,
} from "./makelvar";
import {
	qapp,
	qlam,
	qvar,
	rename,
	subst5,
} from "./testutils";
import type { MGoal } from "./streams";

describe.skip("index", () => {
	test.skip("Testkanren", () => {
		const outv = kn.run(
			3,
			kn.all(
				kn.eq(qlvar.b, makeLiteral("bill")),
				kn.either(
					kn.all(
						kn.eq(qlvar.a, makeLiteral("mcbob")),
						kn.eq(qlvar.b, makeLiteral("bob")),
					),
					kn.all(
						kn.eq(qlvar.b, makeLiteral("bill")),
						kn.eq(qlvar.a, makeLiteral("bob")),
					),
				),
			),
		);
		expect(outv.map((kkn) => kkn.toMap())).toEqual([
			{ a: "bob", b: "bill" },
		]);
	});

	test.skip("Kn First", () => {
		const firsto = (a: trm.LTerm, l: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(a, v), l),
			);
		};
		const outv = kn.run(
			3,
			firsto(
				qlvar.init1,
				makeList([
					makeLiteral("a"),
					makeLiteral("b"),
					makeLiteral("c"),
				]),
			),
		);
		expect(outv.map((kkn) => kkn.toMap())).toEqual([
			{ init1: "a" },
		]);
	});

	test.skip("Kn Rest", () => {
		const resto = (l: trm.LTerm, r: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(v, r), l),
			);
		};
		const outv = kn.run(
			3,
			resto(
				makeList([
					makeLiteral("a"),
					makeLiteral("b"),
					makeLiteral("c"),
				]),
				qlvar.init1,
			),
		);
		expect(outv.map((kkn) => kkn.toMap())).toEqual([
			{ init1: "b,c" },
		]);
	});

	test.skip("Kn Membero", () => {
		const firsto = (a: trm.LTerm, l: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(a, v), l),
			);
		};
		const resto = (l: trm.LTerm, r: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(v, r), l),
			);
		};
		const membero = (a: trm.LTerm, l: trm.LTerm): MGoal => {
			return kn.either(
				firsto(a, l),
				frf.call_fresh((vv) =>
					kn.all(resto(l, vv), membero(a, vv)),
				),
			);
		};
		const outv = kn.run(
			22,
			kn.all(
				membero(
					qlvar.init1,
					makeList([
						makeLiteral("a"),
						makeLiteral("b"),
						makeLiteral("c"),
					]),
				),
			),
		);
		expect(outv.map((kkn) => kkn.toMap())).toEqual([
			{ init1: "a" },
			{ init1: "b" },
			{ init1: "c" },
		]);
	});

	test.skip("Kn Append", () => {
		const firsto = (a: trm.LTerm, l: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(a, v), l),
			);
		};
		const resto = (r: trm.LTerm, l: trm.LTerm): MGoal => {
			return frf.call_fresh((v) =>
				kn.eq(makePair(v, r), l),
			);
		};
		const appendo = (
			l: trm.LTerm,
			s: trm.LTerm,
			o: trm.LTerm,
		): MGoal => {
			return kn.either(
				kn.all(kn.eq(makeEmpty(), l), kn.eq(s, o)),
				frf.call_fresh((a) =>
					frf.call_fresh((d) =>
						frf.call_fresh((res) =>
							kn.all(
								kn.eq(makePair(a, d), l),
								kn.eq(makePair(a, res), o),
								frf.call_fresh(() => appendo(d, s, res)),
							),
						),
					),
				),
			);
		};
		const outv = kn.run(
			22,
			kn.all(
				appendo(
					makeList([makeLiteral("a"), makeLiteral("b")]),
					makeList([makeLiteral("c"), makeLiteral("d")]),
					makeList([
						makeLiteral("a"),
						makeLiteral("b"),
						makeLiteral("c"),
						makeLiteral("d"),
					]),
				),
			),
		);
		const outv2 = kn.run(
			22,
			kn.all(
				appendo(
					makeList([makeLiteral("a"), makeLiteral("b")]),
					qlvar.init1,
					makeList([
						makeLiteral("a"),
						makeLiteral("b"),
						makeLiteral("c"),
						makeLiteral("d"),
					]),
				),
			),
		);
		expect(outv2.map((kkn) => kkn.toMap())).toEqual([
			{ init1: "c,d" },
		]);
	});

	test("Kn Append2", () => {
		const cons = (
			a: trm.LTerm,
			v: trm.LTerm,
			l: trm.LTerm,
		): MGoal => {
			return (sc) => {
				console.log(
					"cons:",
					sc.reify(a).toString(),
					sc.reify(v).toString(),
					sc.reify(l).toString(),
				);
				// return applyGoal(kn.eq(makePair(a, v), l), sc);
				return [() => kn.eq(makePair(a, v), l)(sc)];
			};
		};
		const appendo = (
			l: trm.LTerm,
			s: trm.LTerm,
			o: trm.LTerm,
			// loc = 'None'
		): MGoal => {
			return (sc) => [
				() =>
					kn.either(
						kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
						frf.fresh3((a, d, res) =>
							kn.all(
								kn.eq(makePair(a, d), l),
								kn.eq(makePair(a, res), o),
								// kn.apply_pred(
								//     qlvar.appendo,
								//     d,
								//     s,
								//     res,
								// ),
								frf.call_fresh(
									// () => appendo(d, s, res),
									() =>
										kn.apply_pred(qlvar.appendo, d, s, res),
								),
							),
						),
					)(sc),
			];
		};

		const outv = kn.run1(
			3,
			["qq", "mid"],
			kn.all(
				kn.eq(
					qlvar.appendo,
					new trm.LPredicate("appendo", appendo),
				),
				kn.eq(
					qlvar.einput,
					makeList([
						makeLiteral("1"),
						makeLiteral("2"),
						makeLiteral("3"),
					]),
				),
				kn.eq(
					qlvar.input2,
					makeList([
						makeLiteral("4"),
						makeLiteral("5"),
						makeLiteral("6"),
					]),
				),
				appendo(
					qlvar.einput,
					qlvar.__fresh_1,
					qlvar.__fresh_2,
				),
				appendo(
					qlvar.input2,
					qlvar.__fresh_0,
					qlvar.__fresh_1,
				),
				kn.eq(makeEmpty(), qlvar.__fresh_0),
				kn.eq(qlvar.qq, qlvar.__fresh_2),
				kn.either(
					kn.all(
						// kn.eq(makeEmpty(), qlvar.__fresh_3),
						// kn.eq(
						//     qlvar.qq,
						//     qlvar.__fresh_6,
						// ),
						cons(
							makeLiteral("1"),
							qlvar.__fresh_5,
							qlvar.__fresh_6,
						),
						cons(
							makeLiteral("6"),
							qlvar.__fresh_3,
							qlvar.__fresh_4,
						),
						kn.eq(makeEmpty(), qlvar.__fresh_3),
						appendo(
							qlvar.mid,
							qlvar.__fresh_4,
							qlvar.__fresh_5,
						),
						kn.eq(qlvar.qq, qlvar.__fresh_6),
					),
					kn.all(
						kn.eq(qlvar.qq, makeList([makeLiteral("45")])),
					),
				),
			),
		);
		console.log(outv);
		expect(outv).toHaveLength(1);
		expect(
			outv,
			// .filter((kk) => !kk.fail)
			// .map((kkn) => kkn.toMap(true, ["qq", "mid"])),
		).toEqual([
			{
				qq: ["1", "2", "3", "4", "5", "6"],
				mid: ["2", "3", "4", "5"],
			},
		]);
	}, 3000);

	test("Kn Append33", () => {
		const cons = (
			a: trm.LTerm,
			v: trm.LTerm,
			l: trm.LTerm,
		): MGoal => {
			return kn.eq(makePair(a, v), l);
		};
		const appendo = (
			l: trm.LTerm,
			s: trm.LTerm,
			o: trm.LTerm,
		): MGoal => {
			return kn.either(
				kn.all(kn.eq(makeEmpty(), l), kn.eq(s, o)),
				frf.call_fresh((a) =>
					frf.call_fresh((d) =>
						frf.call_fresh((res) =>
							kn.all(
								kn.eq(makePair(a, d), l),
								kn.eq(makePair(a, res), o),
								appendo(d, s, res),
								// frf.call_fresh(
								// () => appendo(d, s, res),
								// )
							),
						),
					),
				),
			);
		};

		const outv = kn.run1(
			30,
			["qq", "mid"],
			kn.all(
				kn.eq(
					qlvar.appendo,
					new trm.LPredicate("appendo", appendo),
				),
				kn.eq(
					qlvar.einput,
					makeList([
						makeLiteral("1"),
						makeLiteral("2"),
						makeLiteral("3"),
					]),
				),
				kn.eq(
					qlvar.input2,
					makeList([
						makeLiteral("4"),
						makeLiteral("5"),
						makeLiteral("6"),
					]),
				),
				appendo(
					qlvar.einput,
					qlvar.__fresh_1,
					qlvar.__fresh_2,
				),
				appendo(
					qlvar.input2,
					qlvar.__fresh_0,
					qlvar.__fresh_1,
				),
				kn.eq(makeEmpty(), qlvar.__fresh_0),
				kn.eq(qlvar.qq, qlvar.__fresh_2),
				kn.either(
					kn.all(
						cons(
							makeLiteral("1"),
							qlvar.__fresh_5,
							qlvar.__fresh_6,
						),
						cons(
							makeLiteral("6"),
							qlvar.__fresh_3,
							qlvar.__fresh_4,
						),
						kn.eq(makeEmpty(), qlvar.__fresh_3),
						appendo(
							qlvar.mid,
							qlvar.__fresh_4,
							qlvar.__fresh_5,
						),
						kn.eq(qlvar.qq, qlvar.__fresh_6),
					),
					kn.all(
						kn.eq(qlvar.qq, makeList([makeLiteral("45")])),
					),
				),
			),
		);
		expect(outv).toHaveLength(1);
		expect(outv).toEqual([
			{
				qq: ["1", "2", "3", "4", "5", "6"],
				mid: ["2", "3", "4", "5"],
			},
		]);
	}, 3000);

	test.skip("Kn Save and Call Pred", () => {
		// Make an append predicate, then unify it as a predicate with lvar wq
		// Then in a goal, retrieve wq and call it with some arguments
		// const appendo = (
		//     l: trm.LTerm,
		//     s: trm.LTerm,
		//     o: trm.LTerm,
		// ): Goal => {
		//     // console.log("appendo save & call:", l.toString(), s.toString(), o.toString());
		//     // return kn.either(
		//     //     kn.all(
		//     //         kn.eq(makeEmpty(), l),
		//     //         kn.eq(s, o)
		//     //     ),
		//     //     kn.fresh3(
		//     //         (a, d, res) => kn.all(
		//     //             kn.eq(makePair(a, d), l),
		//     //             kn.eq(makePair(a, res), o),
		//     //             appendo(d, s, res)
		//     //         )
		//     //     )
		//     // );
		//     return (scc: State): Iterable<State> => {
		//         // console.log(
		//         // 	"appendo save & call:",
		//         // 	scc.subst.find(l).toString(),
		//         // 	scc.subst.find(s).toString(),
		//         // 	scc.subst.find(o).toString(),
		//         // );
		//         return kn.either(
		//             kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
		//             frf.fresh3((a, d, res) =>
		//                 kn.all(
		//                     kn.eq(makePair(a, d), l),
		//                     kn.eq(makePair(a, res), o),
		//                     // appendo(d, s, res)
		//                     kn.apply_pred(qlvar.wq, d, s, res),
		//                 ),
		//             ),
		//         )(scc);
		//     };
		// };
		const appendo = (
			l: trm.LTerm,
			s: trm.LTerm,
			o: trm.LTerm,
		): MGoal => {
			return kn.either(
				kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
				frf.fresh3((a, d, res) =>
					kn.all(
						kn.eq(makePair(a, d), l),
						kn.eq(makePair(a, res), o),
						// appendo(d, s, res)
						kn.apply_pred(qlvar.wq, d, s, res),
					),
				),
			);
			// return (scc: State): Iterable<State> => {
			//     return kn.either(
			//         kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
			//         frf.fresh3((a, d, res) =>
			//             kn.all(
			//                 kn.eq(makePair(a, d), l),
			//                 kn.eq(makePair(a, res), o),
			//                 // appendo(d, s, res)
			//                 kn.apply_pred(qlvar.wq_recur, d, s, res),
			//             ),
			//         ),
			//     )(scc);
			// };
		};

		const outv = kn.run(
			3,
			kn.all(
				kn.eq(
					qlvar.wq,
					new trm.LPredicate("appendo", appendo),
				),
				frf.fresh4((a, b) => {
					return kn.all(
						kn.eq(
							makeList([
								makeLiteral("a"),
								makeLiteral("b"),
							]),
							a,
						),
						kn.eq(
							makeList([
								makeLiteral("c"),
								makeLiteral("d"),
							]),
							b,
						),
						kn.apply_pred(qlvar.wq, a, b, qlvar.c),
					);
				}),
			),
		);

		// console.log(
		// 	"SCM",
		// 	outv.map((ooo) => ooo.toString()),
		// );

		expect(outv.map((kkn) => kkn.toMap(false))).toEqual([
			{
				wq: "Predicate(appendo)",
				c: "a,b,c,d",
			},
		]);
	});

	test.skip("Kn Save and Call Pred 2", () => {
		// Make an append predicate, then unify it as a predicate with lvar wq
		// Then in a goal, retrieve wq and call it with some arguments
		const appendo = (
			l: trm.LTerm,
			s: trm.LTerm,
			o: trm.LTerm,
		): MGoal => {
			return kn.either(
				kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
				frf.fresh3((a, d, res) =>
					kn.all(
						kn.eq(makePair(a, d), l),
						kn.eq(makePair(a, res), o),
						// appendo(d, s, res)
						kn.apply_pred(qlvar.wq_recur, d, s, res),
					),
				),
			);
			// return (scc: State): Iterable<State> => {
			//     return kn.either(
			//         kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
			//         frf.fresh3((a, d, res) =>
			//             kn.all(
			//                 kn.eq(makePair(a, d), l),
			//                 kn.eq(makePair(a, res), o),
			//                 // appendo(d, s, res)
			//                 kn.apply_pred(qlvar.wq_recur, d, s, res),
			//             ),
			//         ),
			//     )(scc);
			// };
		};

		const outv = kn.run(
			3,
			kn.all(
				kn.eq(qlvar.wq_recur, qlvar.wq2),
				kn.eq(qlvar.wq, qlvar.wq2),
				kn.eq(
					qlvar.wq,
					new trm.LPredicate("appendo", appendo),
				),
				frf.fresh4((a, b) => {
					return kn.all(
						kn.eq(
							makeList([
								makeLiteral("a"),
								makeLiteral("b"),
							]),
							a,
						),
						kn.eq(
							makeList([
								makeLiteral("c"),
								makeLiteral("d"),
							]),
							b,
						),
						kn.apply_pred(qlvar.wq, a, b, qlvar.c),
					);
				}),
			),
		);

		// console.log(
		// 	"SCM",
		// 	outv.map((ooo) => ooo.toString()),
		// );

		expect(
			outv.map((kkn) => kkn.toMap(false, ["wq", "c"])),
		).toEqual([
			{
				wq: "Predicate(appendo)",
				c: "a,b,c,d",
			},
		]);
	});
});

describe("Nominal ext start", () => {
	type Term = trm.LTerm;
	const {
		either: disj,
		all: conj,
		eq: equals,
		run1: run,
	} = kn;

	test("Nominal extensions1", () => {
		const ooo = run(
			1,
			["q", "z", "g"],
			conj(
				frf.freshNom2((a, b) => {
					return rename(
						makeTie(b, makeTie(a, qapp(qvar(b), qvar(a)))),
						qlvar.z,
						qlvar.g,
						qlvar.q,
					);
				}),
				// freshNom2(
				//     (a, _b) => equals(
				//         qlvar.q,
				//         makeTie(a, qapp(qlvar.z, qvar(a))),
				//     )
				// )
			),
		);
		// console.log(ooo);
		expect(ooo).toHaveLength(1);
	});

	test("Nominal extensions2", () => {
		const ooo2 = run(
			1,
			["q"],
			frf.freshNom2((a, b) => {
				return subst5(
					qlam(makeTie(a, qapp(qvar(a), qvar(b)))),
					qvar(b),
					a,
					qlvar.q,
				);
			}),
		);
		expect(ooo2).toHaveLength(1);
		// console.log(ooo2);
	});

	test("Nominal extensions3", () => {
		const ooo3 = run(
			1,
			["q"],
			frf.freshNom3((a, b, c) => {
				return equals(
					qlam(makeTie(a, qapp(qvar(a), qvar(b)))),
					qlam(makeTie(c, qlvar.q)),
				);
			}),
		);
		// console.log(ooo3);
		expect(ooo3).toHaveLength(1);
	});

	test("Nominal extensions4", () => {
		const ooo4 = run(
			1,
			["q"],
			frf.freshNom3((a, g, c) => {
				return conj(
					equals(
						qlam(makeTie(g, qapp(qvar(g), qvar(g)))),
						qlvar.q,
					),

					equals(
						qlam(makeTie(a, qapp(qvar(a), qvar(a)))),
						qlvar.q,
					),
				);
			}),
		);
		expect(ooo4).toHaveLength(1);
		// console.log(ooo4);
	});

	/**
         * The first subst o example shows that [b/a]λa.ab ≡α λc.cb.
        (run∗ (q)
        (fresh (a b)
        (subst o
        ‘(lam ,(./ a ‘(app (var ,a) (var ,b)))) ‘(var ,b) a q))) ⇒
        ((lam (tie a0 (app (var a0 ) (var a1 )))))
        Naive substitution would have produced λb.bb instead.
        This second example shows that [a/b]λa.b ≡α λc.a.
        (run∗ (x )
        (fresh (a b)
        (subst o ‘(lam ,(./ a ‘(var ,b))) ‘(var ,a) b x ))) ⇒
        ((lam (tie a0 (var a1 ))))
        Naive substitution would have produced λa.a instead.
         */

	test("Nominal extensions5", () => {
		const ooo5 = run(
			1,
			["q"],
			frf.freshNom2((a, b) => {
				return subst5(
					qlam(makeTie(a, qapp(qvar(a), qvar(b)))),
					qvar(b),
					a,
					qlvar.q,
				);
			}),
		);
		expect(ooo5).toEqual([
			{
				q: [
					"lam",
					{
						name: "Nom(0)",
						term: [
							"app",
							[
								["var", "Nom(0)"],
								["var", "Nom(1)"],
							],
						],
					},
				],
			},
		]);
	});
});
