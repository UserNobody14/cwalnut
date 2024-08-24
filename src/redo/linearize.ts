/**
 * Go through the desugared AST and linearize the variables, so each variable appears only twice.
 * One for the source and one for the target.
 */

import { Set as ImmSet, Map as ImmMap } from "immutable";
import type {
	TermGeneric,
	PredicateDefinitionGeneric,
	IdentifierGeneric,
	ExpressionGeneric,
	DisjunctionGeneric,
	PredicateCallGeneric,
} from "src/types/AstGeneric";
import {
	type Builtin,
	builtinList,
} from "src/utils/builtinList";
import { debugHolder } from "src/warnHolder";
import { countVarsInCalls, intoVarsUnshadowed, intoVarsUnshadowedG, mapPredCallsRemovable, mapVarsWithState } from "src/lens/into-vars";
import { conjunction1, disjunction1, make, unify } from "src/utils/make_better_typed";
import { freshenForDef } from "./freshenvar";
import { cleanupExcessUnifies, refactorTermsToMergeUnifies } from "./cleanupExcessUnifies";
import { cleanupLinearUnifies } from "./cleanupLinearUnifies";
import {findCommonClosureVars} from './extractclosure';

type FreeVarsData = {
	vars: Set<string>;
	varCounter: Map<string, number>;
	originalVarCounter: Map<string, number>;
	newNames: Map<string, string[]>;
	counter: number;
};

function monadicFold<T, U>(
	f: (x: T, y: U) => [T[], U],
	x: T[],
	y: U,
): [T[], U] {
	return x.reduce(
		([x1, y1], a) => {
			const [ox, oy] = f(a, y1);
			return [[...x1, ...ox], oy];
		},
		[[] as T[], y],
	);
}

function foldVarsF<T>(
	[terms, freeVars1]: [TermGeneric<T>[], FreeVarsData],
	tfn: (tt: TermGeneric<T>[]) => TermGeneric<T>[]
): [TermGeneric<T>[], FreeVarsData] {
	return [tfn(terms), freeVars1];
}


function linearizeVars<T>(
	term: TermGeneric<T> | TermGeneric<T>[],
	freeVars1: FreeVarsData,
): [TermGeneric<T>[], FreeVarsData] {
	if (Array.isArray(term)) {
		return monadicFold(linearizeVars, term, freeVars1);
	}
	switch (term.type) {
		case "conjunction": {
			return foldVarsF(monadicFold(
				linearizeVars,
				term.terms,
				freeVars1,
			),
				(terms) => [conjunction1(...terms)]
			);
		}
		case "disjunction": {
			// return foldVarsF(monadicFold(
			// 	linearizeVars,
			// 	term.terms,
			// 	freeVars1,
			// ),
			// 	(terms) => [disjunction1(...terms)]
			// );
			return linearizeDisjunction(term, freeVars1);
		}
		case "fresh": {
			return foldVarsF(
				linearizeVars(
					term.body,
					freeVars1,
				),
				(terms) => [{
					type: "fresh",
					newVars: term.newVars,
					body: conjunction1(...terms),
				}]
			)
		}
		case "with": {
			return foldVarsF(
				linearizeVars(
					term.body,
					freeVars1,
				),
				(terms) => [{
					type: "with",
					name: term.name,
					body: conjunction1(...terms),
				}]
			)
		}
		case "predicate_call": {
			const [listArgsNew, newTerms, newFreeVars5] =
				processArgs(term.args, freeVars1);
			const [newSource, newTerms2, newFreeVars6] =
				linearizeQuick(term.source, newFreeVars5);
			return [
				[
					...newTerms2,
					...newTerms,
					{
						type: "predicate_call",
						source: newSource,
						args: listArgsNew,
					},
				],
				newFreeVars6,
			];
		}
		case "predicate_definition": {
			// Freshen the arguments
			const npr = freshenForDef(term.args, term.body, (xan, xbn) => {
				return `${xan}_${xbn + freeVars1.counter}`;
			})
			// First, find any recursive calls within the definition
			return linearizePredicateDefinition<T>({
				...term,
				body: npr
			}, {
				...freeVars1,
				counter: freeVars1.counter + term.args.length,
			});
		}
	}
}

