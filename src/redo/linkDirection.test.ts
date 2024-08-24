import type { PredicateCallGeneric } from "src/types/AstGeneric";
import { linkDirection } from "./linkDirection";
import { describe, expect, test } from "@jest/globals";
import { make } from "src/utils/make_better_typed";

describe("linkDirection", () => {
    const {
        a,
        b,
        c,
        d
    } = make.lvar2(undefined);
    const {
        unknown
    } = make.pred2(undefined);
    test("a in prev and b in next", () => {
        const prev = [[unknown(a)]];
        const next = [[unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toEqual({ first: "a", next: "b" });
    });

    test("b in prev and a in next", () => {
        const prev = [[unknown(b)]];
        const next = [[unknown(a)]];
        expect(linkDirection("a", "b", prev, next)).toEqual({ first: "b", next: "a" });
    });

    test("a in prev and b in next", () => {
        const prev = [[unknown(a)]];
        const next = [[unknown(b)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "a", next: "b" });
    });

    test("b in prev and a in next", () => {
        const prev = [[unknown(b)]];
        const next = [[unknown(a)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "b", next: "a" });
    });

    test("a not found", () => {
        const prev = [[unknown(c)]];
        const next = [[unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("b not found", () => {
        const prev = [[unknown(a)]];
        const next = [[unknown(c)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("neither a nor b found", () => {
        const prev = [[unknown(c)]];
        const next = [[unknown(d)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("a and b in the same array", () => {
        const prev = [[unknown(b)]];
        const next: PredicateCallGeneric<undefined>[][] = [];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("both b and a in prev", () => {
        const prev = [[unknown(a), unknown(b)]];
        const next: PredicateCallGeneric<undefined>[][] = [];
        expect(linkDirection("a", "b", prev, next)).toEqual(false);
    });

    test("both a and b in next", () => {
        const prev: PredicateCallGeneric<undefined>[][] = [];
        const next = [[unknown(a), unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toEqual(false);
    });

    test("both a and b in prev and next", () => {
        const prev = [[unknown(a), unknown(b)]];
        const next = [[unknown(a), unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toEqual(false);
    });
});

describe("linkDirection More complex", () => {
    const {
        a,
        b,
        c,
        d
    } = make.lvar2(undefined);
    const {
        unknown
    } = make.pred2(undefined);
    test("a in prev and b in next", () => {
        const prev = [[unknown(a)], [unknown(a), unknown(c)]];
        const next = [[unknown(b)], [unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toEqual({ first: "a", next: "b" });
    });

    test("b in prev and a in next", () => {
        const prev = [[unknown(b)], [unknown(b)]];
        const next = [[unknown(a)], [unknown(a)]];
        expect(linkDirection("a", "b", prev, next)).toEqual({ first: "b", next: "a" });
    });

    test("a in prev and b in next", () => {
        const prev = [[unknown(a)], [unknown(a)]];
        const next = [[unknown(b)], [unknown(b)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "a", next: "b" });
    });

    test("b in prev and a in next", () => {
        const prev = [[unknown(b)], [unknown(b)]];
        const next = [[unknown(a)], [unknown(a)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "b", next: "a" });
    });

    test("a not found", () => {
        const prev = [[unknown(c)], [unknown(c)]];
        const next = [[unknown(b)], [unknown(b)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("b not found", () => {
        const prev = [[unknown(a)], [unknown(a)]];
        const next = [[unknown(c)], [unknown(c)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });

    test("neither a nor b found", () => {
        const prev = [[unknown(c)], [unknown(c)]];
        const next = [[unknown(d)], [unknown(d)]];
        expect(linkDirection("a", "b", prev, next)).toBe(false);
    });


    test("a in prev and b in next", () => {
        const prev = [[unknown(a)], []];
        const next = [[unknown(b)], [unknown(b)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "a", next: "b" });
    });

    test("b in prev and a in next missing", () => {
        const prev = [[], [unknown(b)]];
        const next = [[unknown(a)], [unknown(a)]];
        expect(linkDirection("b", "a", prev, next)).toEqual({ first: "b", next: "a" });
    });


});