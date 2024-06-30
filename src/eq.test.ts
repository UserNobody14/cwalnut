import {
    describe,
    test,
    expect,
} from "@jest/globals";
import { LogicList, LogicLiteral, LogicLvar, World } from "./WorldGoal";
import { eq } from "./eq";


describe("Eq", () => {
    const worldgen = (inrec: {
        [key: string]: LogicLiteral | LogicList;
    } = {}) => {
        return new World(new Map(Object.entries(inrec)));
    };
    test("should be equal", () => {
        const world = worldgen();
        expect(world.equals(world)).toBe(true);
    });

    test("bind an lvar", () => {
        const world = worldgen();
        const world2 = worldgen().bind("a", LogicLiteral.from(2));
        const world3 = eq(LogicLvar.from("a"), LogicLiteral.from(2)).run(world);
        assertWorldEquality(world3, world2)
    });

    test("bind an lvar 2", () => {
        const world = worldgen();
        const world2 = worldgen().bind("a", LogicLiteral.from(2));
        const world3 = eq(LogicLiteral.from(2), LogicLvar.from("a")).run(world);
        assertWorldEquality(world3, world2)
    });

    // test literal checks

    test("should be equal", () => {
        const world = worldgen();
        const world2 = worldgen();
        const world3 = eq(LogicLiteral.from(2), LogicLiteral.from(2)).run(world);
        assertWorldEquality(world3, world2)
    });

    test("should not be equal", () => {
        const world = worldgen();
        const world3 = eq(LogicLiteral.from(2), LogicLiteral.from(3)).run(world);
        expect(world3).toHaveLength(0);
    });

    // test lvar binding on top of bindings

    test("should bind lvar on top of bindings", () => {
        const world = worldgen().bind("a", LogicLiteral.from(2));
        const world2 = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLiteral.from(3));
        const world3 = eq(LogicLvar.from("b"), LogicLiteral.from(3)).run(world);
        assertWorldEquality(world3, world2)
    });

    test("should bind lvar on top of bindings 2", () => {
        const world = worldgen().bind("a", LogicLiteral.from(2));
        const world2 = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLiteral.from(3));
        const world3 = eq(LogicLiteral.from(3), LogicLvar.from("b")).run(world);
        assertWorldEquality(world3, world2);
    });

    // test nested lvar bindings

    test("should bind nested lvar", () => {
        const world = worldgen().bind("a", LogicLiteral.from(2));
        const world2 = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLiteral.from(2));
        const world3 = eq(LogicLvar.from("b"), LogicLvar.from("a")).run(world);
        assertWorldEquality(world3, world2);
    });

    test("should bind nested lvar 2", () => {
        const world = worldgen().bind("a", LogicLiteral.from(2));
        const world2 = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLiteral.from(2));
        const world3 = eq(LogicLvar.from("a"), LogicLvar.from("b")).run(world);
        assertWorldEquality(world3, world2);
    });

    // test nested lvar bindings with literals

    test("should bind nested lvar with literals", () => {
        const world = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLvar.from("a"));
        const world2 = worldgen().bind("a", LogicLiteral.from(2)).bind("b", LogicLiteral.from(2));
        const world3 = eq(LogicLvar.from("b"), LogicLiteral.from(2)).run(world);
        assertWorldEquality(world3, world2);
    });

    // Test lists

    test("should bind list", () => {
        const world = worldgen();
        const world2 = worldgen().bind("a", LogicList.fromFinite(2));
        const world3 = eq(LogicList.fromFinite(2), LogicLvar.from("a")).run(world);
        assertWorldEquality(world3, world2);
    });

    test("should bind list with nested lvar", () => {
        const world = worldgen().bind("b", LogicLiteral.from(3));
        const world2 = worldgen().bind("a", LogicList.fromFinite(2,3));
        const world3 = eq(LogicLvar.from("a"), LogicList.fromFinite(2, LogicLvar.from("b"))).run(world);
        assertWorldEquality(world3, world2);
    });

    // Infinite lists
    test("should bind infinite list", () => {
        const world = worldgen().bind("a", LogicList.fromInfinite(2));
        const world2 = worldgen().bind("a", LogicList.fromInfinite(2, 3));
        const world3 = eq(LogicList.fromInfinite(2, 3), LogicLvar.from("a")).run(world);
        assertWorldEquality(world3, world2);
    });

    test("should bind infinite list with nested lvar", () => {
        const world = worldgen().bind("b", LogicLiteral.from(3));
        const world2 = worldgen().bind("a", LogicList.fromInfinite(2, 3));
        const world3 = eq(LogicLvar.from("a"), LogicList.fromInfinite(2, LogicLvar.from("b"))).run(world);
        assertWorldEquality(world3, world2);
    });

    test("should bind infinite list with another infinite list", () => {
        const world = worldgen({
            a: LogicList.fromInfinite(2),
            b: LogicList.fromInfinite(3),
        });
        const world2 = worldgen({
            a: LogicList.fromInfinite(2, 3),
            b: LogicList.fromInfinite(3),
        });
        const world3 = eq(LogicList.fromInfinite(2, 3), LogicLvar.from("a")).run(world);
        assertWorldEquality(world3, world2);
    });

    test("should bind infinite list with another infinite list 2", () => {
        const world = worldgen({
            a: LogicList.fromInfinite(2),
            b: LogicList.fromInfinite(3),
        });
        const world2 = worldgen({
            a: LogicList.fromInfinite(2, 3, 4),
            b: LogicList.fromInfinite(3),
        });
        const world3 = eq(LogicLvar.from("a"), LogicList.fromInfinite(2, 3, LogicLvar.from("c"))).run(world);
        const world4 = eq(LogicLvar.from("c"), LogicLiteral.from(4)).runAll(world3);
        assertWorldEquality(world3, world2);
    });

});

function assertWorldEquality(world3: World[], world2: World) {
    expect(world3).toHaveLength(1);
    // const [world4] = world3;
    // expect(world2.equals(world4)).toBe(true);
    expect(world2.intersects(world3)).toBe(true);
}
