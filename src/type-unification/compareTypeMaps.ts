import type { Type } from 'src/types/EzType';
import type { Map as ImmMap } from 'immutable';

export function compareTypes(a: Type, b?: Type): boolean {
    switch (a.type) {
        case 'simple':
            return b?.type === 'simple' && a.name === b.name;
        case 'variable':
            return b?.type === 'variable' && a.name === b.name;
        case 'union':
            return b?.type === 'union' && a.types.length === b.types.length && a.types.every((t, i) => compareTypes(t, b.types[i]));
        case 'complex':
            return b?.type === 'complex' && a.name === b.name &&
                a.fresh.length === b.fresh.length && a.fresh.every((t, i) => compareTypes(t, b.fresh[i])) &&
                a.generics.length === b.generics.length && a.generics.every((t, i) => compareTypes(t, b.generics[i]));
    }
}
export function compareTypeMaps(a: ImmMap<string, Type>, b: ImmMap<string, Type>): boolean {
    if (a.size === 0 && b.size !== 0) {
        return compareTypeMaps(b, a);
    }
    for (const [k, v] of a.entries()) {
        // Skip the tt0, tt1, etc. type variables
        if (k.startsWith('tt')) {
            continue;
        }
        if (!compareTypes(v, b.get(k))) {
            return false;
        }
    }
    return true;
}
