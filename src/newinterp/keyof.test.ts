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



describe("keyof tests", () => {
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

    test("set_key_of then unify value with different key", () => {
		const main = conj(
			call("set_key_of", id("obj"), lit("string", "k"), id("val")),
			call("unify", id("val"), lit("string", "hello")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

    test("set two different objects with the same key (different values) and unify them (should fail)", () => {
		const main = conj(
			call("set_key_of", id("obj1"), lit("string", "k"), lit("string", "hello")),
			call("set_key_of", id("obj2"), lit("string", "k"), lit("string", "world")),
			call("unify", id("obj1"), id("obj2")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["obj1", "obj2"] });
		expect(states.length).toBe(0);
	});

    test("set two different objects with the same key (same value) and unify them (should succeed)", () => {
		const main = conj(
			call("set_key_of", id("obj1"), lit("string", "k"), id("val")),
			call("set_key_of", id("obj2"), lit("string", "k"), id("val")),
            call("unify", id("val"), lit("string", "hello")),
			call("unify", id("obj1"), id("obj2")),
		);
		const ast: TermGeneric<CodeLocation>[] = [main];
		const states = runInterp(5, ast, { vars: ["val"] });
		expect(states.length).toBe(1);
		expect(states[0].val).toBe("hello");
	});

    test("set two different objects with the same key (one with value, one with variable) and unify them (should succeed and solve for the variable)", () => {
        const main = conj(
            call("unify", id("val"), lit("string", "hello")),
            call("set_key_of", id("obj1"), lit("string", "k"), id("val")),
            call("set_key_of", id("obj2"), lit("string", "k"), id("val2")),
            call("unify", id("obj1"), id("obj2")),
        );
        const ast: TermGeneric<CodeLocation>[] = [main];
        const states = runInterp(5, ast, { vars: ["val", "val2"] });
        expect(states.length).toBe(1);
        expect(states[0].val).toBe("hello");
        expect(states[0].val2).toBe("hello");
    });
});