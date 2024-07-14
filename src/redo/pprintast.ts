import type {
	TermDsAst,
	ExpressionDsAst,
} from "src/types/DesugaredAst";
import type { Type } from "src/types/Types";
import { indentStr } from "./indentStr";

export function pprintDsAst(
	ast: TermDsAst | TermDsAst[],
	notypes: "withtype" | "without_type" = "without_type",
): string {
	if (Array.isArray(ast)) {
		return ast.map((a) => pprintDsAst(a, notypes)).join("\n");
	}
	switch (ast.type) {
		case "conjunction":
			return `conj:
${ast.terms
	.map((a) => pprintDsAst(a, notypes))
	.map((ii) => indentStr(1, ii))
	.join("\n")}`;
		case "disjunction":
			return `disj:
${ast.terms
	.map((a) => pprintDsAst(a, notypes))
	.map((ii) => indentStr(1, ii))
	.join("\n")}`;
		case "predicate_call":
			return `${pprintExprAst(ast.source)}(${pprintExprListAst(ast.args, notypes)})`;
		case "predicate_definition":
			return `DEFINE ${ast.name.value} as (${pprintExprListAst(ast.args)}) => 
${indentStr(1, pprintDsAst(ast.body.terms, notypes))}`;
		case "fresh":
			return `fresh ${ast.newVars.map((v) => v.value).join(", ")}:
${indentStr(1, pprintDsAst(ast.body, notypes))}`;
		case "with":
			return `with ${ast.name.value}:
${indentStr(1, pprintDsAst(ast.body, notypes))}`;
		default:
			throw `Invalid ast type: ${ast}`;
	}
}
function pprintExprListAst(
	ast: ExpressionDsAst[],
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): string {
	return ast
		.map((ee) => pprintExprAst(ee, withtype, withio))
		.join(", ");
}
function pprintExprAst(
	ast: ExpressionDsAst,
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): string {
	switch (ast.type) {
		case "identifier":
			if (withtype === "withtype") {
				return `${ast.value}: UNUSED`;
			}
				return ast.value;
		case "literal":
			return JSON.stringify(ast.value);
	}
}
export function pprintType(ast: Type): string {
	switch (ast.type) {
		case "simple_type":
			return ast.name;
		case "hkt":
			return `${ast.args.map(pprintType).join(", ")} => ${pprintType(ast.apply(ast.args))}`;
		case "type_var":
			return `\$${ast.name}`;
		case "mono_predicate":
			return `Pred(${ast.args.map(pprintType).join(", ")})`;
		case "union":
			return `(${ast.options.map(pprintType).join(" | ")})`;
		case "complex_type":
			return `${ast.name}<${ast.args.map(pprintType).join(", ")}>`;
	}
}
