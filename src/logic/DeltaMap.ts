import {
	Map as ImmMap,
	Set as ImmSet,
	Record as ImmRecord,
} from "immutable";
import { type LNom, LLVar } from "./terms";
import { mapValueToLNom } from "./mapValueToLNom";

interface DeltaMapI {
	nameToVars: ImmMap<string, ImmSet<string>>;
	varToNames: ImmMap<string, ImmSet<string>>;
}
const deltaDefaults: DeltaMapI = {
	nameToVars: ImmMap(),
	varToNames: ImmMap(),
};

export class DeltaMap extends ImmRecord(deltaDefaults) {
	// restrict these lvars from these names:
	public setOneVarAndName(
		name: LNom,
		lvar: LLVar,
	): DeltaMap {
		// First add the name to the varToNames map
		const varToNames2 =
			this.varToNames.get(lvar.name) ?? ImmSet();
		const varToNames3 = varToNames2.add(name.name);
		const varToNames4 = this.varToNames.set(
			lvar.name,
			varToNames3,
		);
		// Now add the var to the nameToVar map
		const nameToVars2 =
			this.nameToVars.get(name.name) ?? ImmSet();
		const nameToVars3 = nameToVars2.add(lvar.name);
		const nameToVars4 = this.nameToVars.set(
			name.name,
			nameToVars3,
		);
		return this.set("nameToVars", nameToVars4).set(
			"varToNames",
			varToNames4,
		);
	}
	public restrict(
		names: ImmSet<LNom | string> | (LNom | string)[],
		...lvars: LLVar[]
	): DeltaMap {
		const names2 = ImmSet(names.map(mapValueToLNom()));
		return lvars.reduce<DeltaMap>((acc, lvar) => {
			return names2.reduce<DeltaMap>((acc2, name) => {
				return acc2.setOneVarAndName(name, lvar);
			}, acc);
		}, this);
	}

	public union(delta2: DeltaMap): DeltaMap {
		return this.varToNames.reduce((acc, names, vr) => {
			return acc.restrict(names, new LLVar(vr));
		}, delta2);
	}
}

export const emptyDelta = new DeltaMap(deltaDefaults);
