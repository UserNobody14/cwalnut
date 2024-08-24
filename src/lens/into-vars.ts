
import { Map as ImmMap, Set as ImmSet } from "immutable";
import { pprintGeneric } from "src/pprint/pprintgeneric";
import type {
	ConjunctionGeneric,
	DisjunctionGeneric,
	ExpressionGeneric,
	IdentifierGeneric,
	PredicateCallGeneric,
	PredicateDefinitionGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import { conjunction1, make } from "src/utils/make_better_typed";

export function* intoVars(
	tt: TermGeneric<undefined>[],
): Generator<string> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoVars(t.terms);
				break;
			case "fresh":
				for (const v of t.newVars) {
					yield v.value;
				}
				yield* intoVars(t.body.terms);
				break;
			case "with":
				yield t.name.value;
				break;
			case "predicate_definition":
				yield t.name.value;
				for (const a of t.args) {
					yield a.value;
				}
				yield* intoVars(t.body.terms);
				break;
			case "predicate_call":
				yield t.source.value;
				for (const a of t.args) {
					if (a.type === "identifier") {
						yield a.value;
					}
				}
				break;
		}
	}
}

export function* intoVarsUnshadowed(
	tt: TermGeneric<undefined>[],
	ignore: ImmSet<string> = ImmSet(),
): Generator<string> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoVarsUnshadowed(t.terms, ignore);
				break;
			case "fresh":
				yield* intoVarsUnshadowed(t.body.terms, ignore.merge(
					t.newVars.map((v) => v.value),
				));
				break;
			case "with":
				yield* intoVarsUnshadowed(t.body.terms, ignore.add(t.name.value));
				break;
			case "predicate_definition":
				yield* intoVarsUnshadowed(t.body.terms, ignore.add(t.name.value).merge(
					t.args.map((a) => a.value)
				));
				break;
			case "predicate_call":
				if (!ignore.has(t.source.value)) {
					yield t.source.value;
				}
				for (const a of t.args) {
					if (
						a.type === "identifier" &&
						!ignore.has(a.value)
					) {
						yield a.value;
					}
				}
				break;
		}
	}
}

export function* intoVarsUnshadowedG<T>(
	tt: TermGeneric<T>[],
	ignore: ImmSet<string> = ImmSet(),
): Generator<IdentifierGeneric<T>> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoVarsUnshadowedG(t.terms, ignore);
				break;
			case "fresh":
				yield* intoVarsUnshadowedG(t.body.terms, ignore.merge(
					t.newVars.map((v) => v.value),
				));
				break;
			case "with":
				yield* intoVarsUnshadowedG(t.body.terms, ignore.add(t.name.value));
				break;
			case "predicate_definition":
				yield* intoVarsUnshadowedG(t.body.terms, ignore.add(t.name.value).merge(
					t.args.map((a) => a.value)
				));
				break;
			case "predicate_call":
				if (!ignore.has(t.source.value)) {
					yield t.source;
				}
				for (const a of t.args) {
					if (
						a.type === "identifier" &&
						!ignore.has(a.value)
					) {
						yield a;
					}
				}
				break;
		}
	}
}
export function* intoUniqueVars(
	tt: TermGeneric<undefined>[],
	ignore: Set<string>,
): Generator<string> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoUniqueVars(t.terms, ignore);
				break;
			case "fresh":
				for (const v of t.newVars) {
					if (!ignore.has(v.value)) {
						yield v.value;
					}
				}
				yield* intoUniqueVars(t.body.terms, ignore);
				break;
			case "with":
				if (!ignore.has(t.name.value)) {
					yield t.name.value;
				}
				break;
			case "predicate_definition":
				if (!ignore.has(t.name.value)) {
					yield t.name.value;
				}
				for (const a of t.args) {
					if (!ignore.has(a.value)) {
						yield a.value;
					}
				}
				yield* intoUniqueVars(t.body.terms, ignore);
				break;
			case "predicate_call":
				if (!ignore.has(t.source.value)) {
					yield t.source.value;
				}
				for (const a of t.args) {
					if (
						a.type === "identifier" &&
						!ignore.has(a.value)
					) {
						yield a.value;
					}
				}
				break;
		}
	}
}

export function* intoVarsGeneric<T>(
	tt: TermGeneric<T>[],
): Generator<IdentifierGeneric<T>> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoVarsGeneric(t.terms);
				break;
			case "fresh":
				for (const v of t.newVars) {
					yield v;
				}
				yield* intoVarsGeneric(t.body.terms);
				break;
			case "with":
				yield t.name;
				break;
			case "predicate_definition":
				yield t.name;
				for (const a of t.args) {
					yield a;
				}
				yield* intoVarsGeneric(t.body.terms);
				break;
			case "predicate_call":
				yield t.source;
				for (const a of t.args) {
					if (a.type === "identifier") {
						yield a;
					}
				}
				break;
		}
	}
}

