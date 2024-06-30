
/**
 * Microkanren 6 basic ops:
 */
type LLVar = {
    type: "lvar",
    name: string
};
type LPair = [LTerm, LTerm];
type LSymbol = {
    type: "symbol",
    value: string
};
type LTerm = LLVar | string | LSymbol | Boolean | LPair | [];

type Subst = LPair[];
type State = [Subst, number];
type Goal = (sc: State) => LStream;
type LStream = MatureStream | ImmatureStream;
type MatureStream = [] | [State, LStream];
type MatureStreamE = [] | [State, MatureStreamE];
type ImmatureStream = () => LStream;

export const makelvar = (name: string): LLVar => ({
    type: 'lvar',
    name
});

const isPair = (ll: LTerm): ll is LPair => {
    return Array.isArray(ll) && ll.length > 0;
}, isDStream = (d: LStream): d is ImmatureStream => {
    return typeof d === 'function';
}, isNullStream = (d: LStream): d is [] => {
    return Array.isArray(d) && d.length === 0;
}, assertPair = (ll: LTerm) => {
    if (!isPair(ll)) throw new Error("Not a pair");

}
export function eq(u: LTerm, v: LTerm): Goal {
    return function (sc): LStream {
        const s = sc[0];
        const sz = unify(find(u, s), find(v, s), s);
        if (sz) {
            return [[sz, sc[1]], []];
        } else {
            return [];
        }
    }
}

function equiv(u: LTerm, v: LTerm): boolean {
    if (isVar(u) && isVar(v)) {
        return true;
    } else if (u === v) return true;
    return false;
}

function unify(u: LTerm, v: LTerm, s: Subst): Subst | null {
    if (equiv(u, v)) return s;
    if (isVar(u)) return ext_s(u, v, s);
    if (isVar(v)) return unify(v, u, s);
    if (isPair(v) && isPair(u)) {
        const sz = unify(find(u[0], s), find(v[0], s), s);
        if (sz) {
            return unify(find(u[1], sz), find(v[1], sz), sz);
        } else {
            return null;
        }
    }
    return null;
}


function assv(u: LTerm, s: Subst) {
    for (const [v, val] of s) {
        if (equiv(u, v)) return [v, val];
    }
    return false;
}

function find(u: LTerm, s: Subst): LTerm {
    const pr = isVar(u) && assv(u, s);
    if (pr) {
        const piru = pr[1];
        if (!piru) {
            return u;
        }
        return find(piru, s);
    } else {
        return u;
    }
}

export function call_fresh(f: (v: LLVar) => Goal): Goal {
    return (sc) => {
        const c = sc[1];
        return f(makelvar(`$${c}`))(sc);
    }
}

export function call_fresh2(f: (v: LLVar, v2: LLVar) => Goal): Goal {
    return call_fresh((v) => call_fresh((v2) => f(v, v2)));
}

export function call_fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => Goal): Goal {
    return call_fresh((v) => call_fresh2((v2, v3) => f(v, v2, v3)));
}

export function call_fresh4(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => Goal): Goal {
    return call_fresh((v) => call_fresh3((v2, v3, v4) => f(v, v2, v3, v4)));
}

function disj(g1: Goal, g2: Goal): Goal {
    return (sc) => append_1(g1(sc), g2(sc));
}

function conj(g1: Goal, g2: Goal): Goal {
    return (sc) => append_map(g2, g1(sc));
}

function append_1(l1: LStream, l2: LStream): LStream {
    if (isNullStream(l1)) return l2;
    if (isDStream(l1)) {
        return () => append_1(l1(), l2);
    }
    return [l1[0], append_1(l1[1], l2)];

}

function append_map(gg: Goal, l: LStream): LStream {
    if (isNullStream(l)) return [];
    if (isDStream(l)) {
        return () => append_map(gg, l());
    }
    return append_1(gg(l[0]), append_map(gg, l[1]));
}

function defineRelation() {

}

function call_initial_state(n: number | null, g: Goal): Array<State> {
    return take(n, pull(g([[], 0])));
}

const take = (n: number | null, s: MatureStreamE): Array<State> => {
    if (isNullStream(s)) return [];
    if (n && (n - 1) === 0) return [s[0]];
    return [s[0], ...take((n ?? 0) - 1, s[1])];
}, pull = (s: LStream): MatureStreamE => {
    if (isNullStream(s)) return [];
    if (isDStream(s)) {
        return pull(s());
    }
    return [s[0], pull(s[1])];
};


function isVar(x1: LTerm): x1 is LLVar {
    return typeof x1 === 'object' && 'type' in x1 && x1.type === 'lvar';
}

const ext_s = (x: LLVar, v: LTerm, s: Subst): Subst | null => {
    if (doesOccur(x, v, s)) return null;
    return [[x, v], ...s];
}, doesOccur = (x: LLVar, v: LTerm, s: Subst): boolean => {
    if (isVar(v)) {
        return x.name === v.name;
    } else if (isPair(v)) {
        return doesOccur(x, find(v[0], s), s) || doesOccur(x, find(v[1], s), s);
    } else {
        return false;
    }
}


/////////
/////////
///////
////////
// Utility functions:

export const all = (...g: Goal[]): Goal => {
    if (g.length == 0) throw new Error("Cannot do that");
    if (g.length == 1) return g[0];
    return g.reduce((acc, gg) => conj(acc, gg));
}

export const either = (...g: Goal[]): Goal => {
    if (g.length == 0) throw new Error("Cannot do that");
    if (g.length == 1) return g[0];
    return g.reduce((acc, gg) => disj(acc, gg));
}

const projectVar0 = (sc: Subst) => {
    return find(makelvar('$0'), sc);
}, applySubst = (v1: LTerm, s: Subst): LTerm => {
    const v = find(v1, s);
    if (isVar(v)) {
        return v;
    } else if (isPair(v)) {
        return [applySubst(v[0], s), applySubst(v[1], s)];
    } else {
        return v;
    }
}, buildR = (v: LTerm, s: Subst, c: number): LTerm => {
    return applySubst(find(makelvar(`$${c}`), s), s);
};




export const run = (n: number | null, g: Goal) => {
    const ist = call_initial_state(n, g);
    const outv = [];
    for (const ev of ist) {
        outv.push(ev);
    }
    return outv;
};
