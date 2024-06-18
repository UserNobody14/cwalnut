import * as ast from './ast';
/**
 * Take in the ast and return a type annotated ast
 */

// Typing

type InOutType = 'in' | 'out' | 'inout';

interface TypeMeta {
    inout?: InOutType;
    linear?: boolean;
}

interface SimpleType {
    type: 'simple_type';
    name: string;
    meta: TypeMeta;
}

interface ComplexType {
    type: 'complex_type';
    name: string;
    args: Type[];
    meta: TypeMeta;
}

interface HKT {
    type: 'hkt';
    args: TypeVar[];
    staticT: Type[];
    apply: (args: Type[]) => Type;
}

interface TypeVar {
    type: 'type_var';
    name: string;
    // Constraints?
}

interface MonoPredicateType {
    type: 'mono_predicate';
    args: Type[];
    meta: TypeMeta;
}

interface Union {
    type: 'union';
    options: Type[];
}

export type Type = SimpleType | HKT | TypeVar | Union | MonoPredicateType | ComplexType;
export type UnboundType = TypeVar | HKT;
// export type boundType = SimpleType | Union | MonoPredicateType;


// Utilities

const to_type_meta = (inout: InOutType = 'inout', linear: boolean = false): TypeMeta => ({
    inout,
    linear
}),
    to_mono_pred = (args: Type[], inout: InOutType = 'inout', linear: boolean = false): MonoPredicateType => ({
        type: 'mono_predicate',
        args,
        meta: to_type_meta(inout, linear)
    }),
    to_union = (options: Type[]): Union => ({
        type: 'union',
        options
    }),
    to_hkt = (args: TypeVar[], apply: (args: Type[]) => Type, staticT: Type[]): HKT => ({
        type: 'hkt',
        args,
        apply,
        staticT
    }),
    to_complex_type = (name: string, args: Type[], inout: InOutType = 'inout', linear: boolean = false): ComplexType => ({
        type: 'complex_type',
        name,
        args,
        meta: to_type_meta(inout, linear)
    }),
    to_type_var = (name: string): TypeVar => ({
        type: 'type_var',
        name,
    }),
    to_simple_type = (name: string, inout: InOutType = 'inout', linear: boolean = false): SimpleType => ({
        type: 'simple_type',
        name,
        meta: to_type_meta(inout, linear)
    }),
    to_dict = (key: Type, value: Type): ComplexType => to_complex_type('dict', [key, value]);

const types = {
    string: to_simple_type('string'),
    number: to_simple_type('number'),
    bool: to_simple_type('bool'),
    // any: to_simple_type('any'),

    // Builtin complex types
    // dict: to_complex_type('dict', [to_type_var('K'), to_type_var('V')]),

    // Builtin predicates
    unify: to_simple_type('unify'),
    set_key_of: to_simple_type('set_key_of'),
    length: to_simple_type('length'),
} as const;

// Builtin lvars for some utility predicates
const builtins: Record<string, IdentifierTyped> = {
    unify: {
        type: 'identifier',
        value: 'unify',
        contextualType: types.unify
    },
    set_key_of: {
        type: 'identifier',
        value: 'set_key_of',
        contextualType: types.set_key_of
    },
    length: {
        type: 'identifier',
        value: 'length',
        contextualType: types.length
    }
}

const to_unify = (lhs: ExpressionTyped, rhs: ExpressionTyped): PredicateCallTyped => ({
    type: 'predicate',
    source: builtins.unify,
    args: [lhs, rhs]
}),
    to_set_key_of = (obj: ExpressionTyped, key: ExpressionTyped, value: ExpressionTyped): PredicateCallTyped => ({
        type: 'predicate',
        source: {
            type: 'identifier',
            value: 'set_key_of',
            contextualType: types.set_key_of
        },
        args: [obj, key, value]
    }),
    to_literal = (value: string, t: SimpleType): LiteralTyped => ({
        type: 'literal',
        value,
        contextualType: t
    }),
    to_conjunction = (terms: TermTyped[]): ConjunctionTyped => ({
        type: 'conjunction',
        terms
    }),
    to_disjunction = (terms: TermTyped[]): DisjunctionTyped => ({
        type: 'disjunction',
        terms
    }),
    to_typed_lvar = (name: string, t: Type): IdentifierTyped => ({
        type: 'identifier',
        value: name,
        contextualType: t
    });



