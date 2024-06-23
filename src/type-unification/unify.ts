import { type Type, TypeVariable, type ComplexType } from "src/types/EzType";
import { Map as ImmMap } from "immutable";
import { make } from "src/utils/make_better_typed";
import { pprintType } from "src/redo/pprintgeneric";
import { generateTypeVars, replaceTypeVars } from "src/interpret-types/replace_type_vars";

// export function printTypeMap(world: ImmMap<string, Type>): string {
//     if (world.size === 0) {
//         return '<<Empty world>>';
//     }
//     return [...world.entries()].map(([k, v]) => `     ${k} = ${pprintType(v)}`).join('\n');
// }

// function unifyVar(t: Type, u: Type, world: ImmMap<string, Type>): ImmMap<string, Type> | false {
//     console.log(`Unifying ${pprintType(t)} with ${pprintType(u)}`);
//     // if ('name' in t && 'name' in u) {
//     //     const tw = walk(t, world);
//     //     const uw = walk(u, world);
//     //     return world.set(t.name, uw).set(u.name, tw);
//     // }
//     if ('name' in t) {
//         const tw = walk(u, world);
//         if (tw) {
//             // return unify(tw, t, world);
//             return world.set(t.name, tw);
//         }
//         return world.set(t.name, u);
//         // if (world.has(t.name)) {
//         //     const tw = world.get(t.name);
//         //     if (tw) {
//         //         if (tw.type === 'variable' && tw.name === t.name) {
//         //             return world.set(t.name, u);
//         //         }
//         //         return unify(tw, u, world);
//         //     }
//         //     return false;
//         // } 
//         // return world.set(t.name, u);
//     }
//     // if ('name' in u) {
//     //     const uw = walk(t, world);
//     //     if (uw) {
//     //         return world.set(u.name, uw);
//     //     }
//     //     return world.set(u.name, t);
//     // }
//     // return unify(u, t, world);
//     return world;
// }

// function walk(t: Type, world: ImmMap<string, Type>): Type {
//     if (t.type === 'variable') {
//         // return walkMap(t.name, world) ?? t;
//         return world.get(t.name) ?? t;
//     }
//     if (t.type === 'complex') {
//         return {
//             type: 'complex',
//             name: t.name,
//             fresh: t.fresh,
//             generics: t.generics.map(g => g.type === 'variable' ? walk(g, world) : g)
//         };
//     }
//     return t;
// }

// export function walkMap(seek: string, world: ImmMap<string, Type>): Type | undefined {
//     const previous: Set<string> = new Set<string>();
//     let t = world.get(seek);
//     while (t && t.type === 'variable' && world.has(t.name) && !previous.has(t.name)) {
//         previous.add(t.name);
//         const nt = world.get(t.name);
//         if (nt) {
//             t = nt;
//         } else {
//             break;
//         }
//     }
//     if (t && t.type === 'complex') {
//         t = {
//             type: 'complex',
//             name: t.name,
//             fresh: t.fresh,
//             generics: t.generics.map(g => g.type === 'variable' ? walkMap(g.name, world) ?? g : g)
//         };
//     }
//     return t;
// }

// function unifyComplex(t: ComplexType, u: ComplexType, world: ImmMap<string, Type>) {
//     if (t.name !== u.name || t.generics.length !== u.generics.length) {
//         console.warn(`Complex types do not match: ${pprintType(t)} and ${pprintType(u)}`);
//         return false;
//     }
//     const freshOldT = t.fresh.map(v => world.get(v.name));
//     const freshOldU = u.fresh.map(v => world.get(v.name));

//     const world2 = [...t.fresh, ...u.fresh].reduce<ImmMap<string, Type>>((world, v) => {
//         return world.set(v.name, make.type_variable(v.name));
//     }, world);

