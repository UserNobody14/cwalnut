

// First we map to generics
// Then to basic types via gather and/or stateful map
// Then we map via preds to type io/freshness/linearity/options

import { gatherVarInstanceInfo, intoUniqueVarsGeneric, mapPredCallsToState, mapPredDefinitionsGeneric, mapPredDefinitionsToState, mapToGeneric, mapVarsGeneric, mapVarsToState, mapVarsWithState } from "src/lens/into-vars";
import type { IdentifierDsAst, TermDsAst } from "src/types/DesugaredAst";
import type { ExpressionGeneric, IdentifierGeneric, TermGeneric, TermT } from "src/types/DsAstTyped";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { Map as ImmMap } from "immutable";
import { conjunction1, type Builtin } from "src/utils/make_desugared_ast";
import {reifyType, unify} from "src/type-unification/aunt";
import { generateTypeVars } from "./replace_type_vars";
import {unifyTwoMaps} from '../type-unification/aunt';

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

const builtinTypes: Record<Builtin, Type> = {
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
            make.type_variable('L1'),
            make.type_variable('L1'),
            make.type_variable('L1'),
            make.type_variable('L1')
        ])
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
    set_key_of: make.predicate_type(['K1', 'V1'], 
        make.complex_type('dictionary', [], [
            make.type_variable('K1'),
            make.type_variable('V1'),
        ]),
        make.type_variable('K1'), 
        make.type_variable('V1')
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
    slice: make.simple_type('never'), // Temporarily
    length: make.simple_type('never'), // Temporarily
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
    internal_file: make.simple_type('never'), // Temporarily
    internal_import: make.simple_type('never'), // Temporarily
}

export function toBasicTypes(
    tsss: TermDsAst[]
): TermT[] {
    const tt = toEarlyMeta(tsss);
    return toBasicTypesG(tt);
}

// const unifyTypeList = (types: Type[]): Type => {
//     if (types.length === 0) {
//         return make.simple_type('never');
//     }if (types.length === 1) {
//         return types[0];
//     }
//         return types.reduce((acc, t) => {
//             const un1 = unify2(acc, t, ImmMap<string, Type>());
//             if (!un1) {
//                 throw new Error(`Failed to unify ${acc} with ${t}`);
//             }
//             return un1[0];
//         });
// };

// function toBasicTypesG<G>(tt: TermGeneric<G>[]) {
//     let types = ImmMap<string, Type>(builtinTypes);
//     let typeCounter = 0;
//     for (const gathered of intoUniqueVarsGeneric(tt, new Set(Object.keys(builtinTypes)))) {
//         // types = types.set(gathered.value, make.type_variable(`T${typeCounter}`));
//         types = types.set(gathered.value, make.type_variable(gathered.value));
//         typeCounter++;
//     }
//     // const [defs, types2] = resolveDefs(tt, types);
//     // const [tr, tr3] = resolveTypes<G>(tt, types2);
//     const [tr, types2] = resolveTypes<G>(tt, types);
//     const [defs, tr3] = resolveDefs(tt, types2);
//     const gfasd = gatherVarInstanceInfo(defs);
//     const nmap = gfasd.reduce((acc, v, k) => {
//         return acc.set(k, unifyTypeList(v));
//     }, ImmMap<string, Type>());
//     const defs2 = mapVarsGeneric(defs, zg => {
//         const tsz = walkMap(zg.value, nmap);
//         if (!tsz) throw new Error(`Type ${zg.value} not found in ${printTypeMap(nmap)}`);
//         return make.identifier<Type>(tsz, zg.value);
//     });
//     return defs2;
// }