// Output Ast

export type TypedAst = ConjunctionTyped;

export type TermTyped = ConjunctionTyped | DisjunctionTyped | PredicateCallTyped | PredicateDefinitionTyped;

export interface ConjunctionTyped {
    type: 'conjunction';
    terms: TermTyped[];
}

export interface DisjunctionTyped {
    type: 'disjunction';
    terms: TermTyped[];
}

export interface PredicateCallTyped {
    type: 'predicate';
    source: IdentifierTyped;
    args: ExpressionTyped[];
}

export interface PredicateDefinitionTyped {
    type: 'predicate_definition';
    name: IdentifierTyped;
    args: IdentifierTyped[];
    body: TypedAst;
}

export type ExpressionTyped = IdentifierTyped | LiteralTyped;

export interface IdentifierTyped {
    type: 'identifier';
    contextualType: Type;
    value: string;
}

export interface LiteralTyped {
    type: 'literal';
    contextualType: Type;
    value: string;
}


// Conversion from Ast to TypedAst

function unifyTypesDisj(t1: Type, t2: Type): Type {
    if (t1.type === 'type_var') {
        return t2;
    } else if (t2.type === 'type_var') {
        return t1;
    } else if (t1.type === 'simple_type' && t2.type === 'simple_type') {
        if (t1.name === t2.name) {
            return t1;
        } else {
            return to_union([t1, t2]);
        }
    } else if (t1.type === 'complex_type') {
        if (t2.type === 'complex_type') {
            if (t1.name === t2.name) {
                if (t1.args.length !== t2.args.length) {
                    throw new Error(`Complex types have different number of args: ${t1.args.length} vs ${t2.args.length}`);
                }
                const args = t1.args.map((arg, i) => unifyTypesDisj(arg, t2.args[i]));
                return to_complex_type(t1.name, args);
            } else {
                return to_union([t1, t2]);
            }
        } else {
            return to_union([t1, t2]);
        }

    } else if (t1.type === 'hkt' && t2.type === 'hkt') {
        if (t1.args.length !== t2.args.length) {
            throw new Error(`HKTs have different number of args: ${t1.args.length} vs ${t2.args.length}`);
        }
        const args = t1.args.map((arg, i) => unifyTypesDisj(arg, t2.args[i]));
        // return to_hkt(args, t1.apply);
        throw new Error(`Unification not implemented for HKTs`);
    } else {
        throw new Error(`Unification not implemented for ${t1.type} and ${t2.type}`);
    }
}

class TypeEnv {
    private env: { [key: string]: Type } = {};
    private boundTypeVars: { [key: string]: Type } = {};
    private lvarCount = 0;
    private typeVarCount = 0;
    constructor() {
        this.env = {};
    }

    public addType(name: string, type: Type) {
        if (this.env[name]) {
            throw new Error(`Type ${name} already defined as ${pprintType(this.env[name])}`);
        }
        this.env[name] = type;
    }

    public getType(name: string): Type | undefined {
        const simpleType = this.env[name];
        if (simpleType && simpleType.type === 'type_var') {
            const walkedT = this.walkTypeVar(simpleType.name);
            if (walkedT) {
                return walkedT;
            }
        }
        return simpleType;
    }

    public getNewLvar(): string {
        return `_lvar${this.lvarCount++}`;
    }

    public getTypedLvar(t: Type): IdentifierTyped {
        const lvar = this.getNewLvar();
        this.addType(lvar, t);
        return {
            type: 'identifier',
            value: lvar,
            contextualType: t
        };
    }

    public getNewTypeVar(altPrefix?: string): string {
        return `${altPrefix ?? '_typevar'}${this.typeVarCount++}`;
    }

    public getAsTypeVar(id?: string, altPrefix?: string): IdentifierTyped {
        const typevar = this.getNewTypeVar(altPrefix);
        const t = to_type_var(typevar);
        if (id) {
            const gettingV = this.getType(id);
            if (gettingV) {
                throw new Error(`Type ${id} already defined`);
            } else {
                this.addType(id, t);
                return {
                    type: 'identifier',
                    value: id,
                    contextualType: t
                };
            }
        }
        return this.getTypedLvar(t);
    }

