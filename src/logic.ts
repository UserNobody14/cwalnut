// (function() {

import {
	get_domain,
	intersection,
	make_domain,
	minus_inf,
	inf,
	REAL_DOMAIN,
} from "./get_domain";

//utils
function assert(x: boolean, str: string | undefined) {
	if (x === false) throw new Error(str);
}

const write =
	typeof console === "object" &&
	typeof console.log !== "undefined"
		? console.log
		: (() => {});

/*
    constraints	
 
*/
type ConstraintFn<T> = (
	...args: T[]
) => (p: Package) => Package | false;

class Constraint<T, U> {
	fn: ConstraintFn<T>;
	args: T[];
	name: string;
	constructor(
		fn: ConstraintFn<T>,
		args: T[],
		name: string,
	) {
		this.fn = fn;
		this.args = args ?? [];
		this.name = name ?? "";
	}
	public toString = () => {
		const str = `[${this.name} ${this.args}]`;
		return str;
	};
	//calls constraint
	//c->proc takes a package and returns a modified package or false
	proc(p: Package): Package | false {
		const f = this.fn.apply(null, this.args);
		return f(p);
	}
}

function make_constraint<T, U>(
	fn: ConstraintFn<T>,
	args: T[],
	name: string,
) {
	assert(
		typeof fn === "function",
		"#1 of make-constraint is function",
	);
	assert(
		typeof args === "object",
		"#2 of make-constraint is array",
	);
	assert(
		Array.isArray(args),
		"#2 of make-constraint is array",
	);
	return new Constraint<T, U>(fn, args, name);
}

//this returns false (in case of inconsistency) or a modified package
function run_constraints(
	store: SList<any>,
	p0: Package,
): Package | false {
	let p: Package | false = p0;
	let cs = store;
	while (!cs.is_empty()) {
		const c = cs.first;
		p = c.proc(p);
		if (p === false) return false;
		cs = cs.rest;
	}
	return p;
}

type CLPInput = number | LVar;

/*
    clp for reals
    
    The clp operations (such +-/* and <=, <, >, >=, !=, dom) create a binding of a variable to a domain, which is added to package->domains after checking for consistency. When eq creates a new binding, we check the variable's domain (if any) for consistency before extending package->frame.
    
*/

function less_equal_c(x: CLPInput, y: CLPInput) {
	return (p: Package) => {
		const wx = p.walk(x);
		const wy = p.walk(y);
		const dx = get_domain(p, wx);
		const dy = get_domain(p, wy);
		const di = intersection(
			dx,
			make_domain(minus_inf, dy.max),
		);
		if (di) {
			const di2 = intersection(
				dy,
				make_domain(dx.min, inf),
			);
			if (di2) {
				const p1 = p.extend_domain(x, di);
				const p2 = p1.extend_domain(y, di2);
				return p2;
			}return false;
		}return false;
	};
}

function add_c(x: CLPInput, y: CLPInput, z: CLPInput) {
	//X + Y = Z
	//z=x+y
	//x=z-y
	//y=z-x
	return (p: Package) => {
		const wx = p.walk(x);
		const wy = p.walk(y);
		const wz = p.walk(z);
		let dx = get_domain(p, wx);
		let dy = get_domain(p, wy);
		let dz = get_domain(p, wz);
		dz = intersection(dz, dx.add(dy));
		if (dz) {
			dx = intersection(dx, dz.sub(dy));
			if (dx) {
				dy = intersection(dy, dz.sub(dx));
				if (dy) {
					return p
						.extend_domain(x, dx)
						.extend_domain(y, dy)
						.extend_domain(z, dz);
				}
			}
		}
		return false;
	};
}

function mul_c(x: CLPInput, y: CLPInput, z: CLPInput) {
	//X * Y = Z
	//z=x*y
	//x=z/y
	//y=z/x
	return (p: Package) => {
		const wx = p.walk(x);
		const wy = p.walk(y);
		const wz = p.walk(z);
		let dx = get_domain(p, wx);
		let dy = get_domain(p, wy);
		let dz = get_domain(p, wz);
		dz = intersection(dz, dx.mul(dy));
		if (dz) {
			dx = intersection(dx, dz.div(dy));
			if (dx) {
				dy = intersection(dy, dz.div(dx));
				if (dy) {
					return p
						.extend_domain(x, dx)
						.extend_domain(y, dy)
						.extend_domain(z, dz);
				}
			}
		}
		return false;
	};
}

