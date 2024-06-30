import { eq } from "./eq";
import { LogicVal } from "./interpret/logic";
import { type LVar, SLogic } from "./logic";
import { warnHolder, debugHolder } from "./warnHolder";

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
// debugHolder(newRun);
////////////////////
//////////////////
////////////////////
export class World {
	private lvarIncrement = 0;
	constructor(
		public lvars: Map<string, LogicValue>,
		public failed = false,
	) {}

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

	getFreshLvar(): LogicLvar {
		const lvar = new LogicLvar(
			`_lvar${this.lvarIncrement++}`,
		);
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
			}if (lvar2 instanceof LogicLvar) {
				if (lvar2.getName() !== lvar.name) {
					warnHolder(
						`Lvar ${lvar.name} is still unbound`,
					);
					return this.walk(lvar2);
				}
					return lvar2;
			}
				return lvar2;
		}
		if (l instanceof LogicMap) {
			const map = l.value;
			const newMap = new Map<string, LogicValue>();
			for (const [key, value] of map.entries()) {
				const nvv = this.walk(value);
				newMap.set(key, nvv !== undefined ? nvv : value);
			}
			return new LogicMap(newMap, l.type);
		}
		if (l instanceof LogicList) {
			const list = l.value as LogicValue[];
			debugHolder("list", list.toString());
			const newList = list.map(
				(item) => this.walk(item) ?? item,
			);
			return new LogicList(newList, l.type);
		}
		return l;
	}

	bindSafe(str?: string, value?: LogicValue): World {
		if (str === undefined || value === undefined) {
			return this;
		}
		return this.bind(str, value);
	}

	bind(str: string, value: LogicValue): World {
		debugHolder("bind", str, value.toString());
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
				if (
					walked instanceof LogicLvar &&
					walked.getName() === str
				) {
					//debugHolder("bindWalked2", str, value.toString());
					this.addLvar(str, value);
					return this;
				}
					// debugHolder(
					// 	"bindWalked1",
					// 	str,
					// 	walked.toString(),
					// 	value.toString(),
					// );
					this.addLvar(str, value.unite(walked) ?? value);
					return this;
			}
				warnHolder(`Lvar ${str} is still unbound?`);
				this.addLvar(str, value);
				return this;
		}
			this.addLvar(str, value);
			return this.bind(str, value);
	}

	toString = () => {
		return `World${this.failed ? " (failed)" : ""}(\n${Array.from(
			this.lvars.entries(),
		)
			.map(([key, value]) => `${key}: ${value}`)
			.join("\n")}\n)`;
	};

	// Just for convenience
	eq(a: LogicValue, b: LogicValue | number): World[] {
		return eq(a, typeof b === 'number' ? new LogicLiteral(b) : b).run(this);
	}

	equals(other: World): boolean {
		if (this.failed && other.failed) {
			return true;
		}
		if (this.failed || other.failed) {
			return false;
		}
		if (this.lvars.size !== other.lvars.size) {
			return false;
		}
		for (const [key, value] of this.lvars.entries()) {
			if (!other.lvars.has(key)) {
				return false;
			}
			const otherValue = other.lvars.get(key);
			if (otherValue === undefined) {
				return false;
			}
			if (!value.unite(otherValue)) {
				return false;
			}
		}
		return true;
	}

	intersects(other: World[]): boolean {
		if (other.length === 0) {
			return false;
		}
		for (const o of other) {
			for (const [key, value] of this.lvars.entries()) {
				if (!o.lvars.has(key)) {
					continue;
				}
				const otherValue = o.lvars.get(key);
				if (otherValue === undefined) {
					continue;
				}
				if (!value.unite(otherValue)) {
					console.log("Intersection failed", key, value.toString(), otherValue.toString());
					return false;
				}
			}
		}
		return true;
	}

	static fail = new World(new Map(), true);
}
export class WorldGoal {
	constructor(public goal: (world: World) => World[]) {}

	run(world: World): World[] {
		if (world.failed) {
			return [];
		}
		return this.goal(world).filter(
			(world) => !world.failed,
		);
	}

	runAll(worlds: World[]): World[] {
		return worlds.flatMap((world) => this.run(world));
	}

	conj(...goals: WorldGoal[]): WorldGoal {
		return new WorldGoal((world) =>
			this.runAll(
				goals.reduce<World[]>(
					(acc, goal) =>
						acc.flatMap((world) => goal.run(world)),
					[world],
				),
			),
		);
	}

