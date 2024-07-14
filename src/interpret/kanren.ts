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
type MatureStream = Iterable<State>;
type ImmatureStream = () => Iterable<State>;


function* mergeStreams(state: State, functions: Array<(state: State) => MatureStream>): MatureStream {
    if (state.fail) return;
    // Initialize an array of iterators from the functions
    const iterators = functions.map(func => func(state)[Symbol.iterator]());
    const queue: Array<Iterator<State>> = [...iterators];
    yield* mergeGeneral(queue);
}

function* mergeGeneral(queue: Array<Iterator<State>>): Iterable<State> {
    while (queue.length > 0) {
        const iterator = queue.shift();
        if (iterator) {
            const result = iterator.next();
            if (!result.done) {
                if (!result.value) throw new Error("No value????");
                if (result.value.fail) {
                    yield result.value;
                    // queue.push(iterator); // Put the iterator back in the queue for further processing
                    continue;
                }
                yield result.value;
                queue.push(iterator); // Put the iterator back in the queue for further processing
            }
        }
    }
}

// function* mergeGeneral2(queue: Array<Iterator<State>>): Iterable<State> {
//     while (queue.length > 0) {
//         const iterator = queue.shift();
//         if (iterator) {
//             const result = iterator.next();
//             if (!result.done) {
//                 if (!result.value) throw new Error("No value????");
//                 if (result.value.fail) {
//                     // yield result.value;
//                     // queue.push(iterator); // Put the iterator back in the queue for further processing
//                     continue;
//                 }
//                 yield result.value;
//                 queue.push(iterator); // Put the iterator back in the queue for further processing
//             }
//         }
//     }
// }

function* mapStreams(goal: (s: State) => Iterable<State>, stream: Iterable<State>): MatureStream {
    // Breadth first merger & mapping of the streams
    const queue: Array<Iterator<State>> = [];
    const streamIter = stream[Symbol.iterator]();
    let streamDone = false;
    while (queue.length > 0 || !streamDone) {
        if (streamIter && !streamDone) {
            if (queue.length > 0) {
                const iterator = queue.shift();
                if (iterator) {
                    const result = iterator.next();
                    if (!result.done) {
                        if (!result.value) throw new Error("No value????");
                        if (result.value.fail) {
                            // yield result.value;
                            queue.push(iterator); // Put the iterator back in the queue for further processing
                            continue;
                        }
                        yield result.value;
                        queue.push(iterator); // Put the iterator back in the queue for further processing
                    }
                }
            }
            const result = streamIter.next();
            if (result.done) {
                streamDone = true;
                continue;
            }
            const val = result.value;
            if (val.fail) {
                continue;
            }
            queue.push(goal(val)[Symbol.iterator]());
        } else {
            yield* mergeGeneral(queue);
        }
    }
}

export function* fail(sc: State): Iterable<State> {}



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
    public abstract cleanOutput(): CleanOutput;
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
    cleanOutput(): CleanOutput {
        return `?${this.name}`;
    }
}

export class LLiteral extends LTerm {
    leftRank = 50;
    type = 'literal' as const;
    constructor(public value: string | boolean | number) {
        super();
    }
    toString(): string {
        return `${this.value}`;
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
    cleanOutput(): CleanOutput {
        return this.value;
    }
}

export class LEmpty extends LTerm {
    type = 'empty' as const;
    leftRank = 100;

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
    cleanOutput(): CleanOutput {
        return [];
    }
}

export class LPair extends LTerm {
    type = 'pair' as const;
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
    public cleanOutput(): CleanOutput {
        const sc1 = this.second.cleanOutput();
        if (Array.isArray(sc1)) {
            return [this.first.cleanOutput(), ...sc1];
        }
        throw new Error("Not a list");
        // return [this.first.cleanOutput(), sc];
    }
}

export class LFunctor extends LTerm {
    // Holds a specific record of a set number of arguments
    type = 'functor' as const;
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

