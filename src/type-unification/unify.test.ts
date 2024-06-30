import { describe, expect, test } from '@jest/globals';
import type { Type, TypeVariable } from 'src/types/EzType';
import { Map as ImmMap } from 'immutable';
import { pprintType } from 'src/redo/pprintgeneric';
import { make } from 'src/utils/make_better_typed';
import { unify } from './aunt';
import { pprintTypeMap } from './pprintTypeMap';
import { compareTypeMaps } from './compareTypeMaps';
import { reify } from './reifyType';


type Tmap = ImmMap<string, Type>;
const tmap = (obj?: Record<string, Type>): Tmap => obj ? ImmMap(obj) : ImmMap<string, Type>();

const tstring = make.simple_type('string'),
    tnumber = make.simple_type('number'),
    tpred = (frsh: (string | TypeVariable)[], tt: Type[]) => make.complex_type('predicate',
        frsh.map(ff => typeof ff === 'string' ? make.type_variable(ff) : ff), tt),
    tlist = (frsh: (string | TypeVariable)[], tt: Type[]) => make.complex_type('list',
        frsh.map(ff => typeof ff === 'string' ? make.type_variable(ff) : ff), tt),
    tvar = make.type_variable;

function checkUnity(t1: Type, t2: Type, inputWorld: Tmap,
    expected: Tmap, shouldFail = false) {
    if (shouldFail) {
        try {
            const subst = unify(t1, t2, inputWorld);
            if (compareTypeMaps(subst, expected)) {
                throw new Error(`Unification should not have succeeded for ${pprintType(t1)} and ${pprintType(t2)}.
                --
                Expected: ${pprintTypeMap(reify(expected))}
                --
                Got: ${pprintTypeMap(reify(subst))}`);
            }
        } catch (e) {
            // pass
        }
    } else {
        const subst = unify(t1, t2, inputWorld);
        if (!compareTypeMaps(subst, expected)) {
            throw new Error(`Unification failed for ${pprintType(t1)} and ${pprintType(t2)}.
            --
            Expected: ${pprintTypeMap(reify(expected))}
            --
            Got: ${pprintTypeMap(reify(subst))}`);
        }
    }
}

describe('Type unification', () => {
    // const uTests: [Type, Type, Tmap, Tmap][] = [
    test('Simple types', () => {
        checkUnity(tstring, tstring, tmap(), tmap());
    });
    // checkUnity(tstring, tnumber, tmap(), tmap())
    // // two type vars
    // checkUnity(tvar('T1'), tvar('T2'), tmap(), tmap({
    //     T1: tvar('T2')
    // }))
    // // two complex vars
    // checkUnity(
    //     tlist([tvar('T1')], [tvar('T1')]),
    //     tlist([], [tnumber]),
    //     tmap(), tmap({
    //         tt0: tnumber
    //     })
    // )
    // // complex var with simple var
    // checkUnity(
    //     tlist([tvar('T1')], [tvar('T1')]),
    //     tnumber,
    //     tmap(),
    //     tmap(),
    //     true
    // )

    // instantiation of a predicate 1
    test(" instantiation of a predicate 1", () => {
        checkUnity(
            tvar('predtest'),
            tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            tmap({
                predtest: tpred([], [tnumber, tnumber])
            }),
            tmap({
                predtest: tpred([], [tnumber, tnumber])
            })
        )
    });
    // instantiation of a predicate 2
    test(" instantiation of a predicate 2", () => {
        checkUnity(
            tvar('predtest'),
            tpred([], [tnumber, tnumber]),
            tmap({
                // predtest: tpred( [], [tnumber, tnumber])
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            }),
            tmap({
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            })
        )
    });
    // instantiation of a predicate 3
    test(" instantiation of a predicate 3", () => {
        checkUnity(
            tvar('predtest'),
            // tpred( [], [tnumber, tnumber]),
            tpred([], [tvar('x1'), tvar('x2')]),
            tmap({
                x1: tnumber,
                // predtest: tpred( [], [tnumber, tnumber])
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            }),
            tmap({
                x1: tnumber,
                x2: tnumber,
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            })
        )
    });
    // instantiation of a predicate 4
    test(" instantiation of a predicate 4", () => {
        checkUnity(
            // tpred( [], [tvar('x1'),tvar('x2')]),
            tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            // tvar('predtest'),
            // tpred( [], [tnumber, tnumber]),
            tpred([], [tvar('x1'), tvar('x2')]),
            tmap({
                x1: tnumber,
                // predtest: tpred( [], [tnumber, tnumber])
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            }),
            tmap({
                x1: tnumber,
                x2: tnumber,
                predtest: tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            })
        )
    });
    // instantiation of a predicate 5
    test(" instantiation of a predicate 5", () => {
        checkUnity(
            tvar('predtest'),
            tpred([], [tnumber,
                tvar('x2')
            ]),
            tmap({
                // predtest: tpred( [], [tnumber, tnumber])
                // predtest: tpred( [tvar('P1')], [tvar('P1'),tvar('P1')]),
                predtest: tpred([tvar('P1')], [tvar('P1'),
                tlist([], [tvar('P1')])
                ]),
            }),
            tmap({
                predtest: tpred([tvar('P1')], [tvar('P1'),
                tlist([], [tvar('P1')])
                ]),
                x2: tlist([], [tnumber])
            })
        )
    });


    // let counter = 0;
    // for (const [t1, t2, inputWorld, expected] of uTests) {
    //     console.log(`Running test ${counter}`);
    //     checkUnity(t1, t2, inputWorld, expected);
    //     counter++;
    // }




    // predicate union with another predicate
    test(" predicate union with another predicate", () => {
        checkUnity(
            make.union_type(
                tpred([], [tnumber]),
                tpred([], [tstring]),
            ),
            tpred([tvar('P1')], [tvar('P1')]),
            tmap(), tmap({
                tt2: tnumber
            })
        )
    });
    // predicate union with another predicate, showing constraints
    test(" predicate union with another predicate, showing constraints", () => {
        checkUnity(
            make.union_type(
                tpred([], [tnumber, tnumber]),
                tpred([], [tstring]),
            ),
            tpred([tvar('P1')], [tvar('P1'), tvar('P1')]),
            tmap(), tmap()
        )
    });
    // predicate union, with a type var that has a predicate in the map
    test(" predicate union, with a type var that has a predicate in the map", () => {
        checkUnity(
            tvar('predtest'),
            tpred([tvar('P1')], [tvar('P1')]),
            tmap({
                predtest: tpred([], [tnumber, tnumber])
            }),
            tmap(),
            true
        )
    });





});
