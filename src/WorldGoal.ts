import { LVar, SLogic } from "./logic";

// const qq = SLogic.lvar('qq');
// const _lvar0 = SLogic.lvar('_lvar0');
// const _lvar1 = SLogic.lvar('_lvar1');
// const _lvar2 = SLogic.lvar('_lvar2');
// const val = SLogic.lvar('val');
// const father = (a: any, b: any) => SLogic.disj(
//     SLogic.conj(SLogic.eq(a, "mcbob"), SLogic.eq(b, "bob")),
//     SLogic.conj(SLogic.eq(b, "bill"), SLogic.eq(a, "bob"))
// );
// const newRun = SLogic.run(
//     SLogic.and(
//         setKeyValue(val, 'father', _lvar0),
//         SLogic.eq(_lvar0, father),
//         setKeyValue(val, 'father', _lvar1),
//         applyF(_lvar1, ["bob", qq]),
//     ),
//     qq
// );
// console.log(newRun);
////////////////////
//////////////////
////////////////////
export class World {
    private lvarIncrement = 0;
    constructor(
        public lvars: Map<string, LogicValue>,
        public failed: boolean = false
    ) {
    }

    addLvar(name: string, lvar: LogicValue) {
        this.lvars.set(name, lvar);
    }

    getLvar(name: string): LogicValue | undefined {
        if (this.failed) {
            return undefined;
        }
        if (!this.lvars.has(name)) {
            throw new Error(`Lvar ${name} not found`);
        }
        return this.lvars.get(name);
    }

    getFreshLvar(): LogicValue {
        const lvar = new LogicLvar(`_lvar${this.lvarIncrement++}`);
        this.addLvar(lvar.getName(), lvar);
        return lvar;
    }

    walk(l: LogicValue): LogicValue | undefined {
        if (this.failed) {
            return undefined;
        }
        if (l instanceof LogicLvar) {
            const lvar = l;
            if (!this.lvars.has(lvar.name)) {
                // throw new Error(`Lvar ${lvar.name} not found`);
                this.addLvar(lvar.name, new LogicLvar(lvar.name));
            }
            const lvar2 = this.lvars.get(lvar.name);
            if (lvar2 === undefined) {
                return l;
            } else if (lvar2 instanceof LogicLvar) {
                if (lvar2.getName() !== lvar.name) {
                    console.warn(`Lvar ${lvar.name} is still unbound`);
                    return this.walk(lvar2);
                } else {
                    return lvar2;
                }
            } else {
                return lvar2;
            }
        }
        if (l instanceof LogicMap) {
            const map = l.value;
            let newMap = new Map<string, LogicValue>();
            for (const [key, value] of map.entries()) {
                const nvv = this.walk(value);
                newMap.set(key, nvv !== undefined ? nvv : value);
            }
            return new LogicMap(newMap, l.type);
        }
        if (l instanceof LogicList) {
            const list = l.value as LogicValue[];
            console.log('list', list.toString());
            let newList = list.map((item) => this.walk(item) ?? item);
            return new LogicList(newList);
        }
        return l;
    }

    bind(str: string, value: LogicValue): World {
        console.log('bind', str, value.toString());
        if (this.failed) {
            return this;
        }
        if (this.lvars.has(str)) {
            const lvar = this.lvars.get(str);
            if (lvar === undefined) {
                throw new Error(`Lvar ${str} not found`);
            }
            const walked = this.walk(lvar);
            if (walked !== undefined) {
                if (walked instanceof LogicLvar && walked.getName() === str) {
                    console.log('bindWalked2', str, value.toString());
                    this.addLvar(str, value);
                    return this;
                } else {
                    console.log('bindWalked1', str, walked.toString(), value.toString());
                    this.addLvar(str, value.unite(walked) ?? value);
                    return this;
                }
            } else {
                console.warn(`Lvar ${str} is still unbound?`);
                this.addLvar(str, value);
                return this;
            }
        } else {
            this.addLvar(str, value);
            return this.bind(str, value);
        }
    }