    public bindTypeVar(id: string, t: Type) {
        // check if it is already bound
        if (this.boundTypeVars[id]) {
            if (equalsTypes(this.boundTypeVars[id], t)) {
                return;
            }
            if (this.boundTypeVars[id].type !== 'type_var' && t.type === 'type_var') {
                this.bindTypeVar(t.name, this.boundTypeVars[id]);
                return;
            }
            throw new Error(`Type var ${id} already bound to ${pprintType(this.boundTypeVars[id])
                } (Attempting to bind to ${pprintType(t)}
            Context:
            ${this.toString()}`);
        }
        this.boundTypeVars[id] = t;
        // search through the env and update any references to this type var
        for (let key in this.env) {
            const type = this.env[key];
            if (type.type === 'type_var' && type.name === id) {
                this.env[key] = t;
            }
        }
    }

    // Walk the type var to its bound type
    public walkTypeVar(t: string): Type | undefined {
        const bound = this.boundTypeVars[t];
        if (bound) {
            // If the bound type is a type var, walk it further
            if (bound.type === 'type_var') {
                return this.walkTypeVar(bound.name);
            } else {
                return bound;
            }
        }
        return undefined;
    }

    public unifyDisjunction(d: TypeEnv) {
        // Unify the type vars
        for (let key in this.boundTypeVars) {
            const bound = this.boundTypeVars[key];
            const otherBound = d.boundTypeVars[key];
            if (bound && otherBound) {
                const unified = unifyTypesDisj(bound, otherBound);
                this.bindTypeVar(key, unified);
                d.bindTypeVar(key, unified);
            } else if (bound) {
                d.bindTypeVar(key, bound);
            } else if (otherBound) {
                this.bindTypeVar(key, otherBound);
            }
        }
        // Unify the env
        for (let key in this.env) {
            const type = this.env[key];
            const otherType = d.env[key];
            if (type && otherType) {
                const unified = unifyTypesDisj(type, otherType);
                this.env[key] = unified;
                d.env[key] = unified;
            } else if (type) {
                d.env[key] = type;
            } else if (otherType) {
                this.env[key] = otherType;
            }
        }
    }

    public toFreshEnv(): TypeEnv {
        const newEnv = new TypeEnv();
        newEnv.env = { ...this.env };
        newEnv.boundTypeVars = { ...this.boundTypeVars };
        newEnv.lvarCount = this.lvarCount;
        newEnv.typeVarCount = this.typeVarCount;
        return newEnv;
    }

    public toString(): string {
        const env = JSON.stringify(this.env, null, 4);
        const bound = JSON.stringify(this.boundTypeVars, null, 4);
        return `Env: ${env}\nBound: ${bound}`;
    }
}

function equalsTypes(t1: Type, t2: Type): boolean {
    console.log("Equalsv: ", pprintType(t1), pprintType(t2));
    switch (t1.type) {
        case 'simple_type':
            if (t2.type === 'simple_type') {
                return t1.name === t2.name;
            }
            return false;
        case 'complex_type':
            if (t2.type === 'complex_type') {
                if (t1.name !== t2.name) {
                    return false;
                }
                if (t1.args.length !== t2.args.length) {
                    return false;
                }
                return t1.args.every((arg, i) => equalsTypes(arg, t2.args[i]));
            }
            return false;
        case 'type_var':
            if (t2.type === 'type_var') {
                return t1.name === t2.name;
            }
            return false;
        case 'hkt':
            if (t2.type === 'hkt') {
                if (t1.args.length !== t2.args.length) {
                    return false;
                }
                return t1.args.every((arg, i) => equalsTypes(arg, t2.args[i]));
            }
            return false;
        case 'union':
            if (t2.type === 'union') {
                if (t1.options.length !== t2.options.length) {
                    return false;
                }
                return t1.options.every((opt, i) => equalsTypes(opt, t2.options[i]));
            }
            return false;
        case 'mono_predicate':
            if (t2.type === 'mono_predicate') {
                if (t1.args.length !== t2.args.length) {
                    return false;
                }
                return t1.args.every((arg, i) => equalsTypes(arg, t2.args[i]));
            }
            return false;
    }
}

// Type checking & annotation
// Each term is simplified to a conjunction and/or disjunction of predicates, so each ast node
// can return more than one term, and the type environment is updated accordingly
function typeTermAst(ast: ast.Term, typeEnv: TypeEnv): [TermTyped[], TypeEnv] {
    switch (ast.type) {
        case 'conjunction': return typeConjunction(ast, typeEnv);
        case 'disjunction': return typeDisjunction(ast, typeEnv);
        case 'predicate_call': return typePredicateCall(ast, typeEnv);
        case 'unification': return typeUnification(ast, typeEnv);
    }
}

