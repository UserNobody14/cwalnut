import {
	WorldGoal,
	type LogicValue,
	PredicateLogic,
	World,
	LogicPredicate,
	LogicList,
	LogicMap,
	eq,
	LogicLiteral,
	LogicLvar,
} from "src/WorldGoal";
import { Builtin } from "src/utils/make_desugared_ast";
import fs from "fs";
import { debugHolder, warnHolder } from "src/warnHolder";


const toVal = (val?: LogicValue): any => {
    if (!val) {
        return val;
    }
    if (val instanceof LogicLiteral) {
        return val.value;
    } if (val instanceof LogicLvar) {
        return val.getName();
    } if (val instanceof LogicList) {
        return val.value;
    } if (val instanceof LogicMap) {
        return val.value;
    }
    return val;
}

const emptyList = new LogicList([]);
type BuiltinRecord = Record<Builtin, (...args: LogicValue[]) => WorldGoal>;
const builtins2: BuiltinRecord = {
    unify: (itema: any, itemb: any) => {
        debugHolder(
            "unify",
            itema.toString(),
            itemb.toString()
        );
        return eq(itema, itemb);
    },
    set_key_of: (
        obj: LogicValue,
        key: LogicValue,
        value: LogicValue
    ) => {
        if (!key.isLiteral())
            throw new Error("Key must be a literal");
        const keyStr = key.value as string;
        const vve = new Map();
        vve.set(keyStr, value);
        debugHolder(
            "set_key_of",
            obj.toString(),
            key.toString(),
            value.toString()
        );
        return eq(obj, new LogicMap(vve, "infinite"));
    },
    first: (firstElem: LogicValue, fullList: LogicValue) => {
        if (fullList instanceof LogicList) {
            if (fullList.value.length === 0) {
                warnHolder("first: b is empty");
                return WorldGoal.fail;
            }
            return eq(firstElem, fullList.value[0]);
        } if (fullList instanceof LogicLvar) {
            return eq(
                fullList,
                new LogicList([firstElem], 'infinite', null)
            );
        }
        warnHolder(
            "first: b is not a list or lvar: ",
            fullList.toString()
        );
        return WorldGoal.fail;
    },
    rest: (remainder1: LogicValue, fullList1: LogicValue) => {
        debugHolder(
            "rest: remainder",
            remainder1.toString(),
            fullList1.toString()
        );
        if (fullList1 instanceof LogicList) {
            if (fullList1.value.length === 0) {
                warnHolder("rest: b is empty");
                return WorldGoal.fail;
            }
            if (fullList1.value.length === 1) {
                return eq(emptyList, remainder1);
            }
            const slicedValue = [...fullList1.value].slice(1);
            debugHolder("slicedValue", slicedValue);
            return eq(new LogicList(slicedValue), remainder1);
        } if (remainder1 instanceof LogicList) {
            // return eq(fullList1, new LogicList([]));
            return new WorldGoal((world) => {
                return eq(
                    fullList1,
                    new LogicList([
                        world.getFreshLvar(),
                        ...remainder1.value,
                    ])
                ).run(world);
            });
        }
        warnHolder(
            "rest: b is not a list or lvar: ",
            remainder1.toString(),
            fullList1.toString()
        );
        return WorldGoal.fail;
    },
    empty: (a: LogicValue) => {
        return eq(a, emptyList);
    },

    list: (outarg: LogicValue, ...args: LogicValue[]) => {
        debugHolder("list:::::::::", outarg.toString(), args);
        return eq(outarg, new LogicList(args, 'finite', args.length));
    },
    length: (item1: LogicValue, len1: LogicValue) => {
        return new WorldGoal((world) => {
            const item = world.walk(item1);
            const len = world.walk(len1);
            if (item instanceof LogicList) {
                debugHolder("length: item", item.toString());
                return eq(
                    len,
                    new LogicLiteral(item.value.length)
                ).run(world);
            } if (item instanceof LogicMap) {
                debugHolder(
                    "length: item (map)",
                    item.toString(),
                    item.value.size,
                    len?.toString()
                );
                if (len &&
                    len instanceof LogicLiteral &&
                    item1 instanceof LogicLvar) {
                    debugHolder(
                        "Binding map",
                        len,
                        item.value.size,
                        item1.getName(),
                        item1.toString()
                    );
                    return eq(
                        len,
                        new LogicLiteral(item.value.size)
                    ).run(
                        world.bind(
                            item1.getName(),
                            new LogicMap(
                                item.value,
                                "finite",
                                Number(len.value)
                            )
                        )
                    );
                }
                // Set the map to finite (as constraint??)
                return eq(
                    len,
                    new LogicLiteral(item.value.size)
                ).run(world);
            }
            warnHolder("length: a is not a list or map");
            return [World.fail];
        });
    },
    unify_left: function (...args: LogicValue[]): WorldGoal {
        if (args.length !== 2) {
            throw new Error("unify_left requires 2 arguments");
        }
        const [a, b] = args;
        return eq(a, b);
    },
    unify_right: function (...args: LogicValue[]): WorldGoal {
        if (args.length !== 2) {
            throw new Error("unify_right requires 2 arguments");
        }
        const [a, b] = args;
        return eq(a, b);
    },
    unify_equal: function (...args: LogicValue[]): WorldGoal {
        if (args.length !== 2) {
            throw new Error("unify_equal requires 2 arguments");
        }
        const [a, b] = args;
        return eq(a, b);
    },
    unify_not_equal: function (...args: LogicValue[]): WorldGoal {
        if (args.length !== 2) {
            throw new Error("unify_left requires 2 arguments");
        }
        const [a, b] = args;
        return new WorldGoal((world) => {
            if (world.walk(a) === world.walk(b)) {
                return [World.fail];
            }
            return [world];
        });
    },
// slice(a, b, c) means that a[b] = c
slice: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        // const a = toVal(world.walk(args[0]) ?? args[0]);
        // const b = toVal(world.walk(args[1]) ?? args[1]);
        // const c = toVal(world.walk(args[2]) ?? args[2]);

        const a = world.walk(args[0]) ?? args[0];
        const b = world.walk(args[1]) ?? args[1];
        const c = world.walk(args[2]) ?? args[2];

        if (a instanceof LogicList) {
            if (b instanceof LogicLiteral) {
                if (c instanceof LogicLvar) {
                    return eq(c, a.value[Number(b.value)]).run(world);
                } else {
                    return eq(c, a.value[Number(b.value)]).run(world);
                }
            }
            return WorldGoal.disj(
                ...a.value.map((item, index) => {
                    return WorldGoal.and(
                        eq(c, item),
                        eq(b, new LogicLiteral(index))
                    );
                })
            ).run(world);
        } else if (Array.isArray(a)) {
            if (typeof b === "number") {
                if (c instanceof LogicLvar) {
                    return eq(c, a[b]).run(world);
                } else {
                    return eq(c, a[b]).run(world);
                }
            }
            return WorldGoal.disj(
                ...a.map((item, index) => {
                    return WorldGoal.and(
                        eq(c, item),
                        eq(b, new LogicLiteral(index))
                    );
                })
            ).run(world);
        } else {
            throw new Error("a is not a list: " + a.toString());
            // return [World.fail];
        }
    });
},
// add(a, b, c) means a + b = c
add: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));
        const c = toVal(world.walk(args[2]));

        if (a instanceof LogicLvar) {
            return world.eq(a, c - b);
        } else if (b instanceof LogicLvar) {
            return world.eq(b, c - a);
        } else if (c instanceof LogicLvar) {
            return world.eq(c, a + b);
        } else {
            return a + b === c ? [world] : [World.fail];
        }
    });
},
// subtract(a, b, c) means a - b = c
subtract: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));
        const c = toVal(world.walk(args[2]));

        if (a instanceof LogicLvar) {
            return world.eq(a, c + b);
        } else if (b instanceof LogicLvar) {
            return world.eq(b, a - c);
        } else if (c instanceof LogicLvar) {
            return world.eq(c, a - b);
        } else {
            return a - b === c ? [world] : [World.fail];
        }
    });
},
// multiply(a, b, c) means a * b = c
multiply: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));
        const c = toVal(world.walk(args[2]));

        if (a instanceof LogicLvar) {
            return world.eq(a, c / b);
        } else if (b instanceof LogicLvar) {
            return world.eq(b, c / a);
        } else if (c instanceof LogicLvar) {
            return world.eq(c, a * b);
        } else {
            return a * b === c ? [world] : [World.fail];
        }
    });
},
// divide(a, b, c) means a / b = c
divide: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));
        const c = toVal(world.walk(args[2]));

        if (a instanceof LogicLvar) {
            return world.eq(a, c * b);
        } else if (b instanceof LogicLvar) {
            return world.eq(b, a / c);
        } else if (c instanceof LogicLvar) {
            return world.eq(c, a / b);
        } else {
            return a / b === c ? [world] : [World.fail];
        }
    });
},
// modulo(a, b, c) means a % b = c
modulo: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));
        const c = toVal(world.walk(args[2]));

        if (a instanceof LogicLvar) {
            return [World.fail]; // Cannot solve for a
        } else if (b instanceof LogicLvar) {
            return [World.fail]; // Cannot solve for b
        } else if (c instanceof LogicLvar) {
            return world.eq(c, a % b);
        } else {
            return a % b === c ? [world] : [World.fail];
        }
    });
},
// negate(a, b) means -a = b
negate: function (...args: LogicValue[]): WorldGoal {
    return new WorldGoal((world) => {
        const a = toVal(world.walk(args[0]));
        const b = toVal(world.walk(args[1]));

        if (a instanceof LogicLvar) {
            return world.eq(a, -b);
        } else if (b instanceof LogicLvar) {
            return world.eq(b, -a);
        } else {
            return -a === b ? [world] : [World.fail];
        }
    });
},
// file(a, b) means read file a and store the contents in b
    internal_file: function (...args: LogicValue[]): WorldGoal {
        return new WorldGoal((world) => {
            const a = toVal(world.walk(args[0]));
            const b = toVal(world.walk(args[1]));

            if (a instanceof LogicLvar) {
                return [World.fail]; // Cannot solve for a
            } else {
                // return [world]; // TODO: Implement file reading
                try {
                    const fileContents = fs.readFileSync(a, "utf8");
                    return eq(b, new LogicLiteral(fileContents)).run(world);
                } catch (e) {
                    debugHolder("Error reading file", process.cwd());
                    return [World.fail];
                }
                //return eq(b, new LogicLiteral(fileContents)).run(world);
            }
        });
    },
    internal_import: function (...args: LogicValue[]): WorldGoal {
        throw new Error("Function not implemented.");
    }
};
export const builtinWorld = new World(new Map(), false);
for (const [key, value] of Object.entries(builtins2)) {
	// truev key === 'unify'
	const ignoreVals = ["unify", "set_key_of", "length"];
	builtinWorld.addLvar(
		key,
		new LogicPredicate(
			new PredicateLogic(
				value as any,
				ignoreVals.includes(key),
			),
		),
	);
}