// function resolveDefs<G>(tt: TermGeneric<G>[], types: ImmMap<string, Type>):
//     [TermGeneric<Type>[], ImmMap<string, Type>] {
//     const tgl = mapPredDefinitionsGeneric<G, Type>(tt,
//         (predDef) => {
//             const [newTerms, newTypes] = resolveTypes(predDef.body.terms, types);
//             const argTypes = predDef.args.map((arg) => {
//                     const tsz = newTypes.get(arg.value);
//                     if (tsz) return tsz;
//                     throw new Error(`Type ${arg.value} not found in ${newTypes}`);
//             });
//             const newBody = make.conjunction(newTerms);
//             const allRemainingTypeVarsS = new Set([...argTypes.map(ttzd => [...generateTypeVars(ttzd)])].flat());
//             const allRemainingTypeVars = [...allRemainingTypeVarsS];
//             const renameTvarMap = new Map(allRemainingTypeVars.map((tvar, i) => [tvar.name, make.type_variable(`T${predDef.name.value}${i}`)]));
//             const renameTypeVarFn = (st: string) => {
//                 const renamed = renameTvarMap.get(st);
//                 if (!renamed) throw new Error(`Type variable ${st} not found in ${renameTvarMap}`);
//                 return renamed;
//             };
//             const newFresh = allRemainingTypeVars.map(tvar => renameTypeVarFn(tvar.name));
//             const predType = make.complex_type(
//                 'predicate',
//                 newFresh,
//                 // [],
//                 argTypes.map(ttzd => replaceTypeVars(ttzd, renameTypeVarFn))
//                 // argTypes
//             );
//             const predTyped = make.predicate_definition(
//                 make.identifier(predType, predDef.name.value),
//                 predDef.args.map((arg): IdentifierGeneric<Type> => {
//                     const tsz = newTypes.get(arg.value);
//                     if (tsz) return make.identifier(tsz, arg.value);
//                     throw new Error(`Type ${arg.value} not found in ${newTypes}`);                
//                 }),
//                 // predDef.args.map((arg): IdentifierGeneric<Type> => make.identifier(nnl, arg.value)),
//                 newBody
//             );
//             return predTyped;
//         },
//         (ctx, idv): IdentifierGeneric<Type>[] => {
//             return idv.map(
//                 (id) => {
//                     const typeVal = types.get(id.value);
//                     if (typeVal) {
//                         return make.identifier(typeVal, id.value);
//                     }
//                     switch (ctx) {
//                         case 'definition-args':
//                             return make.identifier(make.type_variable(id.value), id.value);
//                         case 'fresh-args':
//                             return make.identifier(make.type_variable(id.value), id.value);
//                         case 'name':
//                             return make.identifier(make.type_variable(id.value), id.value);
//                         case 'call-args':
//                             return make.identifier(make.type_variable(id.value), id.value); 
//                     }
//                 }   
//             )
//         }
//     );
//     let otypes = ImmMap<string, Type>(builtinTypes);
//     for (const gathered of intoUniqueVarsGeneric(tgl, new Set(Object.keys(builtinTypes)))) {
//         // types = types.set(gathered.value, make.type_variable(`T${typeCounter}`));
//         // typeCounter++;
//         if (
//             !otypes.has(gathered.value) &&
//             !(gathered.info.type === 'complex' && gathered.info.name === 'predicate')
//         ) {
//             otypes = otypes.set(gathered.value, gathered.info);
//         }
//     }
//     const tgll2 = mapVarsGeneric(tgl, zg => {
//         if (zg.info.type === 'complex' && zg.info.name === 'predicate') {
//             return zg;
//         }
//         const tsz = walkMap(zg.value, otypes);
//         if (!tsz) throw new Error(`Type ${zg.value} not found in ${printTypeMap(otypes)}`);
//         return make.identifier<Type>(tsz, zg.value);
//     })
//     return [tgll2, otypes];
// }

// function resolveTypes<G>(tt: TermGeneric<G>[], types: ImmMap<string, Type>): [TermT[], ImmMap<string, Type>] {
//     const gl = mapPredCallsToState<G, ImmMap<string, Type> | false>(tt,
//         (prk, curr) => {
//             if (!curr) return false;
//             const pred = curr.get(prk.source.value);
//             if (!pred) throw new Error(`Predicate ${prk.source.value} not found in ${curr}`);
//             // first build the predicate call into a type
//             const argTypes = prk.args.map((arg) => {
//                 if (arg.type === 'identifier') {
//                     const tsz = curr.get(arg.value);
//                     if (tsz) return tsz;
//                     throw new Error(`Type ${arg.value} not found in ${curr}`);
//                 }
//                 return make.simple_type(arg.kind);
//             });
//             const allRemainingTypeVarsS = new Set([...argTypes.map(ttzd => [...generateTypeVars(ttzd)])].flat());
//             const allRemainingTypeVars = [...allRemainingTypeVarsS];
//             const renameTvarMap = new Map(allRemainingTypeVars.map((tvar, i) => [tvar.name, make.type_variable(`T${prk.source.value}${i}`)]));
//             const renameTypeVarFn = (st: string) => {
//                 const renamed = renameTvarMap.get(st);
//                 if (!renamed) throw new Error(`Type variable ${st} not found in ${renameTvarMap}`);
//                 return renamed;
//             };
//             const newFresh = allRemainingTypeVars.map(tvar => renameTypeVarFn(tvar.name));
//             const predTyped = make.complex_type(
//                 'predicate',
//                 // newFresh,
//                 [],
//                 // argTypes.map(ttzd => replaceTypeVars(ttzd, renameTypeVarFn))
//                 argTypes
//             );
//             // then unify the predicate call with the type
//             const [utlf, worldz] = unify2(predTyped, pred, curr);
//             console.log(`Unify ${predTyped} with ${pred}:\n ${pprintType(utlf)}`);
//             return worldz;
//         },
//         types
//     );

//     if (!gl) throw new Error(`Failed to unify types ${tt} with ${types}`);

