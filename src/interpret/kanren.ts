
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
    public abstract type: string;
}
export class LLVar extends LTerm {
    type = 'lvar';
    constructor(public name: string) {
        super();
    }

    toString(): string {
        return this.name;
    }
}

export class LLiteral extends LTerm {
    type: 'literal' = 'literal';
    constructor(public value: string | boolean | number) {
        super();
    }
    toString(): string {
        return this.value + "";
    }
}

export class LEmpty extends LTerm {
    type: 'empty' = 'empty';
    constructor() {
        super();
    }

    toString(): string {
        return '[]';
    }
}

export class LPair extends LTerm {
    type: 'pair' = 'pair';
    constructor(public first: LTerm, public second: LTerm) {
        super();
    }

    toString(): string {
        return `[${this.first.toString()}, ${this.second.toString()}]`;
    }
}


export class Subst {
    constructor(public pairs: LPair[]) {}

    public extend(x: LLVar, v: LTerm): Subst {
        if (this.doesOccur(x, v)) return this;
        return new Subst([...this.pairs, new LPair(x, v)]);
    }

    public find(u: LTerm): LTerm {
        const pr = u instanceof LLVar && this.assv(u);
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

    public assv(u: LLVar): LPair | false {
        for (const ppr of this.pairs) {
            if (ppr.first instanceof LLVar && ppr.first.name === u.name) return ppr;
            // if (u instanceof LLVar && u.name === v.name) return [v, val];
        }
        return false;
    }

    public unify(u: LTerm, v: LTerm): Subst | null {
        if (this.equiv(u, v)) return this;
        if (u instanceof LLVar) return this.extend(u, v);
        if (v instanceof LLVar) return this.unify(v, u);
        if (u instanceof LPair && v instanceof LPair) {
            const sz = this.unify(this.find(u.first), this.find(v.first));
            if (sz) {
                return sz.unify(this.find(u.second), this.find(v.second));
            } else {
                return null;
            }
        }
        return null;
    }

    // TODO: refactor out?
    public equiv(u: LTerm, v: LTerm): boolean {
        if (u instanceof LLVar && v instanceof LLVar && u.name === v.name) {
            return true;
        } else if (u instanceof LLiteral && v instanceof LLiteral && u.value === v.value) {
            return true;
        } else if (u instanceof LEmpty && v instanceof LEmpty) {
            return true;
        } else if (u instanceof LPair && v instanceof LPair) {
            return this.equiv(u.first, v.first) && this.equiv(u.second, v.second);
        } else if (u instanceof LNom && v instanceof LNom && u.name === v.name) {
            return true;
        }
        return false;
    }

    public doesOccur(x: LLVar, v: LTerm): boolean {
        if (v instanceof LLVar) {
            return x.name === v.name;
        } else if (v instanceof LPair) {
            return this.doesOccur(x, this.find(v.first)) || this.doesOccur(x, this.find(v.second));
        } else {
            return false;
        }
    }
}

export class State {
    constructor(public subst: Subst, public number: number) {}

    toMap(): {[k: string]: string} {
        return this.subst.pairs.reduce((acc, spair) => {
            const v = spair.first;
            const val = this.subst.find(spair.second);
            if (v instanceof LLVar) {
                if (v.name.startsWith('$')) {
                    return acc;
                }
                if (val instanceof LPair) {
                    acc[v.name] = val.toString();
                    return acc;
                }
                acc[v.name] = val instanceof LLiteral ? val.value + "" : val + "";
                return acc;
            }
            acc[`${v}`] = val instanceof LLiteral ? val.value + "" : val + "";
            return acc;
        }, {} as {[k: string]: string});
    }

    toString(): string {
        return this.subst.pairs.map((spair) => {
            const v = spair.first;
            const val = this.subst.find(spair.second);
            if (v instanceof LLVar) {
                return `${v.name} = ${val}`;
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
export const makePair = (first: LTerm, second: LTerm): LPair => new LPair(first, second);
export const makeList = (list: LTerm[]): LPair | LTerm => {
    if (list.length === 0) return makeEmpty();
    // if (list.length === 1) return list[0];
    return list.reduceRight((acc, el) => makePair(el, acc), makeEmpty());
    // return list.reduceRight((acc, el) => makePair(el, acc));
}


export function eq(u: LTerm, v: LTerm): Goal {
    return (sc): LStream => {
        const s = sc.subst;
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
    return take(n, g(new State(new Subst([]), 0)));
}

export function call_fresh(f: (v: LLVar) => Goal): Goal {
    return (sc) => f(makelvar(`$${sc.number}`))(new State(sc.subst, sc.number + 1));
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
        return new ImmatureStream(() => append_map(gg, lss));
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
    return g.reduce((acc, gg) => disj(acc, gg));
};












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

export class LNom {
    constructor(public name: string) {}
    toString(): string {
        return this.name;
    }
}
export class LTie extends LTerm {
    type: 'tie' = 'tie';
    constructor(public name: LNom, public term: LTerm) {
        super();
    }
    toString(): string {
        return `${this.name} = ${this.term}`;
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