function linearizeDisjunction<T>(
	term: DisjunctionGeneric<T>,
	freeVars1: FreeVarsData
): [TermGeneric<T>[], FreeVarsData] {
	// const [terms, newFreeVars] = monadicFold(
	// 	linearizeVars,
	// 	term.terms,
	// 	freeVars1
	// );
	const { allVarsUsed, commonVars, nestedVars } = findCommonClosureVars(term.terms);
	if (commonVars.size === 0) {
			return foldVarsF(monadicFold(
				linearizeVars,
				term.terms,
				freeVars1,
			),
				(terms) => [disjunction1(...terms)]
			);
	} else {
		const countedCommon = countVarsInCalls(term.terms);
		const numOccurences = ImmMap(commonVars.toArray().map(
			(x) => [x, countedCommon.get(x) ?? 0]
		));
		// Replace the disjunct calls with the new name <var_name>_disj_<counter>
		const [bodyWithReplacedCalls2, [str, vmap]] = mapVarsWithState(term.terms,
			(xx, [ss, vmap2]) => {
				if (ss.has(xx.value)) {
					const newName = `${xx.value}_disj_${ss.get(xx.value)}`;
					const newCounter = ss.update(xx.value, (x = 0) => x + 1);
					return [make.identifier(xx.info, newName), [newCounter, vmap2.set(xx.value, xx)]];
				} else {
					return [xx, [ss, vmap2]];
				}
			},
			[numOccurences.map(() => 0), ImmMap<string, IdentifierGeneric<T>>()]
		);
		const newUnifications = [...str.entries()].map(([k, v]) => {
			const outUnifies: PredicateCallGeneric<T>[] = [];
			const keyv = vmap.get(k);
			if (!keyv) throw `Key ${k} not found in vmap`;
			for (let i = 0; i < v; i++) {
				outUnifies.push(unify(
					keyv.info,
					make.identifier(keyv.info, k),
					make.identifier(keyv.info, `${k}_disj_${i}`),
				));
			}
			return outUnifies;
		});
		const nres: TermGeneric<T>[] = [
			...newUnifications.flat(),
			disjunction1(...bodyWithReplacedCalls2)
		]
		return monadicFold(
			linearizeVars,
			nres,
			freeVars1,
		);
	}
}

function linearizePredicateDefinition<T>(term: PredicateDefinitionGeneric<T>, freeVars1: FreeVarsData): [TermGeneric<T>[], FreeVarsData] {
	const callsToThisPred = [...intoVarsUnshadowedG(term.body.terms, ImmSet(builtinList))].filter(
		(x) => x.value === term.name.value
	);
	let extraRecursiveUnifyTerms: TermGeneric<T>[] = [];
	let bodyWithReplacedCalls = term.body;
	let extraFreeVars: FreeVarsData = freeVars1;
	if (callsToThisPred.length > 0) {
		const [newSource1, newTerms21, newFreeVars61] = linearizeQuick(term.name, extraFreeVars);
		extraFreeVars = newFreeVars61;
		const [newSource, newTerms, newFreeVars6] = linearizeQuick(term.name, extraFreeVars);
		extraFreeVars = newFreeVars6;
		// If there are recursive calls, we need to add a unify term to each of the recursive calls before the definition
		const newRecurs = callsToThisPred.map((x, i) => {
			return make.identifier(x.info, `${term.name.value}_recur_${i}`);
		});
		extraRecursiveUnifyTerms = [
			unify(
				term.name.info,
				newSource,
				...newRecurs
			),
			...newTerms21,
			...newTerms
		];
		// Replace the recursive calls with the new name <pred_name>_recur_<counter>
		const [bodyWithReplacedCalls2] = mapVarsWithState(term.body.terms,
			(xx, ss) => {
				if (xx.value === term.name.value) {
					const newName = `${term.name.value}_recur_${ss}`;
					const newCounter = ss + 1;
					return [make.identifier(xx.info, newName), newCounter];
				} else {
					return [xx, ss];
				}
			},
			0
		);
		bodyWithReplacedCalls = conjunction1(...bodyWithReplacedCalls2);
	}

	const [linearizedDef, newFreeVars7] = linearizeVars(
		bodyWithReplacedCalls,
		extraFreeVars
	);
	const predDef: PredicateDefinitionGeneric<T> = {
		type: "predicate_definition",
		name: term.name,
		args: term.args,
		body: conjunction1(...linearizedDef),
	};
	return [
		[
			...extraRecursiveUnifyTerms,
			predDef
		],
		{
			...newFreeVars7,
		},
	];
}

