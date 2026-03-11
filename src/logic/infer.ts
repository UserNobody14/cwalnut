

import { all, either, eq } from ".";
import { fresh, fresh2, fresh3, fresh4, fresh5, fresh6, freshNom } from "./AnyFreshFn";
import { availableo, hash } from "./availableo";
import { makeEmpty, makeList, makeList2, makeLiteral, makePair, makeTie } from "./makelvar";
import type { MGoal } from "./streams";
import { type LNom, LTerm } from "./terms";
import { lamTie, qapp, qlam, qvar } from "./testutils";
import type { CleanOutput } from "./types";

/**
 * Lookup:
 * (define lookup o
(λ (x tx g)
(exist (a d )
(≡ ‘(,a . ,d ) g)
(conde
((≡ ‘(,x . ,tx ) a))
((exist (ˆx tˆx)
(≡ ‘(,ˆx . ,tˆx) a)
(# x ˆx)
(lookup o x tx d )))))))
 */

/**
 * 
 * @param x Variable nominal
 * @param tx 
 * @param g 
 * @returns 
 */
export function lookupo(x: LTerm, tx: LTerm, g: LTerm): MGoal {
    return fresh2(
        (a, d) => all(
            eq(makePair(a, d), g),
            either(
                eq(makePair(x, tx), a),
                fresh4(
                    (xHat, txHat) => all(
                        eq(makePair(xHat, txHat), a),
                        hash(x, xHat),
                        lookupo(x, tx, d)
                    )
                )
            )
        )
    );
}


/**
 * 
Type Inferencer for Simply Typed λ-calculus
Let us consider a second non-trivial αKanren example: a
type inferencer for the simply typed λ-calculus (also adapted
from Cheney and Urban 2004). typ o relates a λ-calculus
term e to its type te in type environment g.
(define typ o
(λ (g e te)
(conde
((exist (x )
(≡ ‘(var ,x ) e)
(lookup o x te g)))
((exist (rator trator rand trand )
(≡ ‘(app ,rator ,rand ) e)
(≡ ‘(→ ,trand ,te) trator )
(typ o g rator trator )
(typ o g rand trand )))
((exist (ˆe tˆe trand ˆg)
(fresh (b)
(≡ ‘(lam ,(./ b ˆe)) e)
(≡ ‘(→ ,trand ,tˆe) te)
(# b g)
(≡ ‘((,b . ,trand ) . ,g) ˆg)
(typ o ˆg ˆe tˆe)))))))
 */
/**
 * Type infrerencer for simply typed λ-calculus
 * @param g Type environment
 * @param e Lambda calculus term
 * @param te Lambda calculus type
 * @returns Goal
 */
// export function typeo(g: LTerm, e: LTerm, te: LTerm): MGoal {
//     return either(
//         all(
//             fresh(
//                 (x) => all(
//                     eq(makePair(makeLiteral("var"), x), e),
//                     lookupo(x, te, g)
//                 )
//             ),
//             fresh4(
//                 (rator, trator, rand, trand) => all(
//                     eq(makePair(makeLiteral("app"), makePair(rator, rand)), e),
//                     eq(makePair(makeLiteral("→"), makePair(trand, te)), trator),
//                     typeo(g, rator, trator),
//                     typeo(g, rand, trand)
//                 )
//             ),
//             fresh4(
//                 (eHat, tHat, trand, gHat) => all(
//                     freshNom(
//                         (b) => all(
//                             eq(makePair(makeLiteral("lam"), makeTie(b, eHat)), e),
//                             eq(makePair(makeLiteral("→"), makePair(trand, tHat)), te),
//                             availableo(b, g),
//                             eq(makePair(makePair(b, trand), gHat), gHat),
//                             typeo(gHat, eHat, tHat)
//                         )
//                     )
//                 )
//             )
//         ),
//     );
// }

/**
 *         [exist((x) => eq(['var', x], e), lookupo(x, te, g))],
        [exist((rator, trator, rand, trand) =>
            eq(['app', rator, rand], e) &&
            eq(['→', trand, te], trator) &&
            typeo(g, rator, trator) &&
            typeo(g, rand, trand),
        )],
        [exist((e, t, trand, g) =>
            fresh((b) =>
                eq(['lam', ['/', b, e]], e) &&
                eq(['→', trand, t], te) &&
                b(g) &&
                eq([[b, trand], g], g) &&
                typeo(g, e, t),
            ),
        )],
 */







