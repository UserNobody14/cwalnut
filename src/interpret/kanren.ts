import { Record as ImmRecord, List as ImmList, Map as ImmMap } from "immutable";
/**
 * Microkanren 6 basic ops:
 run, call_fresh, eq, disj, conj, and unify
 */
// type LLVar = {
//     type: "lvar",
//     name: string
// };
// type LPair = [LTerm, LTerm];
// type LSymbol = {
//     type: "symbol",
//     value: string
// };
// type LTerm = LLVar | string | LSymbol | boolean | LPair | [];

// type Subst = LPair[];
// type State = [Subst, number];
// type Goal = (sc: State) => LStream;
// type LStream = MatureStream | ImmatureStream;
// type MatureStream = [] | [State, LStream];
// type MatureStreamE = [] | [State, MatureStreamE];
// type ImmatureStream = () => LStream;



// As classes:
export abstract class LTerm {
    // What type it is, unique to each subclass
    public abstract type: string;
    // How important it is for this term to be on the left side when running unify
    public abstract leftRank: number;
    public abstract equiv(v: this): boolean;
    public abstract toString(): string;
    public selfEquiv(v: LTerm): boolean {
        if (!v) throw new Error(`No v ${this.toString()}`);
        return this.type === v.type && this.equiv(v as this);
    }
    public abstract doesOccur(x: string, find: (z: LTerm) => LTerm): boolean;
    public abstract nonEquivalentUnite(s: Subst, v: LTerm): Subst | null;
    public unite(s: Subst, v: LTerm): Subst | null {
        if (this.leftRank > v.leftRank) {
            return v.nonEquivalentUnite(s, this);
        }
        return this.nonEquivalentUnite(s, v);
    }
    public reify(s: Subst): LTerm {
        return this;
    }
}
export class LLVar extends LTerm {
    type = 'lvar';
    leftRank = 0;
    constructor(public name: string) {
        super();
    }

    toString(): string {
        return this.name;
    }

    equiv = (v: LLVar): boolean => {
        return this.name === v.name;
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return this.name === x;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        throw new Error("Lvars not selfunited");
    }
    override reify(s: Subst): LTerm {
        const fv = s.find(this);
        if (fv instanceof LLVar) return fv;
        return fv.reify(s);
    }
}

export class LLiteral extends LTerm {
    leftRank = 50;
    type: 'literal' = 'literal';
    constructor(public value: string | boolean | number) {
        super();
    }
    toString(): string {
        return this.value + "";
    }

    public equiv(v: LLiteral): boolean {
        return this.value === v.value;
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return false;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (v instanceof LLiteral && this.value === v.value) return s;
        return null;
    }
}

export class LEmpty extends LTerm {
    type: 'empty' = 'empty';
    leftRank = 100;
    constructor() {
        super();
    }

    toString(): string {
        return '[]';
    }

    public equiv(v: LEmpty): boolean {
        return true;
    }

    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return false;
    }

    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        return s;
    }
}

export class LPair extends LTerm {
    type: 'pair' = 'pair';
    public leftRank = 4;
    constructor(public first: LTerm, public second: LTerm) {
        super();
    }

    toString(): string {
        return `[${this.first.toString()}, ${this.second.toString()}]`;
    }

    public equiv(v: LPair): boolean {
        return this.first.selfEquiv(v.first) && this.second.selfEquiv(v.second);
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return find(this.first).doesOccur(x, find) || find(this.second).doesOccur(x, find);
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (!(v instanceof LPair)) return null;
        const sz = s.unify(s.find(this.first), s.find(v.first));
        if (sz) {
            return sz.unify(s.find(this.second), s.find(v.second));
        } else {
            return null;
        }
    }
    override reify(s: Subst): LTerm {
        return new LPair(this.first.reify(s), this.second.reify(s));    
    }
}