//     //// merge the generics
//     const preMerge = t.generics.reduce<ImmMap<string, Type> | false>((world3, tGen, i) => {
//         if (!world3) {
//             return false;
//         }
//         return unify(tGen, u.generics[i], world3);
//     }, world2);
//     if (!preMerge) {
//         console.warn(`Generics do not match: ${t.generics} and ${u.generics}`);
//         return false;
//     }
//     return preMerge.deleteAll(t.fresh.map(v => v.name)).deleteAll(u.fresh.map(v => v.name));
//     // const merged = t.generics.map(tGen => tGen.type === 'variable' ? preMerge.get(tGen.name) : tGen);

// }

// export function unify(t: Type, u: Type, world: ImmMap<string, Type>): ImmMap<string, Type> | false {
//     if (t === u) {
//         return world;
//     }
//     if (t.type === 'variable') {
//         // return unifyVar(t, u, world);
//         const tw = walk(u, world);
//         return world.set(t.name, tw);
//     }
//     if (u.type === 'variable') {
//         // return unifyVar(u, t, world);
//         const uw = walk(t, world);
//         return world.set(u.name, uw);
//     }
//     if (t.type === 'complex' && u.type === 'complex') {
//         return unifyComplex(t, u, world);
//     }
//     if (t.type === 'union' && u.type === 'union') {
//         // Determine if the unions intersect
//         const intersect = t.types.some(tType => u.types.some(uType => unify(tType, uType, world)));
//         if (!intersect) {
//             console.warn(`Unions do not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return false;
//         }
//         if (t.types.length === 1) {
//             return unify(t.types[0], u, world);
//         }
//         if (u.types.length === 1) {
//             return unify(t, u.types[0], world);
//         }
//         let worldp = world;
//         for (const tType of t.types) {
//             for (const uType of u.types) {
//                 const world2 = unify(tType, uType, worldp);
//                 if (world2) {
//                     worldp = world2;
//                 }
//             }
//         }
//         return worldp;
//     }
//     if (t.type === 'union') {
//         const intersect = t.types.some(tType => unify(tType, u, world));
//         if (!intersect) {
//             console.warn(`Union does not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return false;
//         }
//         let worldp2 = world;
//         for (const tType of t.types) {
//             const world2 = unify(tType, u, worldp2);
//             if (world2) {
//                 worldp2 = world2;
//             }
//         }
//         return worldp2;
//     }
//     if (u.type === 'union') {
//         const intersect = u.types.some(uType => unify(t, uType, world));
//         if (!intersect) {
//             console.warn(`Union does not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return false;
//         }
//         let worldp3 = world;
//         for (const uType of u.types) {
//             const world2 = unify(t, uType, worldp3);
//             if (world2) {
//                 worldp3 = world2;
//             }
//         }
//         return worldp3;
//     }
//     if (t.type === 'simple' && u.type === 'simple') {
//         if (t.name !== u.name) {
//             return false;
//         }
//         return world;
//     }
//     console.warn(`Types do not match: ${pprintType(t)} and ${pprintType(u)}`);
//     return false;
// }

// //////////////////
// // Remake w/ environment AND value return
// //////////////////

// export function unify2(t: Type, u: Type, world: ImmMap<string, Type>): [Type, ImmMap<string, Type>] | [Type, false] {
//     if (t.type === 'variable' && t.name === 'qq' || u.type === 'variable' && u.name === 'qq') {
//         console.log(`QQQQQQQQQQQQQQQQQQQQQQQQQ-------------Unifying ${pprintType(t)} with ${pprintType(u)}`);
//     }
//     if (t === u) {
//         return [t, world];
//     }
//     if (u.type === 'variable') {
//         const uw = walk(t, world);
//         const tw = walk(u, world);
//         if (tw && uw && tw.type !== 'variable' && uw.type !== 'variable') {
//             const [ut, world2] = unify2(tw, uw, world);
//             if (world2) {
//                 return [ut, world2.set(u.name, ut)];
//             }
//             return [t, false];
//         }
//         return [uw, world.set(u.name, uw)];
//     }
//     if (t.type === 'variable') {
//         const tw = walk(u, world);
//         const uw = walk(t, world);
//         if (tw && uw && tw.type !== 'variable' && uw.type !== 'variable') {
//             const [ut, world2] = unify2(tw, uw, world);
//             if (world2) {
//                 return [ut, world2.set(t.name, ut)];
//             }
//             return [t, false];
//         }
//         return [tw, world.set(t.name, tw)];
//     }
//     if (t.type === 'complex' && u.type === 'complex') {