//     console.log('Type map:\n', printTypeMap(gl));

//     return [mapVarsGeneric(tt, zg => {
//         const tsz = walkMap(zg.value, gl);
//         if (!tsz) throw new Error(`Type ${zg.value} not found in ${printTypeMap(gl)}`);
//         return make.identifier<Type>(tsz, zg.value);
//     }), gl];
// }


function toBasicTypesG<G>(tt: TermGeneric<G>[]) {
    return [toBasicTypesG1(
        make.conjunction(tt),
        ImmMap<string, Type>(builtinTypes)
    )[0]];
}

type TypedOutput = [TermGeneric<Type>, ImmMap<string, Type>];
type TypedOutputConj = [TermGeneric<Type>[], ImmMap<string, Type>]

function toBasicTypesG1<G>(tt: TermGeneric<G>, mp: ImmMap<string, Type>): TypedOutput {
    switch (tt.type) {
        case 'conjunction':{
            const [t1, t2] = tt.terms.reduce<TypedOutputConj>((acc, t) => {
                const [t1, t2] = acc;
                const [t3, t4] = toBasicTypesG1(t, t2);
                t1.push(t3);
                return [t1, t4] as TypedOutputConj;
            }, [[], mp]);
            return [make.conjunction(t1), t2];}
        case 'disjunction': {
            // instead map & unify type envs?
            // const tList = tt.terms.map((t) => toBasicTypesG1(t, mp));
            // const termsM = tList.map((t) => t[0]);
            // const t2 = tList.map((t) => t[1]);
            // const unitedMap = t2.reduce((acc, t) => {
            //     const newMp = unifyTwoMaps(acc, t);
            //     return newMp;
            // });
            // return [make.disjunction(termsM), unitedMap];
            const [t1, t2] = tt.terms.reduce<TypedOutputConj>((acc, t) => {
                const [t1, t2] = acc;
                const [t3, t4] = toBasicTypesG1(t, t2);
                t1.push(t3);
                return [t1, t4] as TypedOutputConj;
            }, [[], mp]);
            return [make.disjunction(t1), t2];
        }
        case 'predicate_call': {
            // type of the predicate source should not be bound by the specific polymorphism used
            const predType = mp.get(tt.source.value) ?? make.type_variable(tt.source.value);
            const argTypes = tt.args.map((arg) => {
                if (arg.type === 'literal') {
                    return make.simple_type(arg.kind);
                }
                const tsz = mp.get(arg.value);
                if (tsz) return tsz;
                console.warn(`Type ${arg.value} not found in ${tt.source.value} args`);
                return make.type_variable(arg.value);
            });
            const newPredType = make.predicate_type([], ...argTypes);
            const newMp = unify(predType, newPredType, mp);
            if (!newMp) {
                throw new Error(`Failed to unify ${predType} with ${newPredType}`);
            }
            return [make.predicate_call(
                make.identifier(newPredType, tt.source.value),
                tt.args.map((arg, i): ExpressionGeneric<Type> => {
                    if (arg.type === 'literal') {
                        return make.literal(arg.kind, arg.value);
                    }
                    return make.identifier(reifyType(argTypes[i], newMp), arg.value);
                }
            )), newMp];
        }
        case 'predicate_definition': {
            const [body, mp2] = toBasicTypesG1(tt.body, mp);
            const argTypes = tt.args.map((arg) => {
                const tsz = mp2.get(arg.value);
                if (tsz) return tsz;
                console.warn(`Type ${arg.value} not found in ${tt.name.value} args`);
                return make.type_variable(arg.value);
            });
            const remainingTypeVars = [...new Set(argTypes.flatMap(ttzd => [...generateTypeVars(ttzd)]))];
            const predType = reifyType(make.predicate_type(remainingTypeVars.map(ss => ss.name), ...argTypes), mp2);
            const newMp = mp2.set(tt.name.value, predType);
            return [make.predicate_definition(
                make.identifier(predType, tt.name.value),
                tt.args.map((arg, i) => {
                    return make.identifier(reifyType(argTypes[i], newMp), arg.value);
                }),
                make.conjunction1(body)
            ), newMp];
        }
        case 'fresh': {
            const [body, mp2] = toBasicTypesG1(tt.body, mp);
            const freshArgs = tt.newVars.map((v) => {
                const mp22 = mp2.get(v.value);
                if (mp22) {
                    return make.identifier(mp22, v.value);
                }
                return make.identifier(make.type_variable(v.value), v.value);
            });
            return [make.fresh(freshArgs, make.conjunction1(body)), mp2];
        }
        case 'with': {
            const [body, mp2] = toBasicTypesG1(tt.body, mp);
            return [make.with(make.identifier(mp2.get(tt.name.value) ?? make.type_variable(tt.name.value), tt.name.value), make.conjunction1(body)), mp2];
        }
    }
}