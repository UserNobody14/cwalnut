



import { Map as ImmMap } from "immutable";
import type { IdentifierGeneric, PredicateCallGeneric, PredicateDefinitionGeneric, TermGeneric, TermT } from "src/types/DsAstTyped";
import { type ModeDetType, Determinism, type Mode, commonModes, compareModeDetTypes } from "./ModeDetType";
import { conjunction1, disjunction1 } from "src/utils/make_better_typed";
import type { Type } from "src/types/EzType";
import { mapStreams, mergeGeneral, mergeGeneralIterable, mergePossibilities, reduceStreamArray } from "src/utils/iterop";

type VarModeMap = ImmMap<string, Mode>;

// Map from predicate name to a list of mode/determinism types and the definitions they correspond to
type TermModeDefinitionMap = ImmMap<string, ImmMap<string, PredicateDefinitionGeneric<ModeDetType>>>;

// export type ModeWorld = MatureModeWorld | ImmatureModeWorld;

// export interface MatureModeWorld {
//     varModes: VarModeMap;
//     polymorphModes: ImmMap<string, ModeDetType[]>;
//     termArrangement: TermGeneric<ModeDetType>[];
//     definitions: TermModeDefinitionMap;
//     det: Determinism;
// }

// export interface ImmatureModeWorld {
//     type: 'immature';
//     activate: (w: MatureModeWorld) => Iterable<ModeWorld>;
// };

// function isMatureModeWorld(world: ModeWorld): world is MatureModeWorld {
//     return !!(world as MatureModeWorld)?.varModes;
// }

export interface ModeWorld {
    varModes: VarModeMap;
    polymorphModes: ImmMap<string, ModeDetType[]>;
    termArrangement: TermGeneric<ModeDetType>[];
    definitions: TermModeDefinitionMap;
    det: Determinism;
}


const nullModeType: ModeDetType = {
    det: Determinism.ERROR,
    varModes: [],
};

// Functions for expressing modes and determinism types as strings

const modeToString = (mode: Mode): string => {
    return `${mode.from} -> ${mode.to}`;
}
const modeDetTypeToString = (mode: ModeDetType): string => {
    const formattedModes = `[${mode.varModes.map(modeToString).join(', ')}]`;
    return `${mode.det}${formattedModes}`;
}

const modeTypeToString = (modes: Mode[]) => {
    return `[${modes.map(modeToString).join(', ')}]`;
}


// Functions for manipulating VarModeMaps

const getVarMode = <T>(varModes: VarModeMap, varName: IdentifierGeneric<T> | string): Mode => {
    if (typeof varName === 'string') {
        return varModes.get(varName, commonModes.pass);
    }
    return varModes.get(varName.value, commonModes.pass);
}

const listVarModes = <T>(varModes: VarModeMap, varNames: (IdentifierGeneric<T> | string)[]): Mode[] => {
    return varNames.map((v) => getVarMode(varModes, v));
}

const varModesToKey = <T>(varModes: VarModeMap, varNames: (IdentifierGeneric<T> | string)[]): string => {
    return modeTypeToString(listVarModes(varModes, varNames));
}

/**
 * Takes a list of terms and returns a list of variable mode "worlds"
 * Each world is a record with the following items:
 * - varModes: ImmMap from variable name (string) to mode (Mode(to: string, from: string))
 * - polymorphModes: ImmMap from polymorphic predicate name (string) to ModeDetType
 * - termArrangement: TermGeneric<ModeDetType>[]
 * - det: Determinism: DET | SEMIDET | NONDET | MULTI
 */

