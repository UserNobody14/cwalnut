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

    // test("Testkanren", () => {
    //     const outv = kn.run(
    //         1,
    //         kn.all(
                
    //             kn.either(
    //                 kn.all(
    //                     kn.eq(kn.makelvar("a"), kn.makeliteral("mcbob")),
    //                     kn.eq(kn.makelvar("b"), kn.makeliteral("bob")),
    //                 ),
    //                 kn.all(
    //                     kn.eq(kn.makelvar("b"), kn.makeliteral("bill")),
    //                     kn.eq(kn.makelvar("a"), kn.makeliteral("bob")),
    //                 )
    //             )
    //         )
    //     );
    //     expect(outv).toEqual([{ a: "bob", b: "bill" }]);
    // });
});