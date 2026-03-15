import { test, describe, expect } from "@jest/globals";
import type { TermGeneric } from "src/types/AstGeneric";
import type { CodeLocation } from "src/redo/codeloc";
import { interp, makeQueryEnv } from "./interp";
import { make } from "src/utils/make_better_typed";
import { defaultCodeLocation } from "src/redo/codeloc";

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

function id(name: string) {
	return make.identifier(cloc, name);
}
function lit(
	kind: "string" | "number" | "boolean" | "null",
	value: string,
) {
	return make.literal(kind, value);
}
function conj(...terms: TermGeneric<CodeLocation>[]) {
	return make.conjunction(terms);
}
function fresh(
	vars: ReturnType<typeof id>[],
	body: ReturnType<typeof conj>,
) {
	return make.fresh(vars, body);
}
function call(
	source: string,
	...args: (
		| ReturnType<typeof id>
		| ReturnType<typeof lit>
	)[]
) {
	return make.predicate_call(id(source), args);
}
function def(
	name: string,
	args: ReturnType<typeof id>[],
	body: ReturnType<typeof conj>,
) {
	return make.predicate_definition(id(name), args, body);
}

describe("newinterp", () => {
	test("simple unify", () => {
		const main = conj(
			call("unify", id("x"), lit("string", "hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("hello");
	});

	test("conjunction and builtin empty", () => {
		const main = conj(call("empty", id("x")));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].x).toEqual([]);
	});

	test("recursive membero", () => {
		const memberoBody = conj(
			make.disjunction([
				call("first", id("a"), id("l")),
				fresh(
					[id("vv")],
					conj(
						call("rest", id("l"), id("vv")),
						call("membero", id("a"), id("vv")),
					),
				),
			]),
		);
		const main = conj(
			call(
				"list",
				id("theList"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("membero", id("init1"), id("theList")),
		);
		const ast: TermGeneric<CodeLocation>[] = [
			def("membero", [id("a"), id("l")], memberoBody),
			main,
		];
		const states = runInterp(3, ast, {
			vars: ["init1", "theList"],
		});
		const init1Vals = states.map((s) => s.init1);
		// Should include a, b, c among answers (recursive membero)
		expect(init1Vals).toContain("a");
		expect(init1Vals).toContain("b");
		expect(init1Vals).toContain("c");
		expect(states.length).toBeGreaterThanOrEqual(3);
	});

	test.skip("appendo via internal_append", () => {
		const main = conj(
			call("internal_append", id("x"), id("y"), id("z")),
			call("list", id("x"), lit("string", "a")),
			call("list", id("y"), lit("string", "b")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x", "y", "z"],
		});
		expect(states.length).toBeGreaterThanOrEqual(1);
		expect(states[0].z).toBe("[a, [b, []]]");
	});

	test("nested fresh shadowing", () => {
		const ast: TermGeneric<CodeLocation>[] = [
			fresh(
				[id("x")],
				conj(
					call("unify", id("x"), lit("string", "outer")),
					fresh(
						[id("x")],
						conj(
							call(
								"unify",
								id("x"),
								lit("string", "inner"),
							),
						),
					),
					call("unify", id("x"), lit("string", "outer")),
				),
			),
		];
		const states = runInterp(5, ast);
		expect(states.length).toBe(1);
	});

	test("disjunction yields multiple answers", () => {
		const main = conj(
			make.disjunction([
				call("unify", id("x"), lit("string", "a")),
				call("unify", id("x"), lit("string", "b")),
				call("unify", id("x"), lit("string", "c")),
			]),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(3);
		expect(states.map((s) => s.x).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("cyclic unification fails", () => {
		const main = conj(
			call("unify", id("x"), id("y")),
			call("cons", id("x"), id("y"), id("pair")),
			call("unify", id("y"), id("pair")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x", "y", "pair"],
		});
		expect(states.length).toBe(0);
	});

	test("with is transparent", () => {
		const main = make.with(
			id("_"),
			conj(call("unify", id("x"), lit("string", "ok"))),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("ok");
	});
});