export function* intoUniqueVarsGeneric<T>(
	tt: TermGeneric<T>[],
	ignore: Set<string>,
): Generator<IdentifierGeneric<T>> {
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				yield* intoUniqueVarsGeneric(t.terms, ignore);
				break;
			case "fresh":
				for (const v of t.newVars) {
					if (!ignore.has(v.value)) {
						yield v;
					}
				}
				yield* intoUniqueVarsGeneric(t.body.terms, ignore);
				break;
			case "with":
				if (!ignore.has(t.name.value)) {
					yield t.name;
				}
				break;
			case "predicate_definition":
				if (!ignore.has(t.name.value)) {
					yield t.name;
				}
				for (const a of t.args) {
					if (!ignore.has(a.value)) {
						yield a;
					}
				}
				yield* intoUniqueVarsGeneric(t.body.terms, ignore);
				break;
			case "predicate_call":
				if (!ignore.has(t.source.value)) {
					yield t.source;
				}
				for (const a of t.args) {
					if (
						a.type === "identifier" &&
						!ignore.has(a.value)
					) {
						yield a;
					}
				}
				break;
		}
	}
}

export function mapVars(
	tt: TermGeneric<undefined>[],
	fn: (v: string) => string,
): TermGeneric<undefined>[] {
	return tt.map((t) => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapVars(t.terms, fn),
				};
			case "fresh":
				return {
					...t,
					newVars: t.newVars.map((v) => ({
						...v,
						value: fn(v.value),
					})),
					body: {
						...t.body,
						terms: mapVars(t.body.terms, fn),
					},
				};
			case "with":
				return {
					...t,
					name: { ...t.name, value: fn(t.name.value) },
					body: {
						...t.body,
						terms: mapVars(t.body.terms, fn),
					},
				};
			case "predicate_definition":
				return {
					...t,
					name: { ...t.name, value: fn(t.name.value) },
					args: t.args.map((v) => ({
						...v,
						value: fn(v.value),
					})),
					body: {
						...t.body,
						terms: mapVars(t.body.terms, fn),
					},
				};
			case "predicate_call":
				return {
					...t,
					source: {
						...t.source,
						value: fn(t.source.value),
					},
					args: t.args.map((a) =>
						a.type === "identifier"
							? { ...a, value: fn(a.value) }
							: a,
					),
				};
		}
	});
}

export function mapVarsGeneric<T, Z>(
	tt: TermGeneric<T>[],
	fn: (v: IdentifierGeneric<T>) => IdentifierGeneric<Z>,
): TermGeneric<Z>[] {
	return tt.map((t) => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapVarsGeneric(t.terms, fn),
				};
			case "fresh":
				return {
					...t,
					newVars: t.newVars.map((v) => fn(v)),
					body: {
						...t.body,
						terms: mapVarsGeneric(t.body.terms, fn),
					},
				};
			case "with":
				return {
					...t,
					name: fn(t.name),
					body: {
						...t.body,
						terms: mapVarsGeneric(t.body.terms, fn),
					},
				};
			case "predicate_definition":
				return {
					...t,
					name: fn(t.name),
					args: t.args.map((v) => fn(v)),
					body: {
						...t.body,
						terms: mapVarsGeneric(t.body.terms, fn),
					},
				};
			case "predicate_call":
				return {
					...t,
					source: fn(t.source),
					args: t.args.map((a) =>
						a.type === "identifier" ? fn(a) : a,
					),
				};
		}
	});
}

type CtxTypes =
	| "fresh-args"
	| "name"
	| "definition-args"
	| "call-args";

export function mapPredCalls<T, Z>(
	tt: TermGeneric<T>[],
	fn: (
		z: PredicateCallGeneric<T>,
	) => PredicateCallGeneric<Z>,
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
	) => IdentifierGeneric<Z>[],
): TermGeneric<Z>[] {
	return tt.map((t: TermGeneric<T>): TermGeneric<Z> => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapPredCalls(t.terms, fn, freshen),
				};
			case "fresh":
				return {
					...t,
					newVars: freshen("fresh-args", t.newVars),
					body: {
						...t.body,
						terms: mapPredCalls(t.body.terms, fn, freshen),
					},
				};
			case "with":
				return {
					...t,
					name: freshen("name", [t.name])[0],
					body: {
						...t.body,
						terms: mapPredCalls(t.body.terms, fn, freshen),
					},
				};
			case "predicate_definition":
				return {
					...t,
					name: freshen("name", [t.name])[0],
					args: freshen("definition-args", t.args),
					body: {
						...t.body,
						terms: mapPredCalls(t.body.terms, fn, freshen),
					},
				};
			case "predicate_call":
				return fn(t);
		}
	});
}

export function mapPredCallsRemovable<T, Z>(
	tt: TermGeneric<T>[],
	fn: (
		z: PredicateCallGeneric<T>,
	) => PredicateCallGeneric<Z> | undefined,
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
	) => IdentifierGeneric<Z>[],
): TermGeneric<Z>[] {
	return tt.map((t: TermGeneric<T>): TermGeneric<Z> | undefined => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapPredCallsRemovable(t.terms, fn, freshen),
				};
			case "fresh":
				return {
					...t,
					newVars: freshen("fresh-args", t.newVars),
					body: {
						...t.body,
						terms: mapPredCallsRemovable(t.body.terms, fn, freshen),
					},
				};
			case "with":
				return {
					...t,
					name: freshen("name", [t.name])[0],
					body: {
						...t.body,
						terms: mapPredCallsRemovable(t.body.terms, fn, freshen),
					},
				};
			case "predicate_definition":
				return {
					...t,
					name: freshen("name", [t.name])[0],
					args: freshen("definition-args", t.args),
					body: {
						...t.body,
						terms: mapPredCallsRemovable(t.body.terms, fn, freshen),
					},
				};
			case "predicate_call":
				return fn(t);
		}
	}).filter((x): x is TermGeneric<Z> => x !== undefined);
}

