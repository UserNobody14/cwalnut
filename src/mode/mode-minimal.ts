/**
 * Approach the mode issue as a typing problem...
 */

import type { Map as ImmMap } from "immutable";
import { mapStreams, mergePossibilities, mergePossibilitiesGeneral, reduceStreamArray } from "src/utils/iterop";
import { modeToString } from "./modeTypeToString";
import { getPredModes, type DetTypeMap } from "./detTypeMap";
import { disjunction1, conjunction1, make } from "src/utils/make_better_typed";
import memoize from "just-memoize";
import type { ExpressionGeneric, IdentifierGeneric, LiteralGeneric, TermGeneric } from "src/types/AstGeneric";
import type { Determinism } from "./ModeDetType";

type SimpleState = {
    type: "simple",
    value: string,
}

type Wrapped = {
    type: "wrap",
    // This is used to indicate e.g. free, simple etc
    wrapName: string,
    value: VarState,
}

type VSTypeVariable = {
    type: "type_variable",
    lvar: string,
}

type VSUnion = {
    type: "union",
    lvars: VarState[],
}

type VSPolymorphicPred = {
    type: "polymorphic_pred",
    lvars: ModeMinimal[],
    det: Determinism
}
type VarState = SimpleState | Wrapped | VSTypeVariable | VSUnion | VSPolymorphicPred;

type ModeMinimal = {
    from: VarState,
    to: VarState,
}

type VarModeMapMinimalInner = ImmMap<string, ModeMinimal>;
type VarModeMapMinimal = [VarModeMapMinimalInner, StateVarSpace];
type StateVarSpace = ImmMap<string, VarState>;

const to_simple_state = (v: string): SimpleState => ({
    type: "simple",
    value: v,
});

const to_wrap_state = (wrapName: string, v: VarState): Wrapped => ({
    type: "wrap",
    wrapName,
    value: v,
});

const to_typed_free = (v: string): Wrapped => to_wrap_state("free", to_simple_state(v));
const to_typed_grounded = (v: string): Wrapped => to_wrap_state("ground", to_simple_state(v));
const initialize_fresh = to_simple_state('initialized');

const to_initialization_mode = (v: string): ModeMinimal => ({
    from: initialize_fresh,
    to: to_type_variable(v),
});

const to_union_state = (lvars: VarState[]): VSUnion => ({
    type: "union",
    lvars,
});

const to_type_variable = (v: string): VSTypeVariable => ({
    type: "type_variable",
    lvar: v,
});

const to_polymorphic_pred = (lvars: ModeMinimal[], det: Determinism): VSPolymorphicPred => ({
    type: "polymorphic_pred",
    lvars,
    det,
});

const to_simple_mode = (from: string, to: string): ModeMinimal => ({
    from: to_simple_state(from),
    to: to_simple_state(to),
});

const to_mode = (from: VarState, to: VarState): ModeMinimal => ({
    from,
    to,
});

const commonModes = {
    // out: to_simple_mode("free", "ground"),
    // in: to_simple_mode("ground", "ground"),
    // pass: to_simple_mode("free", "free"),
    error: to_simple_mode("error", "error"),
};

const hasMode = (varModes: VarModeMapMinimal, varName: string): boolean => {
    return varModes[0].has(varName);
};
const getMode = (varModes: VarModeMapMinimal, varName: string): ModeMinimal => {
    return varModes[0].get(varName, commonModes.error);
}
const setMode = (varModes: VarModeMapMinimal, varName: string, mode: ModeMinimal): VarModeMapMinimal => {
    return [varModes[0].set(varName, mode), varModes[1]];
}
const hasStvar = (varModes: VarModeMapMinimal, varName: string): boolean => {
    return varModes[1].has(varName);
}
const getStvar = (varModes: VarModeMapMinimal, varName: string): VarState => {
    return varModes[1].get(varName, to_simple_state("free"));
}
const setStvar = (varModes: VarModeMapMinimal, varName: string, state: VarState): VarModeMapMinimal => {
    return [varModes[0], varModes[1].set(varName, state)];
}