    public cleanOutput(): CleanOutput {
        return {
            name: this.name,
            fields: this.fields,
            args: this.args.map((arg) => arg.cleanOutput())
        };
    }

    override reify(s: Subst): LTerm {
        return new LFunctor(this.name, this.fields, this.args.map((arg) => arg.reify(s)));
    }
}
export class LNom extends LTerm {
    type = 'nom' as const;
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
    public cleanOutput(): CleanOutput {
        return `Nom(${this.name})`;
    }
}
export class LTie extends LTerm {
    type = 'tie' as const;
    public leftRank = 2;
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
    public cleanOutput(): CleanOutput {
        return {
            name: this.name.cleanOutput(),
            term: this.term.cleanOutput()
        };
    }
}

export type LPredicateFn = (...args: LTerm[]) => Goal;

export class LPredicate extends LTerm {
    type = 'predicate' as const;
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
        return `Predicate(${this.name})`;
    }
    public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        // if (v instanceof LPredicate && this.name === v.name) return s;
        return null;
    }
    public cleanOutput(): CleanOutput {
        return `Predicate(${this.name})`;
    }
}

// export class LNonfiniteMap extends LTerm {
//     type: 'nonfinitemap' = 'nonfinitemap';
//     public leftRank = 7;
//     constructor(public map: ImmMap<string, LTerm>) {
//         super();
//     }
//     equiv(v: LNonfiniteMap): boolean {
//         return this.map.equals(v.map);
//     }
//     public doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
//         return this.map.some((v) => v.doesOccur(x, find));
//     }
//     toString(): string {
//         return `{${this.map.map((v, k) => `${k}: ${v.toString()}`).join(', ')}}`;
//     }
//     public nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
//         if (!(v instanceof LNonfiniteMap)) return null;
//         if (!this.map.equals(v.map)) return null;
//         return s;
//     }
//     public cleanOutput(): CleanOutput {
//         return {
//             map: this.map.map((v) => v.cleanOutput()).toObject()
//         };
//     }
// }

export class LConstraint<T extends LTerm, Z extends LTerm> extends LTerm {
    // Wraps a term in a constraint, when the term is reified/unified, the constraint is applied
    type = 'constraint' as const;
    public leftRank = -1;
    constructor(
        public term: T, 
        public constraintKind: string,
        public constraintArgs: Z[],
        public constraint: (s: Subst, curr: T, args: Z[]) => Subst | null,
    ) {
        super();
    }

    equiv(v: LConstraint<T, Z>): boolean {
        return this.term.selfEquiv(v.term) && this.constraintKind === v.constraintKind && this.constraintArgs.every((arg, i) => arg.selfEquiv(v.constraintArgs[i]));
    }

    doesOccur(x: string, find: (z: LTerm) => LTerm): boolean {
        return this.term.doesOccur(x, find) || this.constraintArgs.some((arg) => arg.doesOccur(x, find));
    }

    toString(): string {
        return `Constraint: ${this.term.toString()} ${this.constraintKind} ${this.constraintArgs.map((arg) => arg.toString()).join(' ')}`;
    }

    nonEquivalentUnite(s: Subst, v: LTerm): Subst | null {
        // naively unify the term, then apply the constraint
        const sz = s.unify(s.find(this.term), s.find(v));
        if (!sz) return null;
        const nt = this.term.reify(sz) as T;
        const nts = this.constraint(sz, nt, this.constraintArgs);
        return nts;
    }
    public cleanOutput(): CleanOutput {
        return {
            term: this.term.cleanOutput(),
            constraintKind: this.constraintKind,
            constraintArgs: this.constraintArgs.map((arg) => arg.cleanOutput())
        };
    }

    public reify(s: Subst): LTerm {
        return new LConstraint(
            this.term.reify(s) as T,
            this.constraintKind,
            this.constraintArgs.map((arg) => arg.reify(s) as Z),
            this.constraint
        );
    }

}

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