export function mapPredDefinitionsGeneric<T, Z>(
	tt: TermGeneric<T>[],
	fn: (
		z: PredicateDefinitionGeneric<T>,
	) => PredicateDefinitionGeneric<Z>,
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
	) => IdentifierGeneric<Z>[],
): TermGeneric<Z>[] {
	return tt.map((t: TermGeneric<T>): TermGeneric<Z> => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapPredDefinitionsGeneric(
						t.terms,
						fn,
						freshen,
					),
				};
			case "fresh":
				return {
					...t,
					newVars: freshen("fresh-args", t.newVars),
					body: {
						...t.body,
						terms: mapPredDefinitionsGeneric(
							t.body.terms,
							fn,
							freshen,
						),
					},
				};
			case "with":
				return {
					...t,
					name: freshen("name", [t.name])[0],
					body: {
						...t.body,
						terms: mapPredDefinitionsGeneric(
							t.body.terms,
							fn,
							freshen,
						),
					},
				};
			case "predicate_definition":
				return fn(t);
			case "predicate_call":
				return {
					...t,
					source: freshen("name", [t.source])[0],
					args: t.args.map((a) =>
						a.type === "identifier"
							? freshen("call-args", [a])[0]
							: a,
					),
				};
		}
	});
}

export function mapPredDefinitionsToState<T, S>(
	tt: TermGeneric<T>[],
	fn: (z: PredicateDefinitionGeneric<T>, s: S) => S,
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
		s: S,
	) => [IdentifierGeneric<T>[], S],
	s1: S,
): S {
	let s = s1;
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				s = mapPredDefinitionsToState(
					t.terms,
					fn,
					freshen,
					s,
				);
				break;
			case "fresh":
				s = mapPredDefinitionsToState(
					t.body.terms,
					fn,
					freshen,
					s,
				);
				break;
			case "with":
				s = mapPredDefinitionsToState(
					t.body.terms,
					fn,
					freshen,
					s,
				);
				break;
			case "predicate_definition":
				s = fn(t, s);
				break;
			case "predicate_call":
				s = freshen("name", [t.source], s)[1];
				for (const a of t.args) {
					if (a.type === "identifier") {
						s = freshen("call-args", [a], s)[1];
					}
				}
				break;
		}
	}
	return s;
}

export function mapVarsWithState<T, Z, S>(
	tt: TermGeneric<T>[],
	fn: (
		v: IdentifierGeneric<T>,
		s: S,
	) => [IdentifierGeneric<Z>, S],
	s1: S,
): [TermGeneric<Z>[], S] {
	let s = s1;
	const result: TermGeneric<Z>[] = [];
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction": {
				const [newTerms, newState] = mapVarsWithState(
					t.terms,
					fn,
					s,
				);
				result.push({ ...t, terms: newTerms });
				s = newState;
				break;
			}
			case "fresh": {
				const newVars: IdentifierGeneric<Z>[] = [];
				for (const v of t.newVars) {
					const [newVar, newState] = fn(v, s);
					newVars.push(newVar);
					s = newState;
				}
				const [newBody, newState] = mapVarsWithState(
					t.body.terms,
					fn,
					s,
				);
				result.push({
					...t,
					newVars,
					body: { ...t.body, terms: newBody },
				});
				s = newState;
				break;
			}
			case "with": {
				const [newName, newState] = fn(t.name, s);
				const [newBody, newState2] = mapVarsWithState(
					t.body.terms,
					fn,
					newState,
				);
				result.push({
					...t,
					name: newName,
					body: { ...t.body, terms: newBody },
				});
				s = newState2;
				break;
			}
			case "predicate_definition": {
				const [newName, newState] = fn(t.name, s);
				s = newState;
				const newArgs: IdentifierGeneric<Z>[] = [];
				for (const a of t.args) {
					const [newArg, newState] = fn(a, s);
					newArgs.push(newArg);
					s = newState;
				}
				const [newBody, newState2] = mapVarsWithState(
					t.body.terms,
					fn,
					s,
				);
				result.push({
					...t,
					name: newName,
					args: newArgs,
					body: { ...t.body, terms: newBody },
				});
				s = newState2;
				break;
			}
			case "predicate_call": {
				const [newSource, newState] = fn(t.source, s);
				s = newState;
				const newArgs: ExpressionGeneric<Z>[] = [];
				for (const a of t.args) {
					if (a.type === "identifier") {
						const [newArg, newState] = fn(a, s);
						newArgs.push(newArg);
						s = newState;
					} else {
						newArgs.push(a);
					}
				}
				result.push({
					...t,
					source: newSource,
					args: newArgs,
				});
				break;
			}
		}
	}
	return [result, s];
}

export function mapVarsToState<T, S>(
	tt: TermGeneric<T>[],
	fn: (v: IdentifierGeneric<T>, s: S) => S,
	s1: S,
): S {
	let s = s1;
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				s = mapVarsToState(t.terms, fn, s);
				break;
			case "fresh":
				for (const v of t.newVars) {
					s = fn(v, s);
				}
				s = mapVarsToState(t.body.terms, fn, s);
				break;
			case "with":
				s = fn(t.name, s);
				s = mapVarsToState(t.body.terms, fn, s);
				break;
			case "predicate_definition":
				s = fn(t.name, s);
				for (const a of t.args) {
					s = fn(a, s);
				}
				s = mapVarsToState(t.body.terms, fn, s);
				break;
			case "predicate_call":
				s = fn(t.source, s);
				for (const a of t.args) {
					if (a.type === "identifier") {
						s = fn(a, s);
					}
				}
				break;
		}
	}
	return s;
}

