

// First we map to generics
// Then to basic types via gather and/or stateful map
// Then we map via preds to type io/freshness/linearity/options

import { gatherVarInstanceInfo, intoUniqueVarsGeneric, mapPredCallsToState, mapToGeneric, mapVarsGeneric, mapVarsToState, mapVarsWithState } from "src/lens/into-vars";
import type { TermDsAst } from "src/types/DesugaredAst";
import { ExpressionGeneric, type TermGeneric, type TermT } from "src/types/DsAstTyped";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { Map as ImmMap } from "immutable";
import { Goal, LogicVal, VarLogic, conj, disj, eq, failG, fresh } from "src/interpret/logic";
import { printTypeMap, unify, unify2, walkMap } from "src/type-unification/unify";

function toEarlyMeta(
    tt: TermDsAst[]
): TermGeneric<'unknown'>[] {
    return mapToGeneric(tt, (tk) => make.identifier('unknown', tk.value));
}

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

const builtinTypes: Record<string, Type> = {
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
        ]),
    ),
    'list': make.union_type(
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
        ]),
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
        ]),
    ),
}

export function toBasicTypes(
    tsss: TermDsAst[]
): TermT[] {
    const tt = toEarlyMeta(tsss);
    let types = ImmMap<string, Type>(builtinTypes);
    let typeCounter = 0;
    for (const gathered of intoUniqueVarsGeneric(tt, new Set(Object.keys(builtinTypes)))) {
        // types = types.set(gathered.value, make.type_variable(`T${typeCounter}`));
        types = types.set(gathered.value, make.type_variable(gathered.value));
        typeCounter++;
    }
        
    const gl = mapPredCallsToState<'unknown', ImmMap<string, Type> | false>(tt, 
        (prk, curr) => {
            if (!curr) return false;
            const pred = curr.get(prk.source.value);
            if (!pred) throw new Error(`Predicate ${prk.source.value} not found in ${curr}`);
            // first build the predicate call into a type
            const argTypes = prk.args.map((arg) => {
                if (arg.type === 'identifier') {
                    const tsz = curr.get(arg.value);
                    if (tsz) return tsz;
                    throw new Error(`Type ${arg.value} not found in ${curr}`);
                }
                return make.simple_type(arg.kind);
            });
            const predTyped = make.complex_type(
                'predicate',
                [],
                argTypes,
            );
            // then unify the predicate call with the type
            const [_, world] = unify2(predTyped, pred, curr);
            return world;
        },
        types
    );

    if (!gl) throw new Error(`Failed to unify types ${tt} with ${types}`);

    console.log('Type map:\n', printTypeMap(gl));

    return mapVarsGeneric(tt, zg => {
        const tsz = walkMap(zg.value, gl);
        if (!tsz) throw new Error(`Type ${zg.value} not found in ${printTypeMap(gl)}`);
        return make.identifier<Type>(tsz, zg.value);
    });
}