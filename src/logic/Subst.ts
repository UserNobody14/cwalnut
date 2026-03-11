import { List as ImmList, Record as ImmRecord, Map as ImmMap } from "immutable";
import { type LPair, LLVar, type LTerm } from "./terms";
// import { assv } from "./assv";
import type {CleanOutput} from './types';

interface ISubstParams {
    // pairs: ImmList<LPair>;
    mp: ImmMap<string, LTerm>;
}
const substDefaults: ISubstParams = {
    // pairs: ImmList(),
    mp: ImmMap<string, LTerm>()
};

export class Subst extends ImmRecord(substDefaults) {

    public extend(x: LLVar, v: LTerm): Subst | null {
        if (!x) throw new Error("No x (extend)");
        if (!v) throw new Error("No v (extend)");
        // if (v.doesLvarOccur(x.name, (z) => this.find(z))) throw new Error("Infinite loop");
        return this.extendUnchecked(x, v);
    }

    private extendUnchecked(x: LLVar, v: LTerm): Subst {
        // return new Subst([...this.pairs, new LPair(x, v)]);
        // return this.set('pairs', this.pairs.push(new LPair(x, v)));
        return this.set('mp', this.mp.set(x.name, v));
    }

    public find(u: LTerm): LTerm {
        if (!u) throw new Error("No u");
        // const pr = u instanceof LLVar && assv(this.pairs, u);
        const pr = u instanceof LLVar && this.mp.get(u.name);
        if (pr) {
            // const piru = pr;
            // if (!piru) {
            //     return u;
            // }
            return this.find(pr);
        } 
        return u;
    }

    public toClean(showInternals: boolean, vars2seek: LLVar[]): { [k: string]: CleanOutput } {
        const seekvars = vars2seek.length > 0;
        return this.mp.reduce((acc, spairsecond, spairfirst) => {
            const v = spairfirst;
            const val = spairsecond.reify(this);
            if (v.startsWith('$') && !showInternals) {
                return acc;
            }
            if (seekvars) {
                if (vars2seek.some((v2) => v2.name === v)) {
                    // return {...acc, [v.name]: val.cleanOutput()};
                    acc[v] = val.cleanOutput();
                    return acc;
                } else {
                    return acc;
                }
            } else {
                // return {...acc, [v.name]: val.cleanOutput()};
                acc[v] = val.cleanOutput();
                return acc;
            }
        }, {} as { [k: string]: CleanOutput; });
    }

    toString() {
        return this.mp.map((spairsecond, spairfirst) => {
            const v = spairfirst;
            const val = spairsecond.reify(this);
            return `${v} = ${spairsecond.toString()} (${val.toString()})`;
        }).join('\n');
    }
}

/**
 * To add for the new resolution system:
 * "refine" fn that continuously reapplies the substitutions (or constraints?), prevents infinite loops?
 * better constraint handling(?)
 * 
 */