export function mapPredCallsWithState<T, Z, S>(
	tt: TermGeneric<T>[],
	fn: (
		z: PredicateCallGeneric<T>,
		s: S,
	) => [PredicateCallGeneric<Z>, S],
	freshen: (
		src: string,
		zz: IdentifierGeneric<T>[],
		s: S,
	) => [IdentifierGeneric<Z>[], S],
	s1: S,
): [TermGeneric<Z>[], S] {
	let s = s1;
	const result: TermGeneric<Z>[] = [];
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction": {
				const [newTerms, newState] = mapPredCallsWithState(
					t.terms,
					fn,
					freshen,
					s,
				);
				result.push({ ...t, terms: newTerms });
				s = newState;
				break;
			}
			case "fresh": {
				const [newVars, newState] = freshen(
					"fresh-args",
					t.newVars,
					s,
				);
				const [newBody, newState2] = mapPredCallsWithState(
					t.body.terms,
					fn,
					freshen,
					newState,
				);
				result.push({
					...t,
					newVars,
					body: { ...t.body, terms: newBody },
				});
				s = newState2;
				break;
			}
			case "with": {
				const [newName, newState] = freshen(
					"name",
					[t.name],
					s,
				);
				const [newBody, newState2] = mapPredCallsWithState(
					t.body.terms,
					fn,
					freshen,
					newState,
				);
				result.push({
					...t,
					name: newName[0],
					body: { ...t.body, terms: newBody },
				});
				s = newState2;
				break;
			}
			case "predicate_definition": {
				const [newName, newState] = freshen(
					"name",
					[t.name],
					s,
				);
				s = newState;
				const [newArgs, newState2] = freshen(
					"definition-args",
					t.args,
					s,
				);
				const [newBody, newState3] = mapPredCallsWithState(
					t.body.terms,
					fn,
					freshen,
					newState2,
				);
				result.push({
					...t,
					name: newName[0],
					args: newArgs,
					body: { ...t.body, terms: newBody },
				});
				s = newState3;
				break;
			}
			case "predicate_call": {
				const [newCall, newState] = fn(t, s);
				result.push(newCall);
				s = newState;
				break;
			}
		}
	}
	return [result, s];
}

export function mapPredCallsToState<T, S>(
	tt: TermGeneric<T>[],
	fn: (z: PredicateCallGeneric<T>, s: S) => S,
	s1: S,
): S {
	let s = s1;
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				s = mapPredCallsToState(t.terms, fn, s);
				break;
			case "fresh":
				s = mapPredCallsToState(t.body.terms, fn, s);
				break;
			case "with":
				s = mapPredCallsToState(t.body.terms, fn, s);
				break;
			case "predicate_definition":
				// s = mapPredCallsToState(t.body.terms, fn, s);
				break;
			case "predicate_call":
				s = fn(t, s);
				break;
		}
	}
	return s;
}