export class LFunctor extends LTerm {
    // Holds a specific record of a set number of arguments
    type: 'functor' = 'functor';
    public leftRank = 3;
    constructor(public name: string, public fields: string[], public args: LTerm[]) {
        super();
    }
    toString(): string {
        return `${this.name}(${this.args.map((arg, i) => `'${this.fields[i]}': ${arg.toString()}`).join(', ')})`;
    }
    public equiv(v: LFunctor): boolean {
        return this.name === v.name && 
        this.args.every((arg, i) => arg.selfEquiv(v.args[i])) && 
        this.fields.every((field, i) => field === v.fields[i]);
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return this.args.every(arg => find(arg).doesOccur(x, find));
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (!(v instanceof LFunctor)) return null;
        if (this.name !== v.name) return null;
        if (this.args.length !== v.args.length) return null;
        const sz = this.args.reduce<Subst | null>((acc, arg, i) => {
            if (acc === null) return null;
            return acc.unify(acc.find(arg), acc.find(v.args[i]));
        }, s);
        if (sz) return sz;
        return null;
    }
    override reify(s: Subst): LTerm {
        return new LFunctor(this.name, this.fields, this.args.map((arg) => arg.reify(s)));
    }
}
export class LNom extends LTerm {
    type: 'nom' = 'nom';
    leftRank = 5;
    constructor(public name: string) {
        super();
    }
    equiv(v: LNom): boolean {
        // Just for trivial equivalence
        return this.name === v.name;
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return false;
    }
    toString(): string {
        return this.name;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (v instanceof LNom && this.name === v.name) return s;
        return null;
    }
}
export class LTie extends LTerm {
    type: 'tie' = 'tie';
    public leftRank: number = 2;
    constructor(public name: LNom, public term: LTerm) {
        super();
    }
    equiv(v: LTie): boolean {
        return this.name.selfEquiv(v.name) && this.term.selfEquiv(v.term);
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return this.term.doesOccur(x, find);
    }
    toString(): string {
        return `${this.name} = ${this.term}`;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (!(v instanceof LTie)) return null;
        const sz = s.unify(s.find(this.term), s.find(v.term));
        if (sz) return sz;
        return null;
    }
}

export type LPredicateFn = (...args: LTerm[]) => Goal;

export class LPredicate extends LTerm {
    type: 'predicate' = 'predicate';
    public leftRank = 6;
    constructor(public name: string, public fn: LPredicateFn) {
        super();
    }
    equiv(v: LPredicate): boolean {
        return this.name === v.name;
    }
    public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return false;
    }
    toString(): string {
        return this.name;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        // if (v instanceof LPredicate && this.name === v.name) return s;
        return null;
    }
}

// function assv(pairs: LPair[], u: LLVar): LPair | false {
//     if (!u) throw new Error("No u (assv)");
//     for (const ppr of pairs) {
//         if (ppr.first instanceof LLVar && ppr.first.name === u.name &&
//             // not same second
//             !ppr.second.selfEquiv(u)
//         ) return ppr;
//         // if (u instanceof LLVar && u.name === v.name) return [v, val];
//     }
//     return false;
// }
function assv(pairs: ImmList<LPair>, u: LLVar): LPair | false {
    if (!u) throw new Error("No u (assv)");
    for (const ppr of pairs) {
        if (ppr.first instanceof LLVar && ppr.first.name === u.name &&
            // not same second
            !ppr.second.selfEquiv(u)
        ) return ppr;
        // if (u instanceof LLVar && u.name === v.name) return [v, val];
    }
    return false;
}

interface ISubstParams {
    pairs: ImmList<LPair>;
}

const substDefaults: ISubstParams = {
    pairs: ImmList(),
}

export class Subst extends ImmRecord(substDefaults) {
    constructor(params: ISubstParams) {
        super(params);
    }

    public extend(x: LLVar, v: LTerm): Subst {
        if (!x) throw new Error("No x (extend)");
        if (!v) throw new Error("No v (extend)");
        if (v.doesOccur(x.name, (z) => this.find(z))) return this;
        return this.extendUnchecked(x, v);
    }