	static and(...goals: WorldGoal[]): WorldGoal {
		return new WorldGoal((world) =>
			goals.reduce<World[]>(
				(acc, goal) =>
					acc
						.filter((world) => !world.failed)
						.flatMap((world) =>
							world.failed ? [world] : goal.run(world),
						),
				[world],
			),
		);
		// goal.run(world)), [world]));
	}

	static disj(...goals: WorldGoal[]): WorldGoal {
		// return new WorldGoal((world) => goals.flatMap((goal) => goal.run(world)));
		return new WorldGoal((world) => {
			let resl: World[] = [];
			for (const goal of goals) {
				const newWorld = new World(new Map(world.lvars));
				const result = goal.run(newWorld);
				resl = [...resl, ...result];
			}
			return resl;
		});
	}

	static preWalked(
		fn: (...args: LogicValue[]) => WorldGoal,
	): (...args: LogicValue[]) => WorldGoal {
		return (...args: LogicValue[]) =>
			new WorldGoal((world) => {
				// walk the args
				const walkedArgs = args.map((arg) =>
					world.walk(arg),
				) as LogicValue[];
				if (walkedArgs.some((arg) => arg === undefined)) {
					return [World.fail];
				}
				return fn(...walkedArgs).run(world);
			});
	}

	static pred(
		source: string,
		args: LogicValue[],
	): WorldGoal {
		return new WorldGoal((world) => {
			const worldSource = world.getLvar(source);
			if (worldSource instanceof LogicPredicate) {
				return worldSource.value.call(...args).run(world);
				// return WorldGoal.preWalked(
				//     worldSource.value.fn
				// )(...args).run(world);
			}
				return WorldGoal.fail.run(world);
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

	static fail: WorldGoal = new WorldGoal((world) => [
		World.fail,
	]);
}
export class PredicateLogic {
	constructor(
		public fn: (...args: LogicValue[]) => WorldGoal,
		public noWalk = false,
	) {}

	call(...args: LogicValue[]): WorldGoal {
		if (this.noWalk) {
			return this.fn(...args);
		}
		return new WorldGoal((world) => {
			// walk the args
			const walkedArgs = args.map((arg) =>
				world.walk(arg),
			) as LogicValue[];
			if (walkedArgs.some((arg) => arg === undefined)) {
				return [World.fail];
			}
			return this.fn(...walkedArgs).run(world);
		});
	}
}
type LogicDataType = LVar | string | number | Map<string, LogicValue> | LogicValue[] | PredicateLogic;
type LogicReified = LogicLvar | string | number | Map<string, LogicReified> | LogicReified[] | PredicateLogic | { [key: string]: LogicReified };

export abstract class LogicValue {
	// Can be either a plain, unbound logic variable, a bound literal value (string/number)
	// or a deep value: (map/list)
	// or a predicate
	constructor(
		public value:
			LogicDataType,
	) {
		// Verify that the value is a valid logic value
		if (
			typeof this.value === "object" &&
			"type" in this.value &&
			this.value.type === "logic_var"
		) {
			return;
		}if (
			typeof this.value === "string" ||
			typeof this.value === "number"
		) {
			return;
		}if (
			typeof this.value === "object" &&
			this.value instanceof Map
		) {
			return;
		}if (Array.isArray(this.value)) {
			return;
		}if (
			typeof this.value === "object" &&
			this.value instanceof PredicateLogic
		) {
			return;
		}
			throw new Error(`Invalid logic value: ${this.value}`);
	}

	getName(): string {
		if (this instanceof LogicLvar) {
			return (this.value as LVar).name;
		}
		throw new Error("Not an lvar");
	}

	getNameSafe(): string {
		if (this instanceof LogicLvar) {
			return (this.value as LVar).name;
		}
		return "UNKNOWNV";
	}

	isLvar(): boolean {
		return (
			typeof this.value === "object" &&
			"type" in this.value &&
			this.value.type === "logic_var"
		);
	}

	isLiteral(): boolean {
		return (
			typeof this.value === "string" ||
			typeof this.value === "number"
		);
	}

	isMap(): boolean {
		return (
			typeof this.value === "object" &&
			this.value instanceof Map
		);
	}

	isList(): boolean {
		return Array.isArray(this.value);
	}

	isPredicate(): boolean {
		return (
			typeof this.value === "object" && "fn" in this.value
		);
	}

	walkFor(
		lvar: LVar,
		val: LogicValue,
	): LogicValue | undefined {
		if (this instanceof LogicMap) {
			// go through the map and see if there's anything matching the unbound lvar
			// if there is, replace it with the value and keep going, then return the new map
			const currMap = this.value as Map<string, LogicValue>;
			const newMap = new Map<string, LogicValue>(currMap);
			let hadAny = false;
			for (const [key, value] of currMap.entries()) {
				// if the value is an lvar and it's the same as the one we're looking for
				if (value instanceof LogicLvar) {
					if (
						typeof value.value === "object" &&
						"name" in value.value &&
						value.value.name === lvar.name
					) {
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
			}
				return undefined;
		}
		if (this instanceof LogicList) {
			const currList = this.value as LogicValue[];
			const newList = [...currList];
			let hadAny = false;
			for (let i = 0; i < currList.length; i++) {
				const value = currList[i];
				if (value instanceof LogicLvar) {
					if (
						typeof value.value === "object" &&
						"name" in value.value &&
						value.value.name === lvar.name
					) {
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
			}
				return undefined;
		}
		if (this instanceof LogicLvar) {
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
			let str = "{";
			for (const [key, value] of map.entries()) {
				str += `${key}: ${value.toString()}, `;
			}
			return `${str}}`;
		}
		if (this instanceof LogicList) {
			const list = this.value as LogicValue[];
			let str = "[";
			for (const item of list) {
				str += `${item.toString()}, `;
			}
			return `${str}]`;
		}
		if (this.isPredicate()) {
			return "Predicate";
		}
		return "Unknown";
	};

	abstract unite(other: LogicValue): LogicValue | null;
	abstract reify(): LogicReified;
}

export class LogicLvar extends LogicValue {
	constructor(public name: string) {
		super(SLogic.lvar(name));
	}

	override unite(other: LogicValue): LogicValue {
		// if (other instanceof LogicLvar) {
		// 	return this;
		// }
			return other;
	}

	reify() {
		return this;
	}

	static from(name: string): LogicLvar {
		return new LogicLvar(name);
	}

	toString = () => {
		return `<${this.name}>`;
	};
}

export class LogicLiteral extends LogicValue {
	constructor(public value: string | number) {
		super(value);
	}

	override unite(other: LogicValue): LogicValue | null {
		if (other instanceof LogicLiteral) {
			if (this.value === other.value) {
				return this;
			}
				// TODO: should ret a fail world goal?
				// throw new Error(`Literal values not equal: ${this.value} ${other.value}`);
				return null;
		}
		if (other instanceof LogicLvar) {
			return this;
		}
			return null;
	}

	reify() {
		return this.value;
	}

	static from(value: string | number): LogicLiteral {
		return new LogicLiteral(value);
	}

	toString = () => {
		return `"${this.value}"`;
	};
}

export class LogicMap extends LogicValue {
	constructor(
		public value: Map<string, LogicValue>,
		public type: "finite" | "infinite" = "finite",
		public size: number | null = null,
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
		}if (other instanceof LogicLvar) {
			return this;
		}
			return null;
	}

	static from(value: Map<string, LogicValue>): LogicMap {
		return new LogicMap(value);
	}

	constrainSize = (size: number) => {
		if (this.value.size > size) {
			throw new Error(
				`Map size ${this.value.size} exceeds constraint ${size}`,
			);
		}
		return new LogicMap(this.value, this.type, size);
		// return new LogicMap(this.value, this.type);
	};

	set = (key: string, value: LogicValue) => {
		if (
			this.size !== null &&
			this.value.size >= this.size
		) {
			throw new Error(
				`Map size ${this.value.size} exceeds constraint ${this.size}`,
			);
		}
		this.value.set(key, value);
	};

	get = (key: string) => {
		return this.value.get(key);
	};

	entries = () => {
		return this.value.entries();
	};

	static fromSize(size: number | null) {
		if (size === null) {
			return (value: Map<string, LogicReified>) => {
				return LogicMap.fromInfinite(value);
			};
		}
		return (value: Map<string, LogicReified>) => {
			return LogicMap.fromFinite(value, size);
		};
	}

	static fromFinite(
		value: Map<string, LogicReified> | { [key: string]: LogicReified },
		size: number,
	): LogicMap {
		const newMap = new Map<string, LogicValue>();
		for (const [key, val] of value instanceof Map ? value.entries() : Object.entries(value)) {
			if (typeof val === "string") {
				newMap.set(key, new LogicLiteral(val));
			} else if (typeof val === "number") {
				newMap.set(key, new LogicLiteral(val));
			} else if (Array.isArray(val)) {
				newMap.set(key, LogicList.fromFinite(...val));
			} else {
				newMap.set(key, val as LogicValue);
			}
		}
		return new LogicMap(newMap, "finite", size);
	}

	static fromInfinite(
		value: Map<string, LogicReified> | { [key: string]: LogicReified },
	): LogicMap {
		const newMap = LogicMap.fromFinite(value, 
			value instanceof Map ? value.size : Object.keys(value).length).value;
		return new LogicMap(newMap, "infinite", null);
	}

	reify() {
		// const newMap = new Map<string, LogicReified>();
		const newMap: Record<string, LogicReified> = {};
		for (const [key, value] of this.value.entries()) {
			newMap[key] = value.reify();
		}
		return newMap;
	}

	toString = () => {
		let str = "{";
		for (const [key, value] of this.value.entries()) {
			str += `${key}: ${value.toString()}, `;
		}
		return `${str}}`;
	};
}

export class LogicList extends LogicValue {
	constructor(
		public value: LogicValue[],
		public type: "finite" | "infinite" = "finite",
		public size: number | null = null,
	) {
		super(value);
		if (type === "finite" && size === null) {
			this.size = value.length;
		}
	}

	transformRight(other: LogicList): LogicList | null {
		if (this.type === "infinite") {
			throw new Error("Incorrect use of transform finite");
			// return null;
		}
		if (other.type === "finite") {
			throw new Error("Incorrect use of transform finite");
			// return null;
		}
		// This is an infinite list
		// Other is a finite list
		// We need to make sure that the size of the infinite list is less than the size of the other list
		// Then we need to unite the values of the finite list with the values of this list
		if (other.value.length > this.value.length) {
			console.warn(
				`List size exceeds constraint1: ${other.value.length} ${this.value.length}`,
			);
			// throw new Error(
			// 	`List size exceeds constraint: ${other.value.length} ${this.value.length}`,
			// );
			return null;
		}
		// Unite the values up to the size of this list
		// then add the rest of the values from the other list
		const newList = [];
		for (let i = 0; i < other.value.length; i++) {
			const newVal = this.value[i].unite(other.value[i]);
			if (newVal === null) {
				return null;
			}
			newList.push(newVal);
		}
		const rest = this.value.slice(other.value.length);
		return new LogicList([...newList, ...rest], "finite", this.size);
	}

	transformLeft(other: LogicList): LogicList | null {
		if (this.type === "finite") {
			throw new Error("Incorrect use of transform finite");
			// return null;
		}
		if (other.type === "infinite") {
			throw new Error("Incorrect use of transform finite");
			// return null;
		}
		// This is an infinite list
		// Other is a finite list
		// We need to make sure that the size of the finite list is less than the size of this list
		// Then we need to unite the values of the finite list with the values of this list
		if (this.value.length > other.value.length) {
			console.warn(
				`List size exceeds constraint2: ${this.value.length} ${other.value.length}`,
			)
			// throw new Error(
			// 	`List size exceeds constraint: ${this.value.length} ${other.value.length}`,
			// );
			return null;
		}
		// Unite the values up to the size of this list
		// then add the rest of the values from the other list
		const newList = [];
		for (let i = 0; i < this.value.length; i++) {
			const newVal = this.value[i].unite(other.value[i]);
			if (newVal === null) {
				return null;
			}
			newList.push(newVal);
		}
		const rest = other.value.slice(this.value.length);
		return new LogicList([...newList, ...rest], "finite", other.size);
	}

	override unite(other: LogicValue): LogicValue | null {
		if (other instanceof LogicList) {
			if (this.value.length !== other.value.length && this.type === "finite" && other.type === "finite") {
				console.warn(
					`List sizes not equal: ${this.value.length} ${other.value.length}`,
				);
				return null;
			}
			const aList = this.value;
			const bList = other.value;
			if (this.type === "infinite" && other.type === "finite") {
				return this.transformLeft(other);
			} else if (this.type === "finite" && other.type === "infinite") {
				return this.transformRight(other);
			} else if (this.type === "infinite" && other.type === "infinite") {
				// if both are infinite, just set everything up to the min size to equal
				// and everything up to the max size to be that of the larger list
				// then set both to this new list, w/ the max size + infinite type
				const aList2: LogicValue[] = [];
				const minSize = Math.min(aList.length, bList.length);
				for (let i = 0; i < minSize; i++) {
					const uniteed = aList[i].unite(bList[i]);
					if (uniteed === null) {
						return null;
					}
					aList2.push(uniteed);
				}
				if (aList2.some((val) => val === null)) {
					return null;
				}
				let newAlist;
				if (aList.length < bList.length) {
					newAlist = [...aList2, ...bList.slice(aList.length)];
				} else {
					newAlist = [...aList2, ...aList.slice(bList.length)];
				}
				return new LogicList(newAlist, 'infinite', null);
			}
			const newList = [];
			for (let i = 0; i < this.value.length; i++) {
				const newVal = this.value[i].unite(other.value[i]);
				if (newVal === null) {
					return null;
				}
				newList.push(newVal);
			}
			return new LogicList(newList, this.type, this.size);
		}
		if (other instanceof LogicLvar) {
			return other;
		}
		console.warn(`
			Unite failed: ${this?.toString?.()} ${other?.toString?.()}
			`);
			return null;
	}

	static from(size: number | null, ...value: LogicValue[]): LogicList {
		return new LogicList(value, size === null ? "infinite" : "finite", size);
	}

	static fromSize(size: number | null) {
		if (size === null) {
			return (...value: LogicReified[]) => {
				return LogicList.fromInfinite(...value);
			}
		} else {
			return (...value: LogicReified[]) => {
				return LogicList.fromFinite(...value);
			}
		}
	}

	static fromFinite(...value: LogicReified[]): LogicList {
		const values: LogicValue[] = [];
		for (const val of value) {
			if (typeof val === "string") {
				values.push(new LogicLiteral(val));
			} else if (typeof val === "number") {
				values.push(new LogicLiteral(val));
			} else if (Array.isArray(val)) {
				values.push(LogicList.fromFinite(...val));
			} else {
				values.push(val as LogicValue);
			}
		}
		return new LogicList(values, "finite", value.length);
	}

	static fromInfinite(...value: LogicReified[]): LogicList {
		const values = LogicList.fromFinite(...value).value;
		return new LogicList(values, "infinite", null);
	}

	reify() {
		return this.value.map((val) => val.reify());
	}

	toString = () => {
		let str = `${this.type}.${this.size}.[`;
		for (const item of this.value) {
			str += `${item.toString()}, `;
		}
		return `${str}]`;
	};
}

export class LogicPredicate extends LogicValue {
	constructor(public value: PredicateLogic) {
		super(value);
	}

	override unite(other: LogicValue): LogicValue | null {
		if (other instanceof LogicPredicate) {
			return this;
		}if (other instanceof LogicLvar) {
			return this;
		}
			return null;
	}

	reify() {
		return this.value;
	}

	toString = () => {
		return "Predicate";
	};
}

export class LogicCons extends LogicValue {
	constructor(public head: LogicValue, public tail: LogicValue) {
		super([head, tail]);
	}

	override unite(other: LogicValue): LogicValue | null {
		if (other instanceof LogicCons) {
			const newHead = this.head.unite(other.head);
			if (newHead === null) {
				return null;
			}
			const newTail = this.tail.unite(other.tail);
			if (newTail === null) {
				return null;
			}
			return new LogicCons(newHead, newTail);
		}
		if (other instanceof LogicLvar) {
			return this;
		}
		if (other instanceof LogicList) {
			if (other.value.length === 0 && other.type === "finite") {
				return null;
			}
			if (other.type === "infinite" && other.value.length === 0) {
				return this;
			}
			const newHead = this.head.unite(other.value[0]);
			let newTail: LogicCons | null = null;
			if (other.value.length > 1) {
				const tv = other.value.slice(1);
				newTail = tv.reduce(
					(acc, val) => {
						return new LogicCons(val, acc);
					}, new LogicList([])) as LogicCons;
			}
			const newTail2 = newTail ?? new LogicList([]);
			if (newHead === null || newTail2 === null) {
				return null;
			}
			return this.unite(new LogicCons(newHead, newTail2));
		}

		return null;
	}

	static from(head: LogicValue, tail: LogicValue): LogicCons {
		return new LogicCons(head, tail);
	}

	reify() {
		return [this.head.reify(), this.tail.reify()];
	}

	toString = () => {
		return `(${this.head.toString()} . ${this.tail.toString()})`;
	};
}
