import {
	List as ImmList,
	Map as ImmMap,
	Record as ImmRecord,
} from "immutable";
import { type LTerm, LLVar, LNom } from "./terms";
import { Subst } from "./Subst";
import {
	unifyKeyOf as kvUnifyKeyOf,
	mergeKvStore,
} from "./kv";
import {
	type CleanOutput,
	type Nominal,
	type ImmatureStream,
	StreamFailed,
	type SingletonStream,
	type KVStore,
} from "./types";
import { failed } from "./streams";
import { type DeltaMap, emptyDelta } from "./DeltaMap";
interface InfoParams {
	nominal: Nominal;
	kvStore: KVStore;
}
export const infoDefaults: InfoParams = {
	nominal: {
		chi: ImmMap(),
		fenv: ImmMap(),
		fenv2: ImmMap(),
	},
	kvStore: ImmMap(),
};

export class InfoStore extends ImmRecord(infoDefaults) {}

interface StateParams {
	subst: Subst;
	number: number;
	nomNumber: number;
	i: InfoStore;
	delta: DeltaMap;
	timev: number;
}
export const stateDefaults: StateParams = {
	// fail: false,
	// subst: new Subst({ pairs: ImmList() }),
	subst: new Subst({ mp: ImmMap() }),
	number: 0,
	nomNumber: 0,
	// allowFails: true,
	// c: emptyConstraintStore,
	i: new InfoStore(),
	delta: emptyDelta,
	timev: 0,
};

export class State extends ImmRecord(stateDefaults) {
	find(u: LTerm): LTerm {
		const s = this.subst;
		if (!(s instanceof Subst))
			throw new Error("Not a subst");
		return s.find(u);
	}

	reify(u: LTerm): LTerm {
		return this.find(u).reify(this.subst);
	}

	unify(u2: LTerm, v2: LTerm): State | null {
		const u = this.find(u2);
		const v = this.find(v2);
		if (u.selfEquiv(v)) return this;
		if (v instanceof LLVar) {
			return this.unifyVar(u, v);
		}
		if (u instanceof LLVar) return this.unifyVar(v, u);
		return u.unite(this, v);
	}

	unifyVar(u: LTerm, v: LLVar): State | null {
		const state1 = u.varUnifyEmptyScope(this, v);
		if (state1 === null) return null;
		const merged = mergeKvStore(state1);
		return merged !== null ? merged : null;
	}

	unifyKeyOf(
		obj2: LTerm,
		key: string,
		value2: LTerm,
	): State | null {
		return kvUnifyKeyOf(this, obj2, key, value2);
	}

	// resetLvarList(): State {
	//     return this.updateLocal(
	//         (l) => l.setLvarList(ImmList())
	//     );
	// }

	// pushLvar(lv: LLVar): State {
	//     return this.updateLocal(
	//         (l) => l.addLvar(lv)
	//     );
	// }

	extend(u: LLVar, v: LTerm): State {
		const extendedSubst = this.subst.extend(u, v);
		if (!extendedSubst) throw new Error("Failed to extend");
		return this.setSubst(extendedSubst);
	}

	// swapPhi(): State {
	// return this.set('i', this.i.set('local', this.i.local.swapPhi1Phi2()));
	// }

	// setLocal(local: LocalScopeStore): State {
	//     return this.set('i', this.i.set('local', local));
	// }

	setNominal(nominal: Nominal): State {
		return this.set("i", this.i.set("nominal", nominal));
	}

	setDelta(delta: DeltaMap): State {
		return this.set("delta", delta);
	}

	// updateLocal(fn: (local: LocalScopeStore) => LocalScopeStore): State {
	//     return this.set('i', this.i.update('local', fn));
	// }

	// getFreshLocalScope(): LocalScopeStore {
	//     return this.i.local.setPhi1(emptyPhiScope).setPhi2(emptyPhiScope).setPartition(this.i.nominal.chi).setLvarList(ImmList());
	// }

