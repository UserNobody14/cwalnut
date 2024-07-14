import { IdentifierGeneric, type TermGeneric, type TermT } from "src/types/DsAstTyped";
import { Type } from "src/types/EzType";
import type { Map as ImmMap } from "immutable";
import { from } from "rxjs";
import type { ModeDetType } from "./ModeDetType";

// Exclusively check mode/determinacy, without reordering
export function mapToModeDet<T>(tt: TermGeneric<T>[], 
    s1: ImmMap<string, string>,
    s2: ImmMap<string, ModeDetType[]>
): [TermGeneric<string>[], ImmMap<string, string>] {
    let s = s1;
    const out: TermGeneric<string>[] = [];
    for (const t of tt) {
        switch (t.type) {
            case "conjunction": {
                const [q, vv] = mapToModeDet(t.terms, s, s2);
                s = vv;
                out.push({
                    ...t,
                    terms: q
                });
                break;
            }
            case "disjunction": {
                const [q, vv] = mapToModeDet(t.terms, s, s2);
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
                const [q, vv] = mapToModeDet(t.body.terms, sss, s2);
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
                const [q, vv] = mapToModeDet(t.body.terms, s, s2);
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
                    throw new Error(`No modes for ${t.source.value} with ${currentVarStates}`);
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
                break;
            }
        }
    }
    return [out, s];
}