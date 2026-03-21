import { pprintDsAst } from "src/pprint/pprintast";
import { describe, test, expect } from "@jest/globals";
import type {
	TermGeneric,
	ExpressionGeneric,
	PredicateCallGeneric,
	PredicateDefinitionGeneric,
} from "src/types/AstGeneric";
import {
	conjunction1,
	ezlvar,
} from "src/utils/make_better_typed";
import { make_predicate } from "src/utils/make_desugared_ast";

describe.skip("pprintDsAst", () => {
	test("formats conjunction AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "conjunction",
			terms: [
				{
					type: "predicate_call",
					source: ezlvar.pred1(),
					args: [],
				},
				{
					type: "predicate_call",
					source: ezlvar.pred2(),
					args: [],
				},
			],
		};
		const expected = `conj:
    pred1()
    pred2()`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("formats disjunction AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "disjunction",
			terms: [
				{
					type: "predicate_call",
					source: ezlvar.predA(),
					args: [],
				},
				{
					type: "predicate_call",
					source: ezlvar.predB(),
					args: [],
				},
			],
		};
		const expected = `disj:
    predA()
    predB()`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("formats predicate call AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "predicate_call",
			source: ezlvar.myFunc(),
			args: [
				{ type: "literal", value: "arg1", kind: "string" },
			],
		};
		const expected = `myFunc("arg1")`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("formats predicate definition AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "predicate_definition",
			name: ezlvar.definePred(),
			args: [],
			body: conjunction1({
				type: "predicate_call",
				source: ezlvar.innerPred(),
				args: [],
			} as PredicateCallGeneric<undefined>),
		};
		const expected = `DEFINE definePred as () => 
    innerPred()`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("formats fresh AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "fresh",
			nominal: false,
			newVars: [ezlvar.var1()],
			body: {
				type: "conjunction",
				terms: [
					{
						type: "predicate_call",
						source: ezlvar.somePred(),
						args: [],
					},
				],
			},
		};
		const expected = `fresh var1:
    conj:
        somePred()`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("formats with AST correctly", () => {
		const ast: TermGeneric<undefined> = {
			type: "with",
			name: make_predicate(ezlvar.withName(), []),
			body: {
				type: "conjunction",
				terms: [
					{
						type: "predicate_call",
						source: ezlvar.bodyPred(),
						args: [],
					},
				],
			},
		};
		const expected = `with withName:
    conj:
        bodyPred()`;
		expect(pprintDsAst(ast)).toEqual(expected);
	});

	test("throws error on invalid AST type", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Any is used to test invalid AST
		const ast: any = { type: "invalid_type" };
		expect(() => pprintDsAst(ast)).toThrow(
			`Invalid ast type: ${ast}`,
		);
	});
});
