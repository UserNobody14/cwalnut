import {
	CodeLocation,
	defaultCodeLocation,
} from "src/redo/codeloc";
import {
	deflex,
	Expression,
	ezmakeMaker,
	FlexExpression,
	FullExpression,
	make,
	make_pred_expr,
} from "src/utils/make_better_typed";
import type {
	ExpressionGeneric,
	IdentifierGeneric,
	LiteralGeneric,
	PredicateCallGeneric,
	TermGeneric,
} from "src/types/AstGeneric";

const cloc: CodeLocation = defaultCodeLocation;

export type Id = IdentifierGeneric<CodeLocation>;
export type Call = PredicateCallGeneric<CodeLocation>;
export type Expr = ExpressionGeneric<CodeLocation>;
export type CodeExpr = FlexExpression<CodeLocation>;

export function id(name: string): Id {
	return make.identifier(cloc, name);
}

export function usingMappedCodeExprs<T>(
	exprs: CodeExpr[],
	fn: (
		mappedArgs: ExpressionGeneric<CodeLocation>[],
		terms: TermGeneric<CodeLocation>[],
	) => TermGeneric<CodeLocation>,
) {
	const mappedExprs: FullExpression<CodeLocation>[] =
		exprs.map((expr) => deflex(expr));
	const mappedTerms = mappedExprs.flatMap(
		([_, terms]) => terms,
	);
	const mappedArgValues = mappedExprs.map(
		([expr, _]) => expr,
	);
	return fn(mappedArgValues, mappedTerms);
}

export const cx: Record<
	string,
	IdentifierGeneric<CodeLocation>
> = new Proxy(
	{},
	{
		get: (_, prop) => id(prop.toString()),
	},
);

export const cl: Record<
	string,
	(...args: CodeExpr[]) => TermGeneric<CodeLocation>
> = new Proxy(
	{},
	{
		get:
			(_, prop) =>
			(...args: CodeExpr[]) =>
				usingMappedCodeExprs(args, (mappedArgs, terms) =>
					conj1(
						...terms,
						call(prop.toString(), ...mappedArgs),
					),
				),
	},
);

const ezast = ezmakeMaker(defaultCodeLocation);

export const cl2: Record<
	string,
	(...args: CodeExpr[]) => CodeExpr
> = new Proxy(
	{},
	{
		get:
			(_, prop) =>
			(...args: CodeExpr[]) =>
				make_pred_expr(
					prop.toString(),
					args,
					defaultCodeLocation,
					null,
					0,
				),
	},
);

export function lit(
	value: string | number | boolean | null,
) {
	if (value === null) {
		return make.literal("null", "null");
	}
	if (typeof value === "string") {
		return make.literal("string", value);
	}
	if (typeof value === "number") {
		return make.literal("number", value.toString());
	}
	if (typeof value === "boolean") {
		return make.literal("boolean", value.toString());
	}
	throw new Error(`Invalid literal value: ${value}`);
}
export function conj(
	...terms: TermGeneric<CodeLocation>[]
) {
	return make.conjunction(terms);
}

export function conj1(
	...terms: TermGeneric<CodeLocation>[]
) {
	if (terms.length === 0) {
		return make.conjunction<CodeLocation>([]);
	}
	if (terms.length === 1) {
		return terms[0];
	}
	return make.conjunction(terms);
}

export function call(
	source: string,
	...args: (
		| ReturnType<typeof id>
		| ReturnType<typeof lit>
	)[]
) {
	return make.predicate_call(id(source), args);
}
export function def(
	name: string,
	args: ReturnType<typeof id>[],
	body: ReturnType<typeof conj>,
) {
	return make.predicate_definition(id(name), args, body);
}