/**
 * (define typo
  (lambda (g e te)
    (conde
      ((exists (x)
         (== `(var ,x) e)
         (lookupo x te g)))
      ((exists (rator trator rand trand)
         (== `(app ,rator ,rand) e)
         (== `(-> ,trand ,te) trator)
         (typo g rator trator)
         (typo g rand trand)))
      ((exists (e^ te^ trand g^)
         (fresh (b)
           (== `(lam ,(tie b e^)) e)
           (== `(-> ,trand ,te^) te)
           (hash b g)
           (== `((,b . ,trand) . ,g) g^)
           (typo g^ e^ te^))))
      ((exists (rator t-val)
         (== `(C ,rator) e)
         (typo g rator `(-> (-> ,te ,t-val) ,t-val)))))))
 */

export const qtyping = (t1: LTerm, t2: LTerm) => makeList([makeLiteral("->"), makeList([t1, t2])]);
export const qmc = (t1: LTerm) => makeList([makeLiteral("C"), t1]);
export const qcleanOutput = (t1: LTerm | CleanOutput): CleanOutput => {
    return t1 instanceof LTerm ? t1.cleanOutput() : t1;
}
export const qtyping2 = (t1: LTerm | CleanOutput, t2: LTerm | CleanOutput): CleanOutput => {
    return ["->", [qcleanOutput(t1), qcleanOutput(t2)]];
}

export function typo(g: LTerm, e: LTerm, te: LTerm): MGoal {
    return all(
        either(
            fresh(
                (x) => all(
                    eq(qvar(x), e),
                    lookupo(x, te, g)
                )
            ),
            fresh4(
                (rator, trator, rand, trand) => all(
                    eq(qapp(rator, rand), e),
                    eq(qtyping(trand, te), trator),
                    typo(g, rator, trator),
                    typo(g, rand, trand)
                )
            ),
            fresh4(
                (eHat, tHat, trand, gHat) => all(
                    freshNom(
                        (b) => all(
                            // eq(makePair(makeLiteral("lam"), makeTie(b, eHat)), e),
                            // eq(makePair(makeLiteral("→"), makePair(trand, tHat)), te),
                            eq(lamTie(b, eHat), e),
                            eq(qtyping(trand, tHat), te),
                            availableo(b, g),
                            eq(makePair(makePair(b, trand), g), gHat),
                            typo(gHat, eHat, tHat)
                        )
                    )
                )
            ),
            fresh2(
                (rator, tVal) => all(
                    // eq(makePair(makeLiteral("C"), rator), e),
                    eq(qmc(rator), e),
                    // typo(g, rator, makePair(makePair(makeLiteral("→"), makePair(te, tVal)), tVal))
                    typo(g, rator, qtyping(qtyping(te, tVal), tVal))
                )
            )
        )
    );
}


// type/mode inference for mercury-like program

// A pred application in the actual program
export const qpredApp = (n: LTerm, ...r: LTerm[]): LTerm => {
    return makeList([makeLiteral("pred"), n, makeList(r)])
}

// A pred application in the actual program
export const qpredAppI = (n: LTerm, r: LTerm): LTerm => {
    return makeList([makeLiteral("pred"), n, r])
}

// A chunk of a pred definition, referring to only one set of modes for the given inputs
export const qpredDef1 = (modeList: LTerm, det: LTerm, def: LTerm) => {
    return makeList([makeLiteral("def1"), modeList, det, def])
}

// A pred definition, either inferred or specified in the actual program
export const qpredDef = (...def1s: LTerm[]) => {
    return makeList([makeLiteral("def"), makeList(def1s)])
}

// A pred definition, either inferred or specified in the actual program
export const qpredDefI = (def1s: LTerm) => {
    return makeList([makeLiteral("def"), def1s])
}

// A "mode", specifying the state (st1) a variable was in before, and the state (st2) that it will be in for the future
export const qmode = (st1: LTerm, st2: LTerm) => {
    return makeList([makeLiteral("mode"), st1, st2]);
}

// A "fresh" declaration that makes a variable available within its context
const qfresh = (fr: LNom, ...predApps: LTerm[]) => {
    return makeList([makeLiteral("fresh"), makeTie(fr, makeList(predApps))]);
}

// A "disjunction" branch that splits its terms(?)
export const qdisj = (...terms: LTerm[]) => {
    return makeList([makeLiteral("disj"), makeList(terms)]);
}

// A "disjunction" branch that splits its terms(?)
export const qdisj1 = (terms: LTerm) => {
    return makeList([makeLiteral("disj"), terms]);
}

