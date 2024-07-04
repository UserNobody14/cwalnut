import {Builtin} from 'src/utils/make_desugared_ast';
import { LPredicate, LPredicateFn, eq } from './kanren';
import * as kn from 'src/interpret/kanren';
const firsto = (a: kn.LTerm, l: kn.LTerm): kn.Goal => {
    console.log('firsto', a, l);
    return kn.call_fresh(
        (v) => kn.eq(kn.makePair(a, v), l)
    );
};
const resto = (l: kn.LTerm, r: kn.LTerm): kn.Goal => {
    console.log('resto', l, r);
    return kn.call_fresh(
        (v) => kn.eq(kn.makePair(v, r), l)
    );
}
type BuiltinRecord = Record<Builtin, LPredicate | LPredicateFn>;
const defaultPred: LPredicateFn = () => {
    throw new Error("Not implemented");
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
    set_key_of: (key, obj, val) => {
        throw new Error("Not implemented");
    },
    internal_file: (path) => {
        throw new Error("Not implemented");
    },
    unify_left: defaultPred,
    unify_right: defaultPred,
    unify_equal: defaultPred,
    unify_not_equal: defaultPred,
    slice: defaultPred,
    length: defaultPred,
    list: (al, ...l) => {
        return eq(al, kn.makeList(l));
    },
    empty: (l) => {
        return eq(l, kn.makeList([]));
    },
    add: defaultPred,
    subtract: defaultPred,
    multiply: defaultPred,
    divide: defaultPred,
    modulo: defaultPred,
    negate: defaultPred,
    internal_import: defaultPred
};

const toBuiltinInclusionGoal = () => {
    // For each builtin, create a goal that includes the builtin in the state
    // Then return the conjunction of all the goals
    return kn.all(...Object.entries(builtins2).map(([name, fn]) => {
        return kn.eq(kn.makelvar(name), typeof fn === 'function' ? new LPredicate(name, fn) : fn);
    }));
}

export const builtinGoals = toBuiltinInclusionGoal();