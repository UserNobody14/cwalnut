import type { IdentifierDsAst, TermDsAst } from "src/types/DesugaredAst";
import { Map as ImmMap } from "immutable";
import type { ExpressionGeneric, IdentifierGeneric, PredicateCallGeneric, PredicateDefinitionGeneric, TermGeneric } from "src/types/DsAstTyped";
import { P, match } from "ts-pattern";

export function* intoVars(tt: TermDsAst[]): Generator<string> {
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
                break
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

export function* intoUniqueVars(tt: TermDsAst[], ignore: Set<string>): Generator<string> {
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
                break
            case "predicate_call":
                if (!ignore.has(t.source.value)) {
                    yield t.source.value;
                }
                for (const a of t.args) {
                    if (a.type === "identifier" && !ignore.has(a.value)) {
                        yield a.value;
                    }
                }
                break;
        }
    }
}


export function* intoVarsGeneric<T>(tt: TermGeneric<T>[]): Generator<IdentifierGeneric<T>> {
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
                break
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


export function* intoUniqueVarsGeneric<T>(tt: TermGeneric<T>[], ignore: Set<string>): Generator<IdentifierGeneric<T>> {
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
                break
            case "predicate_call":
                if (!ignore.has(t.source.value)) {
                    yield t.source;
                }
                for (const a of t.args) {
                    if (a.type === "identifier" && !ignore.has(a.value)) {
                        yield a;
                    }
                }
                break;
        }
    }
}


export function mapVars(tt: TermDsAst[], fn: (v: string) => string): TermDsAst[] {
    return tt.map(t => {
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
                    newVars: t.newVars.map(v => ({ ...v, value: fn(v.value) })),
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
                    args: t.args.map(v => ({ ...v, value: fn(v.value) })),
                    body: {
                        ...t.body,
                        terms: mapVars(t.body.terms, fn),
                    },
                };
            case "predicate_call":
                return {
                    ...t,
                    source: { ...t.source, value: fn(t.source.value) },
                    args: t.args.map(a => a.type === "identifier" ? { ...a, value: fn(a.value) } : a),
                };
        }
    });
}

export function mapVarsGeneric<T, Z>(tt: TermGeneric<T>[], fn: (v: IdentifierGeneric<T>) => IdentifierGeneric<Z>): TermGeneric<Z>[] {
    return tt.map(t => {
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
                    newVars: t.newVars.map(v => fn(v)),
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
                    args: t.args.map(v => fn(v)),
                    body: {
                        ...t.body,
                        terms: mapVarsGeneric(t.body.terms, fn),
                    },
                };
            case "predicate_call":
                return {
                    ...t,
                    source: fn(t.source),
                    args: t.args.map(a => a.type === "identifier" ? fn(a) : a),
                };
        }
    });
}

type CtxTypes = 'fresh-args' | 'name' | 'definition-args' | 'call-args';