export function* termToModeWorlds(
    term: TermT,
    pm: ImmMap<string, ModeDetType[]>
): Iterable<ModeWorld> {
    switch (term.type) {
        case "conjunction": {
            const processedTermGens = term.terms.map((t) => termToModeWorlds(t, pm));
            const processedTerms = mergePossibilities(processedTermGens);
            const eTermList = mapStreams(
                sp => {
                    return reduceStreamArray(
                        sp,
                        (a, b) => mergeModeWorlds(a, b)
                    )
                },
                processedTerms
            );
            yield* mapStreams(
                (wrld) => {
                    // Wrap term arrangement in conjunction
                    return [{
                        ...wrld,
                        termArrangement: [conjunction1(...wrld.termArrangement)]
                    }];
                },
                eTermList
            );
            break;
        }
        case "disjunction": {
            // Disjunction should be merged in?
            const et = term.terms.map((t) => termToModeWorlds(t, pm));
            const tSet = mergePossibilities(et);
            for (const t of tSet) {
                yield* wrapMWorlds(
                    t,
                    (tr) => [disjunction1(...tr)]
                );
            }
            break;
        }
        case "fresh": {
            const processedWorlds = termToModeWorlds(term.body, pm);
            const compressibles = mapStreams(
                ((world): Iterable<ModeWorld> => {
                    const newVarModes = term.newVars.reduce((acc, v) => {
                        return acc.set(v.value, { from: 'free', to: 'free' });
                    }, world.varModes);
                    const nvp = mergeVarModes(newVarModes, world.varModes);
                    if (!nvp) {
                        console.warn(`Invalid var modes for fresh: ${term.newVars.map((v) => v.value).join(', ')}`);
                        return [];
                    }
                    return [{
                        varModes: nvp,
                        polymorphModes: world.polymorphModes,
                        definitions: world.definitions,
                        termArrangement: [{
                            ...term,
                            newVars: term.newVars.map<IdentifierGeneric<ModeDetType>>((v) => ({ ...v, info: nullModeType })),
                            body: conjunction1(...world.termArrangement)
                        }],
                        det: world.det,
                    }];
                }),
                processedWorlds
            );
            return compressAcrossVars(compressibles, term.newVars.map(nv => nv.value));
        }
        case "predicate_call": {
            const predModes = pm.get(term.source.value);
            if (!predModes) {
                console.warn(`No predicate modes for ${term.source.value}`);
                return [];
            }
            const mappedCalls = predModes.map(md => predCallToModeWorld(md, term, pm));
            yield* mergeGeneralIterable(mappedCalls);
            break;
        }
        case "predicate_definition": {
            // Take a predicate definition, return a list of worlds and extract the polymorphic modes of the predicate
            // Assign them to the predicate name and return the worlds, additionally assign the predicate name as grounded
            const worldsForBody = compressAcrossVars(termToModeWorlds(term.body, pm), term.args.map((arg) => arg.value));
            const predName = term.name.value;
            const mdwList: ModeDetType[] = [];
            const defs = ImmMap<string, PredicateDefinitionGeneric<ModeDetType>>();
            for (const world of worldsForBody) {
                // Extract all of the args with their var-modes in order
                const args = listVarModes(world.varModes, term.args);
                // Get the deterministic type of the predicate
                const det = world.det;
                // Add the mode to the list of modes
                mdwList.push({ varModes: args, det });
                // Add the definition to the list of definitions
                defs.set(modeDetTypeToString({ varModes: args, det }), {
                    ...term,
                    name: { ...term.name, info: { varModes: args, det } },
                    args: term.args.map((arg, i) => ({ ...arg, info: nullModeType })),
                    body: conjunction1(...world.termArrangement),
                });
            }
            const pm2 = pm.set(predName, mdwList);
            yield {
                varModes: ImmMap([[predName, { from: 'free', to: 'ground' }]]),
                polymorphModes: pm2,
                termArrangement: [],
                definitions: ImmMap([[predName, defs]]),
                det: Determinism.DET,
            };
            break;
        }
        default:
            throw `Invalid term type: ${term}`;
    }
}

const wrapMWorlds = (world: ModeWorld[], tfn: (tr: TermGeneric<ModeDetType>[]) => TermGeneric<ModeDetType>[]): ModeWorld[] => {
    const endTrs = tfn(world.flatMap((w) => w.termArrangement));
    return world.map((w) => {
        return {
            ...w,
            termArrangement: endTrs,
        };
    });

}