export function mapConjunctions<T, S>(
	tt: TermGeneric<T>[],
	fn: (z: ConjunctionGeneric<T>, s: S) => [ConjunctionGeneric<T>, S],
	s1: S,
): [TermGeneric<T>[], S]{
    let s = s1;
	const result: TermGeneric<T>[] = [];
	for (const t of tt) {
		switch (t.type) {
			case "conjunction": {
				const [tPlus, stPlus] = mapConjunctions(t.terms, fn, s);
				const [newTerms, newState] = fn(conjunction1(...tPlus), stPlus);
				// const [newTerms, newState] = fn(t, s);
				result.push( newTerms );
				s = newState;
				break;
			}
			case "disjunction": {
				const [newTerms, newState] = mapConjunctions(t.terms, fn, s);
				result.push({ ...t, terms: newTerms });
				s = newState;
				break;
			}
			case "fresh": {
				const [tPlus, stPlus] = mapConjunctions(t.body.terms, fn, s);
				const [newBody, newState] = fn(conjunction1(...tPlus), stPlus);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "with": {
				const [tPlus, stPlus] = mapConjunctions(t.body.terms, fn, s);
				const [newBody, newState] = fn(conjunction1(...tPlus), stPlus);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "predicate_definition": {
				const [tPlus, stPlus] = mapConjunctions(t.body.terms, fn, s);
				const [newBody, newState] = fn(conjunction1(...tPlus), stPlus);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "predicate_call": {
				const [newBody, newState] = fn(conjunction1(t), s);
				result.push(newBody);
				s = newState;
				break;
			}
		}
	}
	return [result, s];
}

type MapConj3<T, S> = (
	tt: ConjunctionGeneric<T>,
	s1: S,
	// fn: (z: ConjunctionGeneric<T>, s: S, recur: MapConj2<T, S>) => [ConjunctionGeneric<T>, S],
	disj: (z: DisjunctionGeneric<T>, s: S, recur: MapConj3<T, S>) => [DisjunctionGeneric<T>, S],
	fn: MapConj3<T, S>,
) => [ConjunctionGeneric<T>, S];

// type MapConj2<T, S> = (
// 	tt: TermGeneric<T>[],
// 	s1: S,
// 	fn: (z: ConjunctionGeneric<T>, s: S, recur: MapConj2<T, S>) => [ConjunctionGeneric<T>, S],
// ) => [TermGeneric<T>[], S];

export const mapConjunctions2 = <T, S>(
	tt: ConjunctionGeneric<T>,
	s1: S,
	// fn: (z: ConjunctionGeneric<T>, s: S, recur: MapConj3<T, S>) => [ConjunctionGeneric<T>, S],
	disj: (z: DisjunctionGeneric<T>, s: S, recur: MapConj3<T, S>) => [DisjunctionGeneric<T>, S],
	fn: MapConj3<T, S>,
): [ConjunctionGeneric<T>, S] => {
    let s = s1;
	const result: TermGeneric<T>[] = [];
	for (const t of tt.terms) {
		switch (t.type) {
			case "conjunction": {
				const [newBody, newState] = fn(t, s, disj, mapConjunctions2);
				result.push( newBody );
				s = newState;
				break;
			}
			case "disjunction": {
				const [newTerms, newState] = disj(t, s, fn);
				result.push(newTerms);
				s = newState;
				break;
			}
			case "fresh": {
				const [newBody, newState] = fn(t.body, s, disj, mapConjunctions2);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "with": {
				const [newBody, newState] = fn(t.body, s, disj, mapConjunctions2);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "predicate_definition": {
				const [newBody, newState] = fn(t.body, s, disj, mapConjunctions2);
				result.push({
					...t,
					body: newBody
				});
				s = newState;
				break;
			}
			case "predicate_call": {
				const [newBody, newState] = fn(conjunction1(t), s, disj, mapConjunctions2);
				result.push(newBody);
				s = newState;
				break;
			}
		}
	}
	return [conjunction1(...result), s];
}

// function wrapTermTransform<T, S>(
// 	t: TermGeneric<T>,
// 	fn: (z: TermGeneric<T>[], s: S) => [TermGeneric<T>[], S],
// ): (s: S) => [TermGeneric<T>[], S] {
// 	switch (t.type) {
// 		case "conjunction": 
// 		case "disjunction": {
// 			return (s: S) => fn(t.terms, s);
// 		}
// 		case "fresh": {
// 			const (s: S) => [newBody, newState] = fn(t.body.terms, s);
// 			return [{ ...t, body: { ...t.body, terms: newBody } }, newState];
// 		}
// 		case "with": {
// 			const (s: S) => [newBody, newState] = fn(t.body.terms, s);
// 			return [{ ...t, body: { ...t.body, terms: newBody } }, newState];
// 		}
// 		case "predicate_definition": {
// 			const (s: S) => [newBody, newState] = fn(t.body.terms, s);
// 			return [{ ...t, body: { ...t.body, terms: newBody } }, newState];
// 		}
// 		case "predicate_call": {
// 			return (s: S) => fn([t], s);
// 		}
// 	}
// }

// export function mpredPossibilities<T, S, EMPTYS = null>(
// 	tt: TermGeneric<T>[],
// 	pred: (z: PredicateDefinitionGeneric<T>, s: S) => Iterable<[PredicateCallGeneric<T>, S | EMPTYS]>,
// 	mplus: EMPTYS,
// ): TermGeneric<T>[] {
// 	const result: TermGeneric<T>[] = [];
// 	for (const t of tt) {
// 		switch (t.type) {
// 			case "conjunction":
// 			case "disjunction":
// 				result.push({
// 					...t,
// 					terms: mpredPossibilities(t.terms, pred, mplus),
// 				});
// 				break;
// 			case "fresh":
// 				result.push({
// 					...t,
// 					body: {
// 						...t.body,
// 						terms: mpredPossibilities(t.body.terms, pred, mplus),
// 					},
// 				});
// 				break;
// 			case "with":
// 				result.push({
// 					...t,
// 					body: {
// 						...t.body,
// 						terms: mpredPossibilities(t.body.terms, pred, mplus),
// 					},
// 				});
// 				break;
// 			case "predicate_definition": {
// 				const poss = pred(t, mplus);
// 				for (const [p, s] of poss) {
// 					result.push(p);
// 				}
// 				break;
// 			}
// 			case "predicate_call":
// 				result.push(t);
// 				break;
// 		}
// 	}
// 	return result;

// }
 
// type MonadHelp<S, MULTIS = S[], EMPTYS = null> = {
// 	lift: (s2s: (s: S) => S | EMPTYS | MULTIS) => (sm: MULTIS) => MULTIS | EMPTYS,
// 	joinin: (s2s: (s: S) => S | MULTIS) => (sm: MULTIS) => MULTIS,
// 	mp: (s: S, se: S | EMPTYS) => S,
// 	rd: (s: S | EMPTYS, m: MULTIS) => MULTIS | EMPTYS,
// 	merge: (s: S | EMPTYS, m: MULTIS) => S | EMPTYS,
// 	is_empty: (m: MULTIS | EMPTYS) => m is EMPTYS,
// };

// type AstBreakdown<INITIAL, FIRSTMAP, OUTPUT, STATE, FIRSTMAPMULTI, OUTPUTMULTI, EMPTY> = {
// 	mplus: EMPTY,
// 	// mh1: MonadHelp<[TermGeneric<INITIAL>[], STATE], INITIALMULTI>,
// 	mh2: MonadHelp<[TermGeneric<FIRSTMAP>[], STATE], FIRSTMAPMULTI, EMPTY>,
// 	mh3: MonadHelp<[TermGeneric<OUTPUT>[], STATE], OUTPUTMULTI, EMPTY>,
// 	// firstmap: {
// 		// pred: (z: PredicateCallGeneric<INITIAL>) => PredicateCallGeneric<FIRSTMAP>,
// 	// }
// 	// disj: 
// 	// disj: (z: DisjunctionGeneric<T>, s: S) => MULTIS,
// 	// conj: (z: ConjunctionGeneric<T>, s: S) => S | EMPTYS,
// 	// pred: (z: PredicateCallGeneric<T>, s: S) => S | EMPTYS,
// 	// frsh: (z: FreshGeneric<T>[], s: S) => S | EMPTYS,
// };

// export const mapConjunctions3 = <T, S, MULTIS = S[], EMPTYS = null>(
// 	tt: TermGeneric<T>[],
// 	s1: S | EMPTYS,
// 	mplus: EMPTYS,
// 	mh: MonadHelp<S, MULTIS, EMPTYS>,
// 	disj: (z: DisjunctionGeneric<T>, s: S) => MULTIS,
// 	conj: (z: ConjunctionGeneric<T>, s: S) => S | EMPTYS,
// 	pred: (z: PredicateCallGeneric<T>, s: S) => S,
// ): S | EMPTYS => {
// 	function recur(t2: TermGeneric<T>[], s3: MULTIS): MULTIS | EMPTYS {
// 		let s0: MULTIS | EMPTYS = mplus;
// 		let s: MULTIS = s3;
// 		const result: TermGeneric<T>[] = [];
// 		for (const t of t2) {
// 			switch (t.type) {
// 				case "conjunction": {
// 					s0 = mh.lift((ss) => conj(t, ss))(s);
// 					break;
// 				}
// 				case "disjunction": {
// 					s0 = mh.joinin((ss) => disj(t, ss))(s);
// 					break;
// 				}
// 				case "fresh": {
// 					s0 = mh.lift((ss) => conj(t.body, ss))(s);
// 					break;
// 				}
// 				case "with": {
// 					s0 = mh.lift((ss) => conj(t.body, ss))(s);
// 					break;
// 				}
// 				case "predicate_definition": {
// 					s0 = mh.lift((ss) => conj(t.body, ss))(s);
// 					break;
// 				}
// 				case "predicate_call": {
// 					s0 = mh.lift((ss) => pred(t, ss))(s);
// 					break;
// 				}
// 			}
// 			if (mh.is_empty(s0)) return mplus;
// 			s = mh.rd(s0, s);
// 			// s = mh.rd(s0, s);
// 		}
// 		return conj(newBody, newState);
// 	}
// }



export function mapPredCallsToStateWithDefs<T, S>(
	tt: TermGeneric<T>[],
	fn: (z: PredicateCallGeneric<T>, s: S) => S,
	s1: S,
): S {
	// console.log(pprintGeneric(tt, (ctx, xx) => ""));
	let s = s1;
	for (const t of [...tt]) {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				s = mapPredCallsToStateWithDefs(t.terms, fn, s);
				break;
			case "fresh":
				s = mapPredCallsToStateWithDefs(t.body.terms, fn, s);
				break;
			case "with":
				s = mapPredCallsToStateWithDefs(t.body.terms, fn, s);
				break;
			case "predicate_definition":
				s = fn(make.predicate_call(
					make.identifier(t.name.info, 'define'),
					[
						t.name,
						...t.args
					]
				), s);
				s = mapPredCallsToStateWithDefs(t.body.terms, fn, s);
				break;
			case "predicate_call":
				s = fn(t, s);
				break;
		}
	}
	return s;
}

export function countVarsInCalls<T>(
	tt: TermGeneric<T>[],
): ImmMap<string, number> {
	return mapPredCallsToStateWithDefs(
		tt,
		(t, s) => {
			let result = s;
			for (const a of t.args) {
				if (a.type === "identifier") {
					if (result.has(a.value)) {
						result = result.set(
							a.value,
							result.get(a.value, 0) + 1,
						);
					} else {
						result = result.set(a.value, 1);
					}
				}
			}
			result = result.update(t.source.value, (x = 0) => x + 1);
			return result;
		},
		ImmMap<string, number>(),
	);
}

export function gatherVarInstanceInfo<T>(
	tt: TermGeneric<T>[],
): ImmMap<string, T[]> {
	let result = ImmMap<string, T[]>();
	for (const eachVarIn of intoVarsGeneric(tt)) {
		result = result.update(eachVarIn.value, (x = []) => [
			...x,
			eachVarIn.info,
		]);
	}
	return result;
}

export function mapToGeneric<T>(
	ts: TermGeneric<undefined>[],
	fn: (v: IdentifierGeneric<undefined>) => IdentifierGeneric<T>,
): TermGeneric<T>[] {
	return ts.map((t) => {
		switch (t.type) {
			case "conjunction":
			case "disjunction":
				return {
					...t,
					terms: mapToGeneric(t.terms, fn),
				};
			case "fresh":
				return {
					...t,
					newVars: t.newVars.map((v) => fn(v)),
					body: {
						...t.body,
						terms: mapToGeneric(t.body.terms, fn),
					},
				};
			case "with":
				return {
					...t,
					name: fn(t.name),
					body: {
						...t.body,
						terms: mapToGeneric(t.body.terms, fn),
					},
				};
			case "predicate_definition":
				return {
					...t,
					name: fn(t.name),
					args: t.args.map((v) => fn(v)),
					body: {
						...t.body,
						terms: mapToGeneric(t.body.terms, fn),
					},
				};
			case "predicate_call":
				return {
					...t,
					source: fn(t.source),
					args: t.args.map((a) =>
						a.type === "identifier" ? fn(a) : a,
					),
				};
		}
	});
}

export function mapReducePredCalls<T, Z, S>(
	tt: TermGeneric<T>[],
	mapFn: (
		z: PredicateCallGeneric<T>,
	) => PredicateCallGeneric<Z>,
	reduceFn: (
		acc: S,
		p: PredicateCallGeneric<Z>
	) => [PredicateCallGeneric<Z>, S],
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
	) => IdentifierGeneric<Z>[],
	s: S,
): [TermGeneric<Z>[], S] {
	let acc = s;
	const result: TermGeneric<Z>[] = [];
	for (const t of tt) {
		switch (t.type) {
			case "conjunction":
			case "disjunction": {
				const [newTerms, newState] = mapReducePredCalls(
					t.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({ ...t, terms: newTerms });
				acc = newState;
				break;
			}
			case "fresh": {
				const [newVars, newState] = mapReducePredCalls(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					newVars: freshen('fresh-args', t.newVars),
					body: { ...t.body, terms: newVars },
				});
				acc = newState;
				break;
			}
			case "with": {
				const [newBody, newState] = mapReducePredCalls(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					name: freshen('name', [t.name])[0],
					body: { ...t.body, terms: newBody },
				});
				acc = newState;
				break;
			}
			case "predicate_definition": {
				const [newBody, newState] = mapReducePredCalls(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					name: freshen('name', [t.name])[0],
					args: freshen('definition-args', t.args),
					body: { ...t.body, terms: newBody },
				});
				acc = newState;
				break;
			}
			case "predicate_call": {
				const [newCall, newState] = reduceFn(acc, mapFn(t));
				result.push(newCall);
				acc = newState;
				break;
			}
		}
	}
	return [result, acc];
}

export function mapReducePredCalls2<T, Z, S>(
	tt: TermGeneric<T>[],
	mapFn: (
		z: PredicateCallGeneric<T>,
	) => PredicateCallGeneric<Z>,
	reduceFn: (
		acc: S[],
		p: PredicateCallGeneric<Z>
	) => [PredicateCallGeneric<Z>, S[]],
	freshen: (
		src: CtxTypes,
		zz: IdentifierGeneric<T>[],
	) => IdentifierGeneric<Z>[],
	s: S[],
): [TermGeneric<Z>[], S[]] {
	let acc = s;
	const result: TermGeneric<Z>[] = [];
	for (const t of tt) {
		switch (t.type) {
			case "conjunction": {
				const [newTerms, newState] = mapReducePredCalls2(
					t.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({ ...t, terms: newTerms });
				acc = newState;
				break;
			}
			case "disjunction": {
				let newTerms: TermGeneric<Z>[] = [];
				let newStates: S[] = [];
				for (const disjt of t.terms) {
					const [newTerms1, newState1] = mapReducePredCalls2(
						[disjt],
						mapFn,
						reduceFn,
						freshen,
						acc,
					);
					newTerms = newTerms.concat(newTerms1);
					newStates = newStates.concat(newState1);
				}
				result.push({ ...t, terms: newTerms });
				acc = newStates;
				break;
			}
			case "fresh": {
				const [newVars, newState] = mapReducePredCalls2(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					newVars: freshen('fresh-args', t.newVars),
					body: { ...t.body, terms: newVars },
				});
				acc = newState;
				break;
			}
			case "with": {
				const [newBody, newState] = mapReducePredCalls2(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					name: freshen('name', [t.name])[0],
					body: { ...t.body, terms: newBody },
				});
				acc = newState;
				break;
			}
			case "predicate_definition": {
				const [newBody, newState] = mapReducePredCalls2(
					t.body.terms,
					mapFn,
					reduceFn,
					freshen,
					acc,
				);
				result.push({
					...t,
					name: freshen('name', [t.name])[0],
					args: freshen('definition-args', t.args),
					body: { ...t.body, terms: newBody },
				});
				acc = newState;
				break;
			}
			case "predicate_call": {
				const [newCall, newState] = reduceFn(acc, mapFn(t));
				result.push(newCall);
				acc = newState;
				break;
			}
		}
	}
	return [result, acc];
}

