



import { Map as ImmMap } from "immutable";
import type { IdentifierGeneric, PredicateDefinitionGeneric, TermGeneric, TermT } from "src/types/DsAstTyped";
import { type ModeDetType, Determinism, type Mode } from "./ModeDetType";
import { conjunction1 } from "src/utils/make_better_typed";

type VarModeMap = ImmMap<string, Mode>;

// Map from predicate name to a list of mode/determinism types and the definitions they correspond to
type TermModeDefinitionMap = ImmMap<string, ImmMap<string, PredicateDefinitionGeneric<ModeDetType>>>;

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

const freeMode: Mode = {
    from: 'free',
    to: 'free',
};

const modeToString = (mode: Mode): string => {
    return `${mode.from} -> ${mode.to}`;
}
const modeDetTypeToString = (mode: ModeDetType): string => {
    return `${mode.det}[${mode.varModes.map(modeToString).join(', ')}]`;
}

/**
 * Takes a list of terms and returns a list of variable mode "worlds"
 * Each world is a record with the following items:
 * - varModes: ImmMap from variable name (string) to mode (Mode(to: string, from: string))
 * - polymorphModes: ImmMap from polymorphic predicate name (string) to ModeDetType
 * - termArrangement: TermGeneric<ModeDetType>[]
 * - det: Determinism: DET | SEMIDET | NONDET | MULTI
 */

export function termToModeWorlds(
    term: TermT,
    pm: ImmMap<string, ModeDetType[]>
): ModeWorld[] {
    switch (term.type) {
        case "conjunction":
            return mergeModeWorldList(term.terms.map((t) => termToModeWorlds(t, pm)));
        case "disjunction":
            // Disjunction should be merged in?
            return term.terms.flatMap((t) => termToModeWorlds(t, pm));
        case "fresh":
            return termToModeWorlds(term.body, pm).flatMap((world): ModeWorld[] => {
                const newVarModes = term.newVars.reduce((acc, v) => {
                    return acc.set(v.value, { from: 'free', to: world.varModes.get(v.value)?.to || 'free' });
                }, ImmMap<string, Mode>());
                const nvp = mergeVarModes(newVarModes, world.varModes);
                if (!nvp) return [];
                return [{
                    varModes: nvp,
                    polymorphModes: world.polymorphModes,
                    definitions: world.definitions,
                    termArrangement: [{ 
                        ...term, 
                        newVars: term.newVars.map<IdentifierGeneric<ModeDetType>>((v) => ({ ...v, info: nullModeType })),
                        body: conjunction1(...world.termArrangement) }],
                    det: world.det,
                }];
            });
        case "predicate_call": {
            const predModes = pm.get(term.source.value);
            if (!predModes) {
                return [];
            }
            return predModes.flatMap((mode): ModeWorld[] => {
                if (term.args.length !== mode.varModes.length) {
                    return [];
                }
                const varModes = term.args.reduce((acc, arg, i) => {
                    return acc.set(arg.value, mode.varModes[i]);
                }, ImmMap<string, Mode>());
                return [{
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
                }];
            });
        }
        case "predicate_definition": {
            // Take a predicate definition, return a list of worlds and extract the polymorphic modes of the predicate
            // Assign them to the predicate name and return the worlds, additionally assign the predicate name as grounded
            const worldsForBody = termToModeWorlds(term.body, pm);
            const predName = term.name.value;
            const mdwList: ModeDetType[] = [];
            const defs = ImmMap<string, PredicateDefinitionGeneric<ModeDetType>>();
            for (const world of worldsForBody) {
                // Extract all of the args with their var-modes in order
                const args = term.args.map((arg) => world.varModes.get(arg.value, freeMode));
                // Get the deterministic type of the predicate
                const det = world.det;
                // Add the mode to the list of modes
                mdwList.push({ varModes: args, det });
                // Add the definition to the list of definitions
                defs.set(modeDetTypeToString({ varModes: args, det }), {
                    ...term,
                    name: { ...term.name, info: { varModes: args, det } },
                    args: term.args.map((arg, i) => ({ ...arg, info: nullModeType})),
                    body: conjunction1(...world.termArrangement),
                });
            }
            const pm2 = pm.set(predName, mdwList);
            return [{
                varModes: ImmMap([[predName, { from: 'free', to: 'ground' }]]),
                polymorphModes: pm2,
                termArrangement: [],
                definitions: ImmMap([[predName, defs]]),
                det: Determinism.DET,
            }];
        }
        default:
            throw `Invalid term type: ${term}`;
    }
}

export function filterModeWorlds(
    worlds: ModeWorld[]
): ModeWorld[] {
    let nv: ModeWorld[] = [];
    let det = Determinism.FAILURE;
    for (const world of worlds) {
        if (world.det < det) {
            det = world.det;
            nv = [world];
        } else if (world.det === det) {
            nv.push(world);
        }
    }
    return nv;
}


/**
 * 
 * Merge mode world list (mergesort style)
 */

export function mergeModeWorldList(
    worlds: ModeWorld[][],
): ModeWorld[] {
    if (worlds.length === 0) {
        return [];
    }
    if (worlds.length === 1) {
        return worlds[0];
    }
    if (worlds.some((w) => w.length === 0)) {
        return [];
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
    worlds1: ModeWorld[],
    worlds2: ModeWorld[],
): ModeWorld[] {
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

export function mergeModeWorlds(
    world1: ModeWorld,
    world2: ModeWorld,
): ModeWorld[] {
    // First try connecting them a => b
    // Each variable in both a and b should match where a.to === b.from
    // Then try the same thing but reversed b => a
    // Return either that are valid
    // If none are valid, return []

    const nv: ModeWorld[] = [];
    // First try a => b
    const varModes = mergeVarModes(world1.varModes, world2.varModes);
    if (varModes) {
        nv.push({
            varModes,
            polymorphModes: mergePolymorphModes(world1.polymorphModes, world2.polymorphModes),
            termArrangement: world1.termArrangement.concat(world2.termArrangement),
            det: mergeDeterminism(world1.det, world2.det),
            definitions: mergeDefinitions(world1.definitions, world2.definitions),
        });
    }

    // Then try b => a
    const varModes2 = mergeVarModes(world2.varModes, world1.varModes);
    if (varModes2) {
        nv.push({
            varModes: varModes2,
            polymorphModes: mergePolymorphModes(world2.polymorphModes, world1.polymorphModes),
            termArrangement: world2.termArrangement.concat(world1.termArrangement),
            det: mergeDeterminism(world2.det, world1.det),
            definitions: mergeDefinitions(world2.definitions, world1.definitions),
        });
    }

    return nv;
}

function mergeVarModes(world1: VarModeMap, world2: VarModeMap) {
    let nv: VarModeMap = world1.merge(world2);
    for (const [key, mode] of world1.entrySeq()) {
        if (world2.has(key)) {
            if (!mode || !mode?.to) {
                throw `Invalid mode world: ${JSON.stringify(world1.toJS())}
                ${JSON.stringify(mode)}
                ${JSON.stringify(world2.toJS())}
                KEY: ${key}
                `;
            }
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

function compareModes(mode1: Mode, mode2: Mode) {
    return mode1.to === mode2.to && mode1.from === mode2.from;
}

function compareModeDetTypes(mode1: ModeDetType, mode2: ModeDetType) {
    if (mode1.det !== mode2.det) {
        return false;
    }
    for (const mode of mode1.varModes) {
        if (!mode2.varModes.some((m) => compareModes(m, mode))) {
            return false;
        }
    }
    return true;
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