// Functions for manipulating VarModeMaps
export const getVarMode = <T>(
	varModes: VarModeMapMinimal,
	varName: ExpressionGeneric<T> | string
): ModeMinimal => {
    if (typeof varName === "string") {
        return getMode(varModes, varName);
    }
	if (varName.type === 'literal') {
        // Return the ground mode
        return to_typed_grounded_mode(varName.kind);
    }
	return getMode(varModes, varName.value);
};

function to_typed_grounded_mode(vk: string): ModeMinimal {
    return to_mode(
        to_typed_grounded(vk),
        to_typed_grounded(vk)
    );
}

export function transformMode<T>(
	varModes: VarModeMapMinimal,
	varName: IdentifierGeneric<T> | string,
	mode: ModeMinimal
): VarModeMapMinimal | null {
	const varVal: string = resolveVariableName<T>(varName);
	if (!hasMode(varModes, varVal)) {
		return setMode(varModes, varVal, mode);
	}
	const currTransform = getVarMode(varModes, varVal);
	if (currTransform.to !== mode.from) return null;
	return setMode(varModes, varVal, {
		from: currTransform.from,
		to: mode.to,
	});
}

function resolveVariableName<T>(varName: string | IdentifierGeneric<T>) {
    let varVal: string;
    if (typeof varName === "string") {
        varVal = varName;
    } else {
        varVal = varName.value;
    }
    return varVal;
}

export function applyToStateSpace<T>(
    varModes: VarModeMapMinimal,
    varName: string,
    state: VarState
): VarModeMapMinimal {
    const varVal: string = resolveVariableName<T>(varName);
    return setStvar(varModes, varVal, state);
}

export function walkVarState(
    varModes: VarModeMapMinimal,
    ns: VarState
): VarState {
    // const ns = getStvar(varModes, varName);
    if (ns.type === "type_variable") {
        if (varModes[1].has(ns.lvar)) {
            return walkVarState(varModes, getStvar(varModes, ns.lvar));
        }
    }
    return ns;
}


export const listVarModes = <T>(
	varModes: VarModeMapMinimal,
	varNames: (IdentifierGeneric<T> | string)[]
): ModeMinimal[] => {
	return varNames.map((v) => getVarMode(varModes, v));
};

// export const listVarModesE = <T>(
// 	varModes: VarModeMapMinimal,
// 	varNames: (ExpressionGeneric<T> | string)[]
// ): ModeMinimal[] => {
// 	return varNames.filter((t): t is (IdentifierGeneric<T> | string) => typeof t === 'string' || t.type === 'identifier').map((v) => getVarMode(varModes, v));
// };
// export const varModesToKey = <T>(
// 	varModes: VarModeMapMinimal,
// 	varNames: (IdentifierGeneric<T> | string)[]
// ): string => {
// 	return modeTypeToString(listVarModes(varModes, varNames));
// }

// type OutputSet = [TermGeneric<undefined>];

// function modeExec2(
//     trms: TermGeneric<undefined>[],
// ): (currentModeMap: VarModeMapMinimal) => Iterable<OutputSet> {

// }


function unifyStVar(
    st1: VarState,
    st2: VarState,
    substitutions: ImmMap<string, VarState>
): [VarState, ImmMap<string, VarState>] | null {
    if (st1.type === "simple" && st2.type === "simple") {
        if (st1.value === st2.value) {
            return [st1, substitutions];
        }
        return null;
    } if (st1.type === "type_variable" && st2.type === "type_variable") {
        if (st1.lvar === st2.lvar) {
            return [st1, substitutions];
        }
        if (substitutions.has(st1.lvar)) {
            return unifyStVar(substitutions.get(st1.lvar, st2), st2, substitutions);
        }
        if (substitutions.has(st2.lvar)) {
            return unifyStVar(st1, substitutions.get(st2.lvar, st1), substitutions);
        }
        return [st1, substitutions.set(st1.lvar, st2)];
    }
    if (st1.type === "union") {
        throw new Error("Not yet implemented");
    }
    if (st2.type === "union") {
        throw new Error("Not yet implemented");
    }
    return null;
}

