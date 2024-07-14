import type { IdentifierGeneric, TermGeneric, TermT } from "src/types/DsAstTyped";
import { Type } from "src/types/EzType";
import { Map as ImmMap } from "immutable";
import { from } from "rxjs";
import type { ModeDetType } from "./ModeDetType";

type EachArrangement = [TermGeneric<string>[], ImmMap<string, string>, number] | null;
type ReturnArrangements = EachArrangement[];

export function* permutations<T>(
    t: T[]
): Generator<T[]> {
    if (t.length === 0) {
        yield [];
    } else {
        for (let i = 0; i < t.length; i++) {
            const rest = t.slice(0, i).concat(t.slice(i + 1));
            for (const restPerm of permutations(rest)) {
                yield [t[i]].concat(restPerm);
            }
        }
    }

}

// // Exclusively check mode/determinacy, with reordering of terms
// export function mapToModeDet<T>(tt: TermGeneric<T>[], 
//     s1: ImmMap<string, string>,
//     s2: ImmMap<string, ModeDetType[]>
// ): EachArrangement {
//     const perms = permutations(tt);
//     let best: EachArrangement = null;
//     let bestDetNum = Number.POSITIVE_INFINITY;
//     for (const perm of perms) {
//         const dti = mapToModeDetInner(perm, s1, s2);
//         if (dti === null) {
//             continue;
//         }
//         const [q, vv, nd] = dti;
//         if (nd < bestDetNum) {
//             best = dti;
//             bestDetNum = nd;
//         }
//     }
//     return best;
// }


// More optimal version
export function mapToModeDetO<T>(tt: TermGeneric<T>[], 
    s1: ImmMap<string, string>,
    s2: ImmMap<string, ModeDetType[]>,
    currDetNum: number,
    bestDetNum1 = Number.POSITIVE_INFINITY
): EachArrangement {
    const perms = permutations(tt);
    let best: EachArrangement = null;
    let bestDetNum = bestDetNum1;
    for (const perm of perms) {
        const outTerms: TermGeneric<string>[] = [];
        let currDetNum1 = currDetNum;
        let s = s1;
        let failed = false;
        for (const t of perm) {
            const zzz = mapOneModeDet(t, s, s2, currDetNum1, bestDetNum);
            if (!zzz[0]) {
                failed = true;
                break;
            }
            const [tr, q, vv, nd] = zzz;
            outTerms.push(q);
            s = vv;
            currDetNum1 = nd;
        }
        if (failed) {
            continue;
        }
        if (currDetNum1 < bestDetNum) {
            best = [outTerms, s, currDetNum1];
            bestDetNum = currDetNum1;
        }
    }
    return best;
}

function mergeMaps(a: ImmMap<string, string>, b: ImmMap<string, string>): ImmMap<string, string> {
    let nm = ImmMap<string, string>();
    for (const [k, v] of b) {
        if (a.has(k) && a.get(k) !== v) {
            nm = nm.set(k, 'inout');
        } else {
            nm = nm.set(k, v);
        }
    }
    for (const [k, v] of a) {
        if (!b.has(k)) {
            nm = nm.set(k, v);
        }
    }
    return nm;
}

export function mapToModeDetDisj<T>(tt: TermGeneric<T>[], 
    s1: ImmMap<string, string>,
    s2: ImmMap<string, ModeDetType[]>,
    currDetNum: number,
    bestDetNum1 = Number.POSITIVE_INFINITY
): EachArrangement {
    const s = s1;
    const oMap = tt.map((t) => mapOneModeDet(t, s, s2, currDetNum, bestDetNum1));
    const realMap = oMap.some((tr) => !tr[0]);
    if (realMap) {
        return null;
    }
    const zzz = oMap.map((tr) => tr[1] as TermGeneric<string>);
    const vv = oMap.map((tr) => tr[2] as ImmMap<string, string>);
    const nd = oMap.map((tr) => tr[3] as number);
    // Average
    const currDetNum2 = nd.reduce((acc, v) => acc + v, 0) / nd.length;
    return [zzz, vv.reduce(mergeMaps), currDetNum2];
}