    toString = () => {

        return `World${
            this.failed ? ' (failed)' : ''
        }(\n${
            Array.from(this.lvars.entries()).map(([key, value]) => `${key}: ${value}`).join('\n')}\n)`;
    };

    static fail = new World(new Map(), true);

}
export class WorldGoal {
    constructor(
        public goal: (world: World) => World[]
    ) {
    }

    run(world: World): World[] {
        if (world.failed) {
            return [];
        }
        return this.goal(world).filter((world) => !world.failed)
    }

    runAll(worlds: World[]): World[] {
        return worlds.flatMap((world) => this.run(world));
    }

    conj(...goals: WorldGoal[]): WorldGoal {
        return new WorldGoal((world) => this.runAll(goals.reduce<World[]>((acc, goal) => acc.flatMap((world) => goal.run(world)), [world])));
    }

    static and(...goals: WorldGoal[]): WorldGoal {
        return new WorldGoal((world) => goals.reduce<World[]>((acc, goal) => acc.filter(
            (world) => !world.failed
        ).flatMap((world) => 
            world.failed ? [world] : goal.run(world)), [world]));
            // goal.run(world)), [world]));
    }

    static disj(...goals: WorldGoal[]): WorldGoal {
        // return new WorldGoal((world) => goals.flatMap((goal) => goal.run(world)));
        return new WorldGoal(
            (world) => {
                let resl: World[] = [];
                for (const goal of goals) {
                    const newWorld = new World(new Map(world.lvars));
                    const result = goal.run(newWorld);
                    resl = [...resl, ...result];
                }
                return resl;
            }
        );
    }

    static preWalked(
        fn: (...args: LogicValue[]) => WorldGoal,
    ): (...args: LogicValue[]) => WorldGoal {
        return (...args: LogicValue[]) => new WorldGoal((world) => {
            // walk the args
            const walkedArgs = args.map((arg) => world.walk(arg)) as LogicValue[];
            if (walkedArgs.some((arg) => arg === undefined)) {
                return [World.fail];
            }
            return fn(...walkedArgs).run(world);
        });
    }

    static pred(source: string, args: LogicValue[]): WorldGoal {
        return new WorldGoal((world) => {
            const worldSource = world.getLvar(source);
            if (worldSource instanceof LogicPredicate) {
                return worldSource.value.call(...args).run(world);
                // return WorldGoal.preWalked(
                //     worldSource.value.fn
                // )(...args).run(world);
            } else {
                return WorldGoal.fail.run(world);
            }
            // if (worldSource === undefined) {
            //     return [World.fail];
            // } else if (!worldSource.isPredicate()) {
            //     return [World.fail];
            // } else {
            //     const pred = worldSource.value as PredicateLogic;
            //     return pred.fn(...args).run(world);
            // }

        });
    }

    static fail: WorldGoal = new WorldGoal((world) => [World.fail]);

}
export class PredicateLogic {
    constructor(
        public fn: (...args: LogicValue[]) => WorldGoal,
        public noWalk: boolean = false
    ) {
    }

    call(...args: LogicValue[]): WorldGoal {
        if (this.noWalk) {
            return this.fn(...args);
        }
        return new WorldGoal(
            (world) => {
                // walk the args
                const walkedArgs = args.map((arg) => world.walk(arg)) as LogicValue[];
                if (walkedArgs.some((arg) => arg === undefined)) {
                    return [World.fail];
                }
                return this.fn(...walkedArgs).run(world);
            }
        );
    }
}
export abstract class LogicValue {
    // Can be either a plain, unbound logic variable, a bound literal value (string/number)
    // or a deep value: (map/list)
    // or a predicate
    constructor(
        public value: LVar | string | number | Map<string, LogicValue> | LogicValue[] | PredicateLogic
    ) {

        // Verify that the value is a valid logic value
        if (typeof this.value === 'object' && 'type' in this.value && this.value.type === 'logic_var') {
            return;
        } else if (typeof this.value === 'string' || typeof this.value === 'number') {
            return;
        } else if (typeof this.value === 'object' && this.value instanceof Map) {
            return;
        } else if (Array.isArray(this.value)) {
            return;
        } else if (typeof this.value === 'object' && this.value instanceof PredicateLogic) {
            return;
        } else {
            throw new Error(`Invalid logic value: ${this.value}`);
        }
    }