function unifyModes(
    mode1: ModeMinimal,
    mode2: ModeMinimal,
    substitutions: VarModeMapMinimal
): [ModeMinimal, VarModeMapMinimal] | null {
    const currState = mode1.from;
    const nextState = mode2.to;
    const otv = unifyStVar(currState, nextState, substitutions[1]);
    if (otv === null) {
        return null;
    }
    const [newState, newSubs] = otv;
    const newModeMap: VarModeMapMinimal = [substitutions[0], newSubs];
    const newMode = to_mode(walkVarState(newModeMap, mode1.from), walkVarState(newModeMap, newState));
    return [newMode, newModeMap];
}

function mergeModes(
    mode1: ModeMinimal,
    mode2: ModeMinimal,
    substitutions: VarModeMapMinimal
): [ModeMinimal, VarModeMapMinimal] | null {
    const otv = unifyStVar(mode1.from, mode2.from, substitutions[1]);
    if (otv === null) {
        return null;
    }
    const [newState, newSubs] = otv;
    const newModeMap: VarModeMapMinimal = [substitutions[0], newSubs];
    const otv2 = unifyStVar(mode1.to, mode2.to, newModeMap[1]);
    if (otv2 === null) {
        return null;
    }
    const [newState2, newSubs2] = otv2;
    const newModeMap2: VarModeMapMinimal = [newModeMap[0], newSubs2];
    return [
        to_mode(
            walkVarState(newModeMap2, newState),
            walkVarState(newModeMap2, newState2)
        ),
        newModeMap2
    ];
}


function unifyModeList(
    modes1: ModeMinimal[],
    modes2: ModeMinimal[],
    substitutions1: VarModeMapMinimal
): [ModeMinimal[], VarModeMapMinimal] | null {
    let substitutions = substitutions1;
    if (modes1.length !== modes2.length) {
        return null;
    }
    const newModes: ModeMinimal[] = [];
    for (let i = 0; i < modes1.length; i++) {
        const otv = unifyModes(modes1[i], modes2[i], substitutions);
        if (otv === null) {
            return null;
        }
        const [newMode, newSubs] = otv;
        newModes.push(newMode);
        substitutions = newSubs;
    }
    return [newModes, substitutions];
}

function applyVarState(
    predSource: VarState,
    args: ModeMinimal[],
    substitutions: VarModeMapMinimal
): [VSPolymorphicPred, VarModeMapMinimal] | null {
    const newPredSource = walkVarState(substitutions, predSource);
    if (newPredSource.type === 'polymorphic_pred') {
        const newDet = newPredSource.det;
        const noutv = unifyModeList(newPredSource.lvars, args, substitutions);
        if (noutv === null) {
            return null;
        }
        return [to_polymorphic_pred(noutv[0], newDet), noutv[1]];
    } else if (newPredSource.type === 'union') {
        throw new Error("Not yet implemented");
    } else {
        return null;
    }
}





// const mergeMapVS = (
//     substitutions1: ImmMap<string, VarState>,
//     substitutions2: ImmMap<string, VarState>
// ): ImmMap<string, VarState> => {
//     let out = substitutions1;
//     for (const [key, value] of substitutions2) {
//         if (out.has(key)) {
//             const ustv = unifyStVar(out.get(key, value), value, out);
//             if (ustv === null) {
//                 return null;
//             }
//         }
//     }
//     return out;
// }

