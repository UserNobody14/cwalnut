import { describe, test, expect } from "@jest/globals";
import { linearize } from "./linearize";
import { codeToAst } from "./ast-desugar";

describe("Linearize", () => {
    test("linearize doesnt destroy vals", () => {
        const sourceCode = `
val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;
        expect(linearize(codeToAst(sourceCode))).not.toBeNull();
    });
});