

// First we map to generics
// Then to basic types via gather and/or stateful map
// Then we map via preds to type io/freshness/linearity/options

import { gatherVarInstanceInfo, intoUniqueVarsGeneric, mapPredCallsToState, mapPredDefinitionsGeneric, mapPredDefinitionsToState, mapToGeneric, mapVarsGeneric, mapVarsToState, mapVarsWithState } from "src/lens/into-vars";
import type { IdentifierDsAst, TermDsAst } from "src/types/DesugaredAst";
import type { ExpressionGeneric, IdentifierGeneric, TermGeneric, TermT } from "src/types/DsAstTyped";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { Map as ImmMap } from "immutable";
import { conjunction1 } from "src/utils/make_desugared_ast";
import {unify} from "src/type-unification/aunt";
import { reify } from 'src/type-unification/reifyType';
import { reifyType } from 'src/type-unification/reifyType';
import { generateTypeVars } from "./replace_type_vars";
import {unifyTwoMaps} from '../type-unification/aunt';
import { builtinTypes } from "./builtinTypes";
import { warnHolder } from "src/warnHolder";

function toEarlyMeta(
    tt: TermDsAst[]
): TermGeneric<'unknown'>[] {
    return mapToGeneric(tt, (tk) => make.identifier('unknown', tk.value));
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
//             warnHolder(`Unify ${predTyped} with ${pred}:\n ${pprintType(utlf)}`);
//             return worldz;
//         },
//         types
//     );

//     if (!gl) throw new Error(`Failed to unify types ${tt} with ${types}`);

//     warnHolder('Type map:\n', printTypeMap(gl));

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
            const tList = tt.terms.map((t) => toBasicTypesG1(t, mp));
            const termsM = tList.map((t) => t[0]);
            const t2 = tList.map((t) => t[1]);
            const unitedMap = t2.reduce((acc, t) => {
                const newMp = unifyTwoMaps(reify(acc), reify(t));
                return newMp;
            });
            return [make.disjunction(termsM), unitedMap];
            // const [t1, t22] = tt.terms.reduce<TypedOutputConj>((acc, t) => {
            //     const [t1, t2] = acc;
            //     const [t3, t4] = toBasicTypesG1(t, t2);
            //     t1.push(t3);
            //     return [t1, t4] as TypedOutputConj;
            // }, [[], mp]);
            // return [make.disjunction(termsM), t22];
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
                warnHolder(`Type ${arg.value} not found in ${tt.source.value} args`);
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
            const [body, mp1] = toBasicTypesG1(tt.body, mp);
            const mp2 = reify(mp1);
            const argTypes = tt.args.map((arg) => {
                const tsz = mp2.get(arg.value);
                if (tsz) return tsz;
                warnHolder(`Type ${arg.value} not found in ${tt.name.value} args`);
                return make.type_variable(arg.value);
            });
            const remainingTypeVars = [...new Set(argTypes.flatMap(ttzd => [...generateTypeVars(ttzd)]))];
            const predType = reifyType(make.predicate_type(remainingTypeVars.map(ss => ss.name), ...argTypes), mp2);
            const newMp = mp2.set(tt.name.value, predType);
            return [make.predicate_definition(
                make.identifier(predType, tt.name.value),
                tt.args.map((arg, i) => {
                    return make.identifier(argTypes[i], arg.value);
                }),
                make.conjunction1(body)
            ), newMp];
        }
        case 'fresh': {
            let mpClean = mp;
            for (const nv of tt.newVars) {
                mpClean = mpClean.delete(nv.value);
            }
            const [body, mp2] = toBasicTypesG1(tt.body, mpClean);
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