import { test, describe, expect } from "@jest/globals";
import { all, either, makelvar, run, eq, call_fresh, call_fresh2, prettifyState, mapStateList } from "./goal";
import * as kn from "src/interpret/kanren";
describe("Test1", () => {
    test("Test2", () => {
        const outv = run(
            null,
            call_fresh2(
                (a, b) => {
                    return all(
                        eq(b, "bill"),
                        either(
                            all(
                                eq(a, "mcbob"),
                                eq(b, "bob")
                            ),
                            all(
                                eq(b, "bill"),
                                eq(a, "bob")
                            )
                        )
                    );
                }
            )
        );
        console.log(outv.map(prettifyState));
        expect(mapStateList(outv)).toEqual([{ "$1": "bill", "$0": "bob" }]);
    });

    test("Testkanren", () => {
        const outv = kn.run(
            3,
            kn.all(
                kn.eq(kn.makelvar("b"), kn.makeLiteral("bill")),
                kn.either(
                    kn.all(
                        kn.eq(kn.makelvar("a"), kn.makeLiteral("mcbob")),
                        kn.eq(kn.makelvar("b"), kn.makeLiteral("bob")),
                    ),
                    kn.all(
                        kn.eq(kn.makelvar("b"), kn.makeLiteral("bill")),
                        kn.eq(kn.makelvar("a"), kn.makeLiteral("bob")),
                    )
                )
            )
        );
        expect(outv.map(kkn => kkn.toMap())).toEqual([{ a: "bob", b: "bill" }]);
    });

    test("Kn First", () => {
        const firsto = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(a, v), l)
            );
        };
        const outv = kn.run(
            3,
            firsto(kn.makelvar("init1"), kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b"), kn.makeLiteral("c")]))
        );
        expect(outv.map(kkn => kkn.toMap())).toEqual([
            { "init1": "a" }
        ]);
    });

    test("Kn Rest", () => {
        const resto = (l: kn.LTerm, r: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(v, r), l)
            );
        };
        const outv = kn.run(
            3,
            resto(kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b"), kn.makeLiteral("c")]), kn.makelvar("init1"))
        );
        expect(outv.map(kkn => kkn.toMap())).toEqual([
            { "init1": "[b, [c, []]]" }
        ]);
    });

    test("Kn Membero", () => {
        const firsto = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(a, v), l)
            );
        };
        const resto = (l: kn.LTerm, r: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(v, r), l)
            );
        }
        const membero = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.either(
                firsto(a, l),
                kn.call_fresh(
                    (vv) => kn.all(
                        resto(l, vv),
                        membero(a, vv)
                    )
                )
            );
        };
        const outv = kn.run(
            22,
            kn.all(
                membero(kn.makelvar("init1"), kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b"), kn.makeLiteral("c")])),
            )
        );
        expect(outv.map(kkn => kkn.toMap())).toEqual([
            { "init1": "a" },
            { "init1": "b" },
            { "init1": "c" },
        ]);
    });


    test("Kn Append", () => {
        const firsto = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(a, v), l)
            );
        };
        const resto = (r: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.call_fresh(
                (v) => kn.eq(kn.makePair(v, r), l)
            );
        }
        const appendo = (l: kn.LTerm, s: kn.LTerm, o: kn.LTerm): kn.Goal => {
            console.log("appendo", l.toString(), s.toString(), o.toString());
            return kn.either(
                kn.all(
                    kn.eq(kn.makeEmpty(), l),
                    kn.eq(s, o)
                ),
                kn.call_fresh(
                    (a) => kn.call_fresh(
                        (d) => kn.call_fresh(
                            (res) => kn.all(
                                kn.eq(kn.makePair(a, d), l),
                                kn.eq(kn.makePair(a, res), o),
                                appendo(d, s, res)
                            )
                        )
                    )
                )
            );
        };
        const outv = kn.run(
            22,
            kn.all(
                appendo(kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b")]),
                    kn.makeList([kn.makeLiteral("c"), kn.makeLiteral("d")]),
                    kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b"),
                    kn.makeLiteral("c"), kn.makeLiteral("d")]))
            )
        );
        const outv2 = kn.run(
            22,
            kn.all(
                appendo(
                    kn.makeList([
                        kn.makeLiteral("a"),
                        kn.makeLiteral("b")
                    ]),
                    kn.makelvar("init1"),
                    kn.makeList([
                        kn.makeLiteral("a"),
                        kn.makeLiteral("b"),
                        kn.makeLiteral("c"),
                        kn.makeLiteral("d")
                    ])
                )
            )
        );
        expect(outv2.map(kkn => kkn.toMap())).toEqual([
            { "init1": "[c, [d, []]]" }
        ]);
    });

    test("Kn Append2", () => {
        const cons = (a: kn.LTerm, v: kn.LTerm, l: kn.LTerm): kn.Goal => {
            return kn.eq(kn.makePair(a, v), l);
        };
        const appendo = (l: kn.LTerm, s: kn.LTerm, o: kn.LTerm): kn.Goal => {
            return (scc: kn.State): Iterable<kn.State> => {
                console.log("appendo save & call:", scc.subst.find(l).toString(), scc.subst.find(s).toString(), scc.subst.find(o).toString());
                return kn.either(
                    kn.all(
                        kn.eq(l, kn.makeEmpty()),
                        kn.eq(s, o)
                    ),
                    kn.fresh3(
                        (a, d, res) => kn.all(
                            kn.eq(kn.makePair(a, d), l),
                            kn.eq(kn.makePair(a, res), o),
                            // appendo(d, s, res)
                            kn.apply_pred(
                                kn.makelvar("appendo"),
                                d, s, res
                            )
                        )
                    )
                )(scc);
            }
        };

        /**
einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]


                    list(ezlvar.einput, make_literal_ast(1), make_literal_ast(2), make_literal_ast(3)),
                list(ezlvar.input2, make_literal_ast(4), make_literal_ast(5), make_literal_ast(6)),
                mk_internal_append(ezlvar.einput, ezlvar.__fresh_1, ezlvar.__fresh_2),
                mk_internal_append(ezlvar.input2, ezlvar.__fresh_0, ezlvar.__fresh_1),
                to_empty(ezlvar.__fresh_0),
                unify(ezlvar.qq, ezlvar.__fresh_2),            
                disjunction1(
                    conjunction1(
                        mk_cons(make_literal_ast(1), ezlvar.__fresh_5, ezlvar.__fresh_6),
                        mk_internal_append(ezlvar.mid, ezlvar.__fresh_4, ezlvar.__fresh_5),
                        mk_cons(make_literal_ast(6), ezlvar.__fresh_3, ezlvar.__fresh_4),
                        to_empty(ezlvar.__fresh_3),
                        unify(ezlvar.qq, ezlvar.__fresh_6),
                    ),
                    conjunction1(
                        list(ezlvar.qq, make_literal_ast(45)),
                    )
                ),
         */
        const outv = kn.run(
            null,
            kn.all(
                kn.eq(kn.makelvar("appendo"), new kn.LPredicate("appendo", appendo)),
                kn.eq(
                    kn.makeLvar("einput"),
                    kn.makeList([
                        kn.makeLiteral("1"),
                        kn.makeLiteral("2"),
                        kn.makeLiteral("3")
                    ]),
                ),
                kn.eq(
                    kn.makeLvar("input2"),
                    kn.makeList([
                        kn.makeLiteral("4"),
                        kn.makeLiteral("5"),
                        kn.makeLiteral("6")
                    ]),
                ),
                appendo(
                    kn.makeLvar("einput"),
                    kn.makeLvar("__fresh_1"),
                    kn.makeLvar("__fresh_2")
                ),
                appendo(
                    kn.makeLvar("input2"),
                    kn.makeLvar("__fresh_0"),
                    kn.makeLvar("__fresh_1")
                ),
                kn.eq(
                    kn.makeEmpty(),
                    kn.makeLvar("__fresh_0")
                ),
                kn.eq(
                    kn.makeLvar("qq"),
                    kn.makeLvar("__fresh_2")
                ),
                kn.either(
                    kn.all(
                        cons(
                            kn.makeLiteral("1"),
                            kn.makeLvar("__fresh_5"),
                            kn.makeLvar("__fresh_6")
                        ),
                        cons(
                            kn.makeLiteral("6"),
                            kn.makeLvar("__fresh_3"),
                            kn.makeLvar("__fresh_4")
                        ),
                        kn.eq(
                            kn.makeEmpty(),
                            kn.makeLvar("__fresh_3")
                        ),
                        appendo(
                            kn.makeLvar("mid"),
                            kn.makeLvar("__fresh_4"),
                            kn.makeLvar("__fresh_5")
                        ),
                        kn.eq(
                            kn.makeLvar("qq"),
                            kn.makeLvar("__fresh_6")
                        )
                    ),
                    kn.all(
                        kn.eq(
                            kn.makeLvar("qq"),
                            kn.makeList([
                                kn.makeLiteral("45")
                            ])
                        )
                    )
                )
            )
        );
        expect(outv.filter(
            (kk) => !kk.fail
        ).map(kkn => kkn.toMap(true, ["qq", "mid"]))).toEqual([
            {
                "qq": "[1, [2, [3, [4, [5, [6, []]]]]]]",
                "mid": "[2, [3, [4, [5, []]]]]",
            }
        ]);
    });

    test("Kn Save and Call Pred", () => {
        // Make an append predicate, then unify it as a predicate with lvar wq
        // Then in a goal, retrieve wq and call it with some arguments
        const appendo = (l: kn.LTerm, s: kn.LTerm, o: kn.LTerm): kn.Goal => {
            // console.log("appendo save & call:", l.toString(), s.toString(), o.toString());
            // return kn.either(
            //     kn.all(
            //         kn.eq(kn.makeEmpty(), l),
            //         kn.eq(s, o)
            //     ),
            //     kn.fresh3(
            //         (a, d, res) => kn.all(
            //             kn.eq(kn.makePair(a, d), l),
            //             kn.eq(kn.makePair(a, res), o),
            //             appendo(d, s, res)
            //         )
            //     )
            // );
            return (scc: kn.State): Iterable<kn.State> => {
                console.log("appendo save & call:", scc.subst.find(l).toString(), scc.subst.find(s).toString(), scc.subst.find(o).toString());
                return kn.either(
                    kn.all(
                        kn.eq(l, kn.makeEmpty()),
                        kn.eq(s, o)
                    ),
                    kn.fresh3(
                        (a, d, res) => kn.all(
                            kn.eq(kn.makePair(a, d), l),
                            kn.eq(kn.makePair(a, res), o),
                            // appendo(d, s, res)
                            kn.apply_pred(
                                kn.makelvar("wq"),
                                d, s, res
                            )
                        )
                    )
                )(scc);
            }
        };

        const outv = kn.run(
            null,
            kn.all(
                kn.eq(kn.makelvar("wq"), new kn.LPredicate("appendo", appendo)),
                kn.fresh4(
                    (a, b) => {
                        return kn.all(
                            kn.eq(
                                kn.makeList([kn.makeLiteral("a"), kn.makeLiteral("b")]),
                                a
                            ),
                            kn.eq(
                                kn.makeList([kn.makeLiteral("c"), kn.makeLiteral("d")]),
                                b
                            ),
                            kn.apply_pred(
                                kn.makelvar("wq"),
                                a, b, kn.makelvar("c")
                            )
                        );
                    }
                )
            )
        );

        console.log("SCM", outv.map(ooo => ooo.toString()));

        expect(outv.map(kkn => kkn.toMap(false))).toEqual([
            { "wq": "Predicate(appendo)", "c": "[a, [b, [c, [d, []]]]]" }
        ]);
    });

});