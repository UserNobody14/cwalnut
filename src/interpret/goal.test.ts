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
                    // kn.makeList([
                    //     kn.makeLiteral("c"),
                    //     kn.makeLiteral("d")
                    // ]),
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
            return (scc: kn.State): kn.LStream => {
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
            { "wq": "appendo", "c": "[a, [b, [c, [d, []]]]]" }
        ]);
    });

});