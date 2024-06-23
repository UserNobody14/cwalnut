import type { Type, ComplexType, TypeVariable, UnionType } from 'src/types/EzType';
import { Map as ImmMap, Set as ImmSet } from 'immutable';
import { pprintType } from 'src/redo/pprintgeneric';
import { make } from 'src/utils/make_better_typed';
// import { ComplexType } from 'src/types/Type';

export function pprintTypeMap(world: ImmMap<string, Type>): string {
    if (world.size === 0) {
        return '<<Empty world>>';
    }
    return `Type Map: {
${[...world.entries()].map(([k, v]) => `     ${k} = ${pprintType(v)}`).join('\n')}
    }`;
}

const is_predicate = (type: Type): type is ComplexType => {
    return type.type === 'complex' && type.name === 'predicate';
}

const is_complex = (type: Type): type is ComplexType => {
    return type.type === 'complex';
}

const is_parametric = (type: Type): type is ComplexType => {
    return type.type === 'complex' && type.name !== 'predicate' && type.fresh.length === 0;
}

const is_forall = (type: Type): type is ComplexType => {
    return type.type === 'complex' && type.fresh.length > 0;
}

// Unification function
export function unify(t1?: Type, t2?: Type, subst = ImmMap<string, Type>()): ImmMap<string, Type> {
    if (!t1) throw new Error("t1 is undefined");
    if (!t2) throw new Error("t2 is undefined");
    if (t1.type === 'variable') {
        return unifyVar(t1, t2, subst);
    } if (t2.type === 'variable') {
        return unifyVar(t2, t1, subst);
    } 
    // if (is_predicate(t1) && is_predicate(t2)) {
    //     // return unifyPredicate(t1, t2, subst);
    //     return unifyFreshComplex(t1.fresh, t2.fresh, t1.generics, t2.generics, subst);
    // }
    if (t1.type === 'union') {
        return unifyUnion(t1, t2, subst);
    }
    if (t2.type === 'union') {
        return unifyUnion(t2, t1, subst);
    }
    if (t1.type === 'simple' && t2.type === 'simple') {
        return subst;
    }
    if (t1.type === 'complex' && t1.fresh.length > 0) {
        return unify(instantiate(t1), t2, subst);
    } 
    if (t2.type === 'complex' && t2.fresh.length > 0) {
        return unify(t1, instantiate(t2), subst);
    }
    if (is_complex(t1) && is_complex(t2)){
        return unifyParametric(t1, t2, subst);
        // return unifyFreshComplex(t1.fresh, t2.fresh, t1.generics, t2.generics, subst);
    }
    throw new Error(`Cannot unify types ${pprintType(t1)} and ${pprintType(t2)} in env:
    ${pprintTypeMap(subst)}`);
}

// function unifyPredicate(t1: ComplexType, t2: ComplexType, subst: ImmMap<string, Type>): ImmMap<string, Type> {
//     if (t1.name !== t2.name || t1.generics.length !== t2.generics.length) {
//         throw new Error(`Cannot unify predicate types: ${t1} and ${t2}`);
//     }

//     if (t1.fresh.length > 0) {
//         return unify(instantiate(t1), t2, subst);
//     } else if (t2.fresh.length > 0) {
//         return unify(t1, instantiate(t2), subst);
//     }

//     let newSubst = subst;
//     for (let i = 0; i < t1.generics.length; i++) {
//         newSubst = unify(t1.generics[i], t2.generics[i], newSubst);
//     }
//     return newSubst;
// }

function unifyUnion(union: UnionType, t: Type, subst: ImmMap<string, Type>): ImmMap<string, Type> {
    // if (t1.types.length !== t2.types.length) {
    //   throw new Error(`Cannot unify union types with different lengths: ${t1} and ${t2}`);
    // }

    // return t1.types.reduce((acc, type, index) => {
    //   return unify(type, t2.types[index], acc);
    // }, subst);
    if (union.types.length === 0) {
        throw new Error(`Cannot unify empty union type with type ${pprintType(t)}`);
    }
    if (union.types.length === 1) {
        return unify(union.types[0], t, subst);
    }
    const matchedEnvs = [];
    for (const type of union.types) {
        try {
            const newT = unify(type, t, subst);
            return newT;
            // matchedEnvs.push(newT);
        } catch (e) {
            console.warn(`Within Union, failed to unify ${pprintType(type)} with ${pprintType(t)}
            Err: ${e}`);
            
            // Continue trying other types in the union
        }
    }
    throw new Error(`Cannot unify union type ${pprintType(union)} with type ${pprintType(t)} in env:
    ${pprintTypeMap(subst)}`);
    // if (matchedEnvs.length === 0) {
    //     throw new Error(`Cannot unify union type ${pprintType(union)} with type ${pprintType(t)}`);
    // } else if (matchedEnvs.length > 1) {
    //     console.warn(`Multiple unifications found for union type ${pprintType(union)} with type ${pprintType(t)}`);        
    // }
    // return matchedEnvs[0];
}

function unifyParametric(t1: ComplexType, t2: ComplexType, subst: ImmMap<string, Type>): ImmMap<string, Type> {
    if (t1.name !== t2.name || t1.generics.length !== t2.generics.length) {
        throw new Error(`Cannot unify parametric types: ${pprintType(t1)} and ${pprintType(t2)}`);
    }

    return t1.generics.reduce((acc, param, index) => {
        return unify(param, t2.generics[index], acc);
    }, subst);
}


