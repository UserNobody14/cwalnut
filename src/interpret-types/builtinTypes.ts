import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import type { Builtin } from "src/utils/make_desugared_ast";

// type Tnv = ImmMap<string, Type>[]
// const typeOf = (ss: VarLogic | ExpressionGeneric<'unknown'>, tt: VarLogic): Goal => {
//     return disj(
//         conj(
//             disj(
//                 eq(tt, LogicVal.create('string')),
//                 eq(tt, LogicVal.create('null')),
//                 eq(tt, LogicVal.create('boolean')),
//                 eq(tt, LogicVal.create('number')),
//             ),
//             ss instanceof VarLogic ? eq(ss, tt) : (
//                 ss.type === 'literal' ? eq(LogicVal.create(ss.kind), tt) : failG
//             )
//         )
//     )
// }
// function matchArgs(
//     args: ExpressionGeneric<'unknown'>[],
//     typeVar: VarLogic
// ): Goal {
//     return conj(
//         ...args.map((arg, i) => {
//             const arg_type = VarLogic.create('arg_type');
//             return fresh(
//                 ['arg_type'],
//                 conj(
//                     typeOf(arg, arg_type),
//                     idxOf(typeVar, i, arg_type)
//                 )
//             )
//         })
//     )
// }
export const builtinTypes: Record<Builtin, Type> = {
    'unify': make.union_type(
        make.complex_type('predicate', [
            make.type_variable('A1')
        ], [
            make.type_variable('A1'),
            make.type_variable('A1'),
        ]),
        make.complex_type('predicate', [
            make.type_variable('A1')
        ], [
            make.type_variable('A1'),
            make.type_variable('A1'),
            make.type_variable('A1'),
        ])
    ),
    'list': make.union_type(
        make.complex_type('predicate', [
            make.type_variable('L1'),
        ], [
            make.complex_type('list', [], [
                make.type_variable('L1'),
            ]),
            make.type_variable('L1'),
        ]),
        make.complex_type('predicate', [
            make.type_variable('L1'),
        ], [
            make.complex_type('list', [], [
                make.type_variable('L1'),
            ]),
        ]),
        make.complex_type('predicate', [
            make.type_variable('L1'),
        ], [
            make.complex_type('list', [], [
                make.type_variable('L1'),
            ]),
            make.type_variable('L1'),
            make.type_variable('L1'),
            make.type_variable('L1'),
            make.type_variable('L1'),
            make.type_variable('L1')
        ]),
    ),
    'first': make.union_type(
        make.complex_type('predicate', [
            make.type_variable('F1'),
        ], [
            make.type_variable('F1'),
            make.complex_type('list', [], [
                make.type_variable('F1'),
            ]),
        ])
    ),
    'rest': make.union_type(
        make.complex_type('predicate', [
            make.type_variable('R1'),
        ], [
            make.complex_type('list', [], [
                make.type_variable('R1'),
            ]),
            make.complex_type('list', [], [
                make.type_variable('R1'),
            ]),
        ])
    ),
    set_key_of: make.union_type(
        make.predicate_type(['K1', 'V1'],
            make.complex_type('dictionary', [], [
                make.type_variable('K1'),
                make.type_variable('V1'),
            ]),
            make.type_variable('K1'),
            make.type_variable('V1')
        ),
        make.predicate_type(['K1', 'V1', 'V2'],
            make.complex_type('dictionary', [], [
                make.type_variable('K1'),
                make.union_type(
                    make.type_variable('V1'),
                    make.type_variable('V2')
                ),
            ]),
            make.type_variable('K1'),
            make.type_variable('V2')
        )
    ),
    unify_left: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('L1')
        ], [
            make.type_variable('L1'),
            make.type_variable('L1'),
        ])
    ),
    unify_right: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('UR1')
        ], [
            make.type_variable('UR1'),
            make.type_variable('UR1'),
        ])
    ),
    unify_equal: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('UE1')
        ], [
            make.type_variable('UE1'),
            make.type_variable('UE1'),
        ])
    ),
    unify_not_equal: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('UNE1')
        ], [
            make.type_variable('UNE1'),
            make.type_variable('UNE1'),
        ])
    ),
    slice: make.union_type(
        make.predicate_type(
            ['LL1'],
            make.complex_type('list', [], [make.type_variable('LL1')]),
            make.simple_type('number'),
            make.type_variable('LL1'),            
        ),
        make.predicate_type(['K1', 'V1'],
            make.complex_type('dictionary', [], [
                make.type_variable('K1'),
                make.type_variable('V1'),
            ]),
            make.type_variable('K1'),
            make.type_variable('V1')
        ),
        make.predicate_type(['K1', 'V1', 'V2'],
            make.complex_type('dictionary', [], [
                make.type_variable('K1'),
                make.union_type(
                    make.type_variable('V1'),
                    make.type_variable('V2')
                ),
            ]),
            make.type_variable('K1'),
            make.type_variable('V2')
        )
    ), // Temporarily
    length: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('L1')
        ], [
            make.type_variable('L1'),
            make.simple_type('number'),
        ])
    ),
    empty: make.simple_type('never'), // Temporarily
    add: make.union_type(
        make.complex_type('predicate', [
            make.type_variable('A1')
        ], [
            make.type_variable('A1'),
            make.type_variable('A1'),
            make.type_variable('A1'),
        ])
    ), // Temporarily
    subtract: make.simple_type('never'), // Temporarily
    multiply: make.simple_type('never'), // Temporarily
    divide: make.simple_type('never'), // Temporarily
    modulo: make.simple_type('never'), // Temporarily
    negate: make.simple_type('never'), // Temporarily
    internal_file: make.complex_type(
        'predicate',
        [],
        [
            make.simple_type('string'),
            make.simple_type('string'),
        ]
    ), // Temporarily
    internal_import: make.simple_type('never'), // Temporarily
};