    private extendUnchecked(x: LLVar, v: LTerm): Subst {
        // return new Subst([...this.pairs, new LPair(x, v)]);
        return this.set('pairs', this.pairs.push(new LPair(x, v)));
    }

    public find(u: LTerm): LTerm {
        if (!u) throw new Error("No u");
        const pr = u instanceof LLVar && assv(this.pairs, u);
        if (pr) {
            const piru = pr.second;
            if (!piru) {
                return u;
            }
            return this.find(piru);
        } else {
            return u;
        }
    }

    public unify(u: LTerm, v: LTerm): Subst | null {
        if (u.selfEquiv(v)) return this;
        if (u instanceof LLVar) return this.extend(u, v);
        if (v instanceof LLVar) return this.unify(v, u);
        return u.unite(this, v);
    }
}



export class State {
    constructor(public subst: Subst, public number: number) {}

    toMap(showInternals = false, vars2seek1: string[] | LLVar[] = []): {[k: string]: string} {
        const vars2seek = vars2seek1.map((v) => {
            if (v instanceof LLVar) return v;
            return new LLVar(v);
            // throw new Error("Not a var");
        });
        const seekvars = vars2seek.length > 0;
        return this.subst.pairs.reduce((acc, spair) => {
            const v = spair.first;
            const val = spair.second.reify(this.subst);
            if (v instanceof LLVar) {
                if (v.name.startsWith('$') && !showInternals) {
                    return acc;
                }
                if (seekvars && vars2seek.some((v2) => v2.name === v.name)) {
                    acc[v.name] = val.toString();
                    return acc;
                } else if (seekvars && !vars2seek.some((v2) => v2.name === v.name)) {
                    return acc;
                } else {
                    acc[v.name] = val.toString();
                    return acc;
                }
            }
            throw new Error("Not a var");
        }, {} as {[k: string]: string});
    }

    toString(): string {
        return this.subst.pairs.map((spair) => {
            const v = spair.first;
            const val = spair.second.reify(this.subst);
            if (v instanceof LLVar) {
                return `${v.name} = ${spair.second.toString()} (${val.toString()})`;
            }
            return `${v} = ${val}`;
        }).join('\n');
    }
}

export abstract class LStream {
    public abstract type: string;
    public abstract getStream(): LStream | null;
    public abstract getState(): State | null;
}

export class MatureStream extends LStream {
    type = 'mature';
    constructor(public state: State, public stream: LStream) {
        super();
    }
    override getStream() {
        return this.stream;
    }
    override getState() {
        return this.state;
    }
}

export class ImmatureStream extends LStream {
    type = 'immature';
    constructor(public thunk: () => LStream) {
        super();
    }
    override getStream() {
        return this.thunk();
    }
    override getState() {
        return null;
    }
}

export class EmptyStream extends LStream {
    type = 'empty';
    constructor() {
        super();
    }
    override getStream() {
        return null;
    }
    override getState() {
        return null;
    }
}

export type Goal = (sc: State) => LStream;
// type LStream = MatureStream | ImmatureStream;
// type MatureStream = [] | [State, LStream];
// type MatureStreamE = [] | [State, MatureStreamE];
// type ImmatureStream = () => LStream;

export const makelvar = (name: string): LLVar => new LLVar(name);
export const makeLiteral = (value: string | boolean | number): LLiteral => new LLiteral(value);
export const makeEmpty = (): LEmpty => new LEmpty();
export const makePair = (first: LTerm, second: LTerm): LPair => {
    if (!first) throw new Error("No first");
    if (!second) throw new Error("No second");
    return new LPair(first, second);
}
export const makeList = (list: LTerm[]): LPair | LTerm => {
    if (list.length === 0) return makeEmpty();
    // if (list.length === 1) return list[0];
    return list.reduceRight((acc, el) => makePair(el, acc), makeEmpty());
    // return list.reduceRight((acc, el) => makePair(el, acc));
}


export function eq(u: LTerm, v: LTerm): Goal {
    return (sc): LStream => {
        const s = sc.subst;
        if (!(s instanceof Subst)) throw new Error("Not a subst");
        const sz = s.unify(s.find(u), s.find(v));
        if (sz) {
            return new MatureStream(new State(sz, sc.number), new EmptyStream());
        } else {
            return new EmptyStream();
        }
    }
}

