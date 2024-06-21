import { match } from "ts-pattern";
import * as P from "ts-pattern";
import { type LogicMap, type Package, SLogic, type Stream } from "./logic";
import { GuardP } from "ts-pattern/dist/types/Pattern";

const is_lvar = SLogic.is_lvar;
const is_logic_map = SLogic.is_logic_map;
const is_stream = SLogic.is_stream;
const is_logic_list = SLogic.is_logic_list;
const is_finite_map = (q: unknown): q is LogicMap =>
		is_logic_map(q) && SLogic.is_finite_map(q);
const is_infinite_map = (q: unknown): q is LogicMap =>
		is_logic_map(q) && SLogic.is_infinite_map(q);

const unify = SLogic.unify;
const eq = SLogic.eq;
const fail = SLogic.fail;
const conj = SLogic.conj;
const disj = SLogic.disj;
const lvar = SLogic.lvar;

const when = P.Pattern.when;

export const setKeyValue =
	(m1: unknown, k1: any, v1: any) =>
	(p: Package): Stream => {
		const m = p.walk(m1);
		const k = p.walk(k1);
		const v = p.walk(v1);
		return match([m, k, v])
			.with(
				[
					when(is_logic_map),
					P.Pattern.string,
					when(is_lvar),
				],
				([m, k, v]): Stream => {
					console.log("setKeyValue 1!!!!!", m, k, v);
					if (SLogic.is_finite_map(m)) {
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, v)(p);
					}
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, v)(p);
				},
			)
			.with(
				[when(is_logic_map), P.Pattern.string, P.Pattern._],
				([m, k, v]): Stream => {
					console.log("setKeyValue 2!!!!!", m, k, v);
					if (SLogic.is_finite_map(m)) {
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, v)(p);
					}
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, v)(p);
				},
			)
			.with(
				[when(is_lvar), P.Pattern.string, when(is_lvar)],
				([m, k, v]) => {
					console.log("setKeyValue 3!!!!!", m, k, v);
					const newMap = SLogic.lmap(new Map(), "infinite");
					newMap.set(k, v);
					return eq(m, newMap)(p);
				},
			)
			.otherwise(([m, k, v]) => {
				console.log("setKeyValue FAILURE!!!!!", m, k, v);
				return SLogic.fail(p);
			});
	};

export const setKey =
	(m1: unknown, k1: any) => (p: Package) => {
		const m = p.walk(m1);
		const k = p.walk(k1);
		return match([m, k])
			.with(
				[when(is_logic_map), P.Pattern.string],
				([m, k]) => {
					if (SLogic.is_finite_map(m)) {
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, k)(p);
					}
						if (!m.has(k)) {
							return SLogic.fail(p);
						}
						const pp = p.walk(m.get(k));
						if (pp === undefined) {
							return SLogic.fail(p);
						}
						return eq(pp, k)(p);
				},
			)
			.with([when(is_lvar), P.Pattern.string], ([m, k]) => {
				const newMap = SLogic.lmap(new Map(), "infinite");
				newMap.set(k, k);
				return eq(m, newMap)(p);
			})
			.otherwise(() => {
				return SLogic.fail;
			});
	};

export const setLength =
	(m1: unknown, k1: any) => (p: Package) => {
		const m = p.walk(m1);
		const k = p.walk(k1);
		return match([m, k])
			.with(
				[when(is_logic_list), P.Pattern.number],
				([m, k]) => {
					if (m.length !== k) {
						return SLogic.fail(p);
					}
					return SLogic.win(p);
				},
			)
			.with(
				[P.Pattern.string, P.Pattern.number],
				([m, k]) => {
					if (m.length !== k) {
						return SLogic.fail(p);
					}
					return SLogic.win(p);
				},
			)
			.with(
				[when(is_logic_list), when(is_lvar)],
				([m, k]) => {
					// Haven't put in the logic for this yet
					throw new Error("Not implemented");
				},
			)
			.with(
				[when(is_logic_map), P.Pattern.number],
				([m, k]) => {
					// Haven't put in the logic for this yet
					throw new Error("Not implemented");
				},
			)
			.with([when(is_lvar), P.Pattern.number], ([m, k]) => {
				// Haven't put in the logic for this yet
				throw new Error("Not implemented");
			})
			.otherwise(() => {
				return SLogic.fail;
			});
	};
