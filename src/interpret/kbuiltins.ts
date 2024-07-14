import type { Builtin } from "src/utils/builtinList";
import { LPredicate, type LPredicateFn, eq } from './kanren';
import * as kn from 'src/interpret/kanren';
import {all, either, call_fresh} from './goal';
const firsto = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
    console.log('firsto', a, l);
    return kn.call_fresh(
        (v) => kn.eq(kn.makePair(a, v), l)
    );
};
const resto = (l: kn.LTerm, r: kn.LTerm): kn.Goal => {
    console.log('resto', l.toString(), r.toString());
    return kn.call_fresh(
        (v) => kn.eq(kn.makePair(v, r), l)
    );
}

// l = a, s = b, o = ab
const appendo = (l: kn.LTerm, s: kn.LTerm, o: kn.LTerm): kn.Goal => {
    console.log("appendo", l.toString(), s.toString(), o.toString());
    return kn.either(
        kn.all(
            kn.eq(kn.makeEmpty(), l),
            kn.eq(s, o)
        ),
        kn.call_fresh(
            (a) => kn.call_fresh(
                (d) => kn.call_fresh(
                    (res) => kn.all(
                        kn.eq(kn.makePair(a, d), l),
                        kn.eq(kn.makePair(a, res), o),
                        // appendo(d, s, res)
                        // (sc) => new kn.ImmatureStream(() => appendo(d, s, res)(sc))
                        kn.apply_pred(
                            kn.makelvar("internal_append"),
                            d, s, res
                        )
                    )
                )
            )
        ),
    );
};

const listToString = (l: kn.LTerm): string | null => {
    if (l instanceof kn.LPair) {
        if (l.first instanceof kn.LLiteral && typeof l.first.value === 'string') {
            const nsecond = listToString(l.second);
            if (nsecond === null) return null;
            return l.first.value + nsecond;
        }
    } else if (l instanceof kn.LEmpty) {
        return "";
    }
    return null;
}

const string_to_list =  (s: kn.LTerm, l: kn.LTerm): kn.Goal => {
    return (sc: kn.State): Iterable<kn.State> => {
        // If s is a literal with a string value, then l is a list of characters
        const ssf = s.reify(sc.subst);
        const llf = l.reify(sc.subst);
        if (ssf instanceof kn.LLiteral && typeof ssf.value === 'string') {
            return kn.eq(l, kn.makeList([...ssf.value].map(
                (c) => new kn.LLiteral(c)
            )))(sc);
        }
        // if (ssf instanceof kn.LPair) {
        //     return kn.all(
        //         kn.eq(kn.makePair(new kn.LLiteral(ssf.car.value), new kn.LVar()), l),
        //         string_to_list(ssf.cdr, l.cdr)
        //     )(sc);
        // }
        if (llf instanceof kn.LPair) {
            const nstring = listToString(llf);
            if (nstring) {
                return kn.eq(s, kn.makeLiteral(nstring))(sc);
            } else {
                return kn.fail(sc);
            }
        } else {
            throw new Error("Not an Lpair");
        }
    }
};

