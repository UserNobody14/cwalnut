import { Map as ImmMap } from 'immutable';


// type Thunk<T> = () => T;
// type Susp = ['susp', unknown, Thunk<Susp>];

// const varThunk = (): Susp => {
//   const s: Susp = ['susp', [], () => s];
//   return s;
// };

// type UnificationPackage = [Substitution, Constraint[]];
// type Substitution = any; // Define the actual type of Substitution
// type Constraint = any; // Define the actual type of Constraint
// type FailureContinuation = (val: boolean) => void;

// // const unify = (u: any, v: any, p: UnificationPackage): UnificationPackage => {
// // //   return callCC((fk: FailureContinuation) => {

// //     const [sigma, _delta] = p;
// //     const newEquation = applySubst(sigma, [u, v]);
// //     const newEquations = [newEquation, ...sigma];
// //     const [newsigma, δ] = applySigmaRules(newEquations, fk);
// //     const updatedδ = applySubst(newsigma, deltaUnion(_delta, δ));
// //     const updated_delta = applyDeltaRules(updatedδ, fk);
// //     return [newsigma, updated_delta];
// // //   });
// // };

// type Eqtns = [Susp, Susp];
// type Smc = Substitution;

// const unify = (eqns: Eqtns, sigma: Smc, nabla: Nbla, fk: Continuation) => {
//     const newEquation = applySubst(sigma, eqns);
//     const newEquations = [newEquation, ...sigma];
//     const [newsigma, delta] = applySigmaRules(newEquations, fk);
//     const updatedDelta = applySubst(newsigma, deltaUnion(nabla, delta));
//     const updatedDelta2 = applyDeltaRules(updatedDelta, fk);
//     return [newsigma, updatedDelta2];
// }

// const applySigmaRules = (equations: Substitution[], fk: FailureContinuation): [Substitution, Constraint] => {
//   if (equations.length === 0) {
//     return [emptySigma, emptyDelta];
//   } else {
//     const [firstEquation, ...restEquations] = equations;
//     const [newEquations, sigma, δ] = oneStep(sigmaRules, [firstEquation, ...restEquations], fk);
//     const [composedsigma, composedδ] = applySigmaRules(newEquations, fk);
//     return [composeSubst(sigma, composedsigma), deltaUnion(composedδ, δ)];
//   }
// };

// const applyDeltaRules = (delta: Constraint[], fk: FailureContinuation): Constraint[] => {
//   if (delta.length === 0) {
//     return emptyDelta;
//   } else {
//     const [newDelta, _delta] = oneStep(deltaRules, delta, fk);
//     return deltaUnion(_delta, applyDeltaRules(newDelta, fk));
//   }
// };

// const oneStep = (rules: (c: Constraint, rest: Constraint[]) => boolean, constraints: Constraint[], fk: FailureContinuation): [Constraint[], Substitution, Constraint] => {
//   const loop = (tried: Constraint[], untried: Constraint[]): [Constraint[], Substitution, Constraint] => {
//     if (untried.length === 0) {
//       fk(false);
//       return [[], emptySigma, emptyDelta];
//     } else {
//       const [constraint, ...restConstraints] = untried;
//       if (rules(constraint, [...tried, ...restConstraints])) {
//         return [[], emptySigma, emptyDelta]; // Assuming this modifies in place or similar
//       } else {
//         return loop([constraint, ...tried], restConstraints);
//       }
//     }
//   };
//   return loop([], constraints);
// };

// // Helper functions
// const callCC = <T>(f: (fk: FailureContinuation) => T): T => {
//     return f((val: boolean) => {
//         if (val) {
//         return;
//         }
//     });
// };

// const applySubst = (subst: Substitution, term: any): any => {
//   // Placeholder for actual implementation
//   return term;
// };

// const deltaUnion = (a: Constraint[], b: Constraint[]): Constraint[] => {
//   // Placeholder for actual implementation
//   return [...a, ...b];
// };

// const composeSubst = (a: Substitution, b: Substitution): Substitution => {
//   // Placeholder for actual implementation
//   return a;
// };

