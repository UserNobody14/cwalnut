import { Map as ImmMap } from "immutable";

abstract class LogicItem {
    abstract unify: (other: LogicItem) => LogicItem | false; // returns unified single var
}

export class LogicVal extends LogicItem {
    constructor(public value: string | number | null | boolean) {
        super();
    }
    unify = (other: LogicItem) => {
        if (other instanceof LogicVal && other.value === this.value) {
            return this;
        }
        if (other instanceof VarLogic) {
            return this;
        }
        return false;
    }

    static create = (value: string | number | null | boolean) => {
        return new LogicVal(value);
    }
}

export class VarLogic extends LogicItem {
    constructor(public name: string) {
        super();
    }
    unify = (other: LogicItem): LogicItem | false => {
        if (other instanceof VarLogic && other.name === this.name) {
            return this;
        }
        return other;
    }

    static create = (name: string) => {
        return new VarLogic(name);
    }

}

export class PredLogic extends LogicItem {
    constructor(public fn: (...args: LogicItem[]) => LogicItem[][]) {
        super();
    }
    unify = (other: LogicItem): LogicItem | false => {
        if (other instanceof VarLogic) {
            return this;
        }
        return false;
    }
}

export class ListLogic extends LogicItem {
    constructor(public items: LogicItem[]) {
        super();
    }
    unify = (other: LogicItem): LogicItem | false => {
        if (other instanceof ListLogic) {
            if (other.items.length !== this.items.length) {
                return false;
            }
            const unified = this.items.map((item, i) => {
                return item.unify(other.items[i]);
            });
            if (unified.includes(false)) {
                return false;
            }
            return new ListLogic(unified as LogicItem[]);
        }
        return false;
    }
}

export class DictLogic extends LogicItem {
    constructor(public items: ImmMap<string, LogicItem>) {
        super();
    }
    unify = (other: LogicItem): LogicItem | false => {
        if (other instanceof DictLogic) {
            const unified = this.items.reduce<ImmMap<string, LogicItem> | false>((acc, item, key) => {
                if (!acc) return false;
                const otherItem = other.items.get(key);
                if (!otherItem) {
                    return false;
                }
                const unified1 = item.unify(otherItem);
                if (!unified1) {
                    return false;
                }
                return acc.set(key, unified1);
            }, ImmMap<string, LogicItem>());
            if (unified === false) {
                return false;
            }
            return new DictLogic(unified);
        }
        return false;
    }
}

export type WorldM = ImmMap<string, LogicItem>;

const fail: WorldM[] = [];
export const failG: Goal = () => fail;
export type Goal = (world: ImmMap<string, LogicItem>) => WorldM[];
export const conj = (...goals: Goal[]) => (world: ImmMap<string, LogicItem>) => {
    return goals.reduce((acc, goal) => {
        return acc.flatMap(goal);
    }, [world]);
}

export const disj = (...goals: Goal[]) => (world: ImmMap<string, LogicItem>) => {
    return goals.flatMap((goal) => goal(world));
}

export const fresh = (newVars: string[], body: Goal) => (world: ImmMap<string, LogicItem>) => {
    // instantiate new vars
    const newWorld = newVars.reduce((acc, v) => {
        return acc.set(v, new VarLogic(v));
    }, world);
    return body(newWorld);
}

export type predicate = (args: LogicItem[]) => LogicItem[][];

export const applyP = (p: predicate, args: LogicItem[]): Goal => {
    return (world: ImmMap<string, LogicItem>) => {
        return p(args).flatMap((result) => {
            return result.reduce<WorldM[]>((acc: WorldM[], item, i) => {
                const param = args[i];
                if (param instanceof VarLogic) {
                    return acc.flatMap(acc2 => acc2.set((param as VarLogic).name, item));
                }
                if (param instanceof LogicVal && item instanceof LogicVal && param.value !== item.value) {
                    return fail;
                }
                return acc;
            }, [world]);
        });
    }
}

export const walk = (item: LogicItem, world: ImmMap<string, LogicItem>): LogicItem => {
    if (item instanceof VarLogic) {
        const walked = world.get(item.name);
        if (walked) {
            if (walked instanceof VarLogic && walked.name !== item.name) {
                return walk(walked, world);
            }
            return walked;
        }
        return item;
    }
    return item;
}

export const eq = (a: LogicItem, b: LogicItem): Goal => {
    return (world: ImmMap<string, LogicItem>) => {
        if (a instanceof VarLogic && b instanceof VarLogic) {
            if (a.name === b.name) {
                return [world];
            }
            return fail;
        }
        if (a instanceof VarLogic) {
            const reunited = walk(b, world).unify(walk(a, world));
            if (!reunited) {
                return fail;
            }
            return [world.set(a.name, reunited)];
        }
        if (b instanceof VarLogic) {
            const reunited = walk(a, world).unify(walk(b, world));
            if (!reunited) {
                return fail;
            }
            return [world.set(b.name, reunited)];
        }
        if (a instanceof LogicVal && b instanceof LogicVal && a.value === b.value) {
            return [world];
        }
        return fail;
    }
}

export const unify_all = (...args: LogicItem[]): Goal => {
    return (world: ImmMap<string, LogicItem>) => {
        return args.reduce((acc, arg, i) => {
            return acc.flatMap((world2) => {
                return eq(arg, args[i])(world2);
            });
        }, [world]);
    }
}

export const run = (goal: Goal, world: ImmMap<string, LogicItem> = ImmMap()) => {
    return goal(world);
}

export const runToPred = (goal: Goal, w: WorldM): predicate => {
    return (args: LogicItem[]) => {
        return run(goal, w).map((world) => {
            return args.map((arg) => walk(arg, world));
        });
    }
}

export const runInitial = (goal: Goal, outputS: string[]) => {
    const output = outputS.map((s) => new VarLogic(s));
    const p = runToPred(goal, ImmMap());
    return p(output);
}