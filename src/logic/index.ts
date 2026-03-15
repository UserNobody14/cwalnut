import { type LTerm, LPredicate, type LNom } from "./terms";
import type {
	AnyGoal,
	CleanOutput,
	SingletonGoal,
} from "./types";
import { emptyState, type State } from "./State";
import { topLevelUnificationS } from "./topLevelUnification";
import { makelvar } from "./makelvar";
import {
	takeT,
	allM,
	eitherM,
	failed,
	type MGoal,
} from "./streams";
import {
	type CarryThrough,
	cleanOutNoms1,
} from "./cleanOutNoms";

export function eq(u: LTerm, v: LTerm): MGoal {
	return (sc: State) => {
		if (!sc) throw new Error("No state");
		const singleton = topLevelUnificationS(sc, u, v);
		if (failed(singleton)) {
			return [];
		} else {
			return [singleton.success];
		}
	};
}

export function run(
	n: number | null,
	g: MGoal,
	extraNum?: number,
): State[] {
	if (n === null) {
		throw new Error("Cannot run with null");
	}
	return [...takeT(g(emptyState), n, extraNum)];
}

export function runProject<T>(
	n: number | null,
	g: MGoal,
	project: (s: State) => T,
	extraNum?: number,
): T[] {
	return run(n, g, extraNum).map(project);
}

export function run1(
	n: number | null,
	v: string[],
	g: MGoal,
	extraNum?: number,
): Record<string, CleanOutput>[] {
	return runProject(
		n,
		g,
		(s) => {
			const out: Record<string, CleanOutput> = {};
			let carryThrough: CarryThrough = {
				noms: [],
				lvars: [],
			};
			for (const vname of v) {
				const val = makelvar(vname).reify(s.subst);
				if (val) {
					const [vCl, ct2] = cleanOutNoms1(
						val.cleanOutput(),
						carryThrough,
					);
					carryThrough = ct2;
					out[vname] = vCl;
				}
			}
			return out;
		},
		extraNum,
	);
}

export function all(...g: MGoal[]): MGoal {
	if (g.length === 0) throw new Error("Cannot do that");
	return allM(g);
}

export function either(...g: MGoal[]): MGoal {
	return eitherM(g);
}

export function apply_pred(
	lp: LTerm,

	...args: LTerm[]
): MGoal {
	return (sc) => {
		const lpp = sc.reify(lp);
		if (!(lpp instanceof LPredicate))
			throw new Error(
				`Not a predicate: < ${lp.toString()} >`,
			);
		const arggs = lpp.fn(...args);
		if (typeof arggs === "function") {
			return arggs(sc);
		}
		throw new Error("Not a function??");
	};
}

//////////
///////////
// Nominal Logic Programming additions (alphakanren)