// Lookup a definition in a list of def1s
// export function lookupDef1s(predName: LTerm, def1s: LTerm, outDef: LTerm): MGoal {
//     return fresh3(
//         (modeList, det, def) => all(
//             eq(qpredDef1(modeList, det, def), outDef),
//             eq(qpredDef(modeList, def), outDef)
//         )
//     );
// }

// Lookup a predicate definition in the pred definition list
export function lookupPredDef(predName: LTerm, predDefs: LTerm, outDef: LTerm): MGoal {
    return fresh3(
        (def1s) => all(
            eq(qpredDefI(def1s), predDefs),
            // TODO: must fix
            lookupo(predName, 
                outDef, def1s)
        )
    );
}

// export function applyMode(vr: LTerm, mode: LTerm, stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
//     return fresh2(
//         (st1, st2) => all(
//             eq(qmode(st1, st2), mode),
//             either(
//                 all(
//                     lookupo(vr, st1, stateLookupBefore),
//                     lookupo(vr, st2, stateLookupAfter)
//                 ),
//                 all(
//                     hash(vr, st1),
//                     eq(makePair(vr, st2), stateLookupAfter)
//                 )
//             )
//         )
//     );
// }

// Lookup the modes in the lookup table
export function findModes(modes: LTerm, ovars: LTerm, stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
    // Go down the list of ovars, for each one, find the state it was in before, then in stateLookupAfter, replace it, based on the mode
    return either(
        // If there are no ovars, then we're done
        all(
            eq(ovars, makeList([])),
            eq(modes, makeList([]))
        ),
        // If there are ovars, then we need to find the mode for the first one and recur
        fresh4(
            (ovar, mode1, ovarsTail, modeTail) => all(
                eq(ovars, makePair(ovar, ovarsTail)),
                eq(modes, makePair(mode1, modeTail)),
                fresh2(
                    (stateBefore, stateAfter) => all(
                        lookupo(ovar, stateBefore, stateLookupBefore),
                        lookupo(ovar, stateAfter, stateLookupAfter),
                        eq(qmode(stateBefore, stateAfter), mode1),
                        findModes(modeTail, ovarsTail, stateLookupBefore, stateLookupAfter)
                    )
                )
            )
        )
    );
}

// Infer the modes for a set of variables in a pred application
export function inferModesForVars(predApp: LTerm, defLookup: LTerm, stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
    return fresh2(
        (ovars, predName) => all(
            eq(qpredAppI(predName, ovars), predApp),
            fresh4(
                (modes, outDef, fnDef, fnDet) => all(
                    eq(qpredDef1(modes, fnDet, fnDef), outDef),
                    lookupPredDef(predName, defLookup, outDef),
                    findModes(modes, ovars, stateLookupBefore, stateLookupAfter),
                )
            )
        )
    );
}

// Infer the states for a list of pred applications
export function inferStatesForPredApps(predApps: LTerm, predDefs: LTerm, stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
    return either(
        // If there are no pred applications, then we're done
        all(
            eq(predApps, makeList([])),
            eq(stateLookupAfter, stateLookupBefore)
        ),
        // If there are pred applications, then we need to infer the states for the first one and recur
        fresh4(
            (predApp, stateAfterHat, predAppsTail) => all(
                eq(predApps, makePair(predApp, predAppsTail)),
                inferStates(predApp, predDefs, stateLookupBefore, stateAfterHat),
                // inferModes(predApp, odef, stateLookupBefore, stateAfterHat),
                inferStatesForPredApps(predAppsTail, predDefs, stateAfterHat, stateLookupAfter)
            )
        )
    );
}

// Infer the modes for the variables in a list of pred applications:
export function inferModesForPredApps(predApps: LTerm, 
    modes: LTerm,
    ovars: LTerm,
    predDefs: LTerm,
     stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
    return all(
        inferStatesForPredApps(predApps, predDefs, stateLookupBefore, stateLookupAfter),
        findModes(modes, ovars, stateLookupBefore, stateLookupAfter)
    );
}


export function unifyDisjunction(disjunct1: LTerm, disjunct2: LTerm, predDefs: LTerm, ovars: LTerm, modes: LTerm, stB4: LTerm, stA: LTerm): MGoal {
    // Infer the modes for both disjunct1 and disjunct2
    // Then combine them into their own def1s
    return fresh6(
        (modes1, modes2, stB41, stA1, stB42, stA2) => all(
            inferStates(disjunct1, predDefs, stB41, stA1),
            inferStates(disjunct2, predDefs, stB42, stA2),
            // disjunctModeList(modes1, modes2, modes),
            // disjunctStateList(stA1, stA2, stA),
            // disjunctStateList(stB41, stB42, stB4),
        )
    );
}