function walkNewName(
	name: string,
	variableContext: FreeVarsData,
): string {
	debugHolder("name", name, "variableContext");
	if (!(typeof name === "string")) {
		throw `Invalid name: ${name}`;
	}
	const newName = variableContext.newNames.get(name);
	if (!newName) return name;
	if (newName?.[0] === name) return name;
	const latestName = newName[newName.length - 1];
	return walkNewName(latestName, variableContext);
}

function linearizeQuick<T>(
	expr: IdentifierGeneric<T>,
	variableContext: FreeVarsData,
): [IdentifierGeneric<T>, TermGeneric<T>[], FreeVarsData] {
	// First check if the variable is in newNames
	const newName = variableContext.newNames.get(expr.value);
	if (builtinList.includes(expr.value as Builtin)) {
		return [expr, [], { ...variableContext }];
	}
	if (!newName) {
		debugHolder(
			"expr.value",
			expr.value,
			variableContext.newNames.get(expr.value),
			variableContext.counter,
		);
		return [
			expr,
			[],
			updateFreeVarsData(
				variableContext,
				expr.value,
				expr.value,
				expr.value,
			),
		];
	}
	const latestName = walkNewName(
		newName[newName.length - 1],
		variableContext,
	);
	const usages = variableContext.varCounter.get(latestName);
	if (!usages) {
		throw `Variable ${expr.value} latestname: ${latestName} not found in varCounter: ${printFreeVars(
			variableContext,
		)}`;
	}
	if (usages === 1) {
		const newName2 = `${expr.value}Z_${variableContext.counter}`;
		const newName3 = `${expr.value}Y_${variableContext.counter}`;
		const actualUses =
			variableContext.originalVarCounter.get(expr.value) ??
			0;
		return [
			{ type: "identifier", value: newName3, info: expr.info },
			[
				unify(
					expr.info,
					make.identifier(expr.info, newName2),
					make.identifier(expr.info, newName3),
					make.identifier(expr.info, latestName),
				),
			],
			updateFreeVarsData(
				variableContext,
				latestName,
				newName2,
				expr.value,
			),
		];
	}
	throw `Invalid usages for variable ${expr.value}: ${usages}`;
}

function updateFreeVarsData(
	variableContextC: FreeVarsData,
	latestName: string,
	newName2: string,
	actualName: string,
): FreeVarsData {
	const newEntryVals: [string, number][] =
		latestName === newName2
			? [
				[
					latestName,
					(variableContextC.varCounter.get(latestName) ??
						0) + 1,
				],
			]
			: [
				[newName2, 1],
				[
					latestName,
					(variableContextC.varCounter.get(latestName) ??
						0) + 1,
				],
			];
	const varCounter = new Map([
		...variableContextC.varCounter.entries(),
		...newEntryVals,
	]);
	const oldNames =
		variableContextC.newNames.get(latestName) ?? [];
	const newNames = new Map([
		...variableContextC.newNames.entries(),
		[latestName, [...oldNames, newName2]],
	]);
	const originalVarCounter = new Map(
		variableContextC.originalVarCounter,
	);
	originalVarCounter.set(
		actualName,
		(variableContextC.originalVarCounter.get(actualName) ??
			0) + 1,
	);
	return {
		vars: new Set([...variableContextC.vars, newName2]),
		counter: variableContextC.counter + 2,
		originalVarCounter,
		varCounter,
		newNames,
	};
}

function processArgs<T>(
	args: ExpressionGeneric<T>[],
	freeVars: FreeVarsData,
): [ExpressionGeneric<T>[], TermGeneric<T>[], FreeVarsData] {
	const args2: ExpressionGeneric<T>[] = [];
	const newTerms2: TermGeneric<T>[] = [];
	let newFreeVars2 = freeVars;
	for (const arg of args) {
		if (arg.type === "literal") {
			args2.push(arg);
		} else {
			const [newArg, newTerms, newFreeVars] = linearizeQuick(arg, newFreeVars2);
			newTerms2.push(...newTerms);
			args2.push(newArg);
			newFreeVars2 = newFreeVars;
		}
	}
	return [args2, newTerms2, newFreeVars2];
}