	toMap(
		showInternals = false,
		vars2seek1: string[] | LLVar[] = [],
	): { [k: string]: string } {
		const vars2seek = vars2seek1.map((v) => {
			if (v instanceof LLVar) return v;
			return new LLVar(v);
		});
		const clo = this.subst.toClean(
			showInternals,
			vars2seek,
		);
		const outVal: { [k: string]: string } = {};
		for (const key of Object.keys(clo)) {
			const val = clo[key];
			outVal[key] = val.toString();
		}
		return outVal;
		// return this.subst.pairs.reduce((acc, spair) => {
		//     const v = spair.first;
		//     const val = spair.second.reify(this.subst);
		//     if (v instanceof LLVar) {
		//         if (v.name.startsWith('$') && !showInternals) {
		//             return acc;
		//         }
		//         if (seekvars && vars2seek.some((v2) => v2.name === v.name)) {
		//             acc[v.name] = val.toString();
		//             return acc;
		//         }if (seekvars && !vars2seek.some((v2) => v2.name === v.name)) {
		//             return acc;
		//         }
		//             acc[v.name] = val.toString();
		//             return acc;
		//     }
		//     throw new Error("Not a var");
		// }, {} as { [k: string]: string; });
	}

	increment(): State {
		return this.set("number", this.number + 1);
	}

	withNom<T>(
		fn: (nom: LNom) => (sc: State) => T,
		tmp?: string,
	): T {
		const gNom = new LNom(`${tmp ?? ""}${this.nomNumber}`);
		const nthis = this.set("nomNumber", this.nomNumber + 1);
		return fn(gNom)(nthis);
	}

	withLvar<T>(
		fn: (lv: LLVar) => (sc: State) => T,
		tmp = "",
	): T {
		const gNom = new LLVar(`${tmp}${this.number}`);
		const nthis = this.set("number", this.number + 1);
		return fn(gNom)(nthis);
	}

	setSubst(subst: Subst): State {
		return this.set("subst", subst);
	}

	toClean(
		showInternals = false,
		vars2seek1: string[] | LLVar[] = [],
	): CleanOutput {
		const vars2seek = vars2seek1.map((v) => {
			if (v instanceof LLVar) return v;
			return new LLVar(v);
		});
		// return this.subst.toClean(showInternals, vars2seek);
		const seekvars = vars2seek.length > 0;
		return this.subst.mp.reduce(
			(acc, spairsecond, spairfirst) => {
				const v = spairfirst;
				const val = spairsecond.reify(this.subst);
				if (v.startsWith("$") && !showInternals) {
					return acc;
				}
				if (seekvars) {
					if (vars2seek.some((v2) => v2.name === v)) {
						// return {...acc, [v.name]: val.cleanOutput()};
						console.log("MappingCHECK");
						acc[v] = val
							.map((valT) => {
								console.log("Mapping1");
								if (valT instanceof LLVar) {
									console.log("Mapping2");
									const fenvCheck = this.i.nominal.fenv.get(
										valT.name,
									);
									const fenv2Check =
										this.i.nominal.fenv2.get(valT.name);
									if (fenvCheck) {
										// acc[v] = `FENV1_SUSPENSION__${fenvCheck.toString()}`;
										return new LLVar(
											`FENV1_SUSPENSION__${fenvCheck.toString()}`,
										);
									} else if (fenv2Check) {
										return new LLVar(
											`FENV2_SUSPENSION__${fenv2Check.toString()}`,
										);
									} else {
										return valT;
									}
								} else {
									return valT;
								}
							})
							.cleanOutput();
						return acc;
					} else {
						return acc;
					}
				} else {
					console.log("MappingCHECK");
					// return {...acc, [v.name]: val.cleanOutput()};
					acc[v] = val.cleanOutput();
					return acc;
				}
			},
			{} as { [k: string]: CleanOutput },
		);
	}

	toString(): string {
		return `
subst: ${this.subst.toString()}

        `;
	}

	static toFail(): State {
		throw new Error("No longer in use");
		// return new State({ fail: true, subst: new Subst({ mp: ImmMap() }), number: 0, c: new ConstraintStore(ImmList()), i: new InfoStore() });
	}
}

export const emptyState = new State(stateDefaults);
