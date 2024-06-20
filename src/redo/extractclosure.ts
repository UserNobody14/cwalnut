/**
 * Extract all of the closure variables from a function, so they can be allocated above it
 */

import { Set } from "immutable";
import type { TermDsAst } from "src/types/DesugaredAst";
import {
	builtinList,
	conjunction1,
	disjunction1,
	make_conjunction,
	make_identifier,
} from "src/utils/make_desugared_ast";
// find out the *greatest* common term for the variables
interface ResponseItem {
	// All variables used in a term or set of terms
	allVarsUsed: Set<string>;
	// Variables whose highest common term group is the same as the full set
	commonVars: Set<string>;
	// Variables whose highest common term group is (currently) bellow the full set
	nestedVars: Set<string>;

	//Note: commonvars + nestedvars = allVarsUsed
}

function findCommonClosureVars(
	terms: TermDsAst[],
): ResponseItem {
	let allVarsUsed = Set<string>();

	const withoutEachClosureVars: Set<string>[] = Array(
		terms.length,
	).fill(Set());
	const eachAllVarsUsed: Set<string>[] = [];
	// let eachCommonVars: Set<string>[] = [];
	// let eachNestedVars: Set<string>[] = [];
	for (let zz = 0; zz < terms.length; zz++) {
		const t = terms[zz];
		switch (t.type) {
			case "conjunction":
				const {
					allVarsUsed: allVarsUsed1,
					commonVars: commonVars1,
					nestedVars: nestedVars1,
				} = findCommonClosureVars(t.terms);
				// First pass over the lists, just set allvars and each of the lists, to operate on later
				allVarsUsed = allVarsUsed.union(allVarsUsed1);
				eachAllVarsUsed[zz] = allVarsUsed1;
				break;
			case "disjunction":
				const {
					allVarsUsed: allVarsUsed2,
					commonVars: commonVars2,
					nestedVars: nestedVars2,
				} = findCommonClosureVars(t.terms);
				allVarsUsed = allVarsUsed.union(allVarsUsed2);
				eachAllVarsUsed[zz] = allVarsUsed2;
				break;
			case "fresh":
				const {
					allVarsUsed: allVarsUsed3,
					commonVars: commonVars3,
					nestedVars: nestedVars3,
				} = findCommonClosureVars([t.body]);
				allVarsUsed = allVarsUsed.union(allVarsUsed3);
				eachAllVarsUsed[zz] = allVarsUsed3;
				break;
			case "with":
				const {
					allVarsUsed: allVarsUsed4,
					commonVars: commonVars4,
					nestedVars: nestedVars4,
				} = findCommonClosureVars([t.body]);
				allVarsUsed = allVarsUsed.union(allVarsUsed4);
				eachAllVarsUsed[zz] = allVarsUsed4;
				break;
			case "predicate_call":
				const newSet = Set(
					t.args
						.filter((ttx) => ttx.type === "identifier")
						.map((a) => a.value),
				).add(t.source.value);
				allVarsUsed = allVarsUsed.union(newSet);
				eachAllVarsUsed[zz] = newSet;
				break;
			case "predicate_definition":
				const newSet2 = Set([t.name.value]);
				allVarsUsed = allVarsUsed.add(t.name.value);
				eachAllVarsUsed[zz] = newSet2;
				break;
		}
	}

	// For each item, find the vars common to *other* items
	let carryUp = Set<string>();
	for (let zz = 1; zz < terms.length; zz++) {
		const otherVarsNew = eachAllVarsUsed[zz - 1];
		carryUp = carryUp.union(otherVarsNew);
		withoutEachClosureVars[zz] = carryUp;
	}
	let carryDown = Set<string>();
	for (let zz = terms.length - 2; zz >= 0; zz--) {
		const otherVarsNew = eachAllVarsUsed[zz + 1];
		carryDown = carryDown.union(otherVarsNew);
		withoutEachClosureVars[zz] =
			withoutEachClosureVars[zz].union(carryDown);
	}

	let commonVars = allVarsUsed;
	let nestedVars = Set<string>();
	// For each item, find the vars unique to that item
	for (let zz = 0; zz < terms.length; zz++) {
		const otherVarsNew = withoutEachClosureVars[zz];
		// eachCommonVars[zz] = eachCommonVars[zz].subtract(otherVarsNew);
		const commonAllV =
			eachAllVarsUsed[zz].subtract(otherVarsNew);
		commonVars = commonVars.subtract(commonAllV);
		nestedVars = nestedVars.union(commonAllV);
	}

	nestedVars = nestedVars.subtract(commonVars);

	ensureLengthsMatch({
		allVarsUsed,
		commonVars,
		nestedVars,
	});

	return {
		allVarsUsed,
		commonVars,
		nestedVars,
	};
}

