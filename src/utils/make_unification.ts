import type {
	Expression,
	LVarAst,
	LiteralAst,
	AttributeAst,
	BinaryOperatorAst,
	UnaryOperatorAst,
	ListAst,
	DictionaryAst,
	PredicateDefinitionAst,
	Term,
	Conjunction,
	Disjunction,
	Unification,
	PredicateCall,
} from "../types/OldAstTyped";

/////////////////////
// const is_simple_type = (t: TypeValue): t is SimpleTypeValue => t.type === 'simple',
//     is_complex_type = (t: TypeValue): t is ComplexType => t.type === 'complex';

export const is_lvar_ast = (e: Expression): e is LVarAst =>
		e.type === "lvar",
	is_literal_ast = (e: Expression): e is LiteralAst =>
		e.type === "literal",
	is_attribute_ast = (e: Expression): e is AttributeAst =>
		e.type === "attribute",
	is_binary_operator_ast = (
		e: Expression,
	): e is BinaryOperatorAst => e.type === "binary_operator",
	is_unary_operator_ast = (
		e: Expression,
	): e is UnaryOperatorAst => e.type === "unary_operator",
	is_list_ast = (e: Expression): e is ListAst =>
		e.type === "list",
	is_dictionary_ast = (e: Expression): e is DictionaryAst =>
		e.type === "dictionary",
	is_predicate_ast = (
		e: Expression,
	): e is PredicateDefinitionAst =>
		e.type === "predicate_definition";
const is_conjunction = (t: Term): t is Conjunction =>
		t.type === "conjunction";
const is_disjunction = (t: Term): t is Disjunction =>
		t.type === "disjunction";
const is_unification = (t: Term): t is Unification =>
		t.type === "unification";
const is_predicate = (t: Term): t is PredicateCall =>
		t.type === "predicate_call";
// is_type_signature = (t: TypeValue): t is TypeSignature => t.type === 'type_signature';
// const is_expression = (e: unknown): e is Expression =>
//     typeof e === 'object' && e !== null && 'type' in e &&
// 	(is_lvar_ast(e) ||
// 	is_literal_ast(e) ||
// 	is_attribute_ast(e) ||
// 	is_binary_operator_ast(e) ||
// 	is_unary_operator_ast(e) ||
// 	is_list_ast(e) ||
// 	is_dictionary_ast(e) ||
// 	is_predicate_ast(e));
// const is_type_value = (t: any): t is TypeValue => is_simple_type(t) || is_complex_type(t) || is_type_signature(t);
/////////////////////
export const make_conjunction = (
		...children: Term[]
	): Conjunction => ({
		type: "conjunction",
		children,
	}),
	make_disjunction = (
		...children: Term[]
	): Disjunction => ({
		type: "disjunction",
		children,
	}),
	make_unification = (
		left: Expression,
		kind: "=" | "!=" | "<<" | ">>" | "==",
		right: Expression,
	): Unification => ({
		type: "unification",
		left,
		kind,
		right,
	}),
	make_predicate = (
		source: Expression,
		args: Expression[],
	): PredicateCall => ({
		type: "predicate_call",
		source,
		args,
	});
export const make_lvar_ast = (name: string): LVarAst => ({
		type: "lvar",
		name,
	}),
	make_literal_ast = (
		value: string | number,
	): LiteralAst => ({
		type: "literal",
		value,
	}),
	make_attribute_ast = (
		object: Expression,
		attribute: string,
	): AttributeAst => ({
		type: "attribute",
		object,
		attribute,
	}),
	make_binary_operator_ast = (
		operator: string,
		left: Expression,
		right: Expression,
	): BinaryOperatorAst => ({
		type: "binary_operator",
		operator,
		left,
		right,
	}),
	make_unary_operator_ast = (
		operator: string,
		operand: Expression,
	): UnaryOperatorAst => ({
		type: "unary_operator",
		operator,
		operand,
	}),
	make_list_ast = (elements: Expression[]): ListAst => ({
		type: "list",
		elements,
	}),
	make_dictionary_ast = (
		entries: [Expression, Expression][],
	): DictionaryAst => ({
		type: "dictionary",
		entries,
	}),
	make_predicate_fn = (
		args: string[],
		children: Conjunction,
	): PredicateDefinitionAst => ({
		type: "predicate_definition",
		args,
		children,
	});