const clpr = {
	dom: (x: any, min: any, max: any) => {
		assert(
			typeof min === "number" && typeof max === "number",
			"#2-3 arguments of dom must be number.",
		);
		return (p: Package) => {
			const d = make_domain(min, max);
			const wx = p.walk(x);
			const dx = get_domain(p, x);
			const di = intersection(dx, d);
			//di returns false when it fails
			//in that case, the goal will fail
			if (di) return SLogic.win(p.extend_domain(x, di));
			return SLogic.fail();
		};
	},
	add: (x: CLPInput, y: CLPInput, z: CLPInput) => goal_construct(add_c, [x, y, z], "+"),
	sub: (x: CLPInput, y: CLPInput, z: CLPInput) => {
		return clpr.add(z, y, x); //x-y=z is the same as x=z+y
	},
	mul: (x: CLPInput, y: CLPInput, z: CLPInput) => goal_construct(mul_c, [x, y, z], "*"),
	div: (x: CLPInput, y: CLPInput, z: CLPInput) => {
		return clpr.mul(z, y, x); //x/y=z is the same as x=z*y
	},
	less_equal: (x: CLPInput, y: CLPInput) => goal_construct(less_equal_c, [x, y], "<="),
	make_domain: make_domain,
	intersection: intersection,
	get_domain: get_domain,
	REAL_DOMAIN: REAL_DOMAIN,
};

//constructs a goal from constraint parameters
export function goal_construct<T>(
	fn: ConstraintFn<T>,
	args: T[],
	name: string,
) {
	const c = make_constraint(fn, args, name);
	return (p: Package) => {
		const pc = p.extend_constraint(c);
		const p2 = c.proc(pc);
		if (p2) return SLogic.win(p2);
		return SLogic.fail();
	};
}

class SList<TYPE> {
	first: any;
	rest: any;
	type: string;
	constructor(a: undefined, b: undefined) {
		this.first = a;
		this.rest = b;
		this.type = "list";
	}
	is_empty(...args: any[]) {
		return typeof this.rest === "undefined";
	}
	append(s2: TYPE | SList<TYPE>): TYPE | SList<TYPE> {
		if (this.is_empty()) return s2;
		return SLogic.make_list(this.first, this.append(s2));
	}
	interleave(s2: SList<TYPE>): SList<TYPE> {
		if (this.is_empty()) return s2;
		
			return SLogic.make_list(
				this.first,
				s2.interleave(this.rest),
			);
	}
	forEach(f: (arg0: TYPE) => void) {
		if (this.is_empty()) return;
		
			f(this.first);
			this.rest.forEach(f);
	}
	foldr<ACC>(
		f: (arg0: ACC, arg1: TYPE) => ACC,
		initial: ACC,
	) {
		if (this.is_empty()) {
			return initial;
		}
			return f(this.first, this.rest.foldr(f, initial));
	}
	map<T>(f: (arg0: TYPE) => T) {
		if (this.is_empty()) return EMPTY_STREAM;
		
			const _rest = this.rest.map(f);
			return SLogic.make_list(f(this.first), _rest);
	}
	extend(val: TYPE, ..._args: TYPE[]) {
		return SLogic.make_list(val, this);
	}
	public toString = () => {
		let str = "|";
		let s = this;
		while (!s.is_empty()) {
			str +=
				`${s.first.toString() +
				(s.rest.is_empty() ? "" : "; ")}\n`;
			s = s.rest;
		}
		str += "|";
		return str;
	};
	write() {
		write(this.toString());
	}
	walk<T>(variable: LVar | T): T | LVar | undefined {
		let frame = this;
		const frame0 = frame;
		if (SLogic.is_lvar(variable)) {
			while (!frame.is_empty()) {
				const binding = frame.first;
				if (binding.variable === variable) {
					return frame0.walk(binding.val);
				}
				frame = frame.rest;
			}
			return variable;
		}return variable;
	}
}

/*
    packages hold a **frame**, a **constraint store** and a list of **domains**
*/

