import { describe, test, expect } from "@jest/globals";
import {
	pprintGeneric,
	pprintType,
	pprintTypeMeta,
} from "./pprintgeneric";
import type { Type } from "src/types/EzType";
import type {
	ConjunctionGeneric,
	PredicateCallGeneric,
} from "src/types/AstGeneric";

describe("pprintGeneric Tests", () => {
	test("pprintGeneric with predicate_call", () => {
		const ast: PredicateCallGeneric<object> = {
			type: "predicate_call",
			source: {
				type: "identifier",
				value: "testFunc",
				info: {},
			},
			args: [],
		};
		const result = pprintGeneric(ast, () => "");
		expect(result).toEqual("testFunc()");
	});

	test("pprintGeneric with conjunction", () => {
		const ast: ConjunctionGeneric<object> = {
			type: "conjunction",
			terms: [
				{
					type: "predicate_call",
					source: {
						type: "identifier",
						value: "func1",
						info: {},
					},
					args: [],
				},
				{
					type: "predicate_call",
					source: {
						type: "identifier",
						value: "func2",
						info: {},
					},
					args: [],
				},
			],
		};
		const result = pprintGeneric(ast, () => "");
		expect(result).toEqual(`conj:
    func1()
    func2()`);
	});

	test("pprintGeneric with invalid AST", () => {
		// biome-ignore lint/suspicious/noExplicitAny: Any is used to test invalid AST
		const ast = { type: "invalid_type" } as any;
		expect(() => pprintGeneric(ast, () => "")).toThrow(
			"Invalid ast type",
		);
	});
});

describe("pprintType Tests", () => {
	test("pprintType with simple type", () => {
		const type: Type = { type: "simple", name: "int" };
		const result = pprintType(type);
		expect(result).toEqual("int");
	});

	test("pprintType with union type", () => {
		const type: Type = {
			type: "union",
			types: [
				{ type: "simple", name: "int" },
				{ type: "simple", name: "string" },
			],
		};
		const result = pprintType(type);
		expect(result).toEqual("(int | string)");
	});

	test("pprintType with complex type", () => {
		const type: Type = {
			type: "complex",
			name: "List",
			fresh: [],
			generics: [{ type: "simple", name: "int" }],
		};
		const result = pprintType(type);
		expect(result).toEqual("List<int>");
	});
});

describe("pprintTypeMeta Tests", () => {
	test("pprintTypeMeta with withtype context", () => {
		const ctx = {
			withtype: "withtype",
			withio: "without_io",
			is_being_called: false,
		} as const;
		const type: Type = { type: "simple", name: "int" };
		const result = pprintTypeMeta(ctx, type);
		expect(result).toEqual(": int");
	});

	test("pprintTypeMeta with without_type context", () => {
		const ctx = {
			withtype: "without_type",
			withio: "without_io",
			is_being_called: false,
		} as const;
		const type: Type = { type: "simple", name: "int" };
		const result = pprintTypeMeta(ctx, type);
		expect(result).toEqual("");
	});
});