export function formScopes<T>(
	t: TermGeneric<T>,
): PredicateCallGeneric<T>[][] {
	const result: PredicateCallGeneric<T>[][] = [];
	switch (t.type) {
		case "conjunction": {
			for (const term of t.terms) {
				const ncc: PredicateCallGeneric<T>[][] = [];
				const newCalls = formScopes(term);
				for (let i = 0; i < newCalls.length; i++) {
					for (let j = 0; j < result.length; j++) {
						ncc.push([...result[j], ...newCalls[i]]);
					}
					if (result.length === 0) {
						ncc.push(newCalls[i]);
					}
				}
				result.push(...ncc);
			}
			return result;
		}
		case "disjunction": {
			return t.terms.flatMap((term): PredicateCallGeneric<T>[][] => formScopes(term));
		}
		case "fresh":
		case "with":
			return formScopes(t.body);
		case "predicate_definition":
			return [];
		case "predicate_call":
			return [[t]];
	}
}

function combineLists<T>(
	a: T[][],
	b: T[][],
): T[][] {
	if (a.length === 0) {
		return b;
	}
	const result: T[][] = [];
	for (const aa of a) {
		for (const bb of b) {
			result.push([...aa, ...bb]);
		}
	}
	return result;
}

export function b4AndAfter<T>(
	t: TermGeneric<T>[],
	idx: number,
	prevB4: PredicateCallGeneric<T>[][] = [],
	prevAfter: PredicateCallGeneric<T>[][] = [],
): [PredicateCallGeneric<T>[][], PredicateCallGeneric<T>[][]] {
	let before: PredicateCallGeneric<T>[][] = [...prevB4];
	let after: PredicateCallGeneric<T>[][] = [...prevAfter];
	for (let i = 0; i < t.length; i++) {
		if (i < idx) {
			// before.push(...formScopes(t[i]));
			before = combineLists(before, formScopes(t[i]));		
		} else if (i > idx) {
			after = combineLists(after, formScopes(t[i]));
		}
	}
	return [before, after];
}