function* pull(s: LStream): Iterable<State> {
    let stream: LStream | null = s;
    while (stream) {
        const state = stream.getState();
        if (state) {
            yield state;
        }
        stream = stream.getStream();
    }
}

function take(n: number | null, s: LStream): State[] {
    const outv = [];
    for (const ev of pull(s)) {
        outv.push(ev);
        if (n && outv.length === n) break;
    }
    return outv;
}

export function run(n: number | null, g: Goal): State[] {
    return take(n, g(new State(new Subst({pairs: ImmList()}), 0)));
}

export function call_fresh(f: (v: LLVar) => Goal): Goal {
    return (sc) => f(makelvar(`$&${sc.number}_${
        Math.random().toString().slice(2)
    }`))(new State(sc.subst, sc.number + 1));
}

export function fresh2(f: (v: LLVar, v2: LLVar) => Goal): Goal {
    return call_fresh((v) => call_fresh((v2) => f(v, v2)));
}

export function fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => Goal): Goal {
    return call_fresh((v) => fresh2((v2, v3) => f(v, v2, v3)));
}

export function fresh4(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => Goal): Goal {
    return call_fresh((v) => fresh3((v2, v3, v4) => f(v, v2, v3, v4)));
}

export function conj(g1: Goal, g2: Goal): Goal {
    return (sc) => {
        return append_map(g2, g1(sc));
    }
}

export function disj(g1: Goal, g2: Goal): Goal {
    return (sc) => {
        return append_1(g1(sc), g2(sc));
    }
}

function append_1(l1: LStream, l2: LStream): LStream {
    if (l1.type === 'empty') return l2;
    if (l2.type === 'empty') return l1;
    if (l1.type === 'immature') {
        return l1.getStream() ?? l2;
    }
    const cstate = l1.getState();
    if (!cstate) return l2;
    const stream = l1.getStream();
    if (!stream) return l2;
    return new MatureStream(cstate, append_1(stream, l2));
}

function append_map(gg: Goal, l: LStream): LStream {
    if (l.type === 'empty') return new EmptyStream();
    if (l.type === 'immature') {
        const lss = l.getStream();
        if (!lss) return new EmptyStream();
        // return new ImmatureStream(() => append_map(gg, lss));
        return append_map(gg, lss);
    }
    const cstate = l.getState();
    if (!cstate) return new EmptyStream();
    const stream = l.getStream();
    if (!stream) return new EmptyStream();
    return append_1(gg(cstate), append_map(gg, stream));
}


export function all(...g: Goal[]): Goal {
    if (g.length === 0) throw new Error("Cannot do that");
    if (g.length === 1) return g[0];
    return g.reduce((acc, gg) => conj(acc, gg));
};

export function either(...g: Goal[]): Goal {
    if (g.length === 0) throw new Error("Cannot do that");
    if (g.length === 1) return g[0];
    // return g.reduce((acc, gg) => disj(acc, gg));
    return (sc) => {
        return g.map((gg) => gg(sc)).reduce((acc, gg) => append_1(acc, gg));
    }
};

export function apply_pred(
    lp: LTerm,
    
    ...args: LTerm[]
): Goal {
    return (sc) => {
        const lpp = sc.subst.find(lp);
        if (!(lpp instanceof LPredicate)) throw new Error("Not a predicate");
        // map(ag => ag.reify(sc.subst))
        const arggs = lpp.fn(...args);
        if (typeof arggs === 'function') {
            // console.log("apply_pred", lp.toString(), args.map(a => a.toString()));
            return arggs(sc);
        } else {
            throw new Error("Not a function??");
        }
        // console.log("apply_pred", lp.toString(), args.map(a => a.toString()));
        // return new ImmatureStream(
        //     () => {
        //         const lpp = sc.subst.find(lp);
        //         if (!(lpp instanceof LPredicate)) throw new Error("Not a predicate");
        //         // map(ag => ag.reify(sc.subst))
        //         return lpp.fn(...args)(sc);
        //     }
        // )
    }
}