// const emptySigma: Substitution = [];
// const emptyDelta: Constraint[] = [];
// const emptyConjunction: Constraint[] = [];

// // Placeholder rules functions
// const sigmaRules = (c: Constraint, rest: Constraint[]): boolean => {
//   // Placeholder for actual implementation
//   return false;
// };

// const deltaRules = (c: Constraint, rest: Constraint[]): boolean => {
//   // Placeholder for actual implementation
//   return false;
// };

// // Usage
// const [u, v] = [varThunk(), varThunk()];
// const pkg: UnificationPackage = [emptySigma, emptyConjunction];
// const result = unify(u, v, pkg);
// console.log(result);


type Name = {
    type: 'name';
    symb: string;
};

type LVar = {
    type: 'lvar';
    symb: string;
};

const isConstant = (x: null | string | number | boolean) => {
    return typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean' || x === null;
}

type Literal = null | string | number | boolean;

type Tie = {
    type: 'tie';
    name: Name;
    term: Term;
};

type Term = LVar | Literal | Tie | Name | [Term, Term];

type Scope = {
    type: 'scope';
    nameToLevel: ImmMap<string, number>;
    levelToName: ImmMap<number, Name>;
};

type Substitution = ImmMap<string, Term>;

type FEnv = ImmMap<string, [Name, Scope][]>;
type FEnv2 = ImmMap<string, Term[]>;

type State = {
    inc: number;
    sigma: Substitution;
    chi: Partition;
    fenv: FEnv;
    fenv2: FEnv2;
};

type Partition = ImmMap<string, [Scope, Scope, LVar][]>;

// function showScope(scope: Scope): Name[] {
//     return scope.levelToName.toArray().map(([level, name]) => {
//         return { type: 'name', symb: name };
//     });
// }

function eqvTerms(t1: Term, t2: Term): boolean {
    if (constant(t1) && constant(t2)) return t1 === t2;
    if (isName(t1) && isName(t2)) return t1.symb === t2.symb;
    if (isLVar(t1) && isLVar(t2)) return t1.symb === t2.symb;
    if (Array.isArray(t1) && Array.isArray(t2)) {
        return eqvTerms(t1[0], t2[0]) && eqvTerms(t1[1], t2[1]);
    }
    if (isTie(t1) && isTie(t2)) {
        return false;
    }
    console.warn('eqvTerms: Unhandled case', t1, t2);
    return false;
}

function emptyScope(s: Scope): boolean {
    return s.levelToName.size === 0;
}

function initScope(): Scope {
    return {
        type: 'scope',
        nameToLevel: ImmMap(),
        levelToName: ImmMap(),
    };
}


function constant(x: any): boolean {
    return typeof x === "symbol" || typeof x === "boolean" || typeof x === "number" || typeof x === "string" || x === null;
}

//   function initScope(): Scope {
//     return {
//       nameToLevel: new Map(),
//       levelToName: new Map(),
//     };
//   }

function showScope(phi: Scope): Name[] {
    const levelToName = phi.levelToName;
    const loop = (n: number): Name[] => {
        if (n === 0) return [];
        const name = levelToName.get(n - 1);
        return name ? [name, ...loop(n - 1)] : loop(n - 1);
    };
    return loop(levelToName.size);
}

//   function emptyScope(phi: Scope): boolean {
//     return phi.levelToName.size === 0;
//   }

function extScp(phi: Scope, n: Name): Scope {
    const l = phi.nameToLevel.size;
    const newScope = initScope();
    newScope.nameToLevel = phi.nameToLevel.set(n.symb, l);
    newScope.levelToName = phi.levelToName.set(l, n);
    // newScope.nameToLevel.set(n, l);
    // newScope.levelToName.set(l, n);
    return newScope;
}

function bound(phi: Scope, n: Name): number | false {
    return phi.nameToLevel.get(n.symb) ?? false;
}

function free(phi: Scope, n: Name): boolean {
    return !bound(phi, n);
}

function makeName(s: string, uniq = false): Name {
    if (uniq) {
        return { type: 'name', symb: `_${s}_${Math.random().toString(36).substring(7)}` };
    }
    return { type: 'name', symb: s };
};

