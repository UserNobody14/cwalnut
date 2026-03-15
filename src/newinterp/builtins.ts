/**
 * MGoal-compatible builtins for the new interpreter.
 * Binds builtin names in the substitution so apply_pred can resolve them.
 */

import {
	type Builtin,
	builtinList,
} from "src/utils/builtinList";
import { eq, all, either, apply_pred } from "src/logic";
import type { LTerm, LPredicateFn } from "src/logic/terms";
import {
	LPredicate,
	LPair,
	LLiteral,
	LEmpty,
} from "src/logic/terms";
import {
	makelvar,
	makeLiteral,
	makePair,
	makeList,
	makeEmpty,
} from "src/logic/makelvar";
import type { MGoal } from "src/logic/streams";
import type { State } from "src/logic/State";
import {
	freshInternal,
	freshInternal3,
} from "src/logic/AnyFreshFn";

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

const defaultPred =
	(s: string): LPredicateFn =>
	() => {
		throw new Error(`${s} Not implemented`);
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
	set_key_of: defaultPred("set_key_of"),
	internal_file: defaultPred("internal_file"),
	unify_left: defaultPred("unify_left"),
	unify_right: defaultPred("unify_right"),
	unify_equal: defaultPred("unify_equal"),
	unify_not_equal: defaultPred("unify_not_equal"),
	slice: defaultPred("slice"),
	length: defaultPred("length"),
	list: (al, ...l) => eq(al, makeList(l)),
	empty: (l) => eq(l, makeList([])),
	add: addc,
	subtract: (a, b, c) => addc(b, c, a),
	multiply: defaultPred("multiply"),
	divide: defaultPred("divide"),
	modulo: defaultPred("modulo"),
	negate: defaultPred("negate"),
	internal_import: defaultPred("internal_import"),
	internal_append: appendo,
	string_to_list,
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