function unifyVar(v: TypeVariable, t: Type, subst: ImmMap<string, Type>): ImmMap<string, Type> {
    // if (t.type === 'variable' && v.name === t.name) {
    //     return subst;
    // }
    if (subst.has(v.name)) {
        return unify(subst.get(v.name), t, subst);
    } if (t.type === 'variable' && subst.has(t.name)) {
        return unify(v, subst.get(t.name), subst);
    } if (occursCheck(v, t, subst)) {
        throw new Error(`Occurs check failed: ${pprintType(v)} in ${pprintType(t)}`);
    }
    return subst.set(v.name, t);
}

function occursCheck(v: TypeVariable, t: Type, subst: ImmMap<string, Type>): boolean {
    if (t.type === 'variable') {
        return v.name === t.name || (subst.has(t.name) && occursCheck(v, subst.get(t.name) as Type, subst));
    } if (is_predicate(t)) {
        return t.generics.some((g) => occursCheck(v, g, subst));
    } if (t.type === 'union') {
        return t.types.some((g) => occursCheck(v, g, subst));
    }
    return false;
}






//////////////
//////////
/////////////

function instantiate(type: Type): Type {
    if (type.type === 'complex' && type.fresh.length > 0) {
      let subst = ImmMap<string, Type>();
      for (const varName of type.fresh) {
        subst = subst.set(varName.name, make.type_variable(generateFreshVarName()));
      }
      const instantiatedGenerics = type.generics.map((g) => applySubstitution(g, subst));
      return make.complex_type(
        type.name,
        type.fresh.filter((v) => instantiatedGenerics.some((g) => occursCheck(v, g, subst))),
        instantiatedGenerics
      );
    }
    return type;
  }

// Helper function to generate fresh type variable names
let varCounter = 0;
function generateFreshVarName(): string {
    return `tt${varCounter++}`;
}

function applySubstitution(type: Type, subst: ImmMap<string, Type>): Type {
    if (type.type === 'variable') {
        return subst.get(type.name) || type;
    } if (type.type === 'union') {
        // return new TUnion(type.types.map(t => applySubstitution(t, subst)));
        return make.union_type(...type.types.map(t => applySubstitution(t, subst)));
    } if (type.type === 'complex') {

        if (type.fresh.length > 0) {
            // Avoid substituting bound type variables
            let newSubst = subst;
            for (const varName of type.fresh) {
                newSubst = newSubst.delete(varName.name);
            }
            // return new TForall(type.vars, applySubstitution(type.type, newSubst));
            return make.complex_type(
                type.name,
                type.fresh,
                type.generics.map((g) => applySubstitution(g, newSubst))
            );
        }

        // return new TParametric(type.name, type.parameters.map(p => applySubstitution(p, subst)));
        return make.complex_type(
            type.name,
            type.fresh,
            type.generics.map((g) => applySubstitution(g, subst))
        );
    }
    return type;
}

// function unifyFreshComplex(t1Fresh: TypeVariable[], t2Fresh: TypeVariable[], 
//     t1Generics: Type[], t2Generics: Type[], subst: ImmMap<string, Type>): ImmMap<string, Type> {
//     if (t1Generics.length !== t2Generics.length) {
//         throw new Error(`Cannot unify complex types with different numbers of generics: ${t1Generics} and ${t2Generics}`);
//     }
//     let subst1 = ImmMap<string, Type>();    ;
//     for (let i = 0; i < t1Fresh.length; i++) {
//         subst1 = subst1.set(t1Fresh[i].name, make.type_variable(generateFreshVarName()));
//     }
//     for (let i = 0; i < t2Fresh.length; i++) {
//         subst1 = subst1.set(t2Fresh[i].name, make.type_variable(generateFreshVarName()));
//     }
//     // for (let i = 0; i < t1Generics.length; i++) {
//     //     subst1 = ;
//     // }
//     let newSubst = subst;
//     for (let i = 0; i < t1Generics.length; i++) {
//         // subst1 = unify(t1Generics[i], t2Generics[i], subst1);
//         newSubst = unify(t1Generics[i], t2Generics[i], newSubst);
//     }
//     return newSubst;
// }

export function unifyTwoMaps(subst1: ImmMap<string, Type>, subst2: ImmMap<string, Type>): ImmMap<string, Type> {
    let newSubst = subst1;
    for (const [k, v] of subst2.entries()) {
        const bk = subst1.get(k);
        newSubst = newSubst.set(
            k,
            bk ? make.union1(
                v,
                bk
            ) : v
        )
    }
    for (const k of ImmSet(subst1.keys()).subtract(
        ImmSet(subst2.keys())
    )) {
        const v = subst1.get(k);
        if (!v) throw new Error(`Unification failed: ${k} not found in subst2`);
        newSubst = newSubst.set(k, v);
    }
    return newSubst;
}

export function reify(subst: ImmMap<string, Type>): ImmMap<string, Type> {
    let newSubst = subst;
    for (const [k, v] of subst.entries()) {
        newSubst = newSubst.set(k, reifyType(v, subst));
    }
    return newSubst;
}

export function reifyType(type: Type, subst: ImmMap<string, Type>): Type {
    if (type.type === 'variable') {
        const t = subst.get(type.name);
        if (!t) return type;
        if (occursCheck(type, t, subst)) {
            throw new Error(`Occurs check failed: ${pprintType(type)} in ${pprintType(t)}`);
        }
        return reifyType(t, subst);
    } if (type.type === 'union') {
        if (type.types.length === 0) {
            throw new Error("Cannot reify empty union type");
        }
        if (type.types.length === 1) {
            return reifyType(type.types[0], subst);
        }
        return make.union_type(...type.types.map(t => reifyType(t, subst)));
    } if (type.type === 'complex') {
        const finGen = type.generics.map(t => reifyType(t, subst));
        return make.complex_type(
            type.name,
            type.fresh.filter(v => finGen.some(g => occursCheck(v, g, subst))),
            finGen
        );
    }
    return type;
}