function ensureLengthsMatch(ccc: ResponseItem) {
	if (
		ccc.allVarsUsed.size !==
		ccc.commonVars.size + ccc.nestedVars.size
	) {
		throw new Error(
			`Mismatch in lengths: ${ccc.allVarsUsed.size} !== ${ccc.commonVars.size} + ${ccc.nestedVars.size}`,
		);
	}
}

function freshenTermVars(
	term: TermDsAst,
	varsToExclude: string[],
): [string[], TermDsAst[]] {
	switch (term.type) {
		case "conjunction":
		case "disjunction":
			const terms = term.terms;
			// const cv = ezcom(terms);
			const cv = findCommonClosureVars(terms);
			const common = cv.commonVars;
			const minusBuiltins = common.subtract(
				Set(varsToExclude),
			);
			const terms2 = terms.flatMap(
				(t) =>
					freshenTermVars(
						t,
						varsToExclude.concat(minusBuiltins.toArray()),
					)[1],
			);
			if (minusBuiltins.size === 0) {
				return [
					[],
					term.type === "conjunction"
						? [conjunction1(...terms2)]
						: [disjunction1(...terms2)],
				];
			} else {
				// Make a new "fresh" term, with the minusBuiltins as the new vars
				const newVars = Array.from(minusBuiltins).map((v) =>
					make_identifier(v),
				);
				// TODO: same treatment for body?
				const newTerm = {
					type: "fresh" as const,
					newVars,
					body:
						term.type === "conjunction"
							? conjunction1(...terms2)
							: make_conjunction(disjunction1(...terms2)),
				};
				return [Array.from(minusBuiltins), [newTerm]];
			}
		case "fresh":
			const nff = freshenTermVars(
				term.body,
				varsToExclude.concat(
					term.newVars.map((v) => v.value),
				),
			);
			return [
				nff[0],
				[
					{
						type: "fresh" as const,
						newVars: term.newVars,
						body: conjunction1(...nff[1]),
					},
				],
			];
		case "with":
			return freshenTermVars(term.body, varsToExclude);
		case "predicate_call":
			const varsUsed = term.args
				.filter((ttx) => ttx.type === "identifier")
				.map((a) => a.value);
			const varsUsedSet = Set(varsUsed).add(
				term.source.value,
			);
			const minusBuiltins2 = varsUsedSet.subtract(
				Set(varsToExclude),
			);
			if (minusBuiltins2.size === 0) {
				return [[], [term]];
			} else {
				const newVars = Array.from(minusBuiltins2).map(
					(v) => make_identifier(v),
				);
				const newTerm = {
					type: "fresh" as const,
					newVars,
					body: conjunction1(term),
				};
				return [Array.from(minusBuiltins2), [newTerm]];
			}
		case "predicate_definition":
			const fn = term;
			// returns a set of variable names that are used in the body of the function, but not created there
			const args = fn.args.map((a) => a.value);
			const [closureVars, body1] = freshenTermVars(
				fn.body,
				args.concat(varsToExclude),
			);
			const body = conjunction1(...body1);
			const newFn = {
				type: "predicate_definition" as const,
				name: fn.name,
				args: fn.args,
				body,
			};
			return [closureVars, [newFn]];
	}
}

export function freshenTerms(
	terms: TermDsAst[],
	logicType: "conjunction" | "disjunction" = "conjunction",
	bt: string[] = builtinList,
): TermDsAst[] {
	if (logicType === "conjunction") {
		const tt = freshenTermVars(conjunction1(...terms), bt);
		return tt[1];
	} else {
		const tt = freshenTermVars(disjunction1(...terms), bt);
		return tt[1];
	}
}