    getName(): string {
        if (this instanceof LogicLvar) {
            return (this.value as LVar).name;
        }
        throw new Error('Not an lvar');
    }

    getNameSafe(): string {
        if (this instanceof LogicLvar) {
            return (this.value as LVar).name;
        }
        return 'UNKNOWNV';
    }

    isLvar(): boolean {
        return typeof this.value === 'object' && 'type' in this.value && this.value.type === 'logic_var';
    }

    isLiteral(): boolean {
        return typeof this.value === 'string' || typeof this.value === 'number';
    }

    isMap(): boolean {
        return typeof this.value === 'object' && this.value instanceof Map;
    }

    isList(): boolean {
        return Array.isArray(this.value);
    }

    isPredicate(): boolean {
        return typeof this.value === 'object' && 'fn' in this.value;
    }

    walkFor(lvar: LVar, val: LogicValue): LogicValue | undefined {
        if (this instanceof LogicMap) {
            // go through the map and see if there's anything matching the unbound lvar
            // if there is, replace it with the value and keep going, then return the new map
            const currMap = this.value as Map<string, LogicValue>;
            let newMap = new Map<string, LogicValue>(currMap);
            let hadAny = false;
            for (const [key, value] of currMap.entries()) {
                // if the value is an lvar and it's the same as the one we're looking for
                if (value instanceof LogicLvar) {
                    if (typeof value.value === 'object' && 'name' in value.value && value.value.name === lvar.name) {
                        newMap.set(key, val);
                        hadAny = true;
                    }
                } else if (value instanceof LogicMap) {
                    const newVal = value.walkFor(lvar, val);
                    if (newVal !== undefined) {
                        newMap.set(key, newVal);
                        hadAny = true;
                    }
                } else if (value instanceof LogicList) {
                    const newVal = value.walkFor(lvar, val);
                    if (newVal !== undefined) {
                        newMap.set(key, newVal);
                        hadAny = true;
                    }
                }
            }
            if (hadAny) {
                return new LogicMap(newMap, this.type);
            } else {
                return undefined;
            }
        }
        if (this instanceof LogicList) {
            const currList = this.value as LogicValue[];
            let newList = [...currList];
            let hadAny = false;
            for (let i = 0; i < currList.length; i++) {
                const value = currList[i];
                if (value instanceof LogicLvar) {
                    if (typeof value.value === 'object' && 'name' in value.value && value.value.name === lvar.name) {
                        newList[i] = val;
                        hadAny = true;
                    }
                } else if (value instanceof LogicMap) {
                    const newVal = value.walkFor(lvar, val);
                    if (newVal !== undefined) {
                        newList[i] = newVal;
                        hadAny = true;
                    }
                } else if (value instanceof LogicList) {
                    const newVal = value.walkFor(lvar, val);
                    if (newVal !== undefined) {
                        newList[i] = newVal;
                        hadAny = true;
                    }
                }
            }
            if (hadAny) {
                return new LogicList(newList);
            } else {
                return undefined;
            }
        } if (this instanceof LogicLvar) {
            return val;
            // if (typeof this.value === 'object' && 'name' in this.value && this.value.name === lvar.name) {
            //     return val;
            // }
        }
        return this;
    }

    toString = () => {
        if (this instanceof LogicLvar) {
            return `<${(this.value as LVar).name}>`;
        }
        if (this instanceof LogicLiteral) {
            return `"${this.value}"`;
        }
        if (this instanceof LogicMap) {
            const map = this.value as Map<string, LogicValue>;
            let str = '{';
            for (const [key, value] of map.entries()) {
                str += `${key}: ${value.toString()}, `;
            }
            return str + '}';
        }
        if (this instanceof LogicList) {
            const list = this.value as LogicValue[];
            let str = '[';
            for (const item of list) {
                str += `${item.toString()}, `;
            }
            return str + ']';
        }
        if (this.isPredicate()) {
            return 'Predicate';
        }
        return 'Unknown';
    };