function makeLvar (s?: string): LVar {
    if (!s) s = `_${Math.random().toString(36).substring(7)}`;
    return { type: 'lvar', symb: s };
}

function findName(phi: Scope, l: number): Name | false {
    const n = phi.levelToName.get(l);
    return n && bound(phi, n) === l ? n : false;
}

function sameName(phi1: Scope, n1: Name, phi2: Scope, n2: Name): boolean {
    const l1 = bound(phi1, n1);
    const l2 = bound(phi2, n2);
    return l1 !== false && l2 !== false && l1 === l2;
}

function isName(t: any): t is Name {
    return typeof t === 'object' && 'type' in t && t.type === 'name';
}

function isTie(t: any): t is Tie {
    return typeof t === 'object' && 'type' in t && t.type === 'tie';
}

function isLVar(t: any): t is LVar {
    return typeof t === 'object' && 'type' in t && t.type === 'lvar';
}

function freeIn(n: Name, t: Term, phi: Scope, fenv: FEnv): FEnv | boolean {
    if (constant(t)) return false;
    if (isName(t)) return t.symb === n.symb;
    if (isTie(t)) {
        if (eqvTerms(t.name,n)) return false;
        return freeIn(n, t.term, extScp(phi, t.name), fenv);
    }
    if (Array.isArray(t)) {
        const r = freeIn(n, t[0], phi, fenv);
        if (!r) return freeIn(n, t[1], phi, fenv);
        if (r === true) return true;
        return freeIn(n, t[1], phi, r);
    }
    if (isLVar(t)) {
        return extFenv(fenv, t, n, phi);
    }
    return false;
}

type Streamof<A> = null | [A, Streamof<A>] | (() => Streamof<A>);
type Goal = (state: State) => Streamof<State>;

// Succeed and Fail Goals
const succeed: Goal = (s) => [s, null];
const fail: Goal = (s) => null;

// Merge Streams
function $merge<A>($1: Streamof<A>, $2: Streamof<A>): Streamof<A> {
  if ($1 === null) return $2;
  if (Array.isArray($1)) return [$1[0], $merge($1[1], $2)];
  return () => $merge($2, $1());
}

// Merge Map Streams
function $mergeMap<A>(f: (a: A) => Streamof<A>, $: Streamof<A>): Streamof<A> {
  if ($ === null) return null;
  if (Array.isArray($)) return $merge(f($[0]), $mergeMap(f, $[1]));
  return () => $mergeMap(f, $());
}

// Take elements from Stream
function $take<A>(i: number, $: Streamof<A>): A[] {
  if (i === 0 || $ === null) return [];
  if (Array.isArray($)) return [$[0], ...$take(i - 1, $[1])];
  return $take(i, $());
}

// Disjunction of Goals
function disj2(g1: Goal, g2: Goal): Goal {
  return (S) => $merge(g1(S), g2(S));
}

// Conjunction of Goals
function conj2(g1: Goal, g2: Goal): Goal {
  return (S) => $mergeMap(g2, g1(S));
}

// type Goal = (state: State) => State[];

function availableo(n: Term, t: Term): Goal {
    return (state): Streamof<State> => {
        const { sigma, chi, fenv, fenv2, inc } = state;
        n = walk(sigma, n);
        t = walk(sigma, t);
        if (isName(n)) {
            const r = freeIn(n, t, initScope(), fenv);
            if (!r) return [{ sigma, chi, fenv, fenv2, inc}, null];
            if (r === true) return null;
            return [{ sigma, chi, fenv: r, fenv2, inc }, null];
        }
        if (isLVar(n)) {
            const ls = fenv2.get(n.symb) ?? [];
            return [{ sigma, chi, fenv, inc, fenv2: fenv2.set(n.symb, [t, ...ls]) }, null];
        }
        return null;
    };
}

function walk(s: Substitution, t: Term): Term {
    if (isLVar(t) && s.has(t.symb)) {
        return walk(s, s.get(t.symb) as Term);
    } else return t;
}

