/**
 * MGoal-compatible builtins for the new interpreter.
 * Binds builtin names in the substitution so apply_pred can resolve them.
 */

import {
	type Builtin,
	builtinList,
} from "src/utils/builtinList";
import { eq, all, either, apply_pred } from "src/logic";
import { LTerm, LPredicateFn, LNom } from "src/logic/terms";
import {
	LPredicate,
	LPair,
	LLiteral,
	LEmpty,
	LLVar,
} from "src/logic/terms";
import {
	makelvar,
	makeLiteral,
	makePair,
	makeList,
	makeEmpty,
	makeTie,
} from "src/logic/makelvar";
import type { MGoal } from "src/logic/streams";
import type { State } from "src/logic/State";
import {
	freshInternal,
	freshInternal2,
	freshInternal3,
	freshNom,
} from "src/logic/AnyFreshFn";
import * as avo from "src/logic/availableo";

const firsto = (a: LTerm, l: LTerm): MGoal =>
	freshInternal((v) => eq(makePair(a, v), l));

const resto = (r: LTerm, l: LTerm): MGoal =>
	freshInternal((v) => eq(makePair(v, r), l));

const appendo = (l: LTerm, s: LTerm, o: LTerm): MGoal =>
	either(
		all(eq(makeEmpty(), l), eq(s, o)),
		freshInternal3((a, d, res) =>
			all(
				eq(makePair(a, d), l),
				eq(makePair(a, res), o),
				apply_pred(makelvar("internal_append"), d, s, res),
			),
		),
	);

function listToString(term: LTerm): string | null {
	if (term instanceof LPair) {
		if (
			term.first instanceof LLiteral &&
			typeof term.first.value === "string"
		) {
			const nsecond = listToString(term.second);
			if (nsecond === null) return null;
			return term.first.value + nsecond;
		}
	} else if (term instanceof LEmpty) {
		return "";
	}
	return null;
}

const string_to_list: LPredicateFn =
	(s: LTerm, l: LTerm): MGoal =>
	(sc: State) => {
		const ssf = sc.reify(s);
		const llf = sc.reify(l);
		if (
			ssf instanceof LLiteral &&
			typeof ssf.value === "string"
		) {
			return eq(
				l,
				makeList([...ssf.value].map((c) => makeLiteral(c))),
			)(sc);
		}
		if (llf instanceof LPair) {
			const nstring = listToString(llf);
			if (nstring != null) {
				return eq(s, makeLiteral(nstring))(sc);
			}
			return [];
		}
		throw new Error("Not an Lpair");
	};

const addc: LPredicateFn =
	(a: LTerm, b: LTerm, c: LTerm): MGoal =>
	(sc: State) => {
		const aWalked = sc.reify(a);
		const bWalked = sc.reify(b);
		const cWalked = sc.reify(c);
		if (
			aWalked instanceof LLiteral &&
			bWalked instanceof LLiteral
		) {
			if (
				typeof aWalked.value === "number" &&
				typeof bWalked.value === "number"
			) {
				return eq(
					c,
					makeLiteral(aWalked.value + bWalked.value),
				)(sc);
			}
			if (
				typeof aWalked.value === "string" &&
				typeof bWalked.value === "string"
			) {
				return eq(
					c,
					makeLiteral(aWalked.value + bWalked.value),
				)(sc);
			}
			if (
				typeof aWalked.value === "number" &&
				typeof bWalked.value === "string"
			) {
				return eq(
					c,
					makeLiteral(
						aWalked.value.toString() + bWalked.value,
					),
				)(sc);
			}
			if (
				typeof aWalked.value === "string" &&
				typeof bWalked.value === "number"
			) {
				return eq(
					c,
					makeLiteral(
						aWalked.value + bWalked.value.toString(),
					),
				)(sc);
			}
			throw new Error("Invalid types for add");
		}
		if (
			aWalked instanceof LLiteral &&
			cWalked instanceof LLiteral
		) {
			if (
				typeof aWalked.value === "number" &&
				typeof cWalked.value === "number"
			) {
				return eq(
					b,
					makeLiteral(cWalked.value - aWalked.value),
				)(sc);
			}
			if (
				typeof aWalked.value === "string" &&
				typeof cWalked.value === "string"
			) {
				return eq(
					b,
					makeLiteral(
						cWalked.value.slice(aWalked.value.length),
					),
				)(sc);
			}
		}
		if (
			bWalked instanceof LLiteral &&
			cWalked instanceof LLiteral
		) {
			if (
				typeof bWalked.value === "number" &&
				typeof cWalked.value === "number"
			) {
				return eq(
					a,
					makeLiteral(cWalked.value - bWalked.value),
				)(sc);
			}
			if (
				typeof bWalked.value === "string" &&
				typeof cWalked.value === "string"
			) {
				return eq(
					a,
					makeLiteral(
						cWalked.value.slice(0, bWalked.value.length),
					),
				)(sc);
			}
		}
		throw new Error("Invalid types for add");
	};

