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

	test("set_key_of then unify value", () => {
		const main = conj(
			call("set_key_of", id("obj"), lit("string", "k"), id("val")),
			call("unify", id("val"), lit("string", "hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
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
		expect(states.length).toBe(3);
		expect(states.map((s) => s.init1).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("appendo via internal_append", () => {
		const main = conj(
			call("list", id("x"), lit("string", "a")),
			call("list", id("y"), lit("string", "b")),
			call("internal_append", id("x"), id("y"), id("z")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["x", "y", "z"],
		});
		expect(states.length).toBeGreaterThanOrEqual(1);
		expect(states[0].z).toEqual(["a", "b"]);
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

	test("with invokes predicate with body AST and env objects", () => {
		const withAcceptBody = conj(call("unify", id("bodyAst"), id("bodyAst")));
		const withHandler = def(
			"with_accept",
			[id("bodyAst"), id("env")],
			withAcceptBody,
		);
		const main = conj(
			make.with(
				id("with_accept"),
				conj(call("unify", id("x"), lit("string", "ok"))),
			),
			call("unify", id("x"), lit("string", "ok")),
		);
		const ast: TermGeneric<CodeLocation>[] = [withHandler, main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("ok");
	});

	test("with undefined predicate fails", () => {
		const main = make.with(
			id("nonexistent_pred"),
			conj(call("unify", id("x"), lit("string", "ok"))),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		expect(() => runInterp(5, ast, { vars: ["x"] })).toThrow("Not a predicate");
	});

	test("unify_left: left ground unifies with right", () => {
		const main = conj(
			call("unify_left", lit("string", "a"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("unify_left: left unbound (lvar) fails", () => {
		const main = conj(
			call("unify_left", id("x"), lit("string", "a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("unify_left: both ground equal succeeds", () => {
		const main = conj(
			call(
				"unify_left",
				lit("string", "a"),
				lit("string", "a"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast);
		expect(states.length).toBe(1);
	});

	test("unify_right: right ground unifies with left", () => {
		const main = conj(
			call("unify_right", id("x"), lit("string", "a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("unify_right: right unbound (lvar) fails", () => {
		const main = conj(
			call("unify_right", lit("string", "a"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("unify_not_equal: different values succeed", () => {
		const main = conj(
			call("unify", id("x"), lit("string", "b")),
			call("unify_not_equal", id("x"), lit("string", "a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("b");
	});

	test("unify_not_equal: same value fails", () => {
		const main = conj(
			call("unify", id("x"), lit("string", "a")),
			call("unify_not_equal", id("x"), lit("string", "a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("length: list ground yields count", () => {
		const main = conj(
			call(
				"list",
				id("l"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("length", id("l"), id("n")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["l", "n"] });
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(3);
	});

	test("length: empty list yields 0", () => {
		const main = conj(
			call("empty", id("l")),
			call("length", id("l"), id("n")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["l", "n"] });
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(0);
	});

	test("slice: list and index ground yields element", () => {
		const main = conj(
			call(
				"list",
				id("l"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("slice", id("l"), lit("number", "1"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("b");
	});

	test("slice: index 0 yields first element", () => {
		const main = conj(
			call(
				"list",
				id("l"),
				lit("string", "a"),
				lit("string", "b"),
			),
			call("slice", id("l"), lit("number", "0"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("multiply: two ground gives product", () => {
		const main = conj(
			call(
				"multiply",
				lit("number", "2"),
				lit("number", "3"),
				id("x"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(6);
	});

	test("multiply: one unknown (a, c ground) solves for b", () => {
		const main = conj(
			call(
				"multiply",
				lit("number", "2"),
				id("x"),
				lit("number", "6"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(3);
	});

	test("divide: two ground gives quotient", () => {
		const main = conj(
			call(
				"divide",
				lit("number", "6"),
				lit("number", "2"),
				id("x"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(3);
	});

	test("modulo: two ground gives remainder", () => {
		const main = conj(
			call(
				"modulo",
				lit("number", "7"),
				lit("number", "3"),
				id("x"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(1);
	});

	test("negate: ground gives negative", () => {
		const main = conj(
			call("negate", lit("number", "5"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(-5);
	});

	test("integration: list then length only", () => {
		const main = conj(
			call(
				"list",
				id("theList"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("length", id("theList"), id("len")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["len"] });
		expect(states.length).toBe(1);
		expect(states[0].len).toBe(3);
	});

	test("integration: list then slice only", () => {
		const main = conj(
			call(
				"list",
				id("l"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("slice", id("l"), lit("number", "0"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("integration: length then slice", () => {
		const main = conj(
			call(
				"list",
				id("l"),
				lit("string", "a"),
				lit("string", "b"),
				lit("string", "c"),
			),
			call("length", id("l"), id("n")),
			call("slice", id("l"), lit("number", "0"), id("x")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, {
			vars: ["l", "n", "x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(3);
		expect(states[0].x).toBe("a");
	});

	test("integration: add and multiply chain", () => {
		const main = conj(
			call(
				"add",
				lit("number", "1"),
				lit("number", "2"),
				id("s"),
			),
			call(
				"multiply",
				id("s"),
				lit("number", "3"),
				id("p"),
			),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["s", "p"] });
		expect(states.length).toBe(1);
		expect(states[0].s).toBe(3);
		expect(states[0].p).toBe(9);
	});
});
