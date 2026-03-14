import { test, describe, expect } from "@jest/globals";
import {
	countVarsInCalls,
	splitAlongScope,
} from "src/lens/into-vars";
import {
	conjunction1,
	make,
} from "src/utils/make_better_typed";
import { Map as ImmMap } from "immutable";
import { jest } from "@jest/globals";
import type {
	PredicateCallGeneric,
	TermGeneric,
} from "src/types/AstGeneric";

describe("countVarsInCalls", () => {
	test("counts vars in calls", () => {
		const { a, b, c } = make.lvar2("info" as const);
		const { unify, other } = make.pred2("info" as const);
		const terms = [unify(a, b), other()];
		const result = countVarsInCalls(terms);
		expect(result).toEqual(
			ImmMap({
				a: 1,
				b: 1,
				unify: 1,
				other: 1,
			}),
		);
	});

	test("counts vars in calls 2", () => {
		const { a, b, c } = make.lvar2("info" as const);
		const { unify, other } = make.pred2("info" as const);
		const terms = [unify(a, b), other(c)];
		const result = countVarsInCalls(terms);
		expect(result).toEqual(
			ImmMap({
				a: 1,
				b: 1,
				c: 1,
				unify: 1,
				other: 1,
			}),
		);
	});

	test("counts vars in calls 3", () => {
		const { a, b, c } = make.lvar2("info" as const);
		const { unify, other } = make.pred2("info" as const);
		const terms = [unify(a, b), other(c), other(c)];
		const result = countVarsInCalls(terms);
		expect(result).toEqual(
			ImmMap({
				a: 1,
				b: 1,
				c: 2,
				unify: 1,
				other: 2,
			}),
		);
	});
});

// Use a mock to ensure split is called with the correct arguments
describe("split", () => {
	const { a, b, c, d } = make.lvar2("info" as const);
	const { unify, other } = make.pred2("info" as const);
	const term = conjunction1(
		unify(a, b),
		unify(b, c),
		other(c),
		other(d),
	);
	const mockFn = jest.fn(
		(
			b4: PredicateCallGeneric<"info">[][],
			after: PredicateCallGeneric<"info">[][],
			currCall: PredicateCallGeneric<"info">,
			vars: [
				ImmMap<string, string>,
				ImmMap<string, string>,
			],
		): [
			PredicateCallGeneric<"info">,
			[ImmMap<string, string>, ImmMap<string, string>],
		] => {
			return [currCall, vars];
		},
	);

	test("calls split with correct arguments", () => {
		const resultv = splitAlongScope(
			term,
			mockFn,
			[
				ImmMap<string, string>(),
				ImmMap<string, string>(),
			] as const,
			[],
			[],
		);

		expect(mockFn).toBeCalledTimes(4);
		expect(mockFn).toHaveBeenNthCalledWith(
			1,
			[],

			[[unify(b, c), other(c), other(d)]],
			unify(a, b),
			[ImmMap(), ImmMap()],
		);
		expect(mockFn).toHaveBeenNthCalledWith(
			2,

			[[unify(a, b)]],
			[[other(c), other(d)]],
			unify(b, c),
			[ImmMap(), ImmMap()],
		);
		expect(mockFn).toHaveBeenNthCalledWith(
			3,
			[[unify(a, b), unify(b, c)]],
			[[other(d)]],
			other(c),
			[ImmMap(), ImmMap()],
		);
		expect(mockFn).toHaveBeenNthCalledWith(
			4,
			[[unify(a, b), unify(b, c), other(c)]],
			[],
			other(d),
			[ImmMap(), ImmMap()],
		);
	});
});