//////////
///////////
// Nominal Logic Programming additions (alphakanren)

// freshNom

export function freshNom(
    fn: (v: LNom) => Goal
): Goal {
    return (sc) => {
        return fn(new LNom(`$${sc.number}`))(new State(sc.subst, sc.number + 1));
    }
}

export function hash() {
}

export class LStaticClosure extends LTerm {
    type: 'staticclosure' = 'staticclosure';
    leftRank = 1;
    constructor(public level: number, 
        public scope: unknown,
        public name: LNom, 
        public closure: LTerm
    ) {
        super();
    }
    /**
     * 
     * Static closures support the following operations:
• ext(𝜙, a) adds the name a to the scope 𝜙. If a has been previously added to 𝜙, then this
older one is shadowed and its corresponding level becomes unusable.
• db(𝜙, a) is Just ℓ where ℓ is the de Bruijn level of a w.r.t the scope 𝜙, if a is not shadowed
in 𝜙; otherwise, the result is Nothing.
• db(𝜙, ℓ) is Just ℓ, if ℓ is available in 𝜙; otherwise, the result is Nothing
     */
    equiv(v: LStaticClosure): boolean {
        return this.closure === v.closure;
    }
    doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return false;
    }
    nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        if (v instanceof LStaticClosure && this.closure === v.closure) return s;
        return null;
    }
    toString(): string {
        return `Closure(${this.closure})`;
    }
}
// export const makelvar = (name: string): LLVar => ({
//     type: 'lvar',
//     name
// });

// const isPair = (ll: LTerm): ll is LPair => {
//     return Array.isArray(ll) && ll.length > 0;
// };
// const isDStream = (d: LStream): d is ImmatureStream => {
//     return typeof d === 'function';
// };
// const isNullStream = (d: LStream): d is [] => {
//     return Array.isArray(d) && d.length === 0;
// };
// const assertPair = (ll: LTerm) => {
//     if (!isPair(ll)) throw new Error("Not a pair");

// };
// export function eq(u: LTerm, v: LTerm): Goal {
//     return (sc): LStream => {
//         const s = sc[0];
//         const sz = unify(find(u, s), find(v, s), s);
//         if (sz) {
//             return [[sz, sc[1]], []];
//         } else {
//             return [];
//         }
//     }
// }

// function equiv(u: LTerm, v: LTerm): boolean {
//     if (isVar(u) && isVar(v) && u.name === v.name) {
//         return true;
//     } else if (u === v) return true;
//     return false;
// }

// function unify(u: LTerm, v: LTerm, s: Subst): Subst | null {
//     if (equiv(u, v)) return s;
//     if (isVar(u)) return ext_s(u, v, s);
//     if (isVar(v)) return unify(v, u, s);
//     if (isPair(v) && isPair(u)) {
//         const sz = unify(find(u[0], s), find(v[0], s), s);
//         if (sz) {
//             return unify(find(u[1], sz), find(v[1], sz), sz);
//         } else {
//             return null;
//         }
//     }
//     return null;
// }


// function assv(u: LTerm, s: Subst) {
//     for (const [v, val] of s) {
//         if (equiv(u, v)) return [v, val];
//     }
//     return false;
// }

// function find(u: LTerm, s: Subst): LTerm {
//     const pr = isVar(u) && assv(u, s);
//     if (pr) {
//         const piru = pr[1];
//         if (!piru) {
//             return u;
//         }
//         return find(piru, s);
//     } else {
//         return u;
//     }
// }

// export function call_fresh(f: (v: LLVar) => Goal): Goal {
//     return (sc) => {
//         const c = sc[1];
//         return f(makelvar(`$${c}`))([sc[0], c + 1]);
//     }
// }

// export function call_fresh2(f: (v: LLVar, v2: LLVar) => Goal): Goal {
//     return call_fresh((v) => call_fresh((v2) => f(v, v2)));
// }

