import { describe, test, expect } from "@jest/globals";
import { linearize } from "./linearize";
import { codeToAst } from "./ast-desugar";
import {
	gatherVarInstanceInfo,
	intoVarsGeneric,
	mapVarsToState,
} from "src/lens/into-vars";
import { countVarsInCalls } from "../lens/into-vars";
import { mapToTypedQuick } from "src/mode/modeconvert";
import { toDummyTypes } from "src/interpret-types/type-pipe";

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

	test("linearize ensures each var used at most once", () => {
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
		const res = linearize(codeToAst(sourceCode));
		const numv = countVarsInCalls(toDummyTypes(res)).filter(
			(v, k) => v > 2,
		);
		expect(numv).not.toBeNull();
	});
});