const addc = (a: kn.LTerm, b: kn.LTerm, c: kn.LTerm): kn.Goal => {
        return (sc) => {
            const aWalked = a.reify(sc.subst);
            const bWalked = b.reify(sc.subst);
            const cWalked = c.reify(sc.subst);
            if (aWalked instanceof kn.LLiteral && bWalked instanceof kn.LLiteral) {
                if (typeof aWalked.value === 'number' && typeof bWalked.value === 'number') {
                    return eq(c, kn.makeLiteral(aWalked.value + bWalked.value))(sc);
                }
                if (typeof aWalked.value === 'string' && typeof bWalked.value === 'string') {
                    return eq(c, kn.makeLiteral(aWalked.value + bWalked.value))(sc);
                }
                if (typeof aWalked.value === 'number' && typeof bWalked.value === 'string') {
                    return eq(c, kn.makeLiteral(aWalked.value.toString() + bWalked.value))(sc);
                }
                if (typeof aWalked.value === 'string' && typeof bWalked.value === 'number') {
                    return eq(c, kn.makeLiteral(aWalked.value + bWalked.value.toString()))(sc);
                }
                else {
                    throw new Error("Invalid types for add");
                }
            } else if (aWalked instanceof kn.LLiteral && cWalked instanceof kn.LLiteral) {
                if (typeof aWalked.value === 'number' && typeof cWalked.value === 'number') {
                    return eq(b, kn.makeLiteral(cWalked.value - aWalked.value))(sc);
                }
                if (typeof aWalked.value === 'string' && typeof cWalked.value === 'string') {
                    return eq(b, kn.makeLiteral(cWalked.value.slice(aWalked.value.length)))(sc);
                }
                if (typeof aWalked.value === 'number' && typeof cWalked.value === 'string') {
                    return eq(b, kn.makeLiteral(cWalked.value.slice(aWalked.value)))(sc);
                }
                if (typeof aWalked.value === 'string' && typeof cWalked.value === 'number') {
                    return eq(b, kn.makeLiteral(cWalked.value - aWalked.value.length))(sc);
                }
                else {
                    throw new Error("Invalid types for add");
                }
            } else if (bWalked instanceof kn.LLiteral && cWalked instanceof kn.LLiteral) {
                if (typeof bWalked.value === 'number' && typeof cWalked.value === 'number') {
                    return eq(a, kn.makeLiteral(cWalked.value - bWalked.value))(sc);
                }
                if (typeof bWalked.value === 'string' && typeof cWalked.value === 'string') {
                    return eq(a, kn.makeLiteral(cWalked.value.slice(0, bWalked.value.length)))(sc);
                }
                if (typeof bWalked.value === 'number' && typeof cWalked.value === 'string') {
                    return eq(a, kn.makeLiteral(cWalked.value.slice(0, bWalked.value)))(sc);
                }
                if (typeof bWalked.value === 'string' && typeof cWalked.value === 'number') {
                    return eq(a, kn.makeLiteral(cWalked.value - bWalked.value.length))(sc);
                }
                else {
                    throw new Error("Invalid types for add");
                }
            } else {
                throw new Error("Invalid types for add");
            }
        }
    }

type BuiltinRecord = Record<Builtin, LPredicate | LPredicateFn>;
// const defaultPred: LPredicateFn = () => {
//     throw new Error("Not implemented");
// };
const defaultPred: (s: string) => LPredicateFn = (s: string) => () => {
    throw new Error(`${s} Not implemented`);
};
const builtins2: BuiltinRecord = {
    unify: (...args) => {
        if (args.length === 0) throw new Error("Unify needs at least two arguments");
        if (args.length === 1) throw new Error("Unify needs at least two arguments");
        // For each pair of arguments, unify them, then conjunct the unify goals
        const [u, v, ...rest] = args;
        let goal = eq(u, v);
        let curr = v;
        for (let i = 0; i < rest.length; i++) {
            goal = kn.conj(goal, eq(curr, rest[i]));
            curr = rest[i];
        }
        return goal;
    },
    first: (a, l) => {
        return firsto(a, l);
    },
    rest: (r, l) => {
        return resto(l, r);
    },
    cons: (a, b, l) => {
        return eq(l, kn.makePair(a, b));
    },
    set_key_of: (key, obj, val) => {
        throw new Error("Not implemented");
    },
    internal_file: (path) => {
        throw new Error("Not implemented");
    },
    unify_left: defaultPred("unify_left"),
    unify_right: defaultPred("unify_right"),
    unify_equal: defaultPred("unify_equal"),
    unify_not_equal: defaultPred("unify_not_equal"),
    slice: defaultPred("slice"),
    length: defaultPred("length"),
    list: (al, ...l) => {
        return eq(al, kn.makeList(l));
    },
    empty: (l) => {
        return eq(l, kn.makeList([]));
    },
    add: addc,
    subtract: (a, b, c) => {
        return addc(b, c, a);
    },
    multiply: defaultPred("multiply"),
    divide: defaultPred("divide"),
    modulo: defaultPred("modulo"),
    negate: defaultPred("negate"),
    internal_import: defaultPred("internal_import"),
    internal_append: appendo,
    // Maps a string (s) to a list of characters (l)
    string_to_list: string_to_list,
};

const toBuiltinInclusionGoal = () => {
    // For each builtin, create a goal that includes the builtin in the state
    // Then return the conjunction of all the goals
    return kn.all(...Object.entries(builtins2).map(([name, fn]) => {
        return kn.eq(kn.makelvar(name), typeof fn === 'function' ? new LPredicate(name, fn) : fn);
    }));
}

export const builtinGoals = toBuiltinInclusionGoal();