function extFenv(fenv: FEnv, t: LVar, n: Name, phi: Scope): FEnv | false {
    const l = bound(phi, n);
    if (l === false) return false;
    const ls = fenv.get(t.symb) ?? [];
    return fenv.set(t.symb, [[n, phi], ...ls]);
}


const availableoAlias = availableo;

function walkStar(sigma: Substitution, t: Term): Term {
    t = walk(sigma, t);
    if (Array.isArray(t)) {
      return [walkStar(sigma, t[0]), walkStar(sigma, t[1])];
    } else if (isTie(t)) {
      const tie = t;
      return {
        type: "tie", 
        name: tie.name, term: walkStar(sigma, tie.term) };
    }
    return t;
  }
  
  function reifyS(sigma: Substitution, t: Term): Substitution {
    t = walk(sigma, t);
    if (isLVar(t)) {
      const n = sigma.size;
      const rn = makeLvar(`_${n}`);
      return sigma.set(t.symb, rn);
    } else if (Array.isArray(t)) {
      const newSigma = reifyS(sigma, t[0]);
      return reifyS(newSigma, t[1]);
    } else if (isTie(t)) {
      return reifyS(sigma, t.term);
    }
    return sigma;
  }
  
  function reify(t: Term): (state: State) => Term {
    return (state) => {
      const { sigma, chi, fenv, fenv2 } = state;
      const newTerm = walkStar(sigma, t);
      const names = reifyS(ImmMap(), newTerm);
      return walkStar(names, newTerm);
    };
  }
  
  function callFresh(symb: string, f: (n: Name) => Goal): Goal {
    return f({ type: "name", symb });
  }
  
  function callExist(symb: string, f: (v: LVar) => Goal): Goal {
    return f({ type:"lvar", symb });
  }

  function exist(f: (v: LVar) => Goal): Goal {
    return (st) => {
        const { sigma, chi, fenv, fenv2, inc } = st;
        const n = makeLvar(`_${inc}`);
        return f(n)({ sigma, chi, fenv, fenv2, inc: inc + 1 });
    };
  };

  function fresh(f: (n: Name) => Goal): Goal {
    return (st) => {
        const { sigma, chi, fenv, fenv2, inc } = st;
        const n = makeName(`_${inc}`);
        return f(n)({ sigma, chi, fenv, fenv2, inc: inc + 1 });
    };
  };

  function fresh2(f: (n1: Name, n2: Name) => Goal): Goal {
    return fresh((n1) => fresh((n2) => f(n1, n2)));
  }

  function fresh3(f: (n1: Name, n2: Name, n3: Name) => Goal): Goal {
    return fresh((n1) => fresh2((n2, n3) => f(n1, n2, n3)));
  }

  function exist2(f: (v1: LVar, v2: LVar) => Goal): Goal {
    return exist((v1) => exist((v2) => f(v1, v2)));
  }
  function exist3(f: (v1: LVar, v2: LVar, v3: LVar) => Goal): Goal {
    return exist((v1) => exist2((v2, v3) => f(v1, v2, v3)));
  }
    function exist4(f: (v1: LVar, v2: LVar, v3: LVar, v4: LVar) => Goal): Goal {
        return exist((v1) => exist3((v2, v3, v4) => f(v1, v2, v3, v4)));
    }
  
  function initState(): State {
    return {
        sigma: ImmMap(),
        chi: ImmMap(),
        inc: 0,
        fenv: ImmMap(),
        fenv2: ImmMap(),
    };
  }
  
  function runGoal(i: number, g: Goal): State[] {
    return $take(i, g(initState()));
  }

  function projectRun(i: number, vs: LVar[], g: Goal): Term[][] {
    return runGoal(i, g).map((s) => vs.map((v) => walkStar(s.sigma, v)));
  }

  function run(i: number, vs: string[], g: Goal): {[key: string]: string}[] {
    return projectRun(i, vs.map(makeLvar), g).map((row) => {
        const obj: {[key: string]: string} = {};
        vs.forEach((v, i) => {
            obj[v] = lstringify(row[i]);
        });
        return obj;
    });
  }

//   function take<T>(i: number, $: Streamof<T>): T[] {
//     if (i === 0 || $ === null) return [];
//     if (Array.isArray($)) return [$[0], ...take(i - 1, $[1])];
//     return take(i, $());
//   }
  
