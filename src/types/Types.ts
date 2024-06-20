/**
 * Take in the ast and return a type annotated ast
 */
// Typing
export type InOutType = "in" | "out" | "inout";
export interface TypeMeta {
	inout?: InOutType;
	linear?: boolean;
}
export interface SimpleType {
	type: "simple_type";
	name: string;
	meta: TypeMeta;
}
export interface ComplexType {
	type: "complex_type";
	name: string;
	args: Type[];
	meta: TypeMeta;
}
export interface HKT {
	type: "hkt";
	args: TypeVar[];
	staticT: Type[];
	apply: (args: Type[]) => Type;
}
export interface TypeVar {
	type: "type_var";
	name: string;
}
export interface MonoPredicateType {
	type: "mono_predicate";
	args: Type[];
	meta: TypeMeta;
}
export interface Union {
	type: "union";
	options: Type[];
}

export type Type =
	| SimpleType
	| HKT
	| TypeVar
	| Union
	| MonoPredicateType
	| ComplexType;
export type UnboundType = TypeVar | HKT;
