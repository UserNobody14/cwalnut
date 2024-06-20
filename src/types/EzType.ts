export interface SimpleType {
    type: 'simple',
    name: string,
}

export interface TypeVariable {
    type: 'variable',
    name: string,
}

export interface ComplexType {
    type: 'complex',
    name: string,
    generics: Type[],
}

export interface UnionType {
    type: 'union',
    types: Type[],
}

export interface ConstraintType {
    type: 'constraint',
    constrain: (s: UnionType) => boolean,
}

export type Type = SimpleType | TypeVariable | ComplexType | UnionType;