    abstract unite(other: LogicValue): LogicValue | null;
}

export function eq(a: LogicValue | undefined, b: LogicValue | undefined): WorldGoal {
    return new WorldGoal((world) => {
        if (a === undefined || b === undefined) {
            console.warn(`Undefined values in eq: ${a} ${b}`);
            return [World.fail];
        }
        const aWalked = world.walk(a);
        const bWalked = world.walk(b);
        if (aWalked === undefined || bWalked === undefined) {
            console.warn(`Undefined values in eq walked: ${aWalked} ${bWalked}`);
            return [World.fail];
        }
        if (aWalked instanceof LogicLiteral && bWalked instanceof LogicLiteral) {
            if (aWalked.value === bWalked.value) {
                return [world];
            } else if (aWalked.value.toString() === bWalked.value.toString()) {
                console.warn(`Literal values questionably equal: ${aWalked.value} ${bWalked.value}`);
                return [world];
            } else {
                console.warn(`Literal values not equal: ${aWalked.value} ${bWalked.value}`);
                return [World.fail];
            }
        }
        if (aWalked instanceof LogicLvar && bWalked instanceof LogicLiteral) {
            return [world.bind(aWalked.getName(), bWalked)];
        }
        if (aWalked instanceof LogicLiteral && bWalked instanceof LogicLvar) {
            return [world.bind(bWalked.getName(), aWalked)];
        }
        if (aWalked instanceof LogicLvar && bWalked instanceof LogicLvar) {
            return [world.bind(bWalked.getName(), aWalked)];
        }
        if (aWalked instanceof LogicMap && bWalked instanceof LogicMap) {
            console.log(`Comparing maps: ${aWalked.toString()} ${bWalked.toString()}
                For: (${a.getNameSafe()} ${b.getNameSafe()})
                sizes: ${aWalked.size} ${bWalked.size}
                sizeVals: ${aWalked.value.size} ${bWalked.value.size}`);
            if (aWalked.size !== null && bWalked.size !== null) {
                if (aWalked.size !== bWalked.size) {
                    console.warn(`Map sizes not equal: ${aWalked.size} ${bWalked.size}`);
                    return [World.fail];
                }
            }
            if (aWalked.type === 'finite' && bWalked.type === 'infinite' && 
                aWalked.size !== null &&
                bWalked.value.size > aWalked.size) {
                console.warn(`Map sizes not equal: ${aWalked.size} ${bWalked.size}`);
                return [World.fail];
            }
            if (aWalked.type === 'infinite' && bWalked.type === 'finite' &&
                bWalked.size !== null &&
                aWalked.value.size > bWalked.size) {
                console.warn(`Map sizes not equal: ${aWalked.size} ${bWalked.size}`);
                return [World.fail];
            }
            if (aWalked.type === 'infinite' || bWalked.type === 'infinite') {
                // const aMap = aWalked.value as Map<string, LogicValue>;
                // const bMap = bWalked.value as Map<string, LogicValue>;
                const aMap = aWalked;
                const bMap = bWalked;
                // let newWorld = new World(new Map(world.lvars));
                const subGoals = [];
                for (const [key, value] of aMap.entries()) {
                    if (!bMap.value.has(key) && bWalked.type === 'infinite') {
                        // TODO: this is a bit of a hack, we should be able to bind the key as well
                        console.log('adding keyA', key, value);
                        bMap.set(key, value);
                        subGoals.push(eq(value, bMap.get(key)));
                    } else {
                        subGoals.push(eq(value, bMap.get(key)));
                    }
                }
                for (const [key, value] of bMap.entries()) {
                    if (!aMap.value.has(key) && aWalked.type === 'infinite') {
                        // TODO: this is a bit of a hack, we should be able to bind the key as well
                        console.log('adding keyB', key, value, `
                            For: (${a.getNameSafe()} ${b.getNameSafe()})
                            ${aWalked.toString()}

                            ${bWalked.toString()}
                            `);
                        aMap.set(key, value);
                        subGoals.push(eq(value, aMap.get(key)));
                    } else {
                        subGoals.push(eq(value, aMap.get(key)));
                    }
                }
                if (aWalked.type === 'finite' && bWalked.type === 'infinite') {
                    // ensure that size constraints aren't exceeded
                    if (aMap.value.size > bMap.value.size) {
                        console.warn(`Map sizes not equal: ${aMap.size} ${bMap.size}`);
                        return [World.fail];
                    }
                }
                if (a instanceof LogicLvar && aWalked.type === 'infinite') {
                    // world.addLvar(a.getName(), new LogicMap(aMap, 'infinite'));
                    subGoals.unshift(new WorldGoal((world2) => {
                        return [world2.bind(a.getName(), new LogicMap(aMap.value, 'infinite', aMap.size))];
                    }));
                } else if (b instanceof LogicLvar && bWalked.type === 'infinite') {
                    subGoals.unshift(new WorldGoal((world2) => {
                        return [world2.bind(b.getName(), new LogicMap(bMap.value, 'infinite', bMap.size))];
                    }));
                }
                return WorldGoal.and(...subGoals).run(world);
            } else {
                const aMap = aWalked.value as Map<string, LogicValue>;
                const bMap = bWalked.value as Map<string, LogicValue>;
                if (aMap.size !== bMap.size) {
                    console.warn(`Map sizes not equal: ${aMap.size} ${bMap.size}`);
                    return [World.fail];
                }
                // let newWorld = new World(new Map(world.lvars));
                const subGoals = [];
                for (const [key, value] of aMap.entries()) {
                    if (!bMap.has(key)) {
                        console.warn(`Map keys missing`);
                        return [World.fail];
                    } else {
                        subGoals.push(eq(value, bMap.get(key)));
                    }
                }
                return WorldGoal.and(...subGoals).run(world);
            }
        }
        if (aWalked instanceof LogicList && bWalked instanceof LogicList) {
            const aList = aWalked.value as LogicValue[];
            const bList = bWalked.value as LogicValue[];
            if (aList.length !== bList.length) {
                console.warn(`List sizes not equal: ${aList.length} ${bList.length}
                    in ${aWalked.toString()} ${bWalked.toString()}`);
                return [World.fail];
            }
            const subGoals = [];
            for (let i = 0; i < aList.length; i++) {
                subGoals.push(eq(aList[i], bList[i]));
            }
            return WorldGoal.and(...subGoals).run(world);
        }
        if (aWalked instanceof LogicLvar) {
            // const newWorld = new World(new Map(world.lvars));
            // world.addLvar(aWalked.getName(), bWalked);
            // if (bWalked instanceof LogicLvar) {
            //     world.addLvar(bWalked.getName(), aWalked);
            // }
            // return [world];
            return [world.bind(aWalked.getName(), bWalked)];
        }
        if (bWalked instanceof LogicLvar) {
            // const newWorld = new World(new Map(world.lvars));
            // world.addLvar(bWalked.getName(), aWalked);
            // world.addLvar(bWalked.getName(), aWalked);
            // if (aWalked instanceof LogicLvar) {
            //     world.addLvar(aWalked.getName(), bWalked);
            // }
            // return [world];
            return [world.bind(bWalked.getName(), aWalked)];
        }
        console.warn(`Values not equal: ${aWalked.toString()} ${bWalked.toString()}`);
        return [World.fail];
    });
}

