import type {
	InOutType,
	TypeMeta,
	Type,
	MonoPredicateType,
	Union,
	TypeVar,
	HKT,
	ComplexType,
	SimpleType,
} from "../types/Types";
import type { IdentifierTyped } from "../types/DesugaredAstTyped";

// export type boundType = SimpleType | Union | MonoPredicateType;
// Utilities
export const to_type_meta = (
		inout: InOutType = "inout",
		linear = false,
	): TypeMeta => ({
		inout,
		linear,
	}),
	to_mono_pred = (
		args: Type[],
		inout: InOutType = "inout",
		linear = false,
	): MonoPredicateType => ({
		type: "mono_predicate",
		args,
		meta: to_type_meta(inout, linear),
	}),
	to_union = (options: Type[]): Union => ({
		type: "union",
		options,
	}),
	to_hkt = (
		args: TypeVar[],
		apply: (args: Type[]) => Type,
		staticT: Type[],
	): HKT => ({
		type: "hkt",
		args,
		apply,
		staticT,
	}),
	to_complex_type = (
		name: string,
		args: Type[],
		inout: InOutType = "inout",
		linear = false,
	): ComplexType => ({
		type: "complex_type",
		name,
		args,
		meta: to_type_meta(inout, linear),
	}),
	to_type_var = (name: string): TypeVar => ({
		type: "type_var",
		name,
	}),
	to_simple_type = (
		name: string,
		inout: InOutType = "inout",
		linear = false,
	): SimpleType => ({
		type: "simple_type",
		name,
		meta: to_type_meta(inout, linear),
	}),
	to_dict = (key: Type, value: Type): ComplexType =>
		to_complex_type("dict", [key, value]);
export const types = {
	string: to_simple_type("string"),
	number: to_simple_type("number"),
	bool: to_simple_type("bool"),
	// any: to_simple_type('any'),
	// Builtin complex types
	// dict: to_complex_type('dict', [to_type_var('K'), to_type_var('V')]),
	// Builtin predicates
	unify: to_simple_type("unify"),
	set_key_of: to_simple_type("set_key_of"),
	length: to_simple_type("length"),
} as const;
// Builtin lvars for some utility predicates
export const builtins: Record<string, IdentifierTyped> = {
	unify: {
		type: "identifier",
		value: "unify",
		contextualType: types.unify,
	},
	set_key_of: {
		type: "identifier",
		value: "set_key_of",
		contextualType: types.set_key_of,
	},
	length: {
		type: "identifier",
		value: "length",
		contextualType: types.length,
	},
};