const multiplyc: LPredicateFn =
	(a: LTerm, b: LTerm, c: LTerm): MGoal =>
	(sc: State) => {
		const aW = sc.reify(a);
		const bW = sc.reify(b);
		const cW = sc.reify(c);
		if (
			aW instanceof LLiteral &&
			bW instanceof LLiteral &&
			typeof aW.value === "number" &&
			typeof bW.value === "number"
		) {
			return eq(c, makeLiteral(aW.value * bW.value))(sc);
		}
		if (
			aW instanceof LLiteral &&
			cW instanceof LLiteral &&
			typeof aW.value === "number" &&
			typeof cW.value === "number"
		) {
			if (aW.value === 0)
				throw new Error("multiply: division by zero");
			return eq(b, makeLiteral(cW.value / aW.value))(sc);
		}
		if (
			bW instanceof LLiteral &&
			cW instanceof LLiteral &&
			typeof bW.value === "number" &&
			typeof cW.value === "number"
		) {
			if (bW.value === 0)
				throw new Error("multiply: division by zero");
			return eq(a, makeLiteral(cW.value / bW.value))(sc);
		}
		throw new Error("Invalid types for multiply");
	};

const dividec: LPredicateFn =
	(a: LTerm, b: LTerm, c: LTerm): MGoal =>
	(sc: State) => {
		const aW = sc.reify(a);
		const bW = sc.reify(b);
		const cW = sc.reify(c);
		if (
			aW instanceof LLiteral &&
			bW instanceof LLiteral &&
			typeof aW.value === "number" &&
			typeof bW.value === "number"
		) {
			if (bW.value === 0)
				throw new Error("divide: division by zero");
			return eq(c, makeLiteral(aW.value / bW.value))(sc);
		}
		if (
			aW instanceof LLiteral &&
			cW instanceof LLiteral &&
			typeof aW.value === "number" &&
			typeof cW.value === "number"
		) {
			if (cW.value === 0 && aW.value !== 0) return [];
			if (aW.value === 0)
				throw new Error("divide: divisor indeterminate");
			return eq(b, makeLiteral(aW.value / cW.value))(sc);
		}
		if (
			bW instanceof LLiteral &&
			cW instanceof LLiteral &&
			typeof bW.value === "number" &&
			typeof cW.value === "number"
		) {
			if (bW.value === 0)
				throw new Error("divide: division by zero");
			return eq(a, makeLiteral(cW.value * bW.value))(sc);
		}
		throw new Error("Invalid types for divide");
	};

const moduloc: LPredicateFn =
	(a: LTerm, b: LTerm, c: LTerm): MGoal =>
	(sc: State) => {
		const aW = sc.reify(a);
		const bW = sc.reify(b);
		const cW = sc.reify(c);
		if (
			aW instanceof LLiteral &&
			bW instanceof LLiteral &&
			typeof aW.value === "number" &&
			typeof bW.value === "number"
		) {
			if (bW.value === 0)
				throw new Error("modulo: division by zero");
			return eq(c, makeLiteral(aW.value % bW.value))(sc);
		}
		throw new Error("Invalid types for modulo");
	};

const negatec: LPredicateFn =
	(a: LTerm, b: LTerm): MGoal =>
	(sc: State) => {
		const aW = sc.reify(a);
		const bW = sc.reify(b);
		if (
			aW instanceof LLiteral &&
			typeof aW.value === "number"
		) {
			return eq(b, makeLiteral(-aW.value))(sc);
		}
		if (
			bW instanceof LLiteral &&
			typeof bW.value === "number"
		) {
			return eq(a, makeLiteral(-bW.value))(sc);
		}
		throw new Error("Invalid types for negate");
	};

const defaultPred =
	(s: string): LPredicateFn =>
	() => {
		throw new Error(`${s} Not implemented`);
	};

const unify_left: LPredicateFn =
	(l: LTerm, r: LTerm): MGoal =>
	(sc: State) => {
		const lReified = sc.reify(l);
		if (lReified instanceof LLVar) return [];
		return eq(l, r)(sc);
	};

const unify_right: LPredicateFn =
	(l: LTerm, r: LTerm): MGoal =>
	(sc: State) => {
		const rReified = sc.reify(r);
		if (rReified instanceof LLVar) return [];
		return eq(l, r)(sc);
	};

const unify_equal: LPredicateFn = (
	l: LTerm,
	r: LTerm,
): MGoal => eq(l, r);

const unify_not_equal: LPredicateFn =
	(l: LTerm, r: LTerm): MGoal =>
	(sc: State) => {
		const res = eq(l, r)(sc);
		// eq returns [] when unification fails, [state] when it succeeds
		if (Array.isArray(res) && res.length === 0) return [sc];
		return [];
	};

function listLength(t: LTerm): number | null {
	if (t instanceof LEmpty) return 0;
	if (t instanceof LPair) {
		const r = listLength(t.second);
		if (r === null) return null;
		return 1 + r;
	}
	return null;
}