type CleanOutput = string | number | boolean | {[k: string]: CleanOutput} | CleanOutput[];

export class ConstraintStore {
    constructor(public constraints: ImmList<ConstrainL>) {}
}

export class InfoStore {
    constructor(public info: ImmMap<string, string>) {}
}

export class ConstrainL {
    constructor(public constraint: (args: LTerm[], s: State) => Iterable<State> | State, public constraintKind: string, public constraintArgs: LTerm[]) {    }
    apply(s: State): Iterable<State> | State {
        return this.constraint(this.constraintArgs.map(
            (arg) => arg.reify(s.subst)
        ), s);
    }    
}

interface StateParams {
    fail: boolean;
    subst: Subst;
    number: number;
    c: ConstraintStore;
    i: InfoStore;
}

const stateDefaults: StateParams = {
    fail: false,
    subst: new Subst({pairs: ImmList()}),
    number: 0,
    c: new ConstraintStore(ImmList()),
    i: new InfoStore(ImmMap()),
}

export class State extends ImmRecord(stateDefaults) {

    toMap(showInternals = false, vars2seek1: string[] | LLVar[] = []): {[k: string]: string} {
        const vars2seek = vars2seek1.map((v) => {
            if (v instanceof LLVar) return v;
            return new LLVar(v);
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

    increment(): State {
        return this.set('number', this.number + 1);
    }

    setSubst(subst: Subst): State {
        return this.set('subst', subst);
    }

    toClean(showInternals = false, vars2seek1: string[] | LLVar[] = []): CleanOutput {
        const vars2seek = vars2seek1.map((v) => {
            if (v instanceof LLVar) return v;
            return new LLVar(v);
        });
        return this.subst.pairs.reduce((acc, spair) => {
            const v = spair.first;
            const val = spair.second.reify(this.subst);
            if (v instanceof LLVar) {
                if (v.name.startsWith('$') && !showInternals) {
                    return acc;
                }
                if (vars2seek.some((v2) => v2.name === v.name)) {
                    // return {...acc, [v.name]: val.cleanOutput()};
                    acc[v.name] = val.cleanOutput();
                    return acc;
                } else {
                    return acc;
                }
            }
            throw new Error("Not a var");
        }, {} as {[k: string]: CleanOutput});
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

    static toFail(): State {
        return new State({fail: true, subst: new Subst({pairs: ImmList()}), number: 0, c: new ConstraintStore(ImmList()), i: new InfoStore(ImmMap())});
    }
}
// export abstract class LStream {
//     public abstract type: string;
//     public abstract getStream(): LStream | null;
//     public abstract getState(): State | null;
//     public abstract pull(sn: number | null): Iterable<State>;
// }

// export abstract class LStream2 {
//     public abstract type: string;
//     public abstract thunk(
//         s: State
//     ): Iterable<State>;
// }

// export class MatureStream extends LStream {
//     type = 'mature';
//     constructor(public state: State, public stream: LStream) {
//         super();
//     }
//     override getStream() {
//         return this.stream;
//     }
//     *pull(sn: number | null): Iterable<State> {
//         if (sn !== null && sn <= 0) return;
//         yield this.state;
//         const thisStream = this.getStream();
//         yield* thisStream.pull(sn ? sn - 1 : null);
//     }
//     override getState() {
//         return this.state;
//     }
// }

// export class ImmatureStream extends LStream {
//     type = 'immature';
//     constructor(public thunk: () => LStream) {
//         super();
//     }
//     override getStream() {
//         return this.thunk();
//     }
//     *pull(sn: number | null): Iterable<State> {
//         if (sn !== null && sn <= 0) return;
//         yield* this.thunk().pull(sn ? sn - 1 : null);
//     }
//     override getState() {
//         return null;
//     }
// }

// // export class DisjStream2 extends LStream2 {
// //     type = 'immature';
// //     constructor(public goals: ((s: State) => LStream2)[]) {
// //         super();
// //     }

// //     *thunk(st: State): Iterable<State> {
// //         for (const goal of this.goals) {
// //             yield goal(st).thunk(st);
// //         }
// //     }
// // }

// export class DisjunctionStream extends LStream {
//     type = 'disjunction';
//     constructor(public streams: LStream[]) {
//         super();
//     }
//     override getStream() {
//         return this;
//     }
//     *pull(sn: number | null): Iterable<State> {
//         yield* mergeGeneral(this.streams.map((stream) => stream.pull(sn)[Symbol.iterator]()));
//         // if (sn !== null && sn <= 0) return;
//         // // Interleave the streams, pulling one state from each, one at a time
//         // const astr = this.streams.map((stream) => stream.pull(sn)[Symbol.iterator]());
//         // while (true) {
//         //     let doneAll = true;
//         //     for (const str of astr) {
//         //         const {value, done} = str.next();
//         //         if (!done) {
//         //             yield value;
//         //             doneAll = false;
//         //         }
//         //     }
//         //     if (doneAll) break;
//         // }
//         // return;
//     }
//     override getState() {
//         return null;
//     }
// }

// export class ConjunctionStream extends LStream {
//     type = 'conjunction';
//     constructor(public op: Goal, public stream: LStream) {
//         super();
//     }
//     override getStream() {
//         return this;
//     }
//     *pull(sn: number | null): Iterable<State> {
//         yield* mapStreams((sc) => this.op(sc).pull(null), this.stream.pull(null));
//         // if (sn !== null && sn <= 0) return;
//         // const iter = this.stream.pull(sn)[Symbol.iterator]();
//         // let done = false;
//         // let counter = sn === null ? 0 : sn;
//         // const useCounter = sn !== null;
//         // while (!done) {
//         //     const {value, done: done1} = iter.next();
//         //     if (done1) {
//         //         done = true;
//         //         break;
//         //     } else {
//         //         if (useCounter) {
//         //             if (counter === 0) {
//         //                 done = true;
//         //                 break;
//         //             } else {
//         //                 counter--;
//         //             }
//         //             yield* this.op(value).pull(counter);
//         //         } else {
//         //             yield* this.op(value).pull(null);
//         //         }
//         //     }
//         // }
//     }
//     override getState() {
//         return this.stream.getState();
//     }
// }

// export class EmptyStream extends LStream {
//     type = 'empty';
//     override getStream() {
//         return null;
//     }
//     override getState() {
//         return null;
//     }
//     *pull(_sn: number | null): Iterable<State> {}
// }

export type Goal = (sc: State) => Iterable<State>;
// type LStream = MatureStream | ImmatureStream;
// type MatureStream = [] | [State, LStream];
// type MatureStreamE = [] | [State, MatureStreamE];
// type ImmatureStream = () => LStream;


// const notEqualConstraint = <A extends LTerm, B extends LTerm>(a: A, b: B): LConstraint<A, B> => {
//     return new LConstraint(a, '!=', [b], (s, curr, args) => {
//         if (curr.selfEquiv(args[0])) return null;
//         return s;
//     });
// }

export const makelvar = (name: string, mp?: ImmMap<string, LLVar>): LLVar => mp?.has?.(name) ? mp.get(name, new LLVar(name)) : new LLVar(name);
export const makeLvar = makelvar;
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
    // return (sc): LStream => {
    //     const s = sc.subst;
    //     if (!(s instanceof Subst)) throw new Error("Not a subst");
    //     const sz = s.unify(s.find(u), s.find(v));
    //     if (sz) {
    //         return new MatureStream(sc.increment().setSubst(sz), new EmptyStream());
    //     } else {
    //         return new EmptyStream();
    //     }
    // }
    return function* (sc: State): Iterable<State> {
        const s = sc.subst;
        if (!(s instanceof Subst)) throw new Error("Not a subst");
        const sz = s.unify(s.find(u), s.find(v));
        if (sz) {
            yield sc.increment().setSubst(sz);
        } else {
            // return fail(sc);
            yield State.toFail();
        }
    }
}

// const emptyState = new State(new Subst({pairs: ImmList()}), 0, new ConstraintStore(ImmList()), new InfoStore(ImmMap()));
const emptyState = new State(stateDefaults);

function* takeT(iterable: Iterable<State>, length1: number) {
    let length = length1;
    const iterator = iterable[Symbol.iterator]();
    while (length-- > 0) {
        const vll = iterator.next();
        if (!vll) throw new Error("No iterator");
        if (vll.done) break;
        if (!vll.value) throw new Error("No value");
        yield vll.value;
    }
}

export function run(n: number | null, g: Goal): State[] {
    if (n === null) {
        return [...g(emptyState)];
    } else {
        return [...takeT(g(emptyState), n)];
    }
}

export function call_fresh(f: (v: LLVar) => Goal): Goal {
    return (sc) => f(makelvar(`$&${sc.number}_${
        Math.random().toString().slice(2)
    }`))(sc.increment());
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

// export function disj(g1: Goal, g2: Goal): Goal {
//     return (sc) => {
//         return append_1(g1(sc), g2(sc));
//     }
// }

function append_1(l1: Iterable<State>, l2: Iterable<State>): Iterable<State> {
    return mergeGeneral([l1[Symbol.iterator](), l2[Symbol.iterator]()]);
}

function append_map(gg: Goal, l: Iterable<State>): Iterable<State> {
    return mapStreams(gg, l);
}

// function append_1(l1: LStream, l2: LStream): LStream {
//     return new DisjunctionStream([l1, l2]);
// }

// function append_map(gg: Goal, l: LStream): LStream {
//     return new ConjunctionStream(gg, l);
// }

export function all(...g: Goal[]): Goal {
    if (g.length === 0) throw new Error("Cannot do that");
    if (g.length === 1) return g[0];
    // return g.reduce((acc, gg) => conj(acc, gg));
    return (sc: State) => {
        return g.reduce((acc, gg) => append_map(gg, acc), g[0](sc));        
    }
};

export function either(...g: Goal[]): Goal {
    if (g.length === 0) throw new Error("Cannot do that");
    if (g.length === 1) return g[0];
    // return g.reduce((acc, gg) => disj(acc, gg));
    return (sc) => {
        return mergeStreams(sc, g);
    }
    // return (sc) => {
    //     return g.map((gg) => gg(sc)).reduce((acc, gg) => append_1(acc, gg));
    // }
};

export function apply_pred(
    lp: LTerm,
    
    ...args: LTerm[]
): Goal {
    return (sc) => {
        const lpp = sc.subst.find(lp);
        // console.log("apply_pred", lp.toString(), lpp.toString(), args.map(a => a.toString()));
        if (!(lpp instanceof LPredicate)) throw new Error(`Not a predicate: < ${lp.toString()} >`);
        // map(ag => ag.reify(sc.subst))
        const arggs = lpp.fn(...args.map((arg) => sc.subst.find(arg)));
        // const arggs = lpp.fn(...args);
        if (typeof arggs === 'function') {
            // console.log("apply_pred", lp.toString(), args.map(a => a.toString()));
            // return new ImmatureStream(() => arggs(sc));
            return arggs(sc);
            // return arggs(sc);
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
        return fn(new LNom(`$${sc.number}`))(sc.increment());
    }
}

export function hash() {
}

export class LStaticClosure extends LTerm {
    type = 'staticclosure' as const;
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
    public cleanOutput(): CleanOutput {
        return {
            level: this.level,
            scope: 'YET TO IMPLEMENT',
            name: this.name.cleanOutput(),
            closure: this.closure.cleanOutput()
        };
    }
}