function typeConjunction(ast: ast.Conjunction, typeEnv: TypeEnv): [TermTyped[], TypeEnv] {
    return typeTermList(ast.children, typeEnv, 'conjunction');
}

function typeDisjunction(ast: ast.Disjunction, typeEnv: TypeEnv): [TermTyped[], TypeEnv] {
    return typeTermList(ast.children, typeEnv, 'disjunction');
}

function typeTermList(children: ast.Term[], typeEnv: TypeEnv, type: 'implicit' | 'conjunction' | 'disjunction'): [TermTyped[], TypeEnv] {
    // TODO: update for disjunction typing properly...
    let terms: TermTyped[] = [];
    if (type === 'conjunction' || type === 'implicit') {
        for (let child of children) {
            let [typed, newEnv] = typeTermAst(child, typeEnv);
            terms = [...terms, ...typed];
            typeEnv = newEnv;
        }
    } else if (type === 'disjunction') {
        const res = children.map((child) => typeTermAst(child, typeEnv.toFreshEnv()));
        // Unify the types of the disjunctions
        let newEnv = typeEnv;
        for (let [typed, env] of res) {
            newEnv.unifyDisjunction(env);
            terms = terms.concat(typed);
        }
        typeEnv = newEnv;
    }
    [terms, typeEnv] = cleanupTypeVarsList(terms, typeEnv);
    if (type === 'implicit') {
        return [terms, typeEnv];
    } else if (type === 'conjunction') {
        return [[to_conjunction(terms)], typeEnv];
    } else {
        return [[to_disjunction(terms)], typeEnv];
    }
}

// Convert predicate call source to (potentially) several unifications with identifiers
function typePredicateCall(ast: ast.PredicateCall, typeEnv: TypeEnv): [TermTyped[], TypeEnv] {
    const [typedArgs, newTerms1, newEnv] = typeExpressionList(ast.args, typeEnv);
    const [source, newTerms2, typeEnv2] = typeToIdentifier(ast.source, newEnv);
    return [[...newTerms1, ...newTerms2, {
        type: 'predicate',
        source: source,
        args: typedArgs
    }], typeEnv2];
}

// Convert unification to a predicate call to the unification predicate
function typeUnification(ast: ast.Unification, typeEnv: TypeEnv): [TermTyped[], TypeEnv] {
    // in the special case of a predicate definition, go to typePredicateDefinition
    if (ast.right.type === 'predicate_definition') {
        return typePredicateDefinition(ast.left, ast.right, typeEnv);
    }
    const [lhs1, newTerms, newEnv] = typeToExpression(ast.left, typeEnv);
    const [rhs1, newTerms2, newEnv2] = typeToExpression(ast.right, newEnv);
    const { lhs, rhs, newEnv3 } = checkAndBindTypes(lhs1, rhs1, newEnv2, newTerms2);
    return [[...newTerms, ...newTerms2, {
        type: 'predicate',
        source: {
            type: 'identifier',
            value: 'unify',
            contextualType: types.unify
        },
        args: [lhs, rhs]
    }], newEnv3];
}

function typePredicateDefinition(lhs: ast.Expression, expression: ast.PredicateDefinitionAst, oldEnv: TypeEnv): [TermTyped[], TypeEnv] {
    const [lhs1, newTerms, typeEnv] = typeToExpression(lhs, oldEnv);
    // Add a predicate definition to the list of terms and use its id here
    const freshTypeEnv = new TypeEnv();
    const args = expression.args.map((arg) => {
        const typeVar = freshTypeEnv.getAsTypeVar(arg);
        return typeVar;
    });
    const [body, nte] = typeTermAst(expression.children, freshTypeEnv);
    // refetch the args in case they've since been updated
    const typedArgs = expression.args.map((arg) => {
        const typeVar = nte.getType(arg);
        if (!typeVar) {
            throw new Error(`Type not found for ${arg}`);
        }
        return typeVar;
    });
    // const id = typeEnv.getTypedLvar(to_mono_pred(typedArgs));
    if (lhs1.type !== 'identifier') {
        throw new Error(`Invalid predicate definition lhs: ${lhs1}`);
    }
    if (lhs1.contextualType.type !== 'mono_predicate') {
        if (lhs1.contextualType.type !== 'type_var') {
            throw new Error(`Invalid predicate definition lhs type: ${lhs1.contextualType}`);
        } else {
            typeEnv.bindTypeVar(lhs1.contextualType.name, to_mono_pred(typedArgs));
        }
    }
    return [[
        ...newTerms,
        {
        type: 'predicate_definition',
        name: lhs1,
        args,
        body: to_conjunction(body)
    }], typeEnv
];
}

