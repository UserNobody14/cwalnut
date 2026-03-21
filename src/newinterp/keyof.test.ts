import { test, describe, expect } from "@jest/globals";
import type { TermGeneric } from "src/types/AstGeneric";
import type { CodeLocation } from "src/redo/codeloc";
import { interp } from "./interp";
import { fresh1, make } from "src/utils/make_better_typed";
import { defaultCodeLocation } from "src/redo/codeloc";
import { run, all } from "src/logic";
import { builtinGoals } from "./builtins";
import { freshInternal } from "src/logic/AnyFreshFn";
import {
	jsonToKeyOfGoal,
	bodyAstToKeyOfGoal,
	envToKeyOfGoal,
	astBodyToJson,
} from "./jsonKeyOf";
import { Map as ImmMap } from "immutable";
import { makeLiteral } from "src/logic/makelvar";
import {
	conj,
	call,
	id,
	lit,
	def,
	cx,
	cl,
} from "./asttestutils";

const cloc: CodeLocation = defaultCodeLocation;

/** Run interp and collect states; return { states, queryEnv }. */
function runInterp(
	n: number,
	ast: TermGeneric<CodeLocation>[],
	options?: { vars?: string[] },
) {
	const r = interp(n, ast, options);
	return r;
}

describe("keyof tests", () => {
	test("set_key_of then unify value", () => {
		const main = fresh1(
			[cx.obj],
			cl.set_key_of(cx.obj, lit("k"), cx.val),
			cl.unify(cx.val, lit("hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

	test("set_key_of then unify value with different key", () => {
		const main = fresh1(
			[cx.obj],
			cl.set_key_of(cx.obj, lit("k"), cx.val),
			cl.unify(cx.val, lit("hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

	test("set two different objects with the same key (different values) and unify them (should fail)", () => {
		const main = fresh1(
			[cx.obj1, cx.obj2],
			cl.set_key_of(cx.obj1, lit("k"), lit("hello")),
			cl.set_key_of(cx.obj2, lit("k"), lit("world")),
			cl.unify(cx.obj1, cx.obj2),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["obj1", "obj2"],
		});
		expect(states.length).toBe(0);
	});

	test("set two different objects with the same key (same value) and unify them (should succeed)", () => {
		const main = fresh1(
			[cx.obj1, cx.obj2],
			cl.set_key_of(cx.obj1, lit("k"), cx.val),
			cl.set_key_of(cx.obj2, lit("k"), cx.val),
			cl.unify(cx.val, lit("hello")),
			cl.unify(cx.obj1, cx.obj2),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

	test("set two different objects with the same key (one with value, one with variable) and unify them (should succeed and solve for the variable)", () => {
		const main = fresh1(
			[cx.obj1, cx.obj2],
			cl.unify(cx.val, lit("hello")),
			cl.set_key_of(cx.obj1, lit("k"), cx.val),
			cl.set_key_of(cx.obj2, lit("k"), cx.val2),
			cl.unify(cx.obj1, cx.obj2),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["val", "val2"],
		});
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
		expect(states[0].val2).toBe("hello");
	});

	test("jsonToKeyOfGoal: nested JSON on a fresh var produces one state", () => {
		const goal = all(
			builtinGoals(),
			freshInternal((obj) =>
				jsonToKeyOfGoal(obj, {
					a: 1,
					b: "two",
					c: { d: true },
				}),
			),
		);
		const states = run(1, goal);
		expect(states.length).toBe(1);
	});

	test("jsonToKeyOfGoal: array in JSON", () => {
		const goal = all(
			builtinGoals(),
			freshInternal((obj) =>
				jsonToKeyOfGoal(obj, { arr: [1, "two", false] }),
			),
		);
		const states = run(1, goal);
		expect(states.length).toBe(1);
	});

	test("astBodyToJson: conjunction has type and terms", () => {
		const body = conj(cl.unify(cx.x, lit("a")));
		const json = astBodyToJson(body);
		expect(json.type).toBe("conjunction");
		expect(Array.isArray(json.terms)).toBe(true);
		expect(
			(json.terms as Record<string, unknown>[]).length,
		).toBe(1);
		const term = (
			json.terms as Record<string, unknown>[]
		)[0];
		expect(term).toEqual({
			type: "predicate_call",
			source: { type: "identifier", value: "unify" },
			args: [
				{ type: "identifier", value: "x" },
				{ type: "literal", kind: "string", value: "a" },
			],
		});
		expect(term.type).toBe("predicate_call");
	});

	test("bodyAstToKeyOfGoal: conjunction body produces one state", () => {
		const body = conj(cl.unify(cx.x, lit("a")));
		const goal = all(
			builtinGoals(),
			freshInternal((v) => bodyAstToKeyOfGoal(v, body)),
		);
		const states = run(1, goal);
		expect(states.length).toBe(1);
	});

	test("envToKeyOfGoal: env bindings produce one state", () => {
		const env = ImmMap<
			string,
			ReturnType<typeof makeLiteral>
		>().set("x", makeLiteral("hello"));
		const goal = all(
			builtinGoals(),
			freshInternal((envVar) =>
				envToKeyOfGoal(envVar, env),
			),
		);
		const states = run(1, goal);
		expect(states.length).toBe(1);
	});
});
