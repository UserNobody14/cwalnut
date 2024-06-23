import type { Type, TypeVariable } from "src/types/EzType";

export const replaceTypeVars = (type: Type, replace: (s: string) => Type): Type => {
    switch (type.type) {
        case 'variable': return replace(type.name);
        case 'simple': return type;
        case 'union': return {
            type: 'union',
            types: type.types.map(t => replaceTypeVars(t, replace))
        };
        case 'complex':
            return {
                type: 'complex',
                name: type.name,
                fresh: type.fresh,
                generics: type.generics.map(t => replaceTypeVars(t, replace))
            };
    }
};

export function* generateTypeVars(t: Type): Generator<TypeVariable> {
    switch (t.type) {
        case 'variable': yield t; break;
        case 'simple': break;
        case 'union': for (const tt of t.types) yield* generateTypeVars(tt); break;
        case 'complex': for (const tt of t.generics) yield* generateTypeVars(tt); break;
    }
}