export function splitAlongScopeStateless<T>(
	t: TermGeneric<T>,
	scopeFn: (
		b4: PredicateCallGeneric<T>[][],
		after: PredicateCallGeneric<T>[][],
		call: PredicateCallGeneric<T>
	) => PredicateCallGeneric<T>,
	prevB4: PredicateCallGeneric<T>[][] = [],
	prevAfter: PredicateCallGeneric<T>[][] = [],
): TermGeneric<T> {
	// Build up the before and after arrays for each scope
	const before: PredicateCallGeneric<T>[][] = [...prevB4];
	const after: PredicateCallGeneric<T>[][] = [...prevAfter];
	switch (t.type) {
		case "conjunction": {
			const newTerms: TermGeneric<T>[] = [];
			for (let i = 0; i < t.terms.length; i++) {
				const [b4_, after_] = b4AndAfter(t.terms, i, before, after);
				const nc = splitAlongScopeStateless(t.terms[i], scopeFn, b4_, after_);
				newTerms.push(nc);
			}
			return { ...t, terms: newTerms };
		}
		case "disjunction": {
			const newTerms: TermGeneric<T>[] = [];
			for (const term of t.terms) {
				const nt= splitAlongScopeStateless(term, scopeFn, before, after);
				newTerms.push(nt);
			}
			return { ...t, terms: newTerms };
		}
		case "fresh": 
		case "with": {
			const b2 = splitAlongScopeStateless(t.body, scopeFn, before, after);
			return {
				...t,
				body: b2 as ConjunctionGeneric<T>,
			};
		}
		case "predicate_definition":{
			const newBody = splitAlongScopeStateless(t.body, scopeFn, before, after);
			if (newBody.type === "conjunction") {
				return {
					...t,
					body: newBody,
				};
			} else {
				throw new Error("Expected conjunction");
			}
		}
		case "predicate_call": {
			const newCall = scopeFn(before, after, t);
			return newCall;
		}
	}
}

