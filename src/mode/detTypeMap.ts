import type { Map as ImmMap } from "immutable";
import type { ModeDetType } from "./ModeDetType";

export class RecurringDetType {
	// Holds the not-yet-processed modes & determinism types for recursive predicate calls.
	constructor(
		public modeMap: ImmMap<string, ModeDetType>,
	) {}
	//
}

export type DetTypeMap = ImmMap<string, ModeDetType[]>;

export function getPredModes(
	predName: string,
	detTypeMap: DetTypeMap,
): ModeDetType[] {
	return detTypeMap.get(predName, []);
}