function checkAndBindTypes(lhs: ExpressionTyped, rhs: ExpressionTyped, newEnv2: any, newTerms2: TermTyped[]) {
    if (lhs.contextualType.type === 'type_var' && rhs.contextualType.type !== 'type_var') {
        newEnv2.bindTypeVar(lhs.contextualType.name, rhs.contextualType);
        lhs = to_typed_lvar(lhs.value, rhs.contextualType);
    } else if (rhs.contextualType.type === 'type_var' && lhs.contextualType.type !== 'type_var') {
        newEnv2.bindTypeVar(rhs.contextualType.name, lhs.contextualType);
        rhs = to_typed_lvar(rhs.value, lhs.contextualType);
    } else if (lhs.contextualType.type === 'type_var' && rhs.contextualType.type === 'type_var') {
        // Bind the type vars to each other
        newEnv2.bindTypeVar(lhs.contextualType.name, rhs.contextualType);
        lhs = to_typed_lvar(lhs.value, rhs.contextualType);
        rhs = to_typed_lvar(rhs.value, lhs.contextualType);
    } else {
        // Check if the two types are valid to unify
        if (lhs.contextualType.type === 'simple_type' && rhs.contextualType.type === 'simple_type') {
            if (lhs.contextualType.name !== rhs.contextualType.name) {
                throw new Error(`Cannot unify ${lhs.contextualType.name} and ${rhs.contextualType.name}`);
            }
        } else if (lhs.contextualType.type === 'complex_type' && rhs.contextualType.type === 'complex_type') {
            if (lhs.contextualType.name !== rhs.contextualType.name) {
                throw new Error(`Cannot unify ${lhs.contextualType.name} and ${rhs.contextualType.name}`);
            }
            if (lhs.contextualType.args.length !== rhs.contextualType.args.length) {
                throw new Error(`Cannot unify complex types with different numbers of args`);
            }
            for (let i = 0; i < lhs.contextualType.args.length; i++) {
                const l = lhs.contextualType.args[i];
                const r = rhs.contextualType.args[i];
                const { newEnv3: newEnv} = checkAndBindTypes(to_typed_lvar(lhs.value, l), to_typed_lvar(rhs.value, r), newEnv2, newTerms2);
                newEnv2 = newEnv;
            }
        }
    }
    return { lhs, rhs, newEnv3: newEnv2 };
}

function typeExpressionList(expressions: ast.Expression[], typeEnv: TypeEnv): [ExpressionTyped[], TermTyped[], TypeEnv] {
    let typed: ExpressionTyped[] = [],
        newTermsList: TermTyped[] = [];
    for (let expression of expressions) {
        const [expr, newTerms, newEnv] = typeToExpression(expression, typeEnv);
        newTermsList = newTermsList.concat(newTerms);
        typed.push(expr);
        typeEnv = newEnv;
    }
    return [typed, newTermsList, typeEnv];
}

function typeToExpression(expression: ast.Expression, typeEnv: TypeEnv): [ExpressionTyped, TermTyped[], TypeEnv] {
    if (expression.type === 'literal') {
        if (typeof expression.value === 'string') {
            return [to_literal(expression.value, types.string), [], typeEnv];
        } else if (typeof expression.value === 'number') {
            return [to_literal(expression.value.toString(), types.number), [], typeEnv];
        }
    }
    return typeToIdentifier(expression, typeEnv);
}

