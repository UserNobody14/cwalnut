import { mapVarsGeneric } from "src/lens/into-vars";
import type {
	ConjunctionGeneric,
	ExpressionGeneric,
	IdentifierGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import { make, unify } from "src/utils/make_better_typed";
import {
	pprintGeneric,
	pprintTermT,
} from "src/pprint/pprintgeneric";

export function renameVar(
	inputName: string,
	outputName: string,
	term: TermGeneric<undefined>,
): TermGeneric<undefined> {
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
				) as ConjunctionGeneric<undefined>,
			};
		case "with":
			return {
				type: "with",
				name: term.name,
				body: renameVar(
					inputName,
					outputName,
					term.body,
				) as ConjunctionGeneric<undefined>,
			};
		case "predicate_call":
			return {
				type: "predicate_call",
				source: renameQuick(
					inputName,
					outputName,
					term.source,
				) as IdentifierGeneric<undefined>,
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
	expr: ExpressionGeneric<undefined>,
): ExpressionGeneric<undefined> {
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

function renameVarGeneric<T>(
	inputName: string,
	outputName: string,
	term: TermGeneric<T>,
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
				name: renameIdGeneric(
					inputName,
					outputName,
					term.name,
				),
				args: term.args.map((a) =>
					renameIdGeneric(inputName, outputName, a),
				),
				body: renameVarGeneric(
					inputName,
					outputName,
					term.body,
				) as ConjunctionGeneric<T>,
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
			expr.value === inputName ? outputName : expr.value,
		info: expr.info,
	};
}

export function renameVarBatch<T>(
	inputToOutputNameMap1:
		| Map<string, string>
		| Record<string, string>
		| Array<[string, string]>,
	term: TermGeneric<T>,
): TermGeneric<T> {
	const inputToOutputNameMap =
		inputToOutputNameMap1 instanceof Map
			? inputToOutputNameMap1
			: Array.isArray(inputToOutputNameMap1)
				? new Map([...inputToOutputNameMap1])
				: new Map(Object.entries(inputToOutputNameMap1));
	const oo = Array.from(
		inputToOutputNameMap.entries(),
	).reduce(
		(acc, [inputName, outputName]) => {
			return acc.map((t) =>
				renameVarGeneric(inputName, outputName, t),
			);
		},
		[term],
	);
	return oo[0];
}

export function renameVarBatch2<T>(
	inputToOutputNameMap1:
		| Map<string, string>
		| Record<string, string>
		| Array<[string, string]>,
	term: TermGeneric<T>,
): TermGeneric<T>[] {
	const inputToOutputNameMap =
		inputToOutputNameMap1 instanceof Map
			? inputToOutputNameMap1
			: Array.isArray(inputToOutputNameMap1)
				? new Map([...inputToOutputNameMap1])
				: new Map(Object.entries(inputToOutputNameMap1));
	const outval = mapVarsGeneric<T, T>([term], (v) => {
		return make.identifier(
			v.info,
			inputToOutputNameMap.get(v.value) ?? v.value,
		);
	});
	// Verify
	const ver = mapVarsGeneric<T, T>(outval, (v) => {
		if (inputToOutputNameMap.has(v.value)) {
			throw new Error(
				`renameVarBatch2: ${v.value} not renamed`,
			);
		} else {
			return v;
		}
	});
	if (ver) {
		// console.log(
		// 	"InputToOutputNameMap",
		// 	inputToOutputNameMap,
		// );
		// console.log(
		// 	"renameVarBatch2: ver",
		// 	pprintGeneric(ver, (ctx, meta) => ""),
		// );
	} else {
		throw new Error("renameVarBatch2: ver failed");
	}
	return outval;
}


export function freshenForDef<T>(
	vars: IdentifierGeneric<T>[],
	cnj: ConjunctionGeneric<T>,
	fn: (s: string, n: number) => string,
): ConjunctionGeneric<T> {
	const vars2 = vars.map((v, i) =>
		make.identifier(v.info, fn(v.value, i)),
	);
	const newUnifications = vars.map((v, i) =>
		unify(v.info, v, vars2[i]),
	);
	const termsRenamed = renameVarBatch2(
		new Map(vars.map((v, i) => [v.value, fn(v.value, i)])),
		cnj
	);
	return make.conjunction1(
		make.fresh1(
			vars2,
			...newUnifications,
			...termsRenamed,
		)
	)
}