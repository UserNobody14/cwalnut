import type { Mode, ModeDetType } from "./ModeDetType";

// Functions for expressing modes and determinism types as strings
export const modeToString = (mode: Mode): string => {
	return `${mode.from} -> ${mode.to}`;
};
export const modeDetTypeToString = (mode: ModeDetType): string => {
	const formattedModes = `[${mode.varModes.map(modeToString).join(", ")}]`;
	return `${mode.det}${formattedModes}`;
};
export const modeTypeToString = (modes: Mode[]) => {
	return `[${modes.map(modeToString).join(", ")}]`;
};