// Convert all of the expr synactic sugar to a predicate call to unify and/or other fns
function typeToIdentifier(expression: ast.Expression, typeEnv: TypeEnv): [IdentifierTyped, TermTyped[], TypeEnv] {
    switch (expression.type) {
        case 'lvar':
            const type = typeEnv.getType(expression.name);
            if (!type) {
                // throw new Error(`Type not found for ${expression.name}`);
                const newLvar = typeEnv.getAsTypeVar(expression.name);
                return [newLvar, [], typeEnv];
            }
            return [{
                type: 'identifier',
                value: expression.name,
                contextualType: type
            }, [], typeEnv];
        case 'literal':
            // Add a predicate call unify(newlvar, literal), and return the new lvar
            if (typeof expression.value === 'string') {
                const newLvar = typeEnv.getTypedLvar(types.string);
                return [newLvar, [to_unify(newLvar,
                    to_literal(expression.value, types.string)
                )], typeEnv];
            } else if (typeof expression.value === 'number') {
                const newLvar = typeEnv.getTypedLvar(types.number);
                return [newLvar, [to_unify(newLvar,
                    to_literal(expression.value.toString(), types.number)
                )], typeEnv];
            } else {
                throw new Error(`Invalid literal type: ${expression.value}`);
            }
        case 'attribute':
            // Add a predicate call to "set_key_of" with the object, key, and (new lvar) value
            // return the value identifier
            const [obj, objTerms, objEnv] = typeToExpression(expression.object, typeEnv);
            const key = to_literal(expression.attribute, types.string);
            if (obj.contextualType.type === 'complex_type' && obj.contextualType.name === 'dict') {
                const value = obj.contextualType.args[1];
                const idValRet = to_typed_lvar(objEnv.getNewLvar(), value);
                // const value to_typed_lvar(objEnv.getNewLvar(), value)
                return [idValRet, [
                    ...objTerms,
                    to_set_key_of(obj, key, idValRet)
                ], objEnv];
            } else if (obj.contextualType.type === 'type_var') {
                // Bind the object type var to a dict with the key and a new type var
                return createAttributeFn(objEnv, obj, objTerms, key);
            } else {
                throw new Error(`Invalid object type for attribute: ${obj.contextualType}`);
            }
        case 'predicate_definition':
            // Add a predicate definition to the list of terms and use its id here
            const freshTypeEnv = new TypeEnv();
            const args = expression.args.map((arg) => {
                const typeVar = freshTypeEnv.getAsTypeVar(arg);
                return typeVar;
            });
            const [body, nte] = typeTermAst(expression.children, freshTypeEnv);
            // refetch the args in case they've since been updated
            const typedArgs = expression.args.map((arg) => {
                const typeVar = nte.getType(arg);
                if (!typeVar) {
                    throw new Error(`Type not found for ${arg}`);
                }
                return typeVar;
            });
            const id = typeEnv.getTypedLvar(to_mono_pred(typedArgs));
            return [id, [{
                type: 'predicate_definition',
                name: id,
                args,
                body: to_conjunction(body)
            }], typeEnv];
        case 'list':
            // Call the predicate labeled "list" with the list of expressions
            // first input to "list" is a new lvar, used in here
            const [typed, newTerms, newEnv] = typeExpressionList(expression.elements, typeEnv);
            // Unify the types of the elements...
            const listType = typed.length > 0 ? typed[0].contextualType : to_type_var(typeEnv.getNewTypeVar('__list'));
            const lvar = newEnv.getTypedLvar(to_complex_type('list', [listType]));
            return [lvar, [...newTerms, {
                type: 'predicate',
                source: {
                    type: 'identifier',
                    value: 'list',
                    contextualType: types.unify
                },
                args: [lvar, ...typed]
            }], newEnv];
        case 'dictionary':
            // Convert to a series of set_key_of calls, plus a "length" call
            const dict = to_complex_type('dict', [types.string, types.string]);
            const dictLvar = typeEnv.getTypedLvar(dict);
            const dictTerms: TermTyped[] = [];
            for (let [key, val] of expression.entries) {
                // const [key2, keyTerms, env1] = typeToExpression(key, typeEnv);
                let key2: ExpressionTyped;
                if (key.type === 'literal') {
                    key2 = to_literal(key.value + '', types.string);
                } else if (key.type === 'lvar') {
                    key2 = to_literal(key.name, types.string);
                } else {
                    throw new Error(`Invalid key type: ${key.type}`);
                }
                const [val2, valTerms, env2] = typeToExpression(val, typeEnv);
                typeEnv = env2;
                // dictTerms.push(...keyTerms);
                dictTerms.push(...valTerms);
                dictTerms.push(to_set_key_of(dictLvar, key2, val2));
            }
            // TODO: deal better w/ situations where keys are not literals
            const len = to_literal(expression.entries.length + '', types.number);
            dictTerms.push({
                type: 'predicate',
                source: {
                    type: 'identifier',
                    value: 'length',
                    contextualType: types.length
                },
                args: [dictLvar, len]
            });
            return [dictLvar, dictTerms, typeEnv];
        case 'unary_operator':
        case 'binary_operator':
            throw new Error(`Not implemented: ${expression.type}`);
    }
}