export class LogicLvar extends LogicValue {
    constructor(
        public name: string
    ) {
        super(SLogic.lvar(name));
    }

    override unite(other: LogicValue): LogicValue {
        if (other instanceof LogicLvar) {
            return this;
        } else {
            return other;
        }
    }

    toString = () => {
        return `<${this.name}>`;
    };
}

export class LogicLiteral extends LogicValue {
    constructor(
        public value: string | number
    ) {
        super(value);
    }

    override unite(other: LogicValue): LogicValue | null {
        if (other instanceof LogicLiteral) {
            if (this.value === other.value) {
                return this;
            } else {
                // TODO: should ret a fail world goal?
                // throw new Error(`Literal values not equal: ${this.value} ${other.value}`);
                return null;
            }
        } else {
            return null;
            // throw new Error(`Literal values not equal: ${this.value} ${other.value}`);
        }
    }

    toString = () => {
        return `"${this.value}"`;
    };
}

export class LogicMap extends LogicValue {
    constructor(
        public value: Map<string, LogicValue>,
        public type: 'finite' | 'infinite' = 'finite',
        public size: number | null = null
    ) {
        super(value);
    }

    override unite(other: LogicValue): LogicValue | null {
        // todo: fix
        if (other instanceof LogicMap) {
            const newMap = new Map<string, LogicValue>();
            for (const [key, value] of this.value.entries()) {
                if (other.value.has(key)) {
                    const ufv = other.value.get(key);
                    if (ufv === undefined) {
                        return null;
                    }
                    const newVal = value.unite(ufv);
                    if (newVal !== null) {
                        newMap.set(key, newVal);
                    } else {
                        return null;
                    }
                } else {
                    newMap.set(key, value);
                }
            }
            for (const [key, value] of other.value.entries()) {
                if (!this.value.has(key)) {
                    newMap.set(key, value);
                }
            }
            // const newSize = this.size !== null && other.size !== null ? Math.min(this.size, other.size) : null;
            let newSize = null;
            if (this.size !== null) {
                if (other.size !== null) {
                    newSize = Math.min(this.size, other.size);
                } else {
                    newSize = this.size;
                }
            } else if (other.size !== null) {
                newSize = other.size;
            }
            if (newSize && newMap.size > newSize) {
                return null;
            }
            return new LogicMap(newMap, this.type, newSize);
        } else if (other instanceof LogicLvar) {
            return this;
        } else {
            return null;
        }
    }

