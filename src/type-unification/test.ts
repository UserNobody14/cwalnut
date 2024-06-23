import type { Type } from 'src/types/EzType';
import { Map as ImmMap } from 'immutable';
import { pprintType } from 'src/redo/pprintgeneric';
import { make } from 'src/utils/make_better_typed';
import { pprintTypeMap, unify } from './aunt';
import { compareTypeMaps } from './compareTypeMaps';

function checkUnity(t1: Type, t2: Type, inputWorld: ImmMap<string, Type>, 
    expected: ImmMap<string, Type>, shouldFail = false) {
    if (shouldFail) {
        try {
            const subst = unify(t1, t2, inputWorld);
            if (compareTypeMaps(subst, expected)) {
                throw new Error(`Unification should not have succeeded for ${pprintType(t1)} and ${pprintType(t2)}.
                --
                Expected: ${pprintTypeMap(expected)}
                --
                Got: ${pprintTypeMap(subst)}`);
            }
        } catch (e) {
            // pass
        }
    } else {
        const subst = unify(t1, t2, inputWorld);
        if (!compareTypeMaps(subst, expected)) {
            throw new Error(`Unification failed for ${pprintType(t1)} and ${pprintType(t2)}.
            --
            Expected: ${pprintTypeMap(expected)}
            --
            Got: ${pprintTypeMap(subst)}`);
        }
    }
}

// const uTests: [Type, Type, ImmMap<string, Type>, ImmMap<string, Type>][] = [
checkUnity(make.simple_type('string'), make.simple_type('string'), ImmMap<string, Type>(), ImmMap<string, Type>())
checkUnity(make.simple_type('string'), make.simple_type('number'), ImmMap<string, Type>(), ImmMap<string, Type>())
// two type vars
checkUnity(make.type_variable('T1'), make.type_variable('T2'), ImmMap<string, Type>(), ImmMap<string, Type>({
    T1: make.type_variable('T2')
}))
// two complex vars
checkUnity(
    make.complex_type('list', [make.type_variable('T1')], [make.type_variable('T1')]),
    make.complex_type('list', [], [make.simple_type('number')]),
    ImmMap<string, Type>(), ImmMap<string, Type>({
        tt0: make.simple_type('number')
    })
)
// complex var with simple var
checkUnity(
    make.complex_type('list', [make.type_variable('T1')], [make.type_variable('T1')]),
    make.simple_type('number'),
    ImmMap<string, Type>(), 
    ImmMap<string, Type>(),
    true
)
// predicate union with another predicate
checkUnity(
    make.union_type(
        make.complex_type('predicate', [], [make.simple_type('number')]),
        make.complex_type('predicate', [], [make.simple_type('string')]),
    ),
    make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1')]),
    ImmMap<string, Type>(), ImmMap<string, Type>({
        tt2: make.simple_type('number')
    })
)
// predicate union with another predicate, showing constraints
checkUnity(
    make.union_type(
        make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
        make.complex_type('predicate', [], [make.simple_type('string')]),
    ),
    make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    ImmMap<string, Type>(), ImmMap<string, Type>()
)
// predicate union, with a type var that has a predicate in the map
checkUnity(
    make.type_variable('predtest'),
    make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1')]),
    ImmMap<string, Type>({
        predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
    }),
    ImmMap<string, Type>(),
    true
)
checkUnity(
    make.type_variable('predtest'),
    make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    ImmMap<string, Type>({
        predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
    }),
    ImmMap<string, Type>({
        predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    })
)
checkUnity(
    make.type_variable('predtest'),
    make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
    ImmMap<string, Type>({
        // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
        predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    }),
    ImmMap<string, Type>({
        predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
    })
)
checkUnity(
    make.type_variable('predtest'),
    // make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
    make.complex_type('predicate', [], [make.type_variable('x1'), make.type_variable('x2')]),
    ImmMap<string, Type>({
        x1: make.simple_type('number'),
        // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
        predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    }),
    ImmMap<string, Type>()
)
checkUnity(
    // make.complex_type('predicate', [], [make.type_variable('x1'),make.type_variable('x2')]),
    make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    // make.type_variable('predtest'),
    // make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
    make.complex_type('predicate', [], [make.type_variable('x1'), make.type_variable('x2')]),
    ImmMap<string, Type>({
        x1: make.simple_type('number'),
        // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
        predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
    }),
    ImmMap<string, Type>()
)
checkUnity(
    make.type_variable('predtest'),
    make.complex_type('predicate', [], [make.simple_type('number'),
    make.type_variable('x2')
    ]),
    ImmMap<string, Type>({
        // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
        // predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'),make.type_variable('P1')]),
        predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'),
        make.complex_type('list', [], [make.type_variable('P1')])
        ]),
    }),
    ImmMap<string, Type>()
)


// let counter = 0;
// for (const [t1, t2, inputWorld, expected] of uTests) {
//     console.log(`Running test ${counter}`);
//     checkUnity(t1, t2, inputWorld, expected);
//     counter++;
// }