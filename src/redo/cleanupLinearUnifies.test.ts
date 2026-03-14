import { cleanupLinearUnifies } from "./cleanupLinearUnifies";
import { Set as ImmSet } from "immutable";
import {
	countVarsInCalls,
	mapPredCalls,
} from "src/lens/into-vars";
import { make } from "src/utils/make_better_typed";
import {
	jest,
	test,
	describe,
	expect,
} from "@jest/globals";

describe("cleanupLinearUnifies", () => {
	test("returns terms unchanged with pass flag true", () => {
		const terms = [
			make.predicate_call(
				make.identifier("info", "test"),
				[],
			),
		];
		const result = cleanupLinearUnifies(
			terms,
			ImmSet(),
			true,
		);
		expect(result).toEqual(terms);
	});

	// Cleans up simple unneeded unify
	test("cleans up simple unneeded unify chain", () => {
		const { a, b, c, d } = make.lvar2("info" as const);
		const { unify } = make.pred2("info" as const);
		const terms = [unify(a, b), unify(b, d)];
		const result = cleanupLinearUnifies(terms);
		expect(result).toEqual([]);
	});
});
