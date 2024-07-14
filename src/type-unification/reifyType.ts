import type { Type } from 'src/types/EzType';
import type { Map as ImmMap } from 'immutable';
import { pprintType } from 'src/redo/pprintgeneric';
import { make } from 'src/utils/make_better_typed';
import { occursCheck, collapseUnion } from './aunt';


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
        // if (type.types.length === 1) {
        //     return reifyType(type.types[0], subst);
        // }
        const types2 = collapseUnion(type.types.map(t => reifyType(t, subst)));
        if (types2.length === 1) {
            return types2[0];
        }
        return make.union1(...types2);
        // return make.union1(...types2);
    } if (type.type === 'complex') {
        const finGen = type.generics.map(t => reifyType(t, subst));
        return make.complex_type(
            type.name,
            type.fresh.filter(v => finGen.some(g => occursCheck(v, g, subst))),
            finGen
        );
    }
    return type;
}export function reify(subst: ImmMap<string, Type>): ImmMap<string, Type> {
    let newSubst = subst;
    for (const [k, v] of subst.entries()) {
        newSubst = newSubst.set(k, reifyType(v, subst));
    }
    return newSubst;
}