function* predCallToModeWorld(mode: ModeDetType, term: PredicateCallGeneric<Type>, pm: ImmMap<string, ModeDetType[]>): Iterable<ModeWorld> {
    if (term.args.length !== mode.varModes.length) {
        console.warn('Invalid var modes 3');
        return;
    }
    const varModes = term.args.reduce<ImmMap<string, Mode> | null>((acc, arg, i) => {
        if (!acc) return null;
        if (arg.type === 'identifier') {
            return acc.set(arg.value, mode.varModes[i]);
        } else if (arg.type === 'literal' && mode.varModes[i].from === 'free') {
            return null;
        }
        return acc;
    }, ImmMap<string, Mode>());
    if (!varModes) {
        // console.warn(`Invalid var modes for predmode ${term.source.value} mode: ${modeDetTypeToString(mode)}`);
        return;
    }
    yield {
        varModes,
        polymorphModes: pm,
        definitions: ImmMap(),
        termArrangement: [
            {
                ...term,
                args: term.args.map((arg) => ({ ...arg, info: mode })
                ),
                source: { ...term.source, info: mode }
            }
        ],
        det: mode.det,
    };
}

export function* compressAcrossVars(
    worlds: Iterable<ModeWorld>,
    vars: string[]
): Iterable<ModeWorld> {
    // Find the max determinism modeworld for each possible mode
    const detMap = ImmMap<string, ModeWorld[]>();
    let tl: number | null = null;
    for (const world of worlds) {
        if (tl === null) {
            tl = world.termArrangement.length;
        } else if (world.termArrangement.length !== tl) {
            throw `Invalid term arrangement length: ${world.termArrangement.length} !== ${tl}`;
        }
        // const key = modeTypeToString(vars.map((v) => world.varModes.get(v, commonModes.pass)));
        const key = varModesToKey(world.varModes, vars);
        const currSeq = detMap.get(key) ?? [];
        const currDet = detMap.get(key)?.[0]?.det;
        // if (!detMap.has(key) || (currDet ?? Determinism.FAILURE) < world.det) {
        //     yield world;
        //     detMap.set(key, [...currSeq]);
        // } else {
        //     detMap.set(key, [...currSeq, world]);
        // }
        detMap.set(key, [...currSeq, world]);
    }
    yield* mergeGeneralIterable([...detMap.valueSeq()]);
    // yield* detMap.valueSeq().toJS().flat(1);
    // for (const worlds of detMap.valueSeq()) {
    //     yield* worlds;
    // }
}

export function* filterModeWorlds(
    worlds: Iterable<ModeWorld>
): Iterable<ModeWorld> {
    let det = Determinism.FAILURE;
    for (const world of worlds) {
        if (world.det < det) {
            det = world.det;
            yield world;
        } else if (world.det === det) {
            yield world;
        }
    }
}

function* modeWorldConjoin(worlds: Iterable<ModeWorld[]>): Iterable<ModeWorld> {

};

function* reduceModeWorlds(worlds: ModeWorld[]): Iterable<ModeWorld> {

}


/**
 * 
 * Merge mode world list (mergesort style)
 */

export function mergeModeWorldList(
    worlds: Iterable<ModeWorld>[],
): Iterable<ModeWorld> {
    if (worlds.length === 0) {
        return [];
    }
    if (worlds.length === 1) {
        return worlds[0];
    }
    if (worlds.length === 2) {
        return mergeModeWorldLists(worlds[0], worlds[1]);
    }
    const mid = Math.floor(worlds.length / 2);
    const left = worlds.slice(0, mid);
    const right = worlds.slice(mid);
    return mergeModeWorldList([mergeModeWorldList(left), mergeModeWorldList(right)]);
}


/**
 * Takes two lists of ModeWorlds and returns a list of merged ModeWorlds with all possible combinations of the two lists
 * Invalid mode worlds are removed
 */