function genName(phi1: Scope, n1: Name, phi2: Scope): Name | false {
    const l1 = bound(phi1, n1);
    if (l1 !== false) {
        const n2 = findName(phi2, l1);
        return n2 ? n2 : false;
    } else if (free(phi1, n1)) {
        return n1;
    } else {
        return false;
    }
}

type UnifOut = [Substitution, Partition, LVar[]];
  
function unif(
    phi1: Scope,
    t1: Term,
    phi2: Scope,
    t2: Term,
    sigma: Substitution,
    chi: Partition,
    xs: LVar[]
  ): UnifOut | false {
    t1 = walk(sigma, t1);
    t2 = walk(sigma, t2);
  
    if (emptyScope(phi1)) {
      // First-order case
      if (t1 === t2) return [sigma, chi, xs];
      if (isLVar(t1)) return [extSubst(sigma, t1, t2), chi, [t1, ...xs]];
      if (isLVar(t2)) return [extSubst(sigma, t2, t1), chi, [t2, ...xs]];
      if (Array.isArray(t1) && Array.isArray(t2)) {
        const result = unif(phi1, t1[0], phi2, t2[0], sigma, chi, xs);
        // if (!result) return false;
        if (!result) {
            // console.log("IssueQ! SCOPE!", t1, t2);
            return false;
        }
        return unif(phi1, t1[1], phi2, t2[1], result[0], result[1], result[2]);
      }
      if (isTie(t1) && isTie(t2)) {
        return unif(
          extScp(phi1, t1.name),
          t1.term,
          extScp(phi2, t2.name),
          t2.term,
          sigma,
          chi,
          xs
        );
      }
      if (isLVar(t1) && isTie(t2)) {
        const n1 = makeName(t2.name.symb, true);
        const v1 = makeLvar();
        return unif(
          extScp(phi1, n1),
          v1,
          extScp(phi2, t2.name),
          t2.term,
          extSubst(sigma, t1, {
            type: "tie", 
            name: n1, term: v1 }),
          chi,
          xs
        );
      }
      if (isTie(t1) && isLVar(t2)) {
        const n2 = makeName(t1.name.symb, true);
        const v2 = makeLvar();
        return unif(
          extScp(phi1, t1.name),
          t1.term,
          extScp(phi2, n2),
          v2,
          extSubst(sigma, t2, { 
            type: "tie",
            name: n2, term: v2 }),
          chi,
          xs
        );
      }
    //   console.log("FallbackQ1111!", t1, t2);
      return false;
    }
  
    // Higher-order case
    if (constant(t1) && constant(t2)) {

      return t1 === t2 ? [sigma, chi, xs] : false;
    }
    if (constant(t1) && isLVar(t2)) {
      return [extSubst(sigma, t2, t1), chi, [t2, ...xs]];
    }
    if (isLVar(t1) && constant(t2)) {
      return [extSubst(sigma, t1, t2), chi, [t1, ...xs]];
    }
    if (isLVar(t1) && isLVar(t2)) {
      return [sigma, extPar(chi, phi1, t1, phi2, t2), xs];
    }
    if (isName(t1) && isName(t2)) {
      return sameName(phi1, t1, phi2, t2) ? [sigma, chi, xs] : false;
    }
    if (isName(t1) && isLVar(t2)) {
      const n2 = genName(phi1, t1, phi2);
      if (!n2) {
        // console.log("IssueQName!", t1, t2);
        return false;
      }
      return n2 ? [extSubst(sigma, t2, n2), chi, [t2, ...xs]] : false;
    }
    if (isLVar(t1) && isName(t2)) {
      const n1 = genName(phi2, t2, phi1);
      if (!n1) {
        // console.log("IssueQName!", t1, t2);
        return false;
      }
      return n1 ? [extSubst(sigma, t1, n1), chi, [t1, ...xs]] : false;
    }
    if (isTie(t1) && isTie(t2)) {
      return unif(
        extScp(phi1, t1.name),
        t1.term,
        extScp(phi2, t2.name),
        t2.term,
        sigma,
        chi,
        xs
      );
    }
    if (Array.isArray(t1) && Array.isArray(t2)) {
      const result = unif(phi1, t1[0], phi2, t2[0], sigma, chi, xs);
      if (!result) {
        // console.log("\nIssueQ!", t1, t2);
        return false;
      }
      return unif(phi1, t1[1], phi2, t2[1], result[0], result[1], result[2]);
    }
    if (isLVar(t1) && Array.isArray(t2)) {
      const v1 = makeLvar();
      const v2 = makeLvar();
      const result = unif(
        phi1,
        v1,
        phi2,
        t2[0],
        extSubst(sigma, t1, [v1, v2]),
        chi,
        xs
      );
      
      if (!result) {
        // console.log("\nIssueQ!", t1, t2);
        return false;
      }
      return unif(phi1, v2, phi2, t2[1], result[0], result[1], result[2]);
    }
    if (Array.isArray(t1) && isLVar(t2)) {
      const v1 = makeLvar();
      const v2 = makeLvar();
      const result = unif(
        phi1,
        t1[0],
        phi2,
        v1,
        extSubst(sigma, t2, [v1, v2]),
        chi,
        xs
      );
    //   if (!result) return false;
      if (!result) {
        // console.log("\nIssueQ!", t1, t2);
        return false;
      }
      return unif(phi1, t1[1], phi2, v2, result[0], result[1], result[2]);
    }
    // console.log("FallbackQ2!", t1, t2, constant(t1), isLVar(t2));

    return false;
  }

  function refine(xs: LVar[], sigma: Substitution, chi: Partition): UnifOut | false {
    if (xs.length === 0) return [sigma, chi, xs];
    if (chi.size === 0) return [sigma, chi, xs];

    const [x, ...xss] = xs;
    const t = sigma.get(x.symb);
    const slice = chi.get(x.symb) ?? [];
    const nm = unifAll(t, slice, xss, sigma, chi.delete(x.symb));
    if (!nm) return false;
    return refine(nm[2], nm[0], nm[1]);
  }

  function unifAll(
    t: Term | undefined,
    slice: [Scope, Scope, LVar][],
    xs: LVar[],
    sigma: Substitution,
    chi: Partition
  ): UnifOut | false {
    if (!t) return false;
    if (slice.length === 0) return [sigma, chi, xs];
    const [phi1, phi2, y] = slice[0];
    const result = unif(initScope(), t, phi1, y, sigma, chi, xs);
    if (!result) return false;
    return unifAll(result[0].get(y.symb), slice.slice(1), result[2], result[0], result[1]);
  }

  function unify (
    phi1: Scope,
    t1: Term,
    phi2: Scope,
    t2: Term,
    sigma: Substitution,
    chi: Partition
  ): UnifOut | false {
    const result = unif(phi1, t1, phi2, t2, sigma, chi, []);
    // if (!result) {
    //     console.log("IssueQ!", t1, t2);
    // }
    if (!result) return false;
    const refined = refine(result[2], result[0], result[1]);
    if (!refined) return false;
    return [refined[0], refined[1], result[2]];
  }
  
  function extSubst(sigma: Substitution, x: LVar, t: Term): Substitution {
    return sigma.set(x.symb, t);
  }

  function extPar(
    chi: Partition,
    phi1: Scope,
    x: LVar,
    phi2: Scope,
    y: LVar
  ): Partition {
    const ls1 = chi.get(x.symb) ?? [];
    const ls2 = chi.get(y.symb) ?? [];
    return chi
      .set(x.symb, [[phi1, phi2, y], ...ls1])
      .set(y.symb, [[phi1, phi2, x], ...ls2]);
    // const l1 = bound(phi1, x);
    // const l2 = bound(phi2, y);
    // if (l1 === false || l2 === false) return chi;
    // const [phi1a, phi1b, xHat] = chi.get(x) ?? [initScope(), initScope(), x];
    // const [phi2a, phi2b, yHat] = chi.get(y) ?? [initScope(), initScope(), y];
    // const newChi = chi
    //   .set(x, [extScp(phi1a, xHat), extScp(phi2a, yHat), xHat])
    //   .set(y, [extScp(phi1b, xHat), extScp(phi2b, yHat), yHat]);
    // return newChi;
  }
  
  function validateFenv(xs: LVar[], sigma: Substitution, fenv: FEnv): FEnv | false {
    if (xs.length === 0) return fenv;
    const [x, ...rest] = xs;
    const ls = fenv.get(x.symb);
    if (ls) {
      const newFenv = validateFenvEach(sigma.get(x.symb), ls, fenv);
      if (newFenv) return validateFenv(rest, sigma, newFenv);
      return false;
    }
    return validateFenv(rest, sigma, fenv);
  }
  
  function validateFenvEach(t: Term | undefined, prs: [Name, Scope][], fenv: FEnv): FEnv | false {
    if (!t) {
        console.warn('validateFenvEach: t is undefined');
        return false;
    }
    for (const [n, phi] of prs) {
      const r = freeIn(n, t, phi, fenv);
      if (r) {
        if (r === true) return false;
        fenv = r;
      }
    }
    return fenv;
  }
  
  function validateFenv2(xs: LVar[], sigma: Substitution, fenv: FEnv, fenv2: FEnv2): [FEnv, FEnv2] | false {
    if (xs.length === 0) return [fenv, fenv2];
    const [x, ...rest] = xs;
    const ls = fenv2.get(x.symb);
    if (ls) {
      const n = sigma.get(x.symb);
      if (n) {
        if (isName(n) && n.symb) {
          const newFenv = validateFenv2Each(n, ls, fenv);
          if (newFenv) return validateFenv2(rest, sigma, newFenv, fenv2.delete(x.symb));
          return false;
        } else if (isLVar(n) && n.symb) {
          return validateFenv2(rest, sigma, fenv, fenv2);
        }
      }
    }
    return validateFenv2(rest, sigma, fenv, fenv2);
  }
  
  function validateFenv2Each(n: Name, ts: Term[], fenv: FEnv): FEnv | false {
    for (const t of ts) {
      const r = freeIn(n, t, initScope(), fenv);
      if (r) {
        if (r === true) return false;
        fenv = r;
      }
    }
    return fenv;
  }
  
  function equals(t1: Term, t2: Term): Goal {
    // return unifier(unify, [t1, t2])
    return (state): Streamof<State> => {
      const { sigma, chi, fenv, fenv2, inc } = state;
      const result = unify(initScope(), t1, initScope(), t2, sigma, chi);
      if (result) {
        const [newSigma, newChi, xs] = result;
        const newFenv = validateFenv(xs, newSigma, fenv);
        if (newFenv) {
          const fenv2Validation = validateFenv2(xs, newSigma, newFenv, fenv2);
          if (fenv2Validation) {
            const [validatedFenv, validatedFenv2] = fenv2Validation;
            return [{ sigma: newSigma, chi: newChi, inc, fenv: validatedFenv, fenv2: validatedFenv2 }, null];
          }
        }
      }
      console.warn('equals: Unification failed1', reifyString(t1, state), reifyString(t2, state));
      return null;
    };
  }

  const reifyString = (t: Term, s: State): string => {
    return lstringify(reify(t)(s));
  }

  // Stringifies logic term
  const lstringify = (t: Term): string => {
    if (isName(t)) return `$${t.symb}`;
    if (isLVar(t)) return `__${t.symb}`;
    if (isTie(t)) return `tie(${lstringify(t.name)}, ${lstringify(t.term)})`;
    if (Array.isArray(t)) return `[${lstringify(t[0])}, ${lstringify(t[1])}]`;
    return JSON.stringify(t);
  }

  const conj = (...g: Goal[]): Goal => {
    if (g.length === 0) return fail;
    if (g.length === 1) return g[0];
    return g.reduce((acc, goal) => conj2(acc, goal));
  }

  const disj = (...g: Goal[]): Goal => {
    if (g.length === 0) return fail;
    if (g.length === 1) return g[0];
    return g.reduce((acc, goal) => disj2(acc, goal));
  };


  const makeTie = (n: Name, t: Term): Term => {
    return { type: "tie", name: n, term: t };
  };

  //////
  // Verify

  const qvar = (t: Term): [Term, Term] => {
    return ["var", t];
  }
  const qapp = (rator: Term, rand: Term): [Term, [Term, Term]] => {
    return ["app", [rator, rand]];
  }