const lengtho: LPredicateFn =
	(list: LTerm, n: LTerm): MGoal =>
	(sc: State) => {
		const listR = sc.reify(list);
		const nR = sc.reify(n);
		if (
			nR instanceof LLiteral &&
			typeof nR.value === "number"
		) {
			const N = nR.value;
			if (N === 0) return eq(list, makeEmpty())(sc);
			if (N > 0 && Number.isInteger(N)) {
				return freshInternal2((h, t) =>
					all(
						eq(list, makePair(h, t)),
						eq(n, makeLiteral(N)),
						lengtho(t, makeLiteral(N - 1)),
					),
				)(sc);
			}
		}
		if (listR instanceof LEmpty)
			return eq(n, makeLiteral(0))(sc);
		if (listR instanceof LPair) {
			const len = listLength(listR);
			if (len !== null) return eq(n, makeLiteral(len))(sc);
		}
		throw new Error(
			"length: invalid or insufficiently instantiated",
		);
	};

function nthOfList(t: LTerm, n: number): LTerm | null {
	if (n === 0) {
		if (t instanceof LPair) return t.first;
		return null;
	}
	if (t instanceof LPair) return nthOfList(t.second, n - 1);
	return null;
}

const sliceo: LPredicateFn =
	(list: LTerm, index: LTerm, result: LTerm): MGoal =>
	(sc: State) => {
		const listR = sc.reify(list);
		const indexR = sc.reify(index);
		if (
			!(indexR instanceof LLiteral) ||
			typeof indexR.value !== "number"
		) {
			throw new Error("slice: index must be a number");
		}
		const idx = indexR.value;
		if (!Number.isInteger(idx) || idx < 0) {
			throw new Error(
				"slice: index must be a non-negative integer",
			);
		}
		const element = nthOfList(listR, idx);
		if (element === null) return [];
		return eq(result, element)(sc);
	};

const set_key_of: LPredicateFn =
	(source: LTerm, key: LTerm, value: LTerm): MGoal =>
	(sc: State) => {
		const keyReified = sc.reify(key);
		if (
			!(keyReified instanceof LLiteral) ||
			typeof keyReified.value !== "string"
		) {
			throw new Error("set_key_of: key must reify to a literal string");
		}
		const keyStr = keyReified.value;
		const objCanon = sc.find(source);
		const newState = sc.unifyKeyOf(objCanon, keyStr, value);
		return newState ? [newState] : [];
	};

const gen_nominal: LPredicateFn =
	(a: LTerm): MGoal =>
	freshNom((v) => eq(a, v));

const tie: LPredicateFn =
	(a: LTerm, tnom: LTerm,  tbody: LTerm): MGoal =>
	(sc: State) => {
		const tnomReified = sc.reify(tnom);
		if (tnomReified instanceof LNom) {
			return eq(a, makeTie(tnomReified, tbody))(sc);
		}
		throw new Error("tie: tnom must reify to a nominal");
	};

const hash: LPredicateFn =
	(a: LTerm, b: LTerm): MGoal =>
	(sc: State) => {
		const aReified = sc.reify(a);
		if (aReified instanceof LNom) {
			return avo.hash(aReified, b)(sc);
		}
		throw new Error("hash: a must reify to a nominal");
	};

const builtinsMap: Record<
	string,
	LPredicateFn | ReturnType<typeof defaultPred>
> = {
	unify: (...args) => {
		if (args.length < 2)
			throw new Error("Unify needs at least two arguments");
		const [u, v, ...rest] = args;
		let goal = eq(u, v);
		let curr = v;
		for (let i = 0; i < rest.length; i++) {
			goal = all(goal, eq(curr, rest[i]));
			curr = rest[i];
		}
		return goal;
	},
	first: (a, l) => firsto(a, l),
	rest: (r, l) => resto(l, r),
	cons: (a, b, l) => eq(l, makePair(a, b)),
	set_key_of,
	internal_file: defaultPred("internal_file"),
	unify_left,
	unify_right,
	unify_equal,
	unify_not_equal,
	slice: sliceo,
	length: lengtho,
	list: (al, ...l) => eq(al, makeList(l)),
	empty: (l) => eq(l, makeList([])),
	add: addc,
	subtract: (a, b, c) => addc(b, c, a),
	multiply: multiplyc,
	divide: dividec,
	modulo: moduloc,
	negate: negatec,
	internal_import: defaultPred("internal_import"),
	internal_append: appendo,
	string_to_list,
	gen_nominal,
	tie,
	hash,
};

/** Single MGoal that binds all builtin names in the substitution. */
const _builtinBindingGoals: MGoal[] = builtinList.map(
	(name) =>
		eq(
			makelvar(name),
			new LPredicate(name, builtinsMap[name]),
		),
);

export function builtinGoals(): MGoal {
	return all(..._builtinBindingGoals);
}
