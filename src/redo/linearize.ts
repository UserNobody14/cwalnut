/**
 * Go through the desugared AST and linearize the variables, so each variable appears only twice.
 * One for the source and one for the target.
 */

import {
	ConjunctionDsAst,
	type TermDsAst,
	PredicateCallDsAst,
	type PredicateDefinitionDsAst,
	type IdentifierDsAst,
	type ExpressionDsAst,
} from "src/types/DesugaredAst";
import {
	builtinList,
	make_conjunction,
	make_identifier,
	make_unification,
	unify,
	unify_term,
} from "src/utils/make_desugared_ast";
import { to_unify } from "src/utils/to_conjunction";
import { debugHolder } from "src/warnHolder";

type FreeVarsData = {
	vars: Set<string>;
	varCounter: Map<string, number>;
	originalVarCounter: Map<string, number>;
	newNames: Map<string, string[]>;
	counter: number;
};

function monadic<T, U>(f: (x: T) => [U, T], x: T): U {
	return f(x)[0];
}

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

function monadicFoldGeneral<T, U, V>(
	f: (x: T, y: U) => [V, U],
	x: V,
	y: U,
	merge: (a: V, b: V) => V,
	emptyV: V,
	fold: (
		vss: V,
		z: (ww: [V, U], s: T) => [V, U],
		y: [V, U],
	) => [V, U],
): [V, U] {
	return fold(
		x,
		([x1, y1], a) => {
			const [ox, oy] = f(a, y1);
			return [merge(x1, ox), oy];
		},
		[emptyV, y],
	);
}

function linearizeVars(
	term: TermDsAst | TermDsAst[],
	freeVars1: FreeVarsData,
): [TermDsAst[], FreeVarsData] {
	if (Array.isArray(term)) {
		return monadicFold(linearizeVars, term, freeVars1);
	}
	switch (term.type) {
		case "conjunction": {
			const [terms, newFreeVars] = monadicFold(
				linearizeVars,
				term.terms,
				freeVars1,
			);
			return [
				[
					{
						type: "conjunction",
						terms,
					},
				],
				newFreeVars,
			];
		}
		case "disjunction": {
			// should be more of a reduction?
			const [terms2, newFreeVars2] = monadicFold(
				linearizeVars,
				term.terms,
				freeVars1,
			);
			return [
				[
					{
						type: "disjunction",
						terms: terms2,
					},
				],
				newFreeVars2,
			];
		}
		case "fresh": {
			const [bodyR, newFreeVars3] = linearizeVars(
				term.body,
				freeVars1,
			);
			return [
				[
					{
						type: "fresh",
						newVars: term.newVars,
						body: make_conjunction(...bodyR),
					},
				],
				newFreeVars3,
			];
		}
		case "with": {
			const [bodyW, newFreeVars4] = linearizeVars(
				term.body,
				freeVars1,
			);
			return [
				[
					{
						type: "with",
						name: term.name,
						body: make_conjunction(...bodyW),
					},
				],
				newFreeVars4,
			];
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
						source: newSource as IdentifierDsAst,
						args: listArgsNew,
					},
				],
				newFreeVars6,
			];
		}
		case "predicate_definition": {
            const [linearizedDef, newFreeVars7] = linearizeVars(
                term.body,
                freeVars1,
            );
            const predDef: PredicateDefinitionDsAst = {
                type: "predicate_definition",
                name: term.name,
                args: term.args,
                body: make_conjunction(...linearizedDef),
            }
			return [[predDef], { ...newFreeVars7,
                varCounter: new Map([...newFreeVars7.varCounter.entries(), [term.name.value, 1]]) }];
		}
	}
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

function linearizeQuick(
	expr: IdentifierDsAst,
	variableContext: FreeVarsData,
): [IdentifierDsAst, TermDsAst[], FreeVarsData] {
	// First check if the variable is in newNames
	const newName = variableContext.newNames.get(expr.value);
	if (builtinList.includes(expr.value as any)) {
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
			{ type: "identifier", value: newName3 },
			[
				unify(
					make_identifier(newName2),
					// { type: 'identifier', value: latestName },
					make_identifier(newName3),
					make_identifier(latestName),
				),
				// unify_term('=',{
				//     type: 'identifier',
				//     value: newName3
				// }, { type: 'identifier', value: newName2 })
				// unify_term('=',{
				//     type: 'identifier',
				//     value: newName3
				// }, { type: 'identifier', value: expr.value })
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
	// debugHolder(
	// 	"latestName",
	// 	latestName,
	// 	"newName2",
	// 	newName2,
	// );
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

function processArgs(
	args: ExpressionDsAst[],
	freeVars: FreeVarsData,
): [ExpressionDsAst[], TermDsAst[], FreeVarsData] {
	const args2: ExpressionDsAst[] = [];
	const newTerms2: TermDsAst[] = [];
	let newFreeVars2 = freeVars;
	for (const arg of args) {
		if (arg.type === "literal") {
			args2.push(arg);
		} else {
			const [newArg, newTerms, newFreeVars] =
				linearizeQuick(arg, newFreeVars2);
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

/**
 * Lin
 */

function countVarUsage(
	term: TermDsAst | TermDsAst[],
	variableContext: FreeVarsData,
): FreeVarsData {
	if (Array.isArray(term)) {
		return term.reduce(
			(acc, t) => countVarUsage(t, acc),
			variableContext,
		);
	}
	switch (term.type) {
		case "conjunction":
		case "disjunction":
			return term.terms.reduce(
				(acc, t) => countVarUsage(t, acc),
				variableContext,
			);
		case "fresh":
			return countVarUsage(term.body, variableContext);
		case "with":
			return countVarUsage(term.body, variableContext);
		case "predicate_call": {
			const sourceCount =
				variableContext.varCounter.get(term.source.value) ??
				0;
			const newVarCounter = new Map(
				variableContext.varCounter,
			);
			newVarCounter.set(term.source.value, sourceCount + 1);
			return term.args.reduce(
				(acc, a) => {
					if (a.type === "identifier") {
						const count = acc.varCounter.get(a.value) ?? 0;
						const newVarCounter2 = new Map(acc.varCounter);
						newVarCounter2.set(a.value, count + 1);
						return {
							// biome-ignore lint/performance/noAccumulatingSpread: <explanation>
							...acc,
							varCounter: newVarCounter2,
						};
					}
					return acc;
				},
				{
					...variableContext,
					varCounter: newVarCounter,
				},
			);
		}
		case "predicate_definition":
			return variableContext;
	}
}

export function linearize(
	term: TermDsAst | TermDsAst[],
): TermDsAst[] {
	// const oldVf = printFreeVars(
	// 	countVarUsage(term, {
	// 		vars: new Set(),
	// 		varCounter: new Map(),
	// 		originalVarCounter: new Map(),
	// 		newNames: new Map(),
	// 		counter: 0,
	// 	}),
	// );
	const [newTerm, frVars] = linearizeVars(term, {
		vars: new Set(),
		varCounter: new Map(),
		originalVarCounter: new Map(),
		newNames: new Map(),
		counter: 0,
	});
	// debugHolder(
	// 	"frVars---------------------------",
	// 	printFreeVars(
	// 		countVarUsage(newTerm, {
	// 			vars: new Set(),
	// 			varCounter: new Map(),
	// 			originalVarCounter: new Map(),
	// 			newNames: new Map(),
	// 			counter: 0,
	// 		}),
	// 	),
	// );
	// debugHolder("oldVf---------------------------", oldVf);
	return newTerm;
}
