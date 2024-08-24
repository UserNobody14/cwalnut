// First we map to generics
// Then to basic types via gather and/or stateful map
// Then we map via preds to type io/freshness/linearity/options

import {
	gatherVarInstanceInfo,
	intoUniqueVarsGeneric,
	mapPredCallsToState,
	mapPredDefinitionsGeneric,
	mapPredDefinitionsToState,
	mapToGeneric,
	mapVarsGeneric,
	mapVarsToState,
	mapVarsWithState,
} from "src/lens/into-vars";
import type {
	ExpressionGeneric,
	IdentifierGeneric,
	TermGeneric,
	TermT,
} from "src/types/AstGeneric";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { Map as ImmMap } from "immutable";
import { conjunction1 } from "src/utils/make_desugared_ast";
import { unify } from "src/type-unification/aunt";
import { reify } from "src/type-unification/reifyType";
import { reifyType } from "src/type-unification/reifyType";
import { generateTypeVars } from "./replace_type_vars";
import { unifyTwoMaps } from "../type-unification/aunt";
import { builtinTypes } from "./builtinTypes";
import { warnHolder } from "src/warnHolder";

function toEarlyMeta(
	tt: TermGeneric<undefined>[],
): TermGeneric<"unknown">[] {
	return mapToGeneric(tt, (tk) =>
		make.identifier("unknown", tk.value),
	);
}

export function toBasicTypes(tsss: TermGeneric<undefined>[]): TermT[] {
	const tt = toEarlyMeta(tsss);
	return toBasicTypesG(tt);
}
export function toDummyTypes(tsss: TermGeneric<undefined>[]): TermT[] {
	return mapToGeneric(tsss, (tk) =>
		make.identifier(make.simple_type("unknown"), tk.value),
	);
}

function toBasicTypesG<G>(tt: TermGeneric<G>[]) {
	return [
		toBasicTypesG1(
			make.conjunction(tt),
			ImmMap<string, Type>(builtinTypes),
		)[0],
	];
}

type TypedOutput = [
	TermGeneric<Type>,
	ImmMap<string, Type>,
];
type TypedOutputConj = [
	TermGeneric<Type>[],
	ImmMap<string, Type>,
];

function toBasicTypesG1<G>(
	tt: TermGeneric<G>,
	mp: ImmMap<string, Type>,
): TypedOutput {
	switch (tt.type) {
		case "conjunction": {
			const [t1, t2] = tt.terms.reduce<TypedOutputConj>(
				(acc, t) => {
					const [t1, t2] = acc;
					const [t3, t4] = toBasicTypesG1(t, t2);
					t1.push(t3);
					return [t1, t4] as TypedOutputConj;
				},
				[[], mp],
			);
			return [make.conjunction(t1), t2];
		}
		case "disjunction": {
			// instead map & unify type envs?
			const tList = tt.terms.map((t) =>
				toBasicTypesG1(t, mp),
			);
			const termsM = tList.map((t) => t[0]);
			const t2 = tList.map((t) => t[1]);
			const unitedMap = t2.reduce((acc, t) => {
				const newMp = unifyTwoMaps(reify(acc), reify(t));
				return newMp;
			});
			return [make.disjunction(termsM), unitedMap];
			// const [t1, t22] = tt.terms.reduce<TypedOutputConj>((acc, t) => {
			//     const [t1, t2] = acc;
			//     const [t3, t4] = toBasicTypesG1(t, t2);
			//     t1.push(t3);
			//     return [t1, t4] as TypedOutputConj;
			// }, [[], mp]);
			// return [make.disjunction(termsM), t22];
		}
		case "predicate_call": {
			// type of the predicate source should not be bound by the specific polymorphism used
			const predType =
				mp.get(tt.source.value) ??
				make.type_variable(tt.source.value);
			const argTypes = tt.args.map((arg) => {
				if (arg.type === "literal") {
					return make.simple_type(arg.kind);
				}
				const tsz = mp.get(arg.value);
				if (tsz) return tsz;
				warnHolder(
					`Type ${arg.value} not found in ${tt.source.value} args`,
				);
				return make.type_variable(arg.value);
			});
			const newPredType = make.predicate_type(
				[],
				...argTypes,
			);
			const newMp = unify(predType, newPredType, mp);
			if (!newMp) {
				throw new Error(
					`Failed to unify ${predType} with ${newPredType}`,
				);
			}
			return [
				make.predicate_call(
					make.identifier(newPredType, tt.source.value),
					tt.args.map((arg, i): ExpressionGeneric<Type> => {
						if (arg.type === "literal") {
							return make.literal(arg.kind, arg.value);
						}
						return make.identifier(
							reifyType(argTypes[i], newMp),
							arg.value,
						);
					}),
				),
				newMp,
			];
		}
		case "predicate_definition": {
			const [body, mp1] = toBasicTypesG1(tt.body, mp);
			const mp2 = reify(mp1);
			const argTypes = tt.args.map((arg) => {
				const tsz = mp2.get(arg.value);
				if (tsz) return tsz;
				warnHolder(
					`Type ${arg.value} not found in ${tt.name.value} args`,
				);
				return make.type_variable(arg.value);
			});
			const remainingTypeVars = [
				...new Set(
					argTypes.flatMap((ttzd) => [
						...generateTypeVars(ttzd),
					]),
				),
			];
			const predType = reifyType(
				make.predicate_type(
					remainingTypeVars.map((ss) => ss.name),
					...argTypes,
				),
				mp2,
			);
			const newMp = mp2.set(tt.name.value, predType);
			return [
				make.predicate_definition(
					make.identifier(predType, tt.name.value),
					tt.args.map((arg, i) => {
						return make.identifier(argTypes[i], arg.value);
					}),
					make.conjunction1(body),
				),
				newMp,
			];
		}
		case "fresh": {
			let mpClean = mp;
			for (const nv of tt.newVars) {
				mpClean = mpClean.delete(nv.value);
			}
			const [body, mp2] = toBasicTypesG1(tt.body, mpClean);
			const freshArgs = tt.newVars.map((v) => {
				const mp22 = mp2.get(v.value);
				if (mp22) {
					return make.identifier(mp22, v.value);
				}
				return make.identifier(
					make.type_variable(v.value),
					v.value,
				);
			});

			return [
				make.fresh(freshArgs, make.conjunction1(body)),
				mp2,
			];
		}
		case "with": {
			const [body, mp2] = toBasicTypesG1(tt.body, mp);
			return [
				make.with(
					make.identifier(
						mp2.get(tt.name.value) ??
							make.type_variable(tt.name.value),
						tt.name.value,
					),
					make.conjunction1(body),
				),
				mp2,
			];
		}
	}
}