export class Package {
	frame: SList<any>;
	store: SList<any>;
	domains: any;
	type: string;
	constructor(f: SList<any>, cs: SList<any>, d: any) {
		this.frame = f;
		this.store = cs;
		this.domains = d;
		this.type = "package";
	}
	lookup_binding_helper<T>(
		frame: SList<any>,
		variable: T,
	): boolean | T {
		if (frame === EMPTY_LIST) return false;
		if (frame.first.variable === variable)
			return frame.first;
		
			return this.lookup_binding_helper(
				frame.rest,
				variable,
			);
	}
	lookup_binding(variable: any) {
		if (SLogic.is_list(this.frame))
			return this.lookup_binding_helper(
				this.frame,
				variable,
			);
		throw new Error("frame must be a list");
	}
	lookup_domain_binding(variable: any) {
		return this.lookup_binding_helper(
			this.domains,
			variable,
		);
	}
	is_empty(args?: any): boolean {
		return this.frame?.is_empty?.(args) ?? false;
	}
	set_frame(f: any) {
		return SLogic.make_package(f, this.store, this.domains);
	}
	extend_binding(variable: any, val: any) {
		return SLogic.make_package(
			this.frame.extend(
				SLogic.make_binding(variable, val),
				this.store,
				this.domains,
			),
			this.store,
			this.domains,
		);
	}
	extend_domain(v: any, d: { min: any; max: any }) {
		if (d.min === d.max) {
			if (SLogic.is_lvar(v))
				return this.extend_binding(v, d.min);
			return this;
		}
		return new Package(
			this.frame,
			this.store,
			this.domains.extend(SLogic.make_binding(v, d)),
		);
	}
	extend_constraint<T, U>(c: Constraint<T, U>) {
		return SLogic.make_package(
			this.frame,
			this.store.extend(c),
			this.domains,
		);
	}
	extend(...args: any): Package {
		return SLogic.make_package(
			this.frame.extend(args),
			this.store,
			this.domains,
		);
	}
	public toString = (): string => {
		const str =
			`{${this.frame.is_empty()
				? ""
				: this.frame.toString() +
					(this.store.is_empty() ? "" : ", ")}${this.store.is_empty() ? "" : `${this.store}, `}${this.domains.is_empty() ? "" : this.domains}}`;
		return str;
	};
	write() {
		write(this.toString());
	}
	walk<T>(variable: T): LVar | T | undefined {
		return this.frame.walk(variable);
	}
	get_value(variable: any) {
		if (!SLogic.is_lvar(variable)) return variable;
		const result = this.lookup_binding(variable).val;
		if (typeof result === "undefined")
			return this.lookup_domain_binding(variable).val;
		return result;
	}
}

/*
    streams
*/

export class Stream {
	first: any;
	rest: any;
	type: string;
	constructor(a: undefined, b: undefined) {
		this.first = a;
		this.rest = b;
		this.type = "stream";
	}
	is_empty() {
		return typeof this.rest === "undefined";
	}
	iterate(f: (arg0: any) => void, j: number, i: number) {
		i = i || 0;
		if (i >= j || this.is_empty()) return;
		
			f(this.first);
			this.rest().iterate(f, j, i + 1);
	}
	forEach(f: (arg0: any) => void) {
		if (this.is_empty()) return;
		
			f(this.first);
			this.rest().iterate(f);
	}
	foldr(f: (arg0: any, arg1: any) => any, initial: any) {
		if (this.is_empty()) {
			return initial;
		}
			return f(this.first, this.rest().foldr(f, initial));
	}
	map(f: (arg0: any) => any) {
		if (this.is_empty()) return EMPTY_STREAM;
		
			const _rest = this.rest().map(f);
			return SLogic.make_stream(f(this.first), () => _rest);
	}
	flatten() {
		if (this.is_empty()) return this;
		if (SLogic.is_stream(this.first)) {
			const s1 = this.first;
			const s2 = this.rest();
			return s1.append(s2.flatten());
		}
			return SLogic.make_stream(this.first).append(
				this.rest().flatten(),
			);
	}
	append(s2: any) {
		if (this.is_empty()) return s2;
		
			return SLogic.make_stream(this.first, () => this.rest().append(s2));
	}
	interleave(s2: { interleave: (arg0: any) => any }) {
		if (this.is_empty()) return s2;
		
			return SLogic.make_stream(this.first, () => s2.interleave(this.rest()));
	}
	extend(val: any) {
		return SLogic.make_stream(val, () => this);
	}
	public toString = () => {
		let str = "(";
		let s = this;
		while (!s.is_empty()) {
			str +=
				s.first.toString() +
				(s.rest().is_empty() ? "" : ", ");
			s = s.rest();
		}
		str += ")";
		return str;
	};
	write() {
		write(this.toString());
	}
}