//   const qlam = (n: Term, body: Term): [Term, [Term, Term]] => {
//     return ["lam", [n, body]];
//   };

  const qlam = (body: Term): [Term, Term] => {
    return ["lam", body];
  };

  const rename = (e: Term, nnew: Term, a: Term, out: Term): Goal => {
    return disj(
        conj(
            equals(qvar(a), e),
            equals(qvar(nnew), out)
        ),
        exist((y) => {
            return conj(
                equals(qvar(y), e),
                equals(qvar(y), out),
                availableoAlias(a, y),
            );
        }),
        exist4((rator, rand, ratoro, rando) => {
            return conj(
                equals(qapp(rator, rand), e),
                equals(qapp(ratoro, rando), out),
                rename(rator, nnew, a, ratoro),
                rename(rand, nnew, a, rando),
            );
        }),
        exist3(
            (body, r, bodyo) => {
                return fresh2((c, cHat) => {
                    return conj(
                        equals(makeTie(c, body), e),
                        rename(body, cHat, c, r),
                        rename(r, nnew, a, bodyo),
                        equals(makeTie(cHat, bodyo), out),
                    )
                })
            }
        )
    );
  };

  function subst(e: Term, nnew: Term, a: Term, out: Term): Goal {
    return disj(
        conj(
            equals(qvar(a), e),
            equals(nnew, out),
        ),
        exist((y) => {
            return conj(
                equals(qvar(y), e),
                equals(qvar(y), out),
                availableoAlias(a, y),
            );
        }),
        exist4((rator, rand, ratoro, rando) => {
            return conj(
                equals(qapp(rator, rand), e),
                equals(qapp(ratoro, rando), out),
                rename(rator, nnew, a, ratoro),
                rename(rand, nnew, a, rando),
            );
        }),
        exist3((body, r, bodyo) => {
            return fresh2((c, cHat) => {
                return conj(
                    equals(makeTie(c, body), e),
                    rename(body, cHat, c, r),
                    subst(r, nnew, a, bodyo),
                    equals(makeTie(cHat, bodyo), out),
                );
            });
        }),
    );
  };

  const ooo = run(100,
    ["q"],
    fresh2((a, b) => {
        return rename(
            makeTie(a, 
                qapp(
                    qvar(b),
                    qvar(a)
                )
            ),
            b,
            a,
            makeLvar("q")
        )
    })
  );

  console.log(ooo);

  const ooo2 = run(10,
    ["q"],
    fresh2((a, b) => {
        return subst(
            makeTie(a, 
                qapp(
                    qvar(a),
                    qvar(b)
                )
            ),
            qvar(b),
            a,
            makeLvar("q")
        )
    })
  );

  console.log(ooo2);


//   const ooo3 = runGoal(1,
//     exist((q) => {
//         return fresh3((a, b, c) => {
//             return equals(
//                 qlam(
//                     makeTie(a, qapp(qvar(a), qvar(b))),
//                 ),
//                 qlam(
//                     makeTie(c, q),
//                 )
//             )
//         });
//     })
//   );

  const ooo3 = run(1,
    ["q"],
    fresh3((a, b, c) => {
            return equals(
                qlam(
                    makeTie(a, qapp(qvar(a), qvar(b))),
                ),
                qlam(
                    makeTie(c, makeLvar('q')),
                )
            )
        })
  );

  console.log(ooo3);


  const ooo4 = run(1,
    ["q"],
    fresh3((a, g, c) => {
            return conj(
                equals(
                    qlam(
                        makeTie(g, qapp(qvar(g), qvar(g))),
                    ),
                    makeLvar("q")
                ),
                
                equals(
                qlam(
                    makeTie(a, qapp(qvar(a), qvar(a))),
                ),
                makeLvar("q")
            )
        )
        })
  );

  console.log(ooo4);