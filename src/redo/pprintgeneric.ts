
import type { Type } from "src/types/EzType";
import { indentStr } from "./indentStr";
import type { TermGeneric, ExpressionGeneric, TermT } from "src/types/DsAstTyped";

type CtxType = {
    withtype: "withtype" | "without_type";
    withio: "withio" | "without_io";
    is_being_called: boolean;
};

const typeIONotCalled: CtxType = {
    withtype: "without_type",
    withio: "withio",
    is_being_called: false,
};
const typeIOCalled: CtxType = {
    withtype: "without_type",
    withio: "withio",
    is_being_called: true,
};
const typeIOType: CtxType = {
    withtype: "withtype",
    withio: "withio",
    is_being_called: false,
};

export function pprintGeneric<T>(
    ast: TermGeneric<T> | TermGeneric<T>[],
    printMeta: (ctx: CtxType, meta: T) => string,
): string {
    if (Array.isArray(ast)) {
        return ast.map((a) => pprintGeneric<T>(a, printMeta)).join("\n");
    }
    switch (ast.type) {
        case "conjunction":
            return `conj:
${ast.terms
    .map((t) => pprintGeneric<T>(t, printMeta))
    .map((ii) => indentStr(1, ii))
    .join("\n")}`;
        case "disjunction":
            return `disj:
${ast.terms
    .map((t) => pprintGeneric<T>(t, printMeta))
    .map((ii) => indentStr(1, ii))
    .join("\n")}`;
        case "predicate_call":
            return `${pprintExprAst(ast.source, printMeta, typeIOCalled)}(${pprintExprListAst(ast.args, printMeta, typeIOType)})`;
        case "predicate_definition":
            return `DEFINE [${pprintExprAst(ast.name, printMeta, typeIOType)}] as (${pprintExprListAst(ast.args, printMeta, typeIOType)}) => 
${indentStr(1, pprintGeneric<T>(ast.body.terms, printMeta))}`;
        case "fresh":
            return `fresh ${ast.newVars.map((v) => v.value).join(", ")}:
${indentStr(1, pprintGeneric<T>(ast.body, printMeta))}`;
        case "with":
            return `with ${ast.name.value}:
${indentStr(1, pprintGeneric<T>(ast.body, printMeta))}`;
        default:
            throw `Invalid ast type: ${ast}`;
    }
}
function pprintExprListAst<T>(
	ast: ExpressionGeneric<T>[],
    printMeta: (ctx: CtxType, meta: T) => string,
    ctx: CtxType,
): string {
	return ast
		.map((ee) => pprintExprAst(ee, printMeta, ctx))
		.join(", ");
}
function pprintExprAst<T>(
	ast: ExpressionGeneric<T>,
    printMeta: (ctx: CtxType, meta: T) => string,
    ctx: CtxType,
): string {
	switch (ast.type) {
		case "identifier":
			// if (withtype === "withtype") {
			// 	return `${ast.value}: UNUSED`;
			// }
			return `${ast.value}${printMeta(ctx, ast.info)}`;
		case "literal":
			return JSON.stringify(ast.value);
	}
}
export function pprintType(ast: Type): string {
	switch (ast.type) {
		case "simple":
			return ast.name;
		// case "hkt":
			// return `${ast.args.map(pprintType).join(", ")} => ${pprintType(ast.apply(ast.args))}`;
		case "variable":
			return `\$${ast.name}`;
		// case "mono_predicate":
			// return `Pred(${ast.args.map(pprintType).join(", ")})`;
		case "union":
			return `(${ast.types.map(pprintType).join(" | ")})`;
		case "complex":
			return `${ast.name}${
                ast.fresh.length > 0 ? `[${ast.fresh.map(pprintType).join(", ")}]` : ""
            }<${ast.generics.map(pprintType).join(", ")}>`;
	}
}
export function pprintTypeMeta(ctx: CtxType, meta: Type): string {
    return ctx.withtype === "withtype" ? `: ${pprintType(meta)}` : "";
}

export function pprintTermT(terms: TermT | TermT[]): string {
    return pprintGeneric(terms, pprintTypeMeta);
}