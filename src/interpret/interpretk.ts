import {
	ConjunctionGeneric,
	type ExpressionGeneric,
	FreshGeneric,
	type IdentifierGeneric,
	type PredicateDefinitionGeneric,
	type TermGeneric,
} from "src/types/AstGeneric";
import type { Type } from "src/types/EzType";
import { Map as ImmMap } from "immutable";
import * as kn from "src/interpret/kanren";
import { builtinGoals } from "src/interpret/kbuiltins";

const defToPredicate = (
	ast: PredicateDefinitionGeneric<Type>,
	frshMap: ImmMap<string, kn.LLVar>,
): kn.Goal => {
	// return (sc: kn.State): kn.LStream => {
	return kn.eq(
		kn.makelvar(ast.name.value, frshMap),
		new kn.LPredicate(
			ast.name.value,
			(...args: kn.LTerm[]) => {
				return (sc: kn.State): Iterable<kn.State> => {
					const rrr = freshenVars(
						sc.get("number"),
						ast.args,
						frshMap,
					);
					// console.log(
					// 	"defToPredicate",
					// 	ast.name.value,
					// 	rrr.toJS(),
					// );
					return kn.all(
						...args.map((arg, i): kn.Goal => {
							return kn.eq(
								arg,
								kn.makelvar(ast.args[i].value, rrr),
							);
						}),
						interpretPlus(ast.body, rrr),
					)(sc.increment());
				};
			},
		),
	);
};

export function interpretPlus(
	ast: TermGeneric<Type> | TermGeneric<Type>[],
	freshMap: ImmMap<string, kn.LLVar> = ImmMap(),
): kn.Goal {
	if (Array.isArray(ast)) {
		return kn.all(
			...ast.map((v) => interpretPlus(v, freshMap)),
		);
	}
	switch (ast.type) {
		case "conjunction":
			return kn.all(
				...ast.terms.map((v) => interpretPlus(v, freshMap)),
			);
		case "disjunction":
			return kn.either(
				...ast.terms.map((v) => interpretPlus(v, freshMap)),
			);
		case "fresh":
			// return interpretPlus(ast.body, addToFreshMap(ast.newVars, freshMap));
			return (sc: kn.State): Iterable<kn.State> => {
				// const [bod, ff] = alphaConvertFresh(ast, sc.get('number'));
				const frmm = freshenVars(
					sc.get("number"),
					ast.newVars,
					freshMap,
				);
				return interpretPlus(
					ast.body,
					frmm,
				)(sc.increment());
			};
		case "predicate_call": {
			const ast2333 = interpretExprListPlus(
				ast.args,
				freshMap,
				"without_type",
				"without_io",
			);
			return kn.apply_pred(
				kn.makelvar(ast.source.value, freshMap),
				...ast2333,
			);
		}
		// return `${interpretExpr(ast.source)}(${interpretExprListPlus(ast.args, 'withtype')})`;
		case "predicate_definition":
			return defToPredicate(ast, freshMap);
		default:
			throw `Invalid ast type: ${ast}`;
	}
}

export function runFor(
	goal: kn.Goal,
	showInternals = false,
	vars2seek: string[] = [],
	numb: number | null = null,
) {
	const runs = kn.run(numb, kn.conj(builtinGoals, goal));
	return runs
		.filter((rnn) => !rnn.fail)
		.map((run) => {
			return run.toClean(showInternals, vars2seek);
		});
}

function freshenVars(
	inc: number,
	newVars: IdentifierGeneric<Type>[],
	freshMap: ImmMap<string, kn.LLVar>,
): ImmMap<string, kn.LLVar> {
	return newVars.reduce((acc, v) => {
		const nvl = (numb: number) => `$${v.value}_${numb}`;
		const numb1 = inc;
		return acc.set(v.value, kn.makelvar(nvl(numb1)));
	}, freshMap);
}

function interpretExprListPlus(
	ast: ExpressionGeneric<Type>[],
	freshMap: ImmMap<string, kn.LLVar>,
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): kn.LTerm[] {
	return ast.map((ee) =>
		interpretExpr(ee, freshMap, withtype, withio),
	);
}
function interpretExpr(
	ast: ExpressionGeneric<Type>,
	freshMap: ImmMap<string, kn.LLVar>,
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): kn.LTerm {
	switch (ast.type) {
		case "identifier":
			return kn.makelvar(ast.value, freshMap);
		case "literal":
			return kn.makeLiteral(ast.value);
	}
}
