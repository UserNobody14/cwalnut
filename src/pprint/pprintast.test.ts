import { pprintDsAst } from "src/pprint/pprintast";
import { describe, test, expect } from "@jest/globals";
import type { TermDsAst, ExpressionDsAst, PredicateCallDsAst, PredicateDefinitionDsAst } from "src/types/DesugaredAst";
import { conjunction1 } from "src/utils/make_desugared_ast";

describe("pprintDsAst", () => {
    test("formats conjunction AST correctly", () => {
        const ast: TermDsAst = {
            type: "conjunction",
            terms: [
                { type: "predicate_call", source: { type: "identifier", value: "pred1" }, args: [] },
                { type: "predicate_call", source: { type: "identifier", value: "pred2" }, args: [] }
            ]
        };
    const expected = `conj:
    pred1()
    pred2()`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("formats disjunction AST correctly", () => {
        const ast: TermDsAst = {
            type: "disjunction",
            terms: [
                { type: "predicate_call", source: { type: "identifier", value: "predA" }, args: [] },
                { type: "predicate_call", source: { type: "identifier", value: "predB" }, args: [] }
            ]
        };
        const expected = `disj:
    predA()
    predB()`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("formats predicate call AST correctly", () => {
        const ast: TermDsAst = {
            type: "predicate_call",
            source: { type: "identifier", value: "myFunc" },
            args: [{ type: "literal", value: "arg1", kind: "string" }]
        };
        const expected = `myFunc("arg1")`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("formats predicate definition AST correctly", () => {
        const ast: TermDsAst = {
            type: "predicate_definition",
            name: { type: "identifier", value: "definePred" },
            args: [],
            body: conjunction1(
                { type: "predicate_call", source: { type: "identifier", value: "innerPred" }, args: [] } as PredicateCallDsAst
            )
        };
        const expected = `DEFINE definePred as () => 
    innerPred()`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("formats fresh AST correctly", () => {
        const ast: TermDsAst = {
            type: "fresh",
            newVars: [{ type: "identifier", value: "var1" }],
            body: {
                type: "conjunction",
                terms: [{ type: "predicate_call", source: { type: "identifier", value: "somePred" }, args: [] }]
            }
        };
        const expected = `fresh var1:
    conj:
        somePred()`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("formats with AST correctly", () => {
        const ast: TermDsAst = {
            type: "with",
            name: { type: "identifier", value: "withName" },
            body: {
                type: "conjunction",
                terms: [
                    { type: "predicate_call", source: { type: "identifier", value: "bodyPred" }, args: [] }
                ]
            }
        };
        const expected = `with withName:
    conj:
        bodyPred()`;
        expect(pprintDsAst(ast)).toEqual(expected);
    });

    test("throws error on invalid AST type", () => {
        // biome-ignore lint/suspicious/noExplicitAny: Any is used to test invalid AST
        const ast: any = { type: "invalid_type" };
        expect(() => pprintDsAst(ast)).toThrow(`Invalid ast type: ${ast}`);
    });
});