export function printFreeVars(
	freeVars: FreeVarsData,
): string {
	return `vars: ${JSON.stringify([...freeVars.vars])}, 
    varCounter: ${[...freeVars.varCounter.entries()]
			.map(([k, v]) => `${k}: ${v}`)
			.join(", \n")}
    newNames: ${JSON.stringify([...freeVars.newNames])}, 
    counter: ${freeVars.counter}`;
}


export function linearize(
	term: TermGeneric<undefined> | TermGeneric<undefined>[],
	ignore: ImmSet<string> = ImmSet(builtinList),
): TermGeneric<undefined>[] {
	const [newTerm, frVars] = linearizeVars(term, {
		vars: new Set(),
		varCounter: new Map(),
		originalVarCounter: new Map(),
		newNames: new Map(),
		counter: 0,
	});
	const clearpass = false;
	// const lin1 = cleanupLinearUnifies(newTerm, ignore, true);
	// const lin2 = replaceUnusedPreds(lin1, clearpass);
	// const lin3 = cleanupExcessUnifies(conjunction1(...lin2), clearpass);
	// const lin4 = cleanupLinearUnifies([lin3], ignore, false);
	// const [lin4, _] = refactorTermsToMergeUnifies(conjunction1(...newTerm));
	// const lin5 = cleanupLinearUnifies(lin4, ignore, false);
	// return replaceUnusedPreds(lin5, clearpass);
	return cleanupCircus(newTerm, 3, ignore);
	// return replaceUnusedPreds([
	// 	cleanupExcessUnifies(conjunction1(...cleanupLinearUnifies(newTerm, ignore, false)), false)
	// ], false);
}
/**
 * 
    conj:
        unify(appendo, appendo_recur_0, appendoY_91)
        unify(einput, einputY_85)
        unify(input2, input2Y_87)
        DEFINE [appendo] as (a, b, ab) => 
            fresh a_0, b_1, ab_2:
                conj:
                    unify(b, b_1_disj_0, b_1_disj_1)
                    unify(ab, ab_2_disj_0, ab_2_disj_1, ab_2_disj_2)
                    unify(a, a_0_disj_0, a_0_disj_1, a_0_disj_2)
                    disj:
                        conj:
                            unify(ab_2_disj_0, b_1_disj_0)
                            unify(a_0_disj_0, a_0_disj_0Y_51)
                            empty(a_0_disj_0Y_51)
                        conj:
                            unify(ab_2_disj_1, ab_2_disj_1Y_59)
                            unify(ab_2_disj_2, ab_2_disj_2Y_63)
                            unify(q, qY_65)
                            unify(a_0_disj_1, a_0_disj_1Y_67)
                            unify(a_0_disj_2, a_0_disj_2Y_71)
                            unify(d, dY_73)
                            unify(b_1_disj_1, b_1_disj_1Y_75)
                            unify(r, rY_77)
                            rest(r, ab_2_disj_1Y_59)
                            first(q, ab_2_disj_2Y_63)
                            first(qY_65, a_0_disj_1Y_67)
                            rest(d, a_0_disj_2Y_71)
                            appendo_recur_0(dY_73, b_1_disj_1Y_75, rY_77)
        list(einput, "1", "2", "3")
        list(input2, "4", "5", "6")
        appendoY_91(einputY_85, input2Y_87, qq)
 */
function cleanupCircus<T>(
	term: TermGeneric<T>[],
	repeats = 1,
	ignore: ImmSet<string> = ImmSet(builtinList),
): TermGeneric<T>[] {
	// Repeatedly run refactor, then cleanup, then replaceUnusedPreds for repeat times
	let newTerm = term;
	// for (let i = 0; i < repeats; i++) {
		const [newTerm1, _] = refactorTermsToMergeUnifies(conjunction1(...newTerm));
		// const newTerm1 = cleanupExcessUnifies(conjunction1(...newTerm), false);
		const newTerm2 = cleanupLinearUnifies(newTerm1, ignore, false);
		newTerm = replaceUnusedPreds(newTerm2, false);
	// }
	return newTerm;
}


function replaceUnusedPreds<T>(
	terms: TermGeneric<T>[],
	pass = false
): TermGeneric<T>[] {
	if (pass) {
		return terms
	}
	return mapPredCallsRemovable(
		terms,
		(pc) => {
			if (pc.source.value === "unify" && pc.args.length < 2) {
				return undefined;
			}
			return pc;
		},
		(ct, zz) => zz
	)
}