// export function call_fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => Goal): Goal {
//     return call_fresh((v) => call_fresh2((v2, v3) => f(v, v2, v3)));
// }

// export function call_fresh4(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => Goal): Goal {
//     return call_fresh((v) => call_fresh3((v2, v3, v4) => f(v, v2, v3, v4)));
// }

// function disj(g1: Goal, g2: Goal): Goal {
//     return sc => append_1(g1(sc), g2(sc));
// }

// function conj(g1: Goal, g2: Goal): Goal {
//     return (sc) => append_map(g2, g1(sc));
// }

// function append_1(l1: LStream, l2: LStream): LStream {
//     if (isNullStream(l1)) return l2;
//     if (isNullStream(l2)) return l1;
//     if (isDStream(l1)) {
//         return () => append_1(l1(), l2);
//     }
//     return [l1[0], append_1(l1[1], l2)];

// }

// function append_map(gg: Goal, l: LStream): LStream {
//     if (isNullStream(l)) return [];
//     if (isDStream(l)) {
//         return () => append_map(gg, l());
//     }
//     return append_1(gg(l[0]), append_map(gg, l[1]));
// }

// function defineRelation() {

// }

// function call_initial_state(n: number | null, g: Goal): Array<State> {
//     return take(n, pull(g([[], 0])));
// }

// export const prettifyState = (s: State): string => {
//     return s[0].map(([v, val]) => {
//         if (isVar(v)) {
//             return `${v.name} = ${val}`;
//         }
//         return `${v} = ${val}`;
//     }).join('\n');
// }

// export const mapStateList = (s: State[]): {[k: string]: string}[] => {
//     return s.map(([v, val]) => {
//         return v.reduce((acc, [v, val]) => {
//             if (isVar(v)) {
//                 // return {...acc, [v.name]: val};
//                 acc[v.name] = val as string;
//                 return acc;
//             }
//             acc[`${v}`] = val as string;
//             return acc;
//             // return {...acc, [v + ""]: val};
//         }, {} as {[k: string]: string});
//     });
// }


// const take = (n: number | null, s: MatureStreamE): Array<State> => {
//     if (isNullStream(s)) return [];
//     if (n && (n - 1) === 0) return [s[0]];
//     return [s[0], ...take((n ?? 0) - 1, s[1])];
// };
// const pull = (s: LStream): MatureStreamE => {
//     if (isNullStream(s)) return [];
//     if (isDStream(s)) {
//         return pull(s());
//     }
//     return [s[0], pull(s[1])];
// };


// function isVar(x1: LTerm): x1 is LLVar {
//     return typeof x1 === 'object' && 'type' in x1 && x1.type === 'lvar';
// }

// const ext_s = (x: LLVar, v: LTerm, s: Subst): Subst | null => {
//     if (doesOccur(x, v, s)) return null;
//     return [[x, v], ...s];
// }
// const doesOccur = (x: LLVar, v: LTerm, s: Subst): boolean => {
//     if (isVar(v)) {
//         return x.name === v.name;
//     } else if (isPair(v)) {
//         return doesOccur(x, find(v[0], s), s) || doesOccur(x, find(v[1], s), s);
//     } else {
//         return false;
//     }
// }


// /////////
// /////////
// ///////
// ////////
// // Utility functions:

// export const all = (...g: Goal[]): Goal => {
//     if (g.length === 0) throw new Error("Cannot do that");
//     if (g.length === 1) return g[0];
//     return g.reduce((acc, gg) => conj(acc, gg));
// }

// export const either = (...g: Goal[]): Goal => {
//     if (g.length === 0) throw new Error("Cannot do that");
//     if (g.length === 1) return g[0];
//     return g.reduce((acc, gg) => disj(acc, gg));
// }

// export const run = (n: number | null, g: Goal) => {
//     const ist = call_initial_state(n, g);
//     const outv = [];
//     for (const ev of ist) {
//         outv.push(ev);
//     }
//     return outv;
// };