export function mapModeRearrange<T>(tt: TermGeneric<T>[],
    s2: ImmMap<string, ModeDetType[]>
): [TermGeneric<string>[], ImmMap<string, string>] {
    const s1 = ImmMap<string, string>();
    const dti = mapToModeDetO(tt, s1, s2, 0, Number.POSITIVE_INFINITY);
    if (dti === null) {
        throw new Error("No valid mode/determinacy arrangement");
    }
    return [dti[0], dti[1]];
}

function mapOneModeDet<T>(
    t: TermGeneric<T>,
    s1: ImmMap<string, string>,
    s2: ImmMap<string, ModeDetType[]>,
    currDetNum: number,
    bestDetNum: number
): [true, TermGeneric<string>, ImmMap<string, string>, number] | [false, TermGeneric<T>, ImmMap<string, string>, number] {
    let s = s1;
    switch (t.type) {
        case "conjunction": {
            const zzz = mapToModeDetO(t.terms, s, s2, currDetNum, bestDetNum);
            if (zzz === null) {
                return [false, t, s, 0];
            }
            const [q, vv, nd] = zzz;
            return [true, {
                ...t,
                terms: q
            }, vv, nd];
        }
        case "disjunction": {
            const zzz = mapToModeDetDisj(t.terms, s, s2, currDetNum, bestDetNum);
            if (zzz === null) {
                return [false, t, s, 0];
            }
            const [q, vv, nd] = zzz;
            return [true, {
                ...t,
                terms: q
            }, vv, nd];
        }
        case "fresh": {
            const sss = t.newVars.reduce((acc, v) => {
                return acc.set(v.value, 'free');
            }, s1);
            const zzz = mapToModeDetO(t.body.terms, sss, s2, currDetNum, bestDetNum);
            if (zzz === null) {
                return [false, t, s, 0];
            }
            const [q, vv, nd] = zzz;
            return [true, {
                ...t,
                newVars: t.newVars.map((v) => ({ ...v, info: 
                    buildVarInformation<T>(sss, v, vv)
                })),
                body: {
                    ...t.body,
                    terms: q
                }
            }, vv, nd];
        }
        case "with": {
            const zzz = mapToModeDetO(t.body.terms, s, s2, currDetNum, bestDetNum);
            if (zzz === null) {
                return [false, t, s, 0];
            }
            const [q, vv, nd] = zzz;
            return [true, {
                ...t,
                name: {
                    ...t.name,
                    info: 'withtype'
                },
                body: {
                    ...t.body,
                    terms: q
                }
            }, vv, nd];
        }
        case "predicate_definition":
            throw new Error("Not implemented");
        case "predicate_call": {
            const allModes = s2.get(t.source.value);
            if (!allModes) {
                throw new Error(`No modes for ${t.source.value}`);
            }
            const currentVarStates = t.args.map((a) => a.type === 'literal' ? 'ground' :
            s1.get(a.value, 'free'));
            const modes = allModes.find((m) => {
                if (m.varModes.length !== t.args.length) {
                    return false;
                }
                for (let i = 0; i < t.args.length; i++) {
                    if (m.varModes[i].from !== currentVarStates[i]) {
                        return false;
                    }
                }
                return true;
            });
            if (!modes) {
                return [false, t, s1, 0];
            }
            for (let i = 0; i < t.args.length; i++) {
                if (t.args[i].type === 'identifier') {
                    s = s.set(t.args[i].value, modes.varModes[i].to);
                }
            }
            const out = {
                ...t,
                source: {
                    ...t.source,
                    // value: `${t.source.value}/${modes.det}`,
                    value: t.source.value,
                    info: `${modes.det}`
                },
                args: t.args.map((a, i) => {
                    if (a.type === 'literal') {
                        return a;
                    }
                    return {
                        ...a,
                        // info: modes.varModes[i].to
                        info: buildVarInformation<T>(s1, a, s)
                    };
                })
            };
            return [true, out, s, modes.det];
        }
    }
}