export function mergeModeWorldLists(
    worlds1: Iterable<ModeWorld>,
    worlds2: Iterable<ModeWorld>,
): Iterable<ModeWorld> {
    const nv: ModeWorld[] = [];
    for (const world1 of worlds1) {
        for (const world2 of worlds2) {
            const merged = mergeModeWorlds(world1, world2);
            for (const world of merged) {
                nv.push(world);
            }
        }
    }
    return nv;
}



/**
 * Takes two ModeWorlds and returns a new ModeWorld and/or ModeWorldList with the two ModeWorlds merged
 */

export function* mergeModeWorlds(
    world1: ModeWorld,
    world2: ModeWorld,
): Iterable<ModeWorld> {
    // First try connecting them a => b
    // Each variable in both a and b should match where a.to === b.from
    // Then try the same thing but reversed b => a
    // Return either that are valid
    // If none are valid, return []

    // First try a => b
    const varModes = mergeVarModes(world1.varModes, world2.varModes);
    if (varModes) {
        yield {
            varModes,
            polymorphModes: mergePolymorphModes(world1.polymorphModes, world2.polymorphModes),
            termArrangement: world1.termArrangement.concat(world2.termArrangement),
            det: mergeDeterminism(world1.det, world2.det),
            definitions: mergeDefinitions(world1.definitions, world2.definitions),
        };
    }

    // Then try b => a
    const varModes2 = mergeVarModes(world2.varModes, world1.varModes);
    if (varModes2) {
        yield {
            varModes: varModes2,
            polymorphModes: mergePolymorphModes(world2.polymorphModes, world1.polymorphModes),
            termArrangement: world2.termArrangement.concat(world1.termArrangement),
            det: mergeDeterminism(world2.det, world1.det),
            definitions: mergeDefinitions(world2.definitions, world1.definitions),
        };
    }
}

export function mergeVarModes(world1: VarModeMap, world2: VarModeMap) {
    let nv: VarModeMap = world1.merge(world2);
    for (const [key, mode] of world1.entrySeq()) {
        if (world2.has(key)) {
            // if (!mode || !mode?.to) {
            //     throw `Invalid mode world: ${JSON.stringify(world1.toJS())}
            //     ${JSON.stringify(mode)}
            //     ${JSON.stringify(world2.toJS())}
            //     KEY: ${key}
            //     `;
            // }
            if (mode.to === world2.get(key)?.from) {
                const destinationV = world2.get(key)?.to;
                if (!destinationV) {
                    throw `Invalid mode world: ${world2}`;
                }
                nv = nv.set(key, { from: mode.from, to: destinationV });
            } else {
                return null;
            }
        }
    }
    return nv;
}

function mergeModeDetTypeLists(modes1: ModeDetType[], modes2: ModeDetType[]) {
    const nv: ModeDetType[] = modes2;
    for (const mode of modes1) {
        if (!modes2.some((m) => compareModeDetTypes(m, mode))) {
            nv.push(mode);
        }
    }
    return nv;
}

function mergePolymorphModes(world1: ImmMap<string, ModeDetType[]>, world2: ImmMap<string, ModeDetType[]>) {
    let nv: ImmMap<string, ModeDetType[]> = world1.merge(world2);
    for (const [key, modes] of world1.entries()) {
        if (world2.has(key)) {
            const modes2 = world2.get(key);
            if (!modes2) {
                throw `Invalid mode world: ${world2}`;
            }
            nv = nv.set(key, mergeModeDetTypeLists(modes, modes2));
        }
    }
    return nv;
}

function mergeDeterminism(det1: Determinism, det2: Determinism): Determinism {
    if (det1 === det2) {
        return det1;
    }
    return Math.max(det1, det2);
}

function mergeDefinitions(defs1: TermModeDefinitionMap, defs2: TermModeDefinitionMap) {
    let nv: TermModeDefinitionMap = defs1.merge(defs2);
    for (const [key, defs] of defs1) {
        if (defs2.has(key)) {
            const defs3 = defs2.get(key);
            if (!defs3) {
                throw `Invalid mode world: ${defs3}`;
            }
            nv = nv.set(key, defs.merge(defs3));
        }
    }
    return nv;
}