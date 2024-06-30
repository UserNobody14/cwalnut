import { describe, expect, test } from "@jest/globals";
import { LogicCons, LogicList, LogicLiteral, LogicLvar, LogicMap, LogicValue } from "./WorldGoal";
import { LogicVal } from "./interpret/logic";

const reifyList = (list?: LogicValue | null) => list ? (
    (ll => Array.isArray(ll) ? ll : null )(list.reify())
) : null;

const reifyMap = (map?: LogicValue | null) => map ? map.reify() : null;

/**
 * Logic kinds:
 * - Lvar
 * - Literal
 * - Map
 * - List
 * - Predicate
 */

describe("Unite", () => {
    test("should unite simple (lvars)", () => {
        const a = new LogicLvar("a");
        const b = new LogicLvar("b");
        expect(a.unite(b).getNameSafe()).toEqual(b.getNameSafe());
    });
    test("should unite simple (lvars) 2", () => {
        const a = new LogicLvar("a");
        const b = new LogicLvar("b");
        expect(b.unite(a).getNameSafe()).toEqual(a.getNameSafe());
    });
    test("should unite simple (literals)", () => {
        const a = new LogicLiteral(2);
        const b = new LogicLiteral(3);
        expect(a.unite(b)).toBeNull();
    });
    test("should unite simple (literals) 2", () => {
        const a = new LogicLiteral(2);
        const b = new LogicLiteral(2);
        expect(b.unite(a)?.value).toEqual(2);
    });
    test("should unite simple (literals) 3", () => {
        const a = new LogicLiteral("w");
        const b = new LogicLiteral("w");
        expect(a.unite(b)?.value).toEqual("w");
    });
    test("should unite simple (lvars + literals)", () => {
        const a = new LogicLiteral(2);
        const b = new LogicLvar("b");
        expect(b.unite(a).value).toEqual(2);
    });
    test("should unite simple (lvars + literals) 2", () => {
        const a = new LogicLiteral(2);
        const b = new LogicLvar("b");
        expect(a.unite(b)?.value).toEqual(2);
    });
    // lists and maps
    test("should unite simple (list)", () => {
        const a = LogicList.fromFinite(2, 3);
        const b = new LogicList([
            new LogicLiteral(3),
            new LogicLiteral(4),
        ]);
        expect(a.unite(b)).toBeNull();
    });
    test("should unite simple (list) 2", () => {
        const a = LogicList.fromFinite(2, 3);
        const b = LogicList.fromFinite(2, 3);
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });
    test("should unite simple (list) 3", () => {
        const a = LogicList.fromFinite(2, 3);
        const b = new LogicList([
            new LogicLiteral(2),
            new LogicLvar("b"),
        ]);
        expect(reifyList(b.unite(a))).toEqual([2, 3]);
    });
    test("should unite simple (list) 4", () => {
        const a = LogicList.fromFinite(2, 3);
        const b = LogicList.fromFinite(
            new LogicLvar("b"), 3);
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });

    test("should unite simple (list) 5", () => {
        const a = LogicList.fromFinite(2, 3);
        const b = LogicList.fromFinite(
            new LogicLvar("b"),
            new LogicLvar("c"),
        );
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });
    test("should unite simple (list) 6", () => {
        const a = LogicList.fromFinite(
            2, new LogicLvar("c")
        );
        const b = LogicList.fromFinite(
            new LogicLvar("b"),
            3
        );
        expect(reifyList(b.unite(a))).toEqual([2, 3]);
    });

    test("should unite simple (list) 7", () => {
        const a = LogicList.fromFinite(
            2, new LogicLvar("c")
        );
        const b = LogicList.fromFinite(
            new LogicLvar("b"),
            new LogicLvar("d"),
        );
        const [u1, u2] = reifyList(a.unite(b)) ?? [null, null];
        expect(u1).toEqual(2);
        expect((u2 as any)?.value).toEqual(LogicLvar.from("d").value);
        // expect(unitedList).toEqual([2, LogicLvar.from("d").value]);
        // expect(reifyList(b.unite(a))).toEqual([2, LogicLvar.from("c")]);
        const [u3, u4] = reifyList(b.unite(a)) ?? [null, null];
        expect(u3).toEqual(2);
        expect((u4 as any)?.value).toEqual(LogicLvar.from("c").value);
    });
    // simple, finite maps
    test("should unite simple (map)", () => {
        const a = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        const b = LogicMap.fromFinite({
            a: 3,
            b: 4,
        }, 2);
        expect(reifyMap(a.unite(b))).toEqual(null);
    });

    test("should unite simple (map) 2", () => {
        const a = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        const b = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        expect(reifyMap(a.unite(b))).toEqual({
            a: 2,
            b: 3,
        });
    });

    test("should unite simple (map) 3", () => {
        const a = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        const b = LogicMap.fromFinite({
            a: 2,
            b: new LogicLvar("b"),
        }, 2);
        expect(reifyMap(a.unite(b))).toEqual({
            a: 2,
            b: 3,
        });
    });

    test("should unite simple (map) 4", () => {
        const a = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        const b = LogicMap.fromFinite({
            a: 2,
            b: new LogicLvar("b"),
        }, 2);
        expect(reifyMap(b.unite(a))).toEqual({
            a: 2,
            b: 3,
        });
    });

    test("should unite simple (map) 5", () => {
        const a = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        const b = LogicMap.fromFinite({
            a: 2,
            b: new LogicLvar("b"),
            c: 4,
        }, 3);
        expect(reifyMap(a.unite(b))).toEqual(null);
    });

    // Complex:
    // infinite list unification
    test("should unite (infinite list) 1", () => {
        const a = LogicList.fromInfinite(2);
        const b = LogicList.fromInfinite(3);
        expect(reifyList(a.unite(b))).toEqual(null);
    });

    test("should unite (infinite list) 2", () => {
        const a = LogicList.fromInfinite(2);
        const b = LogicList.fromInfinite(2);
        expect(reifyList(a.unite(b))).toEqual([2]);
    });

    test("should unite (infinite list) 3", () => {
        const a = LogicList.fromInfinite(2);
        const b = LogicList.fromFinite(2, 3);
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
        expect(reifyList(b.unite(a))).toEqual([2, 3]);

    });
    test("should unite (infinite list) 4", () => {
        const a = LogicList.fromInfinite(2, 3);
        const b = LogicList.fromFinite(2, 3);
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
        expect(reifyList(b.unite(a))).toEqual([2, 3]);
    });

    test("should unite (infinite list) 5", () => {
        const a = LogicList.fromInfinite(2, 3);
        const b = LogicList.fromInfinite(2);
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });

    test("should not unite (infinite list) 6", () => {
        const a = LogicList.fromInfinite(2, 3);
        const b = LogicList.fromFinite(2);
        expect(reifyList(b.unite(a))).toEqual(null);
    });

    // infinite map unification
    test("should unite (infinite map) 1", () => {
        const a = LogicMap.fromInfinite({
            a: 2,
        });
        const b = LogicMap.fromInfinite({
            a: 3,
        });
        expect(reifyMap(a.unite(b))).toEqual(null);
    });

    test("should unite (infinite map) 2", () => {
        const a = LogicMap.fromInfinite({
            a: 2,
        });
        const b = LogicMap.fromInfinite({
            a: 2,
        });
        expect(reifyMap(a.unite(b))).toEqual({
            a: 2,
        });
    });

    test("should unite (infinite map) 3", () => {
        const a = LogicMap.fromInfinite({
            a: 2,
        });
        const b = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        expect(reifyMap(a.unite(b))).toEqual({
            a: 2,
            b: 3,
        });
        expect(reifyMap(b.unite(a))).toEqual({
            a: 2,
            b: 3,
        });
    });

    test("should unite (infinite map) 4", () => {
        const a = LogicMap.fromInfinite({
            a: 2,
            b: 3,
        });
        const b = LogicMap.fromFinite({
            a: 2,
            b: 3,
        }, 2);
        expect(reifyMap(a.unite(b))).toEqual({
            a: 2,
            b: 3,
        });
        expect(reifyMap(b.unite(a))).toEqual({
            a: 2,
            b: 3,
        });
    });

    // Should unite logiccons
    test("should unite (logiccons) 1", () => {
        const a = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        const b = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        expect(a.unite(b)).not.toBeNull();
    });

    test("should unite (logiccons) 2", () => {
        const a = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        const b = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });

    test("should unite (logiccons) 3", () => {
        const a = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        const b = LogicCons.from(
            LogicLiteral.from(2),
            new LogicLvar("b"),
        );
        expect(reifyList(a.unite(b))).toEqual([2, 3]);
    });

    test("should unite (logiccons) 4", () => {
        const a = LogicCons.from(
            LogicLiteral.from(2),
            LogicLiteral.from(3),
        );
        const b = LogicList.fromFinite(
            2,
                        new LogicLvar("b"),
        );
        expect(reifyList(b.unite(a))).toEqual([2, 3]);
    });
});