export function mapPredCalls<T, Z>(tt: TermGeneric<T>[], 
    fn: (z: PredicateCallGeneric<T>) => PredicateCallGeneric<Z>,
    freshen: (src: CtxTypes, zz: IdentifierGeneric<T>[]) => IdentifierGeneric<Z>[],
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
                    newVars: freshen('fresh-args', t.newVars),
                    body: {
                        ...t.body,
                        terms: mapPredCalls(t.body.terms, fn, freshen),
                    },
                };
            case "with":
                return {
                    ...t,
                    name: freshen('name', [t.name])[0],
                    body: {
                        ...t.body,
                        terms: mapPredCalls(t.body.terms, fn, freshen),
                    },
                };
            case "predicate_definition":
                return {
                    ...t,
                    name: freshen('name', [t.name])[0],
                    args: freshen('definition-args', t.args),
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

export function mapPredDefinitionsGeneric<T, Z>(
    tt: TermGeneric<T>[],
    fn: (z: PredicateDefinitionGeneric<T>) => PredicateDefinitionGeneric<Z>,
    freshen: (src: CtxTypes, zz: IdentifierGeneric<T>[]) => IdentifierGeneric<Z>[],
): TermGeneric<Z>[] {
    return tt.map((t: TermGeneric<T>): TermGeneric<Z> => {
        switch (t.type) {
            case "conjunction":
            case "disjunction":
                return {
                    ...t,
                    terms: mapPredDefinitionsGeneric(t.terms, fn, freshen),
                };
            case "fresh":
                return {
                    ...t,
                    newVars: freshen('fresh-args', t.newVars),
                    body: {
                        ...t.body,
                        terms: mapPredDefinitionsGeneric(t.body.terms, fn, freshen),
                    },
                };
            case "with":
                return {
                    ...t,
                    name: freshen('name', [t.name])[0],
                    body: {
                        ...t.body,
                        terms: mapPredDefinitionsGeneric(t.body.terms, fn, freshen),
                    },
                };
            case "predicate_definition":
                return fn(t);
            case "predicate_call":
                return {
                    ...t,
                    source: freshen('name', [t.source])[0],
                    args: t.args.map(a => a.type === "identifier" ? freshen('call-args', [a])[0] : a),
                };
        }
    });
}

export function mapPredDefinitionsToState<T, S>(
    tt: TermGeneric<T>[],
    fn: (z: PredicateDefinitionGeneric<T>, s: S) => S,
    freshen: (src: CtxTypes, zz: IdentifierGeneric<T>[], s: S) => [IdentifierGeneric<T>[], S],
    s1: S,
): S {
    let s = s1;
    for (const t of tt) {
        switch (t.type) {
            case "conjunction":
            case "disjunction":
                s = mapPredDefinitionsToState(t.terms, fn, freshen, s);
                break;
            case "fresh":
                s = mapPredDefinitionsToState(t.body.terms, fn, freshen, s);
                break;
            case "with":
                s = mapPredDefinitionsToState(t.body.terms, fn, freshen, s);
                break;
            case "predicate_definition":
                s = fn(t, s);
                break;
            case "predicate_call":
                s = freshen('name', [t.source], s)[1];
                for (const a of t.args) {
                    if (a.type === "identifier") {
                        s = freshen('call-args', [a], s)[1];
                    }
                }
                break;
        }
    }
    return s;
}

export function mapVarsWithState<T, Z, S>(tt: TermGeneric<T>[], fn: (v: IdentifierGeneric<T>, s: S) => [IdentifierGeneric<Z>, S], s1: S): [TermGeneric<Z>[], S] {
    let s = s1;
    const result: TermGeneric<Z>[] = [];
    for (const t of tt) {
        switch (t.type) {
            case "conjunction":
            case "disjunction": {
                const [newTerms, newState] = mapVarsWithState(t.terms, fn, s);
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
                const [newBody, newState] = mapVarsWithState(t.body.terms, fn, s);
                result.push({ ...t, newVars, body: { ...t.body, terms: newBody } });
                s = newState;
                break;
            }
            case "with": {
                const [newName, newState] = fn(t.name, s);
                const [newBody, newState2] = mapVarsWithState(t.body.terms, fn, newState);
                result.push({ ...t, name: newName, body: { ...t.body, terms: newBody } });
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
                const [newBody, newState2] = mapVarsWithState(t.body.terms, fn, s);
                result.push({ ...t, name: newName, args: newArgs, body: { ...t.body, terms: newBody } });
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
                result.push({ ...t, source: newSource, args: newArgs });
                break;
            }
        }
    }
    return [result, s];
}

export function mapVarsToState<T, S>(tt: TermGeneric<T>[], fn: (v: IdentifierGeneric<T>, s: S) => S, s1: S): S {
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
    fn: (z: PredicateCallGeneric<T>, s: S) => [PredicateCallGeneric<Z>, S],
    freshen: (src: string, zz: IdentifierGeneric<T>[], s: S) => [IdentifierGeneric<Z>[], S],
    s1: S,
): [TermGeneric<Z>[], S] {
    let s = s1;
    const result: TermGeneric<Z>[] = [];
    for (const t of tt) {
        switch (t.type) {
            case "conjunction":
            case "disjunction": {
                const [newTerms, newState] = mapPredCallsWithState(t.terms, fn, freshen, s);
                result.push({ ...t, terms: newTerms });
                s = newState;
                break;
            }
            case "fresh": {
                const [newVars, newState] = freshen('fresh-args', t.newVars, s);
                const [newBody, newState2] = mapPredCallsWithState(t.body.terms, fn, freshen, newState);
                result.push({ ...t, newVars, body: { ...t.body, terms: newBody } });
                s = newState2;
                break;
            }
            case "with": {
                const [newName, newState] = freshen('name', [t.name], s);
                const [newBody, newState2] = mapPredCallsWithState(t.body.terms, fn, freshen, newState);
                result.push({ ...t, name: newName[0], body: { ...t.body, terms: newBody } });
                s = newState2;
                break;
            }
            case "predicate_definition": {
                const [newName, newState] = freshen('name', [t.name], s);
                s = newState;
                const [newArgs, newState2] = freshen('definition-args', t.args, s);
                const [newBody, newState3] = mapPredCallsWithState(t.body.terms, fn, freshen, newState2);
                result.push({ ...t, name: newName[0], args: newArgs, body: { ...t.body, terms: newBody } });
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

export function mapPredCallsToState<T, S>(tt: TermGeneric<T>[], fn: (z: PredicateCallGeneric<T>, s: S) => S, s1: S): S {
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

export function gatherVarInstanceInfo<T>(tt: TermGeneric<T>[]): ImmMap<string, T[]> {
    let result = ImmMap<string, T[]>();
    for (const eachVarIn of intoVarsGeneric(tt)) {
        result = result.update(eachVarIn.value, (x = []) => [...x, eachVarIn.info]);
    }
    return result;

}

export function mapToGeneric<T>(ts: TermDsAst[], fn: (v: IdentifierDsAst) => IdentifierGeneric<T>): TermGeneric<T>[] {
    return ts.map(t => {
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
                    newVars: t.newVars.map(v => fn(v)),
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
                    args: t.args.map(v => fn(v)),
                    body: {
                        ...t.body,
                        terms: mapToGeneric(t.body.terms, fn),
                    },
                };
            case "predicate_call":
                return {
                    ...t,
                    source: fn(t.source),
                    args: t.args.map(a => a.type === "identifier" ? fn(a) : a),
                };
        }
    });
}