/*
    bindings
*/

class Binding {
	variable: any;
	val: any;
	type: string;
	constructor(variable: any, val: any) {
		this.variable = variable;
		this.val = val;
		this.type = "binding";
	}
	public toString = () => {
		return (
			`${typeof this.variable.name !== "undefined"
				? this.variable.name
				: "_"}=${this.val.toString()}`
		);
	};
}

/*
    types
*/

const EMPTY_STREAM = new Stream(undefined, undefined);
const EMPTY_LIST = new SList(undefined, undefined);
const EMPTY_PACKAGE = new Package(
	EMPTY_LIST,
	EMPTY_LIST,
	EMPTY_LIST,
);

function has_type(obj: { type: any }, type: string) {
	return (
		typeof obj === "object" &&
		typeof obj.type !== "undefined" &&
		obj.type === type
	);
}

const _between = (
	a: number,
	b: number,
	x: any,
): (p: Package) => Stream => {
	if (a > b) return SLogic.fail;
	
		const eqe = SLogic.eq(x, a);
		return SLogic.disj(eqe, SLogic.between(a + 1, b, x));
};

class LogicList extends Array {
	type: string;
	constructor() {
		super();
		this.type = "logic_list";
	}
	public toString = () => {
		let str = "|";
		const s = this;
		for (const i in s) {
			str += `${i.toString()}; `;
		}
		str += "|";
		return str;
	};
}

const valueShow = (v: any): string => {
	if (typeof v === "undefined") return "undefined";
	if (typeof v === "object" && v !== null) {
		if (v.type === "logic_list") {
			return `[${v.map(valueShow).join(", ")}]`;
		}
		if (v.type === "logic_map") {
			return v.toString();
		}
		if (SLogic.is_lvar(v)) {
			return `Lvar(${typeof v.name !== "undefined" ? v.name : "_"})`;
		}
		if (Array.isArray(v)) {
			return `[${v.map(valueShow).join(", ")}]`;
		}
		if (typeof v.toString === "function") {
			return v.toString();
		}
		return (
			`{${Object.keys(v)
				.map((k) => `${k}=${valueShow(v[k])}`)
				.join(", \n")}}`
		);
	}
	return v.toString();
};

export class LogicMap extends Map {
	type: string;
	isfinite: "finite" | "infinite";
	constructor(finite: "finite" | "infinite" = "finite") {
		super();
		this.isfinite = finite;
		this.type = "logic_map";
	}
	public toString = () => {
		return `LogicMap(${this.isfinite}, ${Array.from(
			this.entries(),
		)
			.map(([k, v]) => `${k}=${valueShow(v)}`)
			.join(", ")})`;
	};
}

export interface LVar {
	type: string;
	name?: any;
}

export class SLogic {
	static dom = clpr.dom;
	static add = clpr.add;
	static sub = clpr.sub;
	static mul = clpr.mul;
	static div = clpr.div;
	static less_equal = clpr.less_equal;
	static clpr = clpr;
	static nil = EMPTY_PACKAGE; //a goal needs a package; therefore it initially receives 'nil' (the first package)
	static EMPTY_STREAM = EMPTY_STREAM;
	static EMPTY_LIST = EMPTY_LIST;

	static is_stream(v: any): v is Stream {
		return has_type(v, "stream");
	}
	static is_list(v: any): v is SList<any> {
		return has_type(v, "list");
	}
	static is_package(v: any): v is Package {
		return has_type(v, "package");
	}
	static is_binding(v: any): v is Binding {
		return has_type(v, "binding");
	}
	static is_lvar(v: any): v is LVar {
		return has_type(v, "logic_var");
	}
	static is_logic_list(v: any): v is LogicList {
		return has_type(v, "logic_list");
	}
	static is_logic_map(v: any): v is LogicMap {
		return has_type(v, "logic_map");
	}