//         const [res, wr] = unifyComplex2(t, u, world);
//         console.log(`Unifying ${pprintType(t)} with ${pprintType(u)}
//         Got: ${pprintType(res)}`);
//         return [res, wr];

//     }
//     if (t.type === 'union' || u.type === 'union') {
//         // Determine if the unions intersect
//         return handleUnionTypes(t, u, world);
//     }
//     if (t.type === 'simple' && u.type === 'simple') {
//         if (t.name !== u.name) {
//             return [t, false];
//         }
//         return [t, world];
//     }
//     console.warn(`Types do not match: ${pprintType(t)} and ${pprintType(u)}`);
//     return [t, false];
// }

// const unifyComplex2 = (t: ComplexType, u: ComplexType, world: ImmMap<string, Type>): [Type, ImmMap<string, Type>] | [Type, false] => {
//     if (t.name !== u.name || t.generics.length !== u.generics.length) {
//         console.warn(`Complex types do not match: ${pprintType(t)} and ${pprintType(u)}`);
//         return [t, false];
//     }

//     let world2 = [...t.fresh, ...u.fresh].reduce<ImmMap<string, Type>>((world, v) => {
//         return world.set(v.name, make.type_variable(v.name));
//     }, world);

//     const toIgnore = new Set<string>([...t.fresh.map(v => v.name), ...u.fresh.map(v => v.name)]);
//     const ct = [...t.generics];
//     const uct = [...u.generics];
//     // swap out the fresh variables
//     for (const v of t.fresh) {
//         const indices = ct.map((g, i) => g.type === 'variable' && g.name === v.name ? i : -1).filter(i => i !== -1);
//         let uvb: Type = v;
//         for (const i of indices) {
//             const [ut, world3] = unify2(uct[i], uvb, world2);
//             if (!world3) {
//                 console.warn(`Generics do not match: ${t.generics} and ${u.generics}`);
//                 return [t, false];
//             }
//             uvb = ut;
//             world2 = world3;
//         }
//         for (const i of indices) {
//             ct[i] = uvb;
//         }
//     }

//     for (const v of u.fresh) {
//         const indices = uct.map((g, i) => g.type === 'variable' && g.name === v.name ? i : -1).filter(i => i !== -1);
//         let uvb: Type = v;
//         for (const i of indices) {
//             const [ut, world3] = unify2(ct[i], uvb, world2);
//             if (!world3) {
//                 console.warn(`Generics do not match: ${t.generics} and ${u.generics}`);
//                 return [t, false];
//             }
//             uvb = ut;
//             world2 = world3;
//         }
//         for (const i of indices) {
//             uct[i] = uvb;
//         }
//     }

//     let preMerge1 = world2;
//     for (let i = 0; i < t.generics.length; i++) {
//         const [ct2, preMerge2] = unify2(ct[i], uct[i], preMerge1);
//         if (!preMerge2) {
//             console.warn(`Generics do not match: ${t.generics} and ${u.generics}`);
//             return [t, false];
//         }
//         ct[i] = ct2;
//         preMerge1 = preMerge2;
//     }
//     const remainingTypeVars = ct.flatMap(gc => [...generateTypeVars(gc)]).filter(v => toIgnore.has(v.name));
//     const allRemainingTypeVars = [...remainingTypeVars];
//     const renameTvarMap = new Map(allRemainingTypeVars.map((tvar, i) => [tvar.name, make.type_variable(`T_${i}`)]));
//     const otherTypeVars = ct.flatMap(gc => [...generateTypeVars(gc)]).filter(v => !toIgnore.has(v.name)).map(sdf => sdf.name);
//     const renameTypeVarFn = (st: string) => {
//         if (otherTypeVars.includes(st)) return make.type_variable(st);
//         const renamed = renameTvarMap.get(st);
//         if (!renamed) throw new Error(`Type variable ${st} not found in ${renameTvarMap}`);
//         return renamed;
//     };
//     const ofresh = [...remainingTypeVars].filter(zs => {
//         const zsw = walk(zs, preMerge1);
//         return zsw !== zs && zsw.type !== 'variable';
//     })
//     const ot: ComplexType = {
//         type: 'complex',
//         name: t.name,
//         fresh: ofresh.map(vz => renameTypeVarFn(vz.name)),
//         generics: ct.map(ttv => replaceTypeVars(ttv, renameTypeVarFn))
//     };
//     if (!preMerge1) {
//         console.warn(`Generics do not match: ${t.generics} and ${u.generics}`);
//         return [t, false];
//     }
//     return [ot, preMerge1.deleteAll(t.fresh.map(v => v.name)).deleteAll(u.fresh.map(v => v.name))];
// }

