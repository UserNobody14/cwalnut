import type {
	ConjunctionDsAst,
	ExpressionDsAst,
	IdentifierDsAst,
	TermDsAst,
} from "src/types/DesugaredAst";

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
