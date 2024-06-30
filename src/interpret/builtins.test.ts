/**
 * For each of the builtin fns, check them with various configurations of their input logic vars/logic literals
	"set_key_of",
	"unify",
	"unify_left",
	"unify_right",
	"unify_equal",
	"unify_not_equal",
	"slice",
	"length",
	"list",
	"first",
	"rest",
	"empty",
    "add",
    "subtract",
    "multiply",
    "divide",
    "modulo",
    "negate",
    "internal_file",
    "internal_import", 
*/

import { describe, test, expect } from "@jest/globals";

import { builtinWorld } from "./builtins";
import { LogicList, LogicLiteral, LogicLvar, LogicMap, LogicPredicate, World } from "src/WorldGoal";

describe("Builtin world has values", () => {
    test("set_key_of", () => {
        const setkeyof = builtinWorld.getLvar("set_key_of");
        expect(setkeyof).toBeDefined();
        expect(setkeyof).toBeInstanceOf(LogicPredicate);
    });
    test("unify", () => {
        const unify = builtinWorld.getLvar("unify");
        expect(unify).toBeDefined();
        expect(unify).toBeInstanceOf(LogicPredicate);
    });
    test("unify_left", () => {
        const unify_left = builtinWorld.getLvar("unify_left");
        expect(unify_left).toBeDefined();
        expect(unify_left).toBeInstanceOf(LogicPredicate);
    });
    test("unify_right", () => {
        const unify_right = builtinWorld.getLvar("unify_right");
        expect(unify_right).toBeDefined();
        expect(unify_right).toBeInstanceOf(LogicPredicate);
    });
    test("unify_equal", () => {
        const unify_equal = builtinWorld.getLvar("unify_equal");
        expect(unify_equal).toBeDefined();
        expect(unify_equal).toBeInstanceOf(LogicPredicate);
    });
    test("unify_not_equal", () => {
        const unify_not_equal = builtinWorld.getLvar("unify_not_equal");
        expect(unify_not_equal).toBeDefined();
        expect(unify_not_equal).toBeInstanceOf(LogicPredicate);
    });
    test("slice", () => {
        const slice = builtinWorld.getLvar("slice");
        expect(slice).toBeDefined();
        expect(slice).toBeInstanceOf(LogicPredicate);
    });
    test("length", () => {
        const length = builtinWorld.getLvar("length");
        expect(length).toBeDefined();
        expect(length).toBeInstanceOf(LogicPredicate);
    });
    test("list", () => {
        const list = builtinWorld.getLvar("list");
        expect(list).toBeDefined();
        expect(list).toBeInstanceOf(LogicPredicate);
    });
    test("first", () => {
        const first = builtinWorld.getLvar("first");
        expect(first).toBeDefined();
        expect(first).toBeInstanceOf(LogicPredicate);
    });
    test("rest", () => {
        const rest = builtinWorld.getLvar("rest");
        expect(rest).toBeDefined();
        expect(rest).toBeInstanceOf(LogicPredicate);
    });
    test("empty", () => {
        const empty = builtinWorld.getLvar("empty");
        expect(empty).toBeDefined();
        expect(empty).toBeInstanceOf(LogicPredicate);
    });
    test("add", () => {
        const add = builtinWorld.getLvar("add");
        expect(add).toBeDefined();
        expect(add).toBeInstanceOf(LogicPredicate);
    });
    test("subtract", () => {
        const subtract = builtinWorld.getLvar("subtract");
        expect(subtract).toBeDefined();
        expect(subtract).toBeInstanceOf(LogicPredicate);
    });
    test("multiply", () => {
        const multiply = builtinWorld.getLvar("multiply");
        expect(multiply).toBeDefined();
        expect(multiply).toBeInstanceOf(LogicPredicate);
    });
    test("divide", () => {
        const divide = builtinWorld.getLvar("divide");
        expect(divide).toBeDefined();
        expect(divide).toBeInstanceOf(LogicPredicate);
    });
    test("modulo", () => {
        const modulo = builtinWorld.getLvar("modulo");
        expect(modulo).toBeDefined();
        expect(modulo).toBeInstanceOf(LogicPredicate);
    });
    test("negate", () => {
        const negate = builtinWorld.getLvar("negate");
        expect(negate).toBeDefined();
        expect(negate).toBeInstanceOf(LogicPredicate);
    });

    test("internal_file", () => {
        const internal_file = builtinWorld.getLvar("internal_file");
        expect(internal_file).toBeDefined();
        expect(internal_file).toBeInstanceOf(LogicPredicate);
    });

    test("internal_import", () => {
        const internal_import = builtinWorld.getLvar("internal_import");
        expect(internal_import).toBeDefined();
        expect(internal_import).toBeInstanceOf(LogicPredicate);
    });
});