// const handleUnionTypes = (t: Type, u: Type, world: ImmMap<string, Type>): [Type, ImmMap<string, Type>] | [Type, false] => {
//     if (t.type === 'union' && u.type === 'union') {
//         // Determine if the unions intersect
//         const intersect = t.types.some(tType => u.types.some(uType => unify(tType, uType, world)));
//         if (!intersect) {
//             console.warn(`Unions do not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return [t, false];
//         }
//         if (t.types.length === 1) {
//             return unify2(t.types[0], u, world);
//         }
//         if (u.types.length === 1) {
//             return unify2(t, u.types[0], world);
//         }
//         let worldp = world;
//         const newUnity: Type[] = [];
//         for (const tType of t.types) {
//             for (const uType of u.types) {
//                 const [unityT, world2] = unify2(tType, uType, worldp);
//                 if (world2) {
//                     worldp = world2;
//                     newUnity.push(unityT);
//                 }
//             }
//         }
//         return [make.union_type(...newUnity), worldp];
//     } if (t.type === 'union') {
//         const intersect = t.types.some(tType => unify(tType, u, world));
//         if (!intersect) {
//             console.warn(`Union does not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return [t, false];
//         }
//         let worldp2 = world;
//         const newUnity: Type[] = [];
//         for (const tType of t.types) {
//             const [unityT, world2] = unify2(tType, u, worldp2);
//             if (world2) {
//                 worldp2 = world2;
//                 newUnity.push(unityT);
//             }
//         }
//         return [make.union_type(...newUnity), worldp2];
//     } if (u.type === 'union') {
//         const intersect = u.types.some(uType => unify(t, uType, world));
//         if (!intersect) {
//             console.warn(`Union does not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//             return [t, false];
//         }
//         let worldp3 = world;
//         const newUnity: Type[] = [];
//         for (const uType of u.types) {
//             const [unityT, world2] = unify2(t, uType, worldp3);
//             if (world2) {
//                 worldp3 = world2;
//                 newUnity.push(unityT);
//             }
//         }
//         return [make.union_type(...newUnity), worldp3];
//     }
//     console.warn(`Unions do not intersect: ${pprintType(t)} and ${pprintType(u)}`);
//     return [t, false];
// }

// function testUnification(tss: [Type, Type, ImmMap<string, Type>][]): void {
//     let counter = 0;
//     for (const [t, u, world] of tss) {
//         const [unified, newWorld] = unify2(t, u, world);
//         console.log(`${counter}. ------------------------`);
//         if (newWorld === false) {
//             console.warn(`Unification failed: ${pprintType(t)} and ${pprintType(u)}`);
//         } else {
//             console.log(`Unifying ${pprintType(t)} with ${pprintType(u)}:
//             Old World:
//                 ${printTypeMap(world)}
//             New World:
//                 ${newWorld ? printTypeMap(newWorld) : 'ERROR NULL!!!!!'}
// Result: ${pprintType(unified)}`);
//         }
//         console.log('------------------------');
//         counter++;
//     }