    constrainSize = (size: number) => {
        if (this.value.size > size) {
            throw new Error(`Map size ${this.value.size} exceeds constraint ${size}`);
        }
        return new LogicMap(this.value, this.type, size);
        // return new LogicMap(this.value, this.type);
    }

    set = (key: string, value: LogicValue) => {
        if (this.size !== null && this.value.size >= this.size) {
            throw new Error(`Map size ${this.value.size} exceeds constraint ${this.size}`);
        }
        this.value.set(key, value);
    }

    get = (key: string) => {
        return this.value.get(key);
    }

    entries = () => {
        return this.value.entries();
    }

    toString = () => {
        let str = '{';
        for (const [key, value] of this.value.entries()) {
            str += `${key}: ${value.toString()}, `;
        }
        return str + '}';
    };
}

export class LogicList extends LogicValue {
    constructor(
        public value: LogicValue[]
    ) {
        super(value);
    }

    override unite(other: LogicValue): LogicValue | null {
        if (other instanceof LogicList) {
            if (this.value.length !== other.value.length) {
                return null;
            }
            const newList = [];
            for (let i = 0; i < this.value.length; i++) {
                const newVal = this.value[i].unite(other.value[i]);
                if (newVal === null) {
                    return null;
                }
                newList.push(newVal);
            }
            return new LogicList(newList);
        } else if (other instanceof LogicLvar) {
            return other;
        } else {
            return null;
        }
    }

    toString = () => {
        let str = '[';
        for (const item of this.value) {
            str += `${item.toString()}, `;
        }
        return str + ']';
    };
}

export class LogicPredicate extends LogicValue {
    constructor(
        public value: PredicateLogic
    ) {
        super(value);
    }

    override unite(other: LogicValue): LogicValue | null {
        if (other instanceof LogicPredicate) {
            return this;
        } else if (other instanceof LogicLvar) {
            return this;
        } else {
            return null;
        }
    }

    toString = () => {
        return 'Predicate';
    };
}