// Infer the states of the variables in a general program

export function inferStates(itrm: LTerm, predDefs: LTerm, stB4: LTerm, stA: LTerm): MGoal {
    return either(
        // If there's only one pred application, then we can infer the modes for the variables in it
        inferModesForVars(itrm, predDefs, stB4, stA),
        // If there are multiple pred applications, then we need to infer the modes recursively
        inferStatesForPredApps(itrm, predDefs, stB4, stA),
        // If there is a fresh declaration, then we need to add the fresh variables to the state lookup table (as "in")
        // then infer the modes for the contents of the fresh declaration and continue
        freshNom(
            (fr) => fresh4(
                (predApps, stB4Adjusted, stAAdjusted, outType) => all(
                    eq(qfresh(fr, predApps), itrm),
                    // Add [fr, "in"] to the state lookup table "before"
                    eq(makePair(makePair(fr, makeLiteral("in")), stB4), stB4Adjusted),
                    // Add [fr, outType] to the state lookup table "after"
                    eq(makePair(makePair(fr, outType), stA), stAAdjusted),
                    inferStates(predApps, predDefs, stB4Adjusted, stAAdjusted),
                )
            )
        )
    );
}

// Set the stateb4 to a list of ovars and fresh vars, and the stateafter to similar list
export function setStates(ovars: LTerm, stateLookupBefore: LTerm, stateLookupAfter: LTerm): MGoal {
    return either(
        // If there are no ovars, then we're done
        all(
            eq(ovars, makeEmpty()),
            eq(stateLookupBefore, makeEmpty()),
            eq(stateLookupAfter, makeEmpty())
        ),
        // If there are ovars, then we need to set the stateB4 & stateAfter for the first one and recur
        fresh6(
            (ovar, stateBefore, stateAfter, ovarsTail, stateLookupBeforeTail, stateLookupAfterTail) => all(
                eq(ovars, makePair(ovar, ovarsTail)),
                eq(stateLookupBefore, makePair(stateBefore, stateLookupBeforeTail)),
                eq(stateLookupAfter, makePair(stateAfter, stateLookupAfterTail)),
                // Set the noms to an empty variable
                fresh2(
                    (emptyState1, emptyState2) => all(
                        // eq(stateBefore, makePair(ovar, emptyState1)),
                        // eq(stateAfter, makePair(ovar, emptyState2)),
                        lookupo(ovar, emptyState1, stateLookupBefore),
                        lookupo(ovar, emptyState2, stateLookupAfter),
                    )
                ),
                setStates(ovarsTail, stateLookupBeforeTail, stateLookupAfterTail)
            )
        )
    )
}

// Given a disjunction list and some variables, infer the definition of the predicate with those vars over this disjunction
export function inferDisjunction1(disjunct: LTerm, ovars: LTerm, modes: LTerm, predDefsIn: LTerm, predDefOut: LTerm): MGoal {
    // Loop through the list of disjunctions, for each one infer the modes, then add it to the predDefOut list
    return either(
        // If there are no disjunctions, then we're done
        all(
            // eq(disjunct, makeList([])),
            eq(disjunct, makeEmpty()),
            // eq(predDefOut, makeList([]))
        ),
        // If there are disjunctions, then we need to infer the modes for the first one and recur
        fresh6(
            (disjunct1, disjunctTail, predDefOut1, predDefOutTail, stIn, stOut) => all(
                eq(disjunct, makePair(disjunct1, disjunctTail)),
                inferStates(disjunct1, predDefsIn, stIn, stOut),
                findModes(modes, ovars, stIn, stOut),
                inferDisjunction1(disjunctTail, ovars, modes, predDefsIn, predDefOutTail)
            )
        )
    )
}

// Given a disjunction and some variables, infer the definition of the predicate with those vars over this disjunction
export function inferDisjunction(disjunct: LTerm, ovars: LTerm, modes: LTerm, predDefsIn: LTerm, predDefOut: LTerm): MGoal {
    return fresh(
        (s1) => all(
            eq(disjunct, qdisj1(s1)),
            inferDisjunction1(s1, ovars, modes, predDefsIn, predDefOut)
        )
    );
}