// }

// const uTests: [Type, Type, ImmMap<string, Type>][] = [
//     [make.simple_type('string'), make.simple_type('string'), ImmMap<string, Type>()],
//     [make.simple_type('string'), make.simple_type('number'), ImmMap<string, Type>()],
//     // two type vars
//     [make.type_variable('T1'), make.type_variable('T2'), ImmMap<string, Type>()],
//     // two complex vars
//     [
//         make.complex_type('list', [make.type_variable('T1')], [make.type_variable('T1')]),
//         make.complex_type('list', [], [make.simple_type('number')]),
//         ImmMap<string, Type>()
//     ],
//     // complex var with simple var
//     [
//         make.complex_type('list', [make.type_variable('T1')], [make.type_variable('T1')]),
//         make.simple_type('number'),
//         ImmMap<string, Type>()
//     ],
//     // predicate union with another predicate
//     [
//         make.union_type(
//             make.complex_type('predicate', [], [make.simple_type('number')]),
//             make.complex_type('predicate', [], [make.simple_type('string')]),
//         ),
//         make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1')]),
//         ImmMap<string, Type>()
//     ],
//     // predicate union with another predicate, showing constraints
//     [
//         make.union_type(
//             make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
//             make.complex_type('predicate', [], [make.simple_type('string')]),
//         ),
//         make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         ImmMap<string, Type>()
//     ],
//     // predicate union, with a type var that has a predicate in the map
//     [
//         make.type_variable('predtest'),
//         make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1')]),
//         ImmMap<string, Type>({
//             predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//         })
//     ],
//     [
//         make.type_variable('predtest'),
//         make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         ImmMap<string, Type>({
//             predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//         })
//     ],
//     [
//         make.type_variable('predtest'),
//         make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
//         ImmMap<string, Type>({
//             // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//             predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         })
//     ],
//     [
//         make.type_variable('predtest'),
//         // make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
//         make.complex_type('predicate', [], [make.type_variable('x1'), make.type_variable('x2')]),
//         ImmMap<string, Type>({
//             x1: make.simple_type('number'),
//             // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//             predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         })
//     ],
//     [
//         // make.complex_type('predicate', [], [make.type_variable('x1'),make.type_variable('x2')]),
//         make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         // make.type_variable('predtest'),
//         // make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')]),
//         make.complex_type('predicate', [], [make.type_variable('x1'), make.type_variable('x2')]),
//         ImmMap<string, Type>({
//             x1: make.simple_type('number'),
//             // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//             predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'), make.type_variable('P1')]),
//         })
//     ],
//     [
//         make.type_variable('predtest'),
//         make.complex_type('predicate', [], [make.simple_type('number'),
//         make.type_variable('x2')
//         ]),
//         ImmMap<string, Type>({
//             // predtest: make.complex_type('predicate', [], [make.simple_type('number'), make.simple_type('number')])
//             // predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'),make.type_variable('P1')]),
//             predtest: make.complex_type('predicate', [make.type_variable('P1')], [make.type_variable('P1'),
//             make.complex_type('list', [], [make.type_variable('P1')])
//             ]),
//         })
//     ],
// ]

// // testUnification(uTests);

function unify(t: Type, u: Type, world: ImmMap<string, Type>): ImmMap<string, Type> {
    if (t === u) {
        return world;
    }
    if (t.type === 'variable') {
        const tw = walk(u, world);
        return world.set(t.name, tw);
    }
    if (u.type === 'variable') {
        const uw = walk(t, world);
        return world.set(u.name, uw);
    }
    if (t.type === 'complex' && u.type === 'complex') {
        return unifyComplex(t, u, world);
    }
    if (t.type === 'union' || u.type === 'union') {
        return handleUnionTypes(t, u, world);
    }
    if (t.type === 'simple' && u.type === 'simple') {
        if (t.name !== u.name) {
            return false;
        }
        return world;
    }
    console.warn(`Types do not match: ${pprintType(t)} and ${pprintType(u)}`);
    return false;
}