function createAttributeFn(objEnv: TypeEnv, obj: ExpressionTyped, objTerms: TermTyped[], key: LiteralTyped): [IdentifierTyped, TermTyped[], TypeEnv] {
    const value = objEnv.getAsTypeVar(undefined, '__dict_value');
    objEnv.bindTypeVar((obj.contextualType as any).name, to_dict(types.string, value.contextualType));
    return [value, [...objTerms, to_set_key_of(obj, key, value)], objEnv];
}

// Cleanup unbound type vars
function cleanupTypeVars(ast: TermTyped, env: TypeEnv): [TermTyped, TypeEnv] {
    switch (ast.type) {
        case 'conjunction':
        case 'disjunction':
            return cleanupTypeVarsConjDisj(ast, env);
        case 'predicate':
            // Check the predicate source and called variables, if they are type vars, seek to replace them
            // with their bound types
            const source = ast.source;
            const args = ast.args;
            let newArgs: ExpressionTyped[] = [];
            for (let arg of args) {
                if (arg.type === 'identifier') {
                    let type = env.getType(arg.value);
                    if (type && type.type === 'type_var') {
                        type = env.walkTypeVar(type.name);
                    } else if (type?.type === 'complex_type') {
                        type = cleanupComplexType(type, env)[0];
                    } else if (!type && arg.contextualType.type === 'type_var') {
                        type = env.walkTypeVar(arg.contextualType.name);
                    }
                    if (type) {
                        newArgs.push(to_typed_lvar(arg.value, type));
                    } else {
                        newArgs.push(arg);
                    }
                } else {
                    newArgs.push(arg);
                }
            }
            return [{
                type: 'predicate',
                source,
                args: newArgs
            }, env];
        case 'predicate_definition':
            // Cleanup the body of the predicate
            const [terms, newEnv] = cleanupTypeVarsList(ast.body.terms, env);
            return [{
                type: 'predicate_definition',
                name: ast.name,
                args: ast.args,
                body: to_conjunction(terms)
            }, newEnv];
    }
}

function cleanupComplexType(ast: ComplexType, env: TypeEnv): [ComplexType, TypeEnv] {
    const args = ast.args;
    let newArgs: Type[] = [];
    for (let type of args) {
        if (type.type === 'type_var') {
            let bound = env.walkTypeVar(type.name);
            if (bound) {
                newArgs.push(bound);
            } else {
                newArgs.push(type);
            }
        } else {
            newArgs.push(type);
        }
    }
    return [to_complex_type(ast.name, newArgs), env];
}

function cleanupTypeVarsList(ast: TermTyped[], env: TypeEnv): [TermTyped[], TypeEnv] {
    let terms: TermTyped[] = [];
    for (let term of ast) {
        const [typed, newEnv] = cleanupTypeVars(term, env);
        terms.push(typed);
        env = newEnv;
    }
    return [terms, env];
}

function cleanupTypeVarsConjDisj(ast: ConjunctionTyped | DisjunctionTyped, env: TypeEnv): [ConjunctionTyped | DisjunctionTyped, TypeEnv] {
    const [terms, newEnv] = cleanupTypeVarsList(ast.terms, env);
    if (ast.type === 'conjunction') {
        return [to_conjunction(terms), newEnv];
    } else {
        return [to_disjunction(terms), newEnv];
    }
}








//////////// Pretty printing





function indentStr(indent: number, multiLineInput: string): string {
    const indentToAdd = "    ".repeat(indent);
    const lines = multiLineInput.split("\n");
    const indentedLines = lines.map((line) => indentToAdd + line);
    return indentedLines.join("\n");
}

function dedentStr(multiLineInput: string, maxDedent = Number.POSITIVE_INFINITY): string {
    const lines = multiLineInput.split("\n");
    const dedentedLines = lines.map((line) => {
        let dedentCount = 0;
        while (line.startsWith("    ") && dedentCount < maxDedent) {
            line = line.slice(4);
            dedentCount++;
        }
        return line;
    });
    return dedentedLines.join("\n");
}