function buildVarInformation<T>(sss: ImmMap<string, string>, v: IdentifierGeneric<T>, vv: ImmMap<string, string>): string {
    switch (`${sss.get(v.value, 'free')}_${vv.get(v.value, 'free')}`) {
        case 'free_free':
            return 'error';
        case 'ground_free':
            return 'error';
        case 'ground_ground':
            return 'in';
        case 'free_ground':
            return 'out';
    }
    return `${sss.get(v.value, 'free')} => ${vv.get(v.value, 'free')}`;
}

function mapToModeDetInner<T>(tt: TermGeneric<T>[], 
    s1: ImmMap<string, string>,
    s2: ImmMap<string, ModeDetType[]>
): EachArrangement {
    let detNum = 0;
    let s = s1;
    const out: TermGeneric<string>[] = [];
    for (const t of tt) {
        switch (t.type) {
            case "conjunction": {
                const dti = mapToModeDetInner(t.terms, s, s2);
                if (dti === null) {
                    return null;
                }
                const [q, vv, nd] = dti;
                detNum += nd;
                s = vv;
                out.push({
                    ...t,
                    terms: q
                });
                break;
            }
            case "disjunction": {
                const dti = mapToModeDetInner(t.terms, s, s2);
                if (dti === null) {
                    return null;
                }
                const [q, vv, nd] = dti;
                detNum += nd;
                s = vv;
                out.push({
                    ...t,
                    terms: q
                });
                break;
            }
            case "fresh": {
                const sss = t.newVars.reduce((acc, v) => {
                    return acc.set(v.value, 'free');
                }, s);
                const dti = mapToModeDetInner(t.body.terms, sss, s2);
                if (dti === null) {
                    return null;
                }
                const [q, vv, nd] = dti;
                detNum += nd;
                s = vv;
                out.push({
                    ...t,
                    newVars: t.newVars.map((v) => ({ ...v, info: vv.get(v.value, 'free')})),
                    body: {
                        ...t.body,
                        terms: q
                    }
                });
                break;
            }
            case "with": {
                const dti = mapToModeDetInner(t.body.terms, s, s2);
                if (dti === null) {
                    return null;
                }
                const [q, vv, nd] = dti;
                detNum += nd;
                s = vv;
                out.push({
                    ...t,
                    name: {
                        ...t.name,
                        info: 'withtype'
                    },
                    body: {
                        ...t.body,
                        terms: q
                    }
                });
                break;
            }
            case "predicate_definition":
                throw new Error("Not implemented");
            case "predicate_call": {
                const allModes = s2.get(t.source.value);
                if (!allModes) {
                    throw new Error(`No modes for ${t.source.value}`);
                }
                const currentVarStates = t.args.map((a) => a.type === 'literal' ? 'ground' :
                s.get(a.value, 'free'));
                const modes = allModes.find((m) => {
                    if (m.varModes.length !== t.args.length) {
                        return false;
                    }
                    for (let i = 0; i < t.args.length; i++) {
                        if (m.varModes[i].from !== currentVarStates[i]) {
                            return false;
                        }
                    }
                    return true;
                });
                if (!modes) {
                    return null;
                }
                out.push({
                    ...t,
                    source: {
                        ...t.source,
                        value: `${t.source.value}/${modes.det}`,
                        info: `${modes.det}`
                    },
                    args: t.args.map((a, i) => {
                        if (a.type === 'literal') {
                            return a;
                        }
                        return {
                            ...a,
                            info: modes.varModes[i].to
                        };
                    })
                });
                for (let i = 0; i < t.args.length; i++) {
                    if (t.args[i].type === 'identifier') {
                        s = s.set(t.args[i].value, modes.varModes[i].to);
                    }
                }
                detNum += modes.det;
                break;
            }
        }
    }
    return [out, s, detNum];
}