	static is_finite_map(v: LogicMap): boolean {
		return v.isfinite === "finite";
	}

	static is_infinite_map(v: LogicMap): boolean {
		return v.isfinite === "infinite";
	}

	static is_array(v: any) {
		return (
			Object.prototype.toString.call(v) === "[object Array]"
		);
	}
	static is_object(v: any) {
		return (
			Object.prototype.toString.call(v) ===
			"[object Object]"
		);
	}
	static lvar(name?: any): LVar {
		//name is optional (for debugging)
		return { type: "logic_var", name: name };
	}
	static list(...args: any[]) {
		const l1 = new LogicList();
		args.forEach((arg) => l1.push(arg));
		// const l = Array.prototype.slice.call(arguments)
		// l.type = 'logic_list'
		return l1;
	}

	static lmap<A, B>(
		m: Map<A, B>,
		finite: "finite" | "infinite" = "finite",
	) {
		const l1 = new LogicMap(finite);
		for (const [k, v] of m) {
			l1.set(k, v);
		}
		return l1;
	}

	static make_binding(variable: any, val: any, name?: any) {
		const b = new Binding(variable, val);
		return b;
	}
	static make_stream(a: any, b?: () => any) {
		if (typeof b === "undefined")
			b = () => EMPTY_STREAM;
		assert(
			typeof b === "function",
			"#2 argument must be function.",
		);
		const b2: any = b;
		return new Stream(a, b2);
	}
	static make_list<T>(a: any, b: any) {
		if (typeof b === "undefined") b = EMPTY_LIST;
		assert(
			typeof b === "object",
			"#2 argument must be object.",
		);
		return new SList<T>(a, b);
	}
	static make_package(f: any, cs: any, ds: any) {
		assert(
			SLogic.is_list(f),
			"#1 argument of package must be list",
		);
		assert(
			SLogic.is_list(cs),
			"#2 argument of package must be list",
		);
		assert(
			SLogic.is_list(ds),
			"#3 argument of package must be list",
		);
		return new Package(f, cs, ds);
	}
	static unify(
		a1: string | any[],
		b1: string | any[],
		frame: false | SList<any>,
	): false | SList<any> {
		if (frame === false) return false;
		const a = frame.walk(a1);
		const b = frame.walk(b1);
		if (a === b) return frame;
		if (SLogic.is_lvar(a))
			//is variable
			return frame.extend(SLogic.make_binding(a, b));
		if (SLogic.is_lvar(b))
			//is variable
			return frame.extend(SLogic.make_binding(b, a));
		if (
			SLogic.is_logic_list(a) &&
			SLogic.is_logic_list(b)
		) {
			//are both lists
			//match two arrays
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; ++i) {
				frame = SLogic.unify(a[i], b[i], frame);
			}
			return frame;
		}if (
			SLogic.is_logic_map(a) &&
			SLogic.is_logic_map(b)
		) {
			//are both maps
			// if a is finite, and b is infinite, treat b as finite
			if (
				SLogic.is_finite_map(a) &&
				SLogic.is_infinite_map(b)
			) {
				// unify b with a
				frame = unifyMaps(a, b, frame);
			}
			// if a is infinite, and b is finite, treat a as finite
			else if (
				SLogic.is_infinite_map(a) &&
				SLogic.is_finite_map(b)
			) {
				// unify a with b
				frame = unifyMaps(b, a, frame);
			}
			// if both are finite, match them
			else if (
				SLogic.is_finite_map(a) &&
				SLogic.is_finite_map(b)
			) {
				// match two maps
				if (a.size !== b.size) return false;
				frame = unifyMaps(a, b, frame);
			}
			// if both are infinite, merge them
			else if (
				SLogic.is_infinite_map(a) &&
				SLogic.is_infinite_map(b)
			) {
				// merge two maps
				frame = unifyMaps(a, b, frame);
				// frame = unifyMaps(b, a, frame);
			} else {
				throw new Error("unify: unknown map type");
			}
			return frame;
		}return false;
	}

	static eq(a: any, b: any) {
		//'goal' version of unify
		// { frame: any; set_frame: (arg0: any) => any; store: { is_empty: () => any } }
		return (p: Package) => {
			const f = p.frame;
			const f2 = SLogic.unify(a, b, f);
			if (f2) {
				//if(f!=f2 && !p.domains.is_empty() && (!intersection(get_domain(p, a), get_domain(p, b)))) //take care of constraints
				//return SLogic.fail()
				const p2 = p.set_frame(f2);
				if (f === f2 || p.store.is_empty())
					return SLogic.win(p2);
				//check constraints first
				const p3 = run_constraints(p2.store, p2);
				if (p3) return SLogic.win(p3);
				return SLogic.fail();
			}return SLogic.fail();
		};
	}

	static win(pack: any) {
		return SLogic.make_stream(pack || SLogic.nil);
	}
	static fail(pack?: any) {
		return EMPTY_STREAM;
	}

	/*
        some functions that operate on goals
    */
	static disj(
		g1: (p: Package) => Stream,
		g2: (arg0: any) => any,
	) {
		return (f: Package) => g1(f).append(g2(f));
	}

	static or(...args: any[]) {
		if (args.length === 0) return SLogic.fail;
		if (args.length === 1) return args[0];
		const g = SLogic.disj(
			args[0],
			SLogic.or.apply(null, args.slice(1)),
		);
		return g;
	}

	static conj(
		g1: (arg0: Package) => Stream,
		g2: (arg0: Package) => Stream,
	) {
		if (
			typeof g1 !== "function" ||
			typeof g2 !== "function"
		) {
			console.log("g1", g1, typeof g1, "g2", g2, typeof g2);
		}
		return (f: Package): Stream => {
			const s1 = g1(f);
			return s1
				.map((f1: Package) => g2(f1))
				.flatten();
		};
	}
	static and(...args: any[]) {
		if (args.length === 0) return SLogic.win;
		if (args.length === 1) return args[0];
		const g = SLogic.conj(
			args[0],
			SLogic.and.apply(null, args.slice(1)),
		);
		return g;
	}

	static implies(
		g1: (arg0: any) => any,
		g2: (arg0: any) => any,
		g3?: (arg0: any) => any,
	) {
		//g1 -> g2 ; g3
		return (p: any) => {
			const s1 = g1(p);
			if (s1.is_empty()) return g3 ? g3(p) : SLogic.win(p);
			
				return s1
					.map((p: any) => g2(p))
					.flatten();
		};
	}

	/*
        non-fundamental goals
    */
	static between(a: number, b: number, x: any) {
		assert(
			typeof a === "number",
			"#1 argument of between is number",
		);
		assert(
			typeof b === "number",
			"#2 argument of between is number",
		);
		return _between(a, b, x);
	}

	static run(
		g: (arg0: any) => any,
		v: LVar | any[],
		n?: number,
	) {
		//runs goal getting the first n results of variables
		//n is optional (n=n or infinity)
		//v is variable or array of variables
		assert(
			SLogic.is_lvar(v) || SLogic.is_array(v),
			"#2 of run must be variable/array",
		);
		n = typeof n === "undefined" ? inf : n;
		let s = g(SLogic.nil);
		const result: any[] = [];
		for (let i = 0; i < n && !s.is_empty(); ++i) {
			const pack = s.first;
			const frame = pack.frame;
			if (SLogic.is_lvar(v)) {
				//get variable into result
				const v2 = frame.walk(v);
				const _temp = SLogic.is_lvar(v2)
					? pack.get_value(v)
					: v2;
				result.push(_temp);
			} else {
				//get array of variables into result
				const vals: any = [];
				for (let j = 0; j < v.length; ++j) {
					const v2 = frame.walk(v[j]);
					const _temp = SLogic.is_lvar(v2)
						? pack.get_value(v2)
						: v2;
					vals.push(_temp);
				}
				result.push(vals);
			}
			s = s.rest();
		}
		return result;
	}
}

function unifyMaps(
	a: LogicMap,
	b: LogicMap,
	frame: false | SList<any>,
) {
	// console.log('unifying maps||||||||||||||||||||||||');
	// console.log('unifying maps||||||||||||||||||||||||');

	// console.log('unifying maps||||||||||||||||||||||||');

	// console.log('unifying maps||||||||||||||||||||||||');

	for (const [k, v] of a) {
		if (b.has(k) && SLogic.is_list(frame)) {
			frame = SLogic.unify(v, b.get(k), frame);
		}
	}
	return frame;
}
