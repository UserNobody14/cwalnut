import type {
	ConjunctionDsAst,
	ExpressionDsAst,
	IdentifierDsAst,
	TermDsAst,
} from "src/types/DesugaredAst";
import { ConjunctionGeneric, ExpressionGeneric, IdentifierGeneric, TermGeneric } from "src/types/DsAstTyped";

export function renameVar(
	inputName: string,
	outputName: string,
	term: TermDsAst,
): TermDsAst {
	switch (term.type) {
		case "conjunction":
			return {
				type: "conjunction",
				terms: term.terms.map((t) =>
					renameVar(inputName, outputName, t),
				),
			};
		case "disjunction":
			return {
				type: "disjunction",
				terms: term.terms.map((t) =>
					renameVar(inputName, outputName, t),
				),
			};
		case "fresh":
			if (term.newVars.some((v) => v.value === inputName)) {
				return term;
			}
			return {
				type: "fresh",
				newVars: term.newVars,
				body: renameVar(
					inputName,
					outputName,
					term.body,
				) as ConjunctionDsAst,
			};
		case "with":
			return {
				type: "with",
				name: term.name,
				body: renameVar(
					inputName,
					outputName,
					term.body,
				) as ConjunctionDsAst,
			};
		case "predicate_call":
			return {
				type: "predicate_call",
				source: renameQuick(
					inputName,
					outputName,
					term.source,
				) as IdentifierDsAst,
				args: term.args.map((a) =>
					renameQuick(inputName, outputName, a),
				),
			};
		case "predicate_definition":
			return term;
	}
}

function renameQuick(
	inputName: string,
	outputName: string,
	expr: ExpressionDsAst,
): ExpressionDsAst {
	switch (expr.type) {
		case "identifier":
			return {
				type: "identifier",
				value:
					expr.value === inputName
						? outputName
						: expr.value,
			};
		case "literal":
			return expr;
	}
}


function renameVarGeneric<T>(
	inputName: string,
	outputName: string,
	term: TermGeneric<T>
): TermGeneric<T> {
	switch (term.type) {
		case "conjunction":
			return {
				type: "conjunction",
				terms: term.terms.map((t) =>
					renameVarGeneric(inputName, outputName, t),
				),
			};
		case "disjunction":
			return {
				type: "disjunction",
				terms: term.terms.map((t) =>
					renameVarGeneric(inputName, outputName, t),
				),
			};
		case "fresh":
			if (term.newVars.some((v) => v.value === inputName)) {
				return term;
			}
			return {
				type: "fresh",
				newVars: term.newVars,
				body: renameVarGeneric(
					inputName,
					outputName,
					term.body,
				) as ConjunctionGeneric<T>,
			};
		case "with":
			return {
				type: "with",
				name: term.name,
				body: renameVarGeneric(
					inputName,
					outputName,
					term.body,
				) as ConjunctionGeneric<T>,
			};
		case "predicate_call":
			return {
				type: "predicate_call",
				source: renameQuickGeneric(
					inputName,
					outputName,
					term.source,
				) as IdentifierGeneric<T>,
				args: term.args.map((a) =>
					renameQuickGeneric(inputName, outputName, a),
				),
			};
		case "predicate_definition":
			return {
				type: "predicate_definition",
				name: renameIdGeneric(inputName, outputName, term.name),
				args: term.args.map((a) => renameIdGeneric(inputName, outputName, a)),
				body: renameVarGeneric(inputName, outputName, term.body) as ConjunctionGeneric<T>
			};
	}
}

function renameQuickGeneric<T>(
	inputName: string,
	outputName: string,
	expr: ExpressionGeneric<T>,
): ExpressionGeneric<T> {
	switch (expr.type) {
		case "identifier":
			return {
				type: "identifier",
				value:
					expr.value === inputName
						? outputName
						: expr.value,
				info: expr.info,
			};
		case "literal":
			return expr;
	}
}

function renameIdGeneric<T>(
	inputName: string,
	outputName: string,
	expr: IdentifierGeneric<T>,
): IdentifierGeneric<T> {
	return {
				type: "identifier",
				value:
					expr.value === inputName
						? outputName
						: expr.value,
				info: expr.info,
			};
}

export function renameVarBatch<T>(
	inputToOutputNameMap1: Map<string, string> | Record<string, string>,
	term: TermGeneric<T>
): TermGeneric<T> {
	const inputToOutputNameMap = inputToOutputNameMap1 instanceof Map ? inputToOutputNameMap1 : new Map(Object.entries(inputToOutputNameMap1));
	const oo = Array.from(inputToOutputNameMap.entries()).reduce((acc, [inputName, outputName]) => {
		return acc.map((t) => renameVarGeneric(inputName, outputName, t));
	}, [term]);
	return oo[0];
}