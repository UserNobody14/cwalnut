import type {
	Map as ImmMap,
	List as ImmList,
} from "immutable";
import type { State } from "./State";
import type { DeltaMap } from "./DeltaMap";
import type { LNom, LTerm, LLVar } from "./terms";
import type { Subst } from "./Subst";

export enum StreamFailed {
	StreamOver = "StreamOver",
}

export type NablaList = ImmList<[LNom, LTerm]>;
export type NablaPackage = [NablaList, DeltaMap];

export type LPackage = [
	ImmList<[LTerm, LTerm]>,
	Subst,
	NablaList,
	number,
];

export type CombinedStateStreamType =
	| State
	| StreamFailed
	| MatureStream
	| ImmatureStream;

export type ImmatureStream =
	Iterable<CombinedStateStreamType>;
export type FlatStream = Iterable<State | StreamFailed>;
export type SingletonStream =
	| {
			success: State;
	  }
	| StreamFailed;
export type MatureStream = Iterable<State>;
export type SingletonGoal = {
	goal: (sc: State) => SingletonStream;
};
export type Goal = (sc: State) => MatureStream;
export type Goal2 = (
	sc: State,
) => MatureStream | ImmatureStream;
export type AnyGoal = Goal2 | SingletonGoal;
export type CleanOutput =
	| string
	| number
	| boolean
	| { [k: string]: CleanOutput }
	| CleanOutput[];

// Var is fresh in the term
export type FEnv2 = ImmMap<string, ImmList<LTerm>>;

export interface Nominal {
	chi: FEnv2;
	fenv: FEnv2;
	fenv2: FEnv2;
}