describe("Builtin world fns work when given all literals", () => {
    // set_key_of(a, b, c) => a[b] = c
    test("set_key_of", () => {
        const zf = builtinWorld.getLvar("set_key_of");
        if (!zf) {
            throw new Error("set_key_of is not defined");
        }
        const set_key_of = builtinWorld.walk(
            zf
        );
        if (set_key_of instanceof LogicPredicate) {
            const mapo = new Map();
            mapo.set("whatevkey", LogicLiteral.from(3));
            const dictc = LogicMap.from(mapo)
            const res = set_key_of.value.fn(
                dictc, LogicLiteral.from("whatevkey"), LogicLiteral.from(3)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("set_key_of is not a LogicPredicate, ");
        }
    });

    // unify(a, b) => a = b
    test("unify", () => {
        const zf = builtinWorld.getLvar("unify");
        if (!zf) {
            throw new Error("unify is not defined");
        }
        const unify = builtinWorld.walk(
            zf
        );
        if (unify instanceof LogicPredicate) {
            const res = unify.value.fn(
                LogicLiteral.from(1), LogicLiteral.from(2)
            );
            expect(
                [[World.fail], []]
            ).toContainEqual(res.run(new World(new Map())));
        } else {
            throw new Error("unify is not a LogicPredicate, ");
        }
    });

    // unify_left(a, b) => a = b
    test("unify_left", () => {
        const zf = builtinWorld.getLvar("unify_left");
        if (!zf) {
            throw new Error("unify_left is not defined");
        }
        const unify_left = builtinWorld.walk(
            zf
        );
        if (unify_left instanceof LogicPredicate) {
            const res = unify_left.value.fn(
                LogicLiteral.from(1), LogicLiteral.from(2)
            );
            expect(
                [[World.fail], []]
            ).toContainEqual(res.run(new World(new Map())));
        } else {
            throw new Error("unify_left is not a LogicPredicate, ");
        }
    });

    // unify_right(a, b) => a = b
    test("unify_right", () => {
        const zf = builtinWorld.getLvar("unify_right");
        if (!zf) {
            throw new Error("unify_right is not defined");
        }
        const unify_right = builtinWorld.walk(
            zf
        );
        if (unify_right instanceof LogicPredicate) {
            const res = unify_right.value.fn(
                LogicLiteral.from(1), LogicLiteral.from(2)
            );
            expect(
                [[World.fail], []]
            ).toContainEqual(res.run(new World(new Map())))
        } else {
            throw new Error("unify_right is not a LogicPredicate, ");
        }
    });

    // unify_equal(a, b) => a = b
    test("unify_equal", () => {
        const zf = builtinWorld.getLvar("unify_equal");
        if (!zf) {
            throw new Error("unify_equal is not defined");
        }
        const unify_equal = builtinWorld.walk(
            zf
        );
        if (unify_equal instanceof LogicPredicate) {
            const res = unify_equal.value.fn(
                LogicLiteral.from(1), LogicLiteral.from(2)
            );
            expect(
                [[World.fail], []]
            ).toContainEqual(res.run(new World(new Map())));
        } else {
            throw new Error("unify_equal is not a LogicPredicate, ");
        }
    });

    // unify_not_equal(a, b) => a != b
    test("unify_not_equal", () => {
        const zf = builtinWorld.getLvar("unify_not_equal");
        if (!zf) {
            throw new Error("unify_not_equal is not defined");
        }
        const unify_not_equal = builtinWorld.walk(
            zf
        );
        if (unify_not_equal instanceof LogicPredicate) {
            const res = unify_not_equal.value.fn(
                LogicLiteral.from(1), LogicLiteral.from(2)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("unify_not_equal is not a LogicPredicate, ");
        }
    });

    // slice(a, b, c) => a[b] = c
    test("slice", () => {
        const zf = builtinWorld.getLvar("slice");
        if (!zf) {
            throw new Error("slice is not defined");
        }
        const slice = builtinWorld.walk(
            zf
        );
        if (slice instanceof LogicPredicate) {
            const listf = LogicList.from(
                4,
                LogicLiteral.from(2), LogicLiteral.from(1), 
                LogicLiteral.from(3), LogicLiteral.from(1)
            );
            const res = slice.value.fn(
                listf, LogicLiteral.from(2), LogicLiteral.from(3)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("slice is not a LogicPredicate, ");
        }
    });

    // length(a, b) => a.length = b

    test("length", () => {
        const zf = builtinWorld.getLvar("length");
        if (!zf) {
            throw new Error("length is not defined");
        }
        const length = builtinWorld.walk(
            zf
        );
        if (length instanceof LogicPredicate) {
            const listf = LogicList.from(
                4,
                LogicLiteral.from(1), LogicLiteral.from(2), 
                LogicLiteral.from(3), LogicLiteral.from(4)
            );
            const res = length.value.fn(
                listf, LogicLiteral.from(4)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("length is not a LogicPredicate, ");
        }
    });

    // list(a, b, c) => a = [b, c]
    test("list", () => {
        const zf = builtinWorld.getLvar("list");
        if (!zf) {
            throw new Error("list is not defined");
        }
        const list = builtinWorld.walk(
            zf
        );
        if (list instanceof LogicPredicate) {
            const res = list.value.fn(
                new LogicLvar('_'), LogicLiteral.from(2), LogicLiteral.from(3)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
                } else {
            throw new Error("list is not a LogicPredicate, ");
        }
    });

    // first(a, b) => a = b[0]
    test("first", () => {
        const zf = builtinWorld.getLvar("first");
        if (!zf) {
            throw new Error("first is not defined");
        }
        const first = builtinWorld.walk(
            zf
        );
        if (first instanceof LogicPredicate) {
            const listf = LogicList.from(
                4,
                LogicLiteral.from(1), LogicLiteral.from(2), 
                LogicLiteral.from(3), LogicLiteral.from(4)
            );
            const res = first.value.fn(
                LogicLiteral.from(1), listf
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("first is not a LogicPredicate, ");
        }
    });

    // rest(a, b) => a = b[1:]
    test("rest", () => {
        const zf = builtinWorld.getLvar("rest");
        if (!zf) {
            throw new Error("rest is not defined");
        }
        const rest = builtinWorld.walk(
            zf
        );
        if (rest instanceof LogicPredicate) {
            const listf = LogicList.from(
                4,
                LogicLiteral.from(1), LogicLiteral.from(2), 
                LogicLiteral.from(3), LogicLiteral.from(4)
            );
            const res = rest.value.fn(
                LogicList.from(3, LogicLiteral.from(2), LogicLiteral.from(3), LogicLiteral.from(4)),
                listf,
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("rest is not a LogicPredicate, ");
        }
    });

    // empty(a) => a = []
    test("empty", () => {
        const zf = builtinWorld.getLvar("empty");
        if (!zf) {
            throw new Error("empty is not defined");
        }
        const empty = builtinWorld.walk(
            zf
        );
        if (empty instanceof LogicPredicate) {
            const res = empty.value.fn(
                LogicList.from(0)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("empty is not a LogicPredicate, ");
        }
    });

    // add(a, b, c) => a + b = c
    test("add", () => {
        const zf = builtinWorld.getLvar("add");
        if (!zf) {
            throw new Error("add is not defined");
        }
        const add = builtinWorld.walk(
            zf
        );
        if (add instanceof LogicPredicate) {
            const res = add.value.fn(
                LogicLiteral.from(2), LogicLiteral.from(1), LogicLiteral.from(3)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("add is not a LogicPredicate, ");
        }
    });

    // subtract(a, b, c) => a - b = c

    test("subtract", () => {
        const zf = builtinWorld.getLvar("subtract");
        if (!zf) {
            throw new Error("subtract is not defined");
        }
        const subtract = builtinWorld.walk(
            zf
        );
        if (subtract instanceof LogicPredicate) {
            const res = subtract.value.fn(
                LogicLiteral.from(5), LogicLiteral.from(3), LogicLiteral.from(2)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("subtract is not a LogicPredicate, ");
        }
    });

    // multiply(a, b, c) => a * b = c
    test("multiply", () => {
        const zf = builtinWorld.getLvar("multiply");
        if (!zf) {
            throw new Error("multiply is not defined");
        }
        const multiply = builtinWorld.walk(
            zf
        );
        if (multiply instanceof LogicPredicate) {
            const res = multiply.value.fn(
                LogicLiteral.from(3), LogicLiteral.from(2), LogicLiteral.from(6)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("multiply is not a LogicPredicate, ");
        }
    });

    // divide(a, b, c) => a / b = c
    test("divide", () => {
        const zf = builtinWorld.getLvar("divide");
        if (!zf) {
            throw new Error("divide is not defined");
        }
        const divide = builtinWorld.walk(
            zf
        );
        if (divide instanceof LogicPredicate) {
            const res = divide.value.fn(
                LogicLiteral.from(6), LogicLiteral.from(2), LogicLiteral.from(3)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("divide is not a LogicPredicate, ");
        }
    });

    // modulo(a, b, c) => a % b = c

    test("modulo", () => {
        const zf = builtinWorld.getLvar("modulo");
        if (!zf) {
            throw new Error("modulo is not defined");
        }
        const modulo = builtinWorld.walk(
            zf
        );
        if (modulo instanceof LogicPredicate) {
            const res = modulo.value.fn(
                LogicLiteral.from(5), LogicLiteral.from(3), LogicLiteral.from(2)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("modulo is not a LogicPredicate, ");
        }
    });

    // negate(a, b) => a = -b
    test("negate", () => {
        const zf = builtinWorld.getLvar("negate");
        if (!zf) {
            throw new Error("negate is not defined");
        }
        const negate = builtinWorld.walk(
            zf
        );
        if (negate instanceof LogicPredicate) {
            const res = negate.value.fn(
                LogicLiteral.from(-1), LogicLiteral.from(1)
            );
            expect(res.run(new World(new Map()))).toHaveLength(1);
        } else {
            throw new Error("negate is not a LogicPredicate, ");
        }
    });

    // internal_file(a, b) => b = <file contents of path a as a string>

    test("internal_file", () => {
        const zf = builtinWorld.getLvar("internal_file");
        if (!zf) {
            throw new Error("internal_file is not defined");
        }
        const internal_file = builtinWorld.walk(
            zf
        );
        if (internal_file instanceof LogicPredicate) {
            const res = internal_file.value.fn(
                LogicLiteral.from("./src/WorldGoal.ts"), LogicLiteral.from("file contents")
            );
            expect(res.run(new World(new Map()))).toHaveLength(0);
        } else {
            throw new Error("internal_file is not a LogicPredicate, ");
        }
    });

    // internal_import(a, b) => b = <imported module from path a as a logic object>
    // test("internal_import", () => {
    //     const zf = builtinWorld.getLvar("internal_import");
    //     if (!zf) {
    //         throw new Error("internal_import is not defined");
    //     }
    //     const internal_import = builtinWorld.walk(
    //         zf
    //     );
    //     if (internal_import instanceof LogicPredicate) {
    //         const res = internal_import.value.fn(
    //             LogicLiteral.from("fs"), LogicLiteral.from("module")
    //         );
    //         expect(res.run(new World(new Map()))).toHaveLength(1);
    //     } else {
    //         throw new Error("internal_import is not a LogicPredicate, ");
    //     }
    // });

});