// Template string version of the above functions

export const indent = (strings: TemplateStringsArray, ...values: any[]): string => {
    // dedent the input string, then indent all values and combine
    const dedented = strings.map(str => dedentStr(str));
    const indentedValues = values.map((value) => {
        if (!value) {
            return "";
        } else if (typeof value === "string") {
            return indentStr(1, value);
        } else if (typeof value === 'object' && 'toString' in value) {
            return indentStr(1, value.toString());
        } else {
            return indentStr(1, JSON.stringify(value, null, 4));
        }
    });
    let result = "";
    for (let i = 0; i < dedented.length; i++) {
        result += dedented[i];
        if (i < indentedValues.length) {
            result += indentedValues[i];
        }
    }
    return result;
}

export function pprintTypedAst(ast: TermTyped | TermTyped[]): string {
    if (Array.isArray(ast)) {
        return ast.map(pprintTypedAst).join('\n');
    }
    switch (ast.type) {
        case 'conjunction':
            return `conj:
${ast.terms.map(pprintTypedAst).map(ii => indentStr(1, ii)).join('\n')}`;
        case 'disjunction':
            return `disj:
${ast.terms.map(pprintTypedAst).map(ii => indentStr(1, ii)).join('\n')}`;
        case 'predicate':
            return `${pprintExprAst(ast.source)}(${pprintExprListAst(ast.args, 'withtype')})`;
        case 'predicate_definition':
            return `DEFINE ${ast.name.value} as (${pprintExprListAst(ast.args)}) => 
${indentStr(1, pprintTypedAst(ast.body.terms))}`;
        default:
            throw `Invalid ast type: ${ast}`;
    }
}

function pprintExprListAst(ast: ExpressionTyped[], withtype: 'withtype' | 'without_type' = 'without_type',
    withio: 'withio' | 'without_io' = 'without_io'): string {
    return ast.map(ee => pprintExprAst(ee, withtype, withio)).join(', ');
}

function pprintExprAst(ast: ExpressionTyped, withtype: 'withtype' | 'without_type' = 'without_type',
    withio: 'withio' | 'without_io' = 'without_io'): string {
    switch (ast.type) {
        case 'identifier':
            if (withtype === 'withtype') {
                return `${ast.value}: ${pprintType(ast.contextualType)}`;
            } else {
                return ast.value;
            }
        case 'literal':
            return JSON.stringify(ast.value);
    }
}

function pprintType(ast: Type): string {
    switch (ast.type) {
        case 'simple_type':
            return ast.name;
        case 'hkt':
            return `${ast.args.map(pprintType).join(', ')} => ${pprintType(ast.apply(ast.args))}`;
        case 'type_var':
            return `\$${ast.name}`;
        case 'mono_predicate':
            return `Pred(${ast.args.map(pprintType).join(', ')})`;
        case 'union':
            return `(${ast.options.map(pprintType).join(' | ')})`;
        case 'complex_type':
            return `${ast.name}<${ast.args.map(pprintType).join(', ')}>`;
    }
}


const sourceCode = `

val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;

const sourceCode2 = `

val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = 0
            a = "bob"
val.father("bob", qq)
`;

const sourceCode3 = `

val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = 0
            b = "bob"
            a = "bob"
val.father("bob", qq)
`;

export function codeToTypedAst(source: string): TypedAst {
    const typeEnv = new TypeEnv();
    const codeE = ast.codeToAst(source);
    if (codeE.type === 'conjunction') {
        const [eet, nv] = typeTermList(codeE.children, typeEnv, 'implicit');
        return to_conjunction(eet);
    } else {
        const [eet, nv] = typeTermAst(codeE, typeEnv);
        return to_conjunction(eet);
    }
}

function testOnSource(source: string) {
    const typeEnv = new TypeEnv();
    const codeE = ast.codeToAst(source);
    if (codeE.type === 'conjunction') {
        const [eet, nv] = typeTermList(codeE.children, typeEnv, 'implicit');
        console.log(nv.toString());
        console.log(
            pprintTypedAst(
                eet
            )
        );

    } else {
        const [eet, nv] = typeTermAst(codeE, typeEnv);

        console.log(nv.toString());

        console.log(
            pprintTypedAst(
                eet
            ));
    }
}

// testOnSource(sourceCode);