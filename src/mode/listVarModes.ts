import type {
	ExpressionGeneric,
	IdentifierGeneric,
} from "src/types/AstGeneric";
import { type Mode, commonModes } from "./ModeDetType";
import { modeTypeToString } from "./modeTypeToString";
import type { Map as ImmMap } from "immutable";

// Functions for manipulating VarModeMaps
export const getVarMode = <T>(
	varModes: VarModeMap,
	varName: IdentifierGeneric<T> | string,
): Mode => {
	if (typeof varName === "string") {
		return varModes.get(varName, commonModes.pass);
	}
	return varModes.get(varName.value, commonModes.pass);
};

export function transformMode<T>(
	varModes: VarModeMap,
	varName: IdentifierGeneric<T> | string,
	mode: Mode,
): VarModeMap | null {
	let varVal: string;
	if (typeof varName === "string") {
		varVal = varName;
	} else {
		varVal = varName.value;
	}
	if (!varModes.has(varVal)) {
		return varModes.set(varVal, mode);
	}
	const currTransform = varModes.get(
		varVal,
		commonModes.pass,
	);
	if (currTransform.to !== mode.from) return null;
	return varModes.set(varVal, {
		from: currTransform.from,
		to: mode.to,
	});
}

export const listVarModes = <T>(
	varModes: VarModeMap,
	varNames: (IdentifierGeneric<T> | string)[],
): Mode[] => {
	return varNames.map((v) => getVarMode(varModes, v));
};

export const listVarModesE = <T>(
	varModes: VarModeMap,
	varNames: (ExpressionGeneric<T> | string)[],
): Mode[] => {
	return varNames
		.filter(
			(t): t is IdentifierGeneric<T> | string =>
				typeof t === "string" || t.type === "identifier",
		)
		.map((v) => getVarMode(varModes, v));
};
export const varModesToKey = <T>(
	varModes: VarModeMap,
	varNames: (IdentifierGeneric<T> | string)[],
): string => {
	return modeTypeToString(listVarModes(varModes, varNames));
};
export type VarModeMap = ImmMap<string, Mode>;

export const expressionToKey = <T>(
	varModes: VarModeMap,
	varNames: (ExpressionGeneric<T> | string)[],
): string => {
	return modeTypeToString(
		listVarModesE(varModes, varNames),
	);
};
