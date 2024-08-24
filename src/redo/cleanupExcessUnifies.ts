import { Map as ImmMap, Set as ImmSet } from "immutable";
import { mapConjunctions, splitAlongScope } from "src/lens/into-vars";
import type { ConjunctionGeneric, ExpressionGeneric, IdentifierGeneric, PredicateCallGeneric, TermGeneric } from "src/types/AstGeneric";
import { flattenConjunctions, make } from "src/utils/make_better_typed";
import { linkDirection } from "./linkDirection";
import { conjunction1 } from "src/utils/make_better_typed";
import { pprintQuick } from "src/pprint/pprintgeneric";

export function cleanupExcessUnifies<T>(
	terms: TermGeneric<T>,
	pass = false
): TermGeneric<T> {
	if (pass) {
		return terms;	
	}
	const [rs, s2] = simplifyUnifyChain<T>(terms);

	// Merge together items in conjunctions:
	const rs2 = refactorTermsToMergeUnifies<T>(rs)
	return conjunction1(...rs2[0]);
}
type UnificationData = [ImmMap<string, string>, ImmSet<string>];

export function simplifyUnifyChain<T>(terms: TermGeneric<T>): [TermGeneric<T>, UnificationData] {
	return splitAlongScope(
		terms,
		simplifyOneUnification,
		[ImmMap<string, string>(), ImmSet<string>()] as const
	);
}

export function simplifyOneUnification<T>(
	b4: PredicateCallGeneric<T>[][], after: PredicateCallGeneric<T>[][], currCall: PredicateCallGeneric<T>, 
	[replacements, st1]: UnificationData) {
	const nArgs = currCall.args.map((a) => {
		if (a.type === "identifier") {
			const replacement = replacements.get(a.value);
			if (replacement) {
				return make.identifier(a.info, replacement);
			}
			return a;
		}
		return a;
	});
	const toOutput = (
		args: ExpressionGeneric<T>[],
		replacements2 = replacements,
	): [PredicateCallGeneric<T>, UnificationData] => {
		return [{
			type: "predicate_call",
			source: currCall.source,
			args: [
				...args,
			],
		}, [replacements2, st1] as const];
	};
	if (currCall.source.value === 'unify' && nArgs.length === 2) {
		// Find previous unify, connected to this one
		const nlink = linkDirection(
			currCall.args[0].value,
			currCall.args[1].value,
			b4, after
		);
		if (nlink) {
			const replacements3 = replacements.set(nlink.next, nlink.first);
			return toOutput([], replacements3);
		}
		return toOutput(currCall.args);
	} else {
		return toOutput(nArgs);
	}
}

export function refactorTermsToMergeUnifies<T>(rs: TermGeneric<T>) {
	return mapConjunctions(
		[rs],
		refactorUnifications<T>,
		[]
	);
}

export function refactorUnifications<T>(
	qq: ConjunctionGeneric<T>,
	zz: unknown[],
): [ConjunctionGeneric<T>, unknown[]] {
	const qterms = flattenConjunctions(qq.terms);
	if (qterms.length === 0) return [qq, zz];
	if (qterms.length === 1) return [qq, zz];
	const allUnifies = filterUnifyPredicateCalls<T>(qterms);
	if (allUnifies.length === 0) return [qq, zz];
	const notUnifies = filterOutUnifyCalls<T>(qterms);
	// If a variable occurs in 2 separate unifications, merge all their variables
	const newUnifies = groupUnifies<T>(allUnifies);

	if (!newUnifies) {
		console.log(`UNIFY ERRRRRRRRRRRRRRRR:
			${pprintQuick(allUnifies)}
			eeeeeeend`);
		throw new Error('Expected newUnifies');
		// return [conjunction1(
		// 	...allUnifies,
		// 	...notUnifies,
		// ), zz]
	};
	return [
		conjunction1(
			...newUnifies,
			...notUnifies,
		), zz
	];
}
export function filterOutUnifyCalls<T>(qterms: TermGeneric<T>[]) {
	return qterms.filter((t) => !(t.type === 'predicate_call' && t.source.value === 'unify'));
}

export function filterUnifyPredicateCalls<T>(qterms: TermGeneric<T>[]) {
	return qterms.filter((t): t is PredicateCallGeneric<T> => t.type === 'predicate_call' && t.source.value === 'unify');
}

export function groupUnifies<T>(allUnifies: PredicateCallGeneric<T>[]) {
	let mergeTargets: ExpressionGeneric<T>[][] = [];
	let idvf: T | null = null;
	for (const unify of allUnifies) {
		if (unify.source.value !== 'unify') throw new Error('Expected unify');
		idvf = unify.source.info;
		// For each unify, search through mergeTargets for a match
		// If found, merge the variables, otherwise add to mergeTargets
		mergeTargets = connectMergeTargets(mergeTargets, unify.args);
	}
	if (idvf === null) return null;
	const newUnifies = [] as TermGeneric<T>[];
	for (const mt of mergeTargets) {
		const allLiterals = mt.filter((m) => m.type === 'literal');
		const allIdentifiers = mt.filter((m) => m.type === 'identifier');
		const uniqueVars = new Set(allIdentifiers.map((m) => m.value));
		const uniqueIdentifiers = Array.from(uniqueVars).sort(
			(a, b) => a.localeCompare(b) // To make it more testable
		).map((v) => make.identifier(
			mt.find((m): m is IdentifierGeneric<T> => m.type === 'identifier' && m.value === v)?.info ?? idvf, v));
		newUnifies.push(make.predicate_call(make.identifier(idvf, 'unify'), [...uniqueIdentifiers, ...allLiterals]));
	}
	return newUnifies;
}

function areUnifiesConnected<T>(
	target: ExpressionGeneric<T>[],
	args: ExpressionGeneric<T>[],
): boolean {
	const targetVars = target.filter((t) => t.type === 'identifier').map((t) => t.value);
	const argVars = args.filter((t) => t.type === 'identifier').map((t) => t.value);
	return targetVars.some((tv) => argVars.includes(tv));
}

function splitUnificationSets<T>(
	terms: ExpressionGeneric<T>[][],
	args: ExpressionGeneric<T>[],
): [ExpressionGeneric<T>[][], ExpressionGeneric<T>[][]] {
	const unconnectedTargets: ExpressionGeneric<T>[][] = [];
	const connectedTargets: ExpressionGeneric<T>[][] = [];
	for (const target of terms) {
		if (areUnifiesConnected(target, args)) {
			connectedTargets.push(target);
		} else {
			unconnectedTargets.push(target);
		}
	}
	return [connectedTargets, unconnectedTargets];
}

export function connectMergeTargets<T>(
	mergeTargets: ExpressionGeneric<T>[][],
	args: ExpressionGeneric<T>[],
): ExpressionGeneric<T>[][] {
	// const mergeTargetsWithout = mergeTargets.filter(areUnifiesDisconnected);
	// const mergeTargetsWith = mergeTargets.filter((mt) => !areUnifiesDisconnected(mt));
	const [mergeTargetsWith, mergeTargetsWithout] = splitUnificationSets(mergeTargets, args);
	if (mergeTargetsWith.length === 0) {
		return [...mergeTargetsWithout, args];
	} else {
		const merged = mergeTargetsWith.flat().concat(args);
		return [merged, ...mergeTargetsWithout];
	}
}