export function splitAlongScope<T, S>(
	t: TermGeneric<T>,
	scopeFn: (
		b4: PredicateCallGeneric<T>[][],
		after: PredicateCallGeneric<T>[][],
		call: PredicateCallGeneric<T>,
		state: S
	) => [PredicateCallGeneric<T>, S],
	state1: S,
	prevB4: PredicateCallGeneric<T>[][] = [],
	prevAfter: PredicateCallGeneric<T>[][] = [],
): [TermGeneric<T>, S] {
	// Build up the before and after arrays for each scope
	const before: PredicateCallGeneric<T>[][] = [...prevB4];
	const after: PredicateCallGeneric<T>[][] = [...prevAfter];
	switch (t.type) {
		case "conjunction": {
			const newTerms: TermGeneric<T>[] = [];
			let state = state1;
			for (let i = 0; i < t.terms.length; i++) {
				const [b4_, after_] = b4AndAfter(t.terms, i, before, after);
				const [nc, s2] = splitAlongScope(t.terms[i], scopeFn, state, b4_, after_);
				state = s2;
				newTerms.push(nc);
			}
			return [{ ...t, terms: newTerms }, state];
		}
		case "disjunction": {
			const newTerms: TermGeneric<T>[] = [];
			let state = state1;
			for (const term of t.terms) {
				const [nt, s2] = splitAlongScope(term, scopeFn, state, before, after);
				state = s2;
				newTerms.push(nt);
			}
			return [{ ...t, terms: newTerms }, state];
		}
		case "fresh": 
		case "with": {
			const [b2, s2] = splitAlongScope(t.body, scopeFn, state1, before, after);
			return [{
				...t,
				body: conjunction1(b2),
			}, s2];
		}
		case "predicate_definition":{
			const includeDefinitions = make.predicate_call(
				make.identifier(
					t.name.info,
					"define_args"
				),
				[
					...t.args
				]
			);
			const before2 = [...before].map(
				(x) => [includeDefinitions, ...x],
			)
			const [newBody, st2] = splitAlongScope(t.body, scopeFn, state1, before2, after);
			return [{
					...t,
					body: conjunction1(newBody),
				}, st2];
		}
		case "predicate_call": {
			const newCall = scopeFn(before, after, t, state1);
			return newCall;
		}
	}
}
