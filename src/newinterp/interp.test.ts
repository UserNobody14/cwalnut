import { test, describe, expect } from "@jest/globals";
import type { TermGeneric } from "src/types/AstGeneric";
import type { CodeLocation } from "src/redo/codeloc";
import { interp } from "./interp";
import {
	fresh1,
	freshNominal1,
	make,
} from "src/utils/make_better_typed";

import {
	conj,
	call,
	id,
	lit,
	def,
	cx,
	cl,
} from "./asttestutils";
describe("newinterp", () => {
	test("simple unify", () => {
		const main = conj(cl.unify(cx.x, lit("hello")));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("hello");
	});

	test("conjunction and builtin empty", () => {
		const main = conj(cl.empty(cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
			vars: ["x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].x).toEqual([]);
	});

	test("set_key_of then unify value", () => {
		const main = fresh1(
			[cx.obj],
			cl.set_key_of(cx.obj, lit("k"), cx.val),
			cl.unify(cx.val, lit("hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

	test("recursive membero", () => {
		const memberoBody = conj(
			make.disjunction([
				cl.first(cx.a, cx.l),
				fresh1(
					[cx.vv],

					cl.rest(cx.l, cx.vv),
					cl.membero(cx.a, cx.vv),
				),
			]),
		);
		const main = conj(
			call(
				"list",
				cx.theList,
				lit("a"),
				lit("b"),
				lit("c"),
			),
			cl.membero(cx.init1, cx.theList),
		);
		const ast: TermGeneric<CodeLocation>[] = [
			def("membero", [cx.a, cx.l], memberoBody),
			main,
		];
		const states = interp(3, ast, {
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
			cl.list(cx.x, lit("a")),
			cl.list(cx.y, lit("b")),
			cl.internal_append(cx.x, cx.y, cx.z),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
			vars: ["x", "y", "z"],
		});
		expect(states.length).toBeGreaterThanOrEqual(1);
		expect(states[0].z).toEqual(["a", "b"]);
	});

	test("nested fresh shadowing", () => {
		const ast: TermGeneric<CodeLocation>[] = [
			fresh1(
				[cx.x],

				cl.unify(cx.x, lit("outer")),
				fresh1(
					[cx.x],

					call("unify", cx.x, lit("inner")),
				),
				cl.unify(cx.x, lit("outer")),
			),
		];
		const states = interp(5, ast);
		expect(states.length).toBe(1);
	});

	test("disjunction yields multiple answers", () => {
		const main = conj(
			make.disjunction([
				cl.unify(cx.x, lit("a")),
				cl.unify(cx.x, lit("b")),
				cl.unify(cx.x, lit("c")),
			]),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
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
			cl.unify(cx.x, cx.y),
			cl.cons(cx.x, cx.y, cx.pair),
			cl.unify(cx.y, cx.pair),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
			vars: ["x", "y", "pair"],
		});
		expect(states.length).toBe(0);
	});

	test("with invokes predicate with body AST and env objects", () => {
		const withAcceptBody = conj(
			cl.unify(cx.bodyAst, cx.bodyAst),
		);
		const withHandler = def(
			"with_accept",
			[cx.bodyAst, cx.env],
			withAcceptBody,
		);
		const main = conj(
			make.with(
				make.predicate_call(cx.with_accept, []),
				conj(cl.unify(cx.x, lit("ok"))),
			),
			cl.unify(cx.x, lit("ok")),
		);
		const ast: TermGeneric<CodeLocation>[] = [
			withHandler,
			main,
		];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("ok");
	});

	test("with undefined predicate fails", () => {
		const main = make.with(
			make.predicate_call(cx.nonexistent_pred, []),
			conj(cl.unify(cx.x, lit("ok"))),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		expect(() => interp(5, ast, { vars: ["x"] })).toThrow(
			"Variable nonexistent_pred not found in env",
		);
	});

	test("unify_left: left ground unifies with right", () => {
		const main = conj(cl.unify_left(lit("a"), cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("unify_left: left unbound (lvar) fails", () => {
		const main = conj(cl.unify_left(cx.x, lit("a")));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("unify_left: both ground equal succeeds", () => {
		const main = conj(
			call("unify_left", lit("a"), lit("a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast);
		expect(states.length).toBe(1);
	});

	test("unify_right: right ground unifies with left", () => {
		const main = conj(cl.unify_right(cx.x, lit("a")));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("unify_right: right unbound (lvar) fails", () => {
		const main = conj(cl.unify_right(lit("a"), cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("unify_not_equal: different values succeed", () => {
		const main = conj(
			cl.unify(cx.x, lit("b")),
			cl.unify_not_equal(cx.x, lit("a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("b");
	});

	test("unify_not_equal: same value fails", () => {
		const main = conj(
			cl.unify(cx.x, lit("a")),
			cl.unify_not_equal(cx.x, lit("a")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(0);
	});

	test("length: list ground yields count", () => {
		const main = conj(
			call("list", cx.l, lit("a"), lit("b"), lit("c")),
			cl.length(cx.l, cx.n),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["l", "n"] });
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(3);
	});

	test("length: empty list yields 0", () => {
		const main = conj(
			cl.empty(cx.l),
			cl.length(cx.l, cx.n),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["l", "n"] });
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(0);
	});

	test("slice: list and index ground yields element", () => {
		const main = conj(
			call("list", cx.l, lit("a"), lit("b"), lit("c")),
			cl.slice(cx.l, lit(1), cx.x),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("b");
	});

	test("slice: index 0 yields first element", () => {
		const main = conj(
			call("list", cx.l, lit("a"), lit("b")),
			cl.slice(cx.l, lit(0), cx.x),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("multiply: two ground gives product", () => {
		const main = conj(
			call("multiply", lit(2), lit(3), cx.x),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(6);
	});

	test("multiply: one unknown (a, c ground) solves for b", () => {
		const main = conj(
			call("multiply", lit(2), cx.x, lit(6)),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(3);
	});

	test("divide: two ground gives quotient", () => {
		const main = conj(call("divide", lit(6), lit(2), cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(3);
	});

	test("modulo: two ground gives remainder", () => {
		const main = conj(call("modulo", lit(7), lit(3), cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(1);
	});

	test("negate: ground gives negative", () => {
		const main = conj(cl.negate(lit(5), cx.x));
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe(-5);
	});

	test("integration: list then length only", () => {
		const main = fresh1(
			[cx.theList],
			call(
				"list",
				cx.theList,
				lit("a"),
				lit("b"),
				lit("c"),
			),
			cl.length(cx.theList, cx.len),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["len"] });
		expect(states.length).toBe(1);
		expect(states[0].len).toBe(3);
	});

	test("integration: list then slice only", () => {
		const main = conj(
			call("list", cx.l, lit("a"), lit("b"), lit("c")),
			cl.slice(cx.l, lit(0), cx.x),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["l", "x"] });
		expect(states.length).toBe(1);
		expect(states[0].x).toBe("a");
	});

	test("integration: length then slice", () => {
		const main = conj(
			call("list", cx.l, lit("a"), lit("b"), lit("c")),
			cl.length(cx.l, cx.n),
			cl.slice(cx.l, lit(0), cx.x),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, {
			vars: ["l", "n", "x"],
		});
		expect(states.length).toBe(1);
		expect(states[0].n).toBe(3);
		expect(states[0].x).toBe("a");
	});

	test("integration: add and multiply chain", () => {
		const main = conj(
			call("add", lit(1), lit(2), cx.s),
			call("multiply", cx.s, lit(3), cx.p),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = interp(5, ast, { vars: ["s", "p"] });
		expect(states.length).toBe(1);
		expect(states[0].s).toBe(3);
		expect(states[0].p).toBe(9);
	});

	describe("nominal logic builtins (tie, hash)", () => {
		test("tie: builds tie term from nominal and body", () => {
			const main = freshNominal1(
				[cx.nom],
				cl.unify(cx.nom, cx.nomf),
				cl.tie(cx.t, cx.nom, lit("body")),
			);
			const ast: TermGeneric<CodeLocation>[] = [main];
			const states = interp(5, ast, {
				vars: ["nomf", "t"],
			});
			expect(states.length).toBe(1);
			expect(states[0].t).toEqual({
				name: "Nom(0)",
				term: "body",
			});
			expect(states[0].nomf).toBe("Nom(0)");
		});

		test("hash: succeeds when nominal is available in term", () => {
			const main = freshNominal1(
				[cx.n],
				cl.tie(cx.t, cx.n, lit("a")),
				cl.hash(cx.n, cx.t),
			);
			const ast: TermGeneric<CodeLocation>[] = [main];
			const states = interp(5, ast, { vars: ["n", "t"] });
			expect(states.length).toBe(1);
			expect(states[0].t).toEqual({
				name: "Nom(0)",
				term: "a",
			});
		});

		test("nominal integration: two gen_nominal then tie each", () => {
			const main = freshNominal1(
				[cx.a, cx.b],
				cl.unify(cx.a, cx.aa),
				cl.unify(cx.b, cx.bb),
				cl.tie(cx.t1, cx.a, lit("x")),
				cl.tie(cx.t2, cx.b, lit("y")),
			);
			const ast: TermGeneric<CodeLocation>[] = [main];
			const states = interp(5, ast, {
				vars: ["aa", "bb", "t1", "t2"],
			});
			expect(states.length).toBe(1);
			expect(states[0].aa).toBe("Nom(0)");
			expect(states[0].bb).toBe("Nom(1)");
			expect(states[0].t1).toEqual({
				name: "Nom(0)",
				term: "x",
			});
			expect(states[0].t2).toEqual({
				name: "Nom(1)",
				term: "y",
			});
		});
	});
});