// const mergeMapMode = (
//     substitutions1: VarModeMapMinimalInner,
//     substitutions2: VarModeMapMinimalInner
// ): VarModeMapMinimalInner => {
//     let out = substitutions1;
//     for (const [key, value] of substitutions2) {
//         out = out.set(key, value);
//     }
//     return out;
// }

const mergeVarModeMaps = (
    substitutions1: VarModeMapMinimal,
    substitutions2: VarModeMapMinimal
): VarModeMapMinimal => {
    // return [mergeMapMode(substitutions1[0], substitutions2[0]),
    // mergeMapVS(substitutions1[1], substitutions2[1])];
    const s0 = substitutions1[0];
    let sOut = substitutions1;
    for (const [key, value] of substitutions2[0]) {
        // s0.set(key, value);
        if (s0.has(key)) {
            const out2 = mergeModes(s0.get(key, value), value, sOut);
            if (out2 === null) {
                // return null;
                throw new Error("Not yet implemented");
            }
            sOut = out2[1];
            sOut = setMode(sOut, key, out2[0]);
        }
    }
    for (const [key, value] of substitutions2[1]) {
        if (sOut[1].has(key)) {
            const ustv = unifyStVar(sOut[1].get(key, value), value, sOut[1]);
            if (ustv === null) {
                // return null;
                throw new Error("Not yet implemented");
            }
            sOut = applyToStateSpace(sOut, key, ustv[0]);
        }
    }
    return sOut;
}

function convertTerms<T>(
    terms: TermGeneric<T>[],
): (currentModeMap: VarModeMapMinimal) => Iterable<[TermGeneric<T>[], VarModeMapMinimal]> {
    type TermsOut = [
        TermGeneric<T>[],
        VarModeMapMinimal
    ];

    return function* (currentModeMap: VarModeMapMinimal): Iterable<TermsOut> {
        let escapeSig = false;
        for (const term of terms) {
            switch (term.type) {
                case "conjunction": {
                    const termList = convertTerms(term.terms);
                    yield* mapStreams<TermsOut, TermsOut>(
                        (tr: TermsOut): Iterable<TermsOut> => {
                            const tr2 = [[conjunction1(...tr[0])], tr[1]] as TermsOut;
                            return [tr2];
                        },
                        termList(currentModeMap),
                    );
                    break;
                }
                case "disjunction": {
                    const termList = mergePossibilities(
                        term.terms.map((t) => convertTerms([t])(currentModeMap)),
                    );
                    for (const nzzz of termList) {
                        const mappedOut = nzzz.flatMap((tr) => conjunction1(...tr[0]));
                        const mappedOut2 = nzzz.map((t) => t[1]);
                        yield [[disjunction1(...mappedOut)], mappedOut2.reduce(
                            (acc, t) => mergeVarModeMaps(acc, t),
                            currentModeMap,
                        )];
                    }
                    break;
                }
                case "fresh": {
                    const termList = convertTerms(term.body.terms);
                    const newModeMap = term.newVars.reduce(
                        (acc, v) => setMode(acc, v.value, to_initialization_mode(v.value)),
                        currentModeMap,
                    );
                    yield* mapStreams<TermsOut, TermsOut>(
                        (tr: TermsOut): Iterable<TermsOut> => {
                            const tr2 = [[conjunction1(...tr[0])], tr[1]] as TermsOut;
                            return [tr2];
                        },
                        termList(newModeMap),
                    );
                    break;
                }
                case "predicate_call": {
                    const predSource = getStvar(currentModeMap, term.source.value);
                    const argModes = term.args.map((arg) => getVarMode(currentModeMap, arg));
                    const noutv = applyVarState(predSource, argModes, currentModeMap);
                    if (noutv === null) {
                        escapeSig = true;
                        break;
                    }
                    const [newPredSource, newModeMap] = noutv;
                    yield [[term], newModeMap];
                }
            }
            if (escapeSig) {
                break;
            }
        }
    }
}