// import Parser from 'tree-sitter';
// import {LVar, Package, SLogic, Stream} from './logic';
// import {setKeyValue} from './Guard';
// function interpret(node: Parser.SyntaxNode, lm: Map<string, LVar>): (p: Package) => Stream {
//     console.log(`Interpreting node: ${node.type}`);
//     switch (node.type) {
//         case 'module':
//             // return SLogic.and(...node.children.map((nc) => interpret(nc, lm)));
//             return buildCompoundLogic(node, lm, 'conjunction');
//         case 'either_statement':
//             // disjunction
//             return buildCompoundLogic(node.children[2], lm, 'disjunction');
//         case 'all_statement':
//             // conjunction
//             return buildCompoundLogic(node.children[2], lm, 'conjunction');
//         case 'unification':
//             const aaa = directAccess(node.children[0], lm);
//             const bbb = directAccess(node.children[2], lm);
//             if (aaa instanceof Unifiable && bbb instanceof Unifiable) {
//                 return aaa.unify(aCorrected => bbb.unify(bCorrected => SLogic.eq(aCorrected, bCorrected)));
//             } else if (aaa instanceof Unifiable) {
//                 return aaa.unify(aCorrected => SLogic.eq(aCorrected, bbb));
//             } else if (bbb instanceof Unifiable) {
//                 return bbb.unify(bCorrected => SLogic.eq(aaa, bCorrected));
//             }
//             return SLogic.eq(aaa, bbb);
//         case 'predicate':
//             // get the predicate name
//             const predicateName = node.children[0].text;
//             // walk the current frame to find the predicate
//             return (p: Package) => {
//                 const predName = lm.has(predicateName) ? lm.get(predicateName) : directAccess(node.children[0], lm);
//                 console.log('predName', predName);
//                 const predicate = predName instanceof Unifiable ? predName.retrieve(p) : p.walk(predName);
//                 // let predicate = predicate1;
//                 // console.debug(`Predicate searching...: ${predicate}`, predName instanceof Unifiable, predName);
//                 // if (SLogic.is_lvar(predicate1)) {
//                 //     console.warn(`Predicate not found: ${predicate1}`);
//                 //     predicate = p.walk(predicate1);
//                 // }
//                 if (predicate === undefined) {
//                     throw new Error(`Predicate not found: ${predicateName} undefined`);
//                 }
//                 if (typeof predicate !== 'function') {
//                     console.log("Frame", p.frame);
//                     console.log('predicate', predicate, typeof predicate);
//                     throw new Error(`Predicate not found: ${predicateName} not a function`);
//                 }

import { setKeyValue } from "./Guard";
import { codeToAst } from "./ast";
import { LVar, Package, SLogic, Stream, goal_construct } from "./logic";
import { ExpressionTyped, TermTyped, codeToTypedAst, pprintTypedAst } from "./typing";

//                 const argActual = node.children[1];
//                 console.log('argActual', argActual.children.map(nnc => nnc.grammarType));
//                 if (argActual.children.length === 0) {
//                     return (predicate as any)()(p);
//                 }
//                 const arglist = argActual.children.slice(1, -1);
//                 console.log('arglist', arglist.map(nnc => nnc.grammarType));
//                 // console.log('arglist', arglist.children.map(nnc => nnc.grammarType));
//                 return (predicate as any)(...arglist.filter(
//                     nnc => nnc.grammarType !== ','
//                 ).map((nc) => directAccess(nc, lm)))(p);
//             };
//         default:
//             throw new Error(`Unrecognized node type: ${node.type}`);
//     }
// }

// type PredicateFn = (...args: any[]) => (p: Package) => Stream;

// function buildCompoundLogic(node: Parser.SyntaxNode, lm: Map<string, LVar>, variety: 'conjunction' | 'disjunction'): (p: Package) => Stream {
//     return (p: Package) => {
//         if (node.children.length === 0) {
//             return SLogic.fail(p);
//         } else if (node.children.length === 1) {
//             return interpret(node.children[0], lm)(p);
//         } else {
//             const comparator = variety === 'conjunction' ? SLogic.conj : SLogic.disj;
//             const ppv: (q: Package) => Stream = node.children.slice(1).reduceRight((acc, nc) => comparator(acc, interpret(nc, lm)), interpret(node.children[0], lm));
//             return ppv(p);
//         }
//     };
// }

// class Unifiable {
//     type = 'unifiable';
//     constructor(public val: any, public goal: (p: Package) => Stream) {

//     }

//     retrieve(p: Package): any {
//         const retrievedVal = p.walk(this.val);
//         p.write();
//         console.log('retrievedVal', retrievedVal);
//         return retrievedVal;
//     }

//     unify(other: (q: any) => (p: Package) => Stream): (p: Package) => Stream {
//         // if (this.val instanceof Unifiable) {
//         //     return SLogic.conj(this.goal, this.val.unify(other));
//         // }
//         return SLogic.conj((p: Package) => this.goal(p), other(this.val));
//     }

//     toString(): string {
//         return `Unifiable(${this.val})`;
//     }
// }

// function directAccess(node: Parser.SyntaxNode, lm: Map<string, LVar>): LVar | string | number | PredicateFn | Unifiable {
//     console.log(`Direct access node: ${node.type}`);
//     switch (node.type) {
//         case 'predicate_definition':
//             const predDef = (...args: any[]) => {
//                 console.log('predicate', args);
//                 const argsList = node.children.slice(1, -3).filter(nnc => nnc.grammarType !== ',');
//                 if (argsList.length !== args.length) {
//                     throw new Error(`Arity mismatch: ${argsList.length} != ${args.length}`);
//                 }
//                 console.log('argsList', argsList.map(nnc => nnc.grammarType));
//                 const argsWalked = argsList.map((arg) => directAccess(arg, lm));
//                 const map = new Map();
//                 argsList.forEach((arg, i) => {
//                     map.set(arg.text, argsWalked[i]);
//                 });
//                 // Set the given inputs to the predicate
//                 const argsListApplication = node.children[6].children;
//                 console.log('argsListApplication', argsListApplication.map(nnc => nnc.grammarType));
//                 const freshTerm = argsWalked.reduce((acc, arg, i) => SLogic.conj(acc, SLogic.eq(args[i], arg)),
//                     buildCompoundLogic(node.children[6], map, 'conjunction'));
//                 return freshTerm;
//             };
//             return predDef;
//         case 'identifier':
//             if (lm.has(node.text)) {
//                 return lm.get(node.text) as LVar;
//             }
//             const nlvar = SLogic.lvar(node.text);
//             lm.set(node.text, nlvar);
//             return nlvar;
//         case 'expression':
//             return directAccess(node.children[0], lm);
//         case 'primary_expression':
//             return directAccess(node.children[0], lm);
//         case 'attribute':
//             const obj = directAccess(node.children[0], lm);
//             const attr = node.children[2].text;
//             const nlvarTempAttribute = lm.has(attr + "_temp") ? lm.get(attr + "_temp") as LVar : SLogic.lvar(attr + "_temp");
//             const lmapn = SLogic.lmap(new Map(), 'infinite');
//             lm.set(attr + '_temp', nlvarTempAttribute);
//             lmapn.set(attr, nlvarTempAttribute);
//             return new Unifiable(nlvarTempAttribute, 
//                 SLogic.conj(
//                     SLogic.eq(obj, lmapn),
//                     setKeyValue(obj, attr, nlvarTempAttribute)
//                 )
//             );
//         case 'binary_operator':
//             throw new Error('Not implemented');
//         case 'unary_operator':
//             throw new Error('Not implemented');
//         case 'list':
//             return SLogic.list(node.children.slice(1, -1).map((nc) => directAccess(nc, lm)));
//         case 'dictionary':
//             const map = new Map();
//             node.children.slice(1, -1).forEach((nc) => {
//                 map.set(nc.children[0].text, directAccess(nc.children[2], lm));
//             });
//             return SLogic.lmap(map, 'finite');
//         case 'string':
//             return node.text.slice(1, -1);
//         case 'number':
//             return parseInt(node.text, 10);
//         default:
//             throw new Error(`Unrecognized node type: ${node.type}`);
//     }
// }

const applyF = (fn: any, args: any[]) => (p: Package) => {
    const fnWalked = p.walk(fn);
    if (fnWalked === undefined) {
        return SLogic.fail(p);
    }
    const argsWalked = args.map((arg) => p.walk(arg));
    if (argsWalked.some((arg) => arg === undefined)) {
        return SLogic.fail(p);
    }
    if (typeof fnWalked !== 'function') {
        return SLogic.fail(p);
    }
    return fnWalked(...argsWalked)(p);
}

type Goal = (p: Package) => Stream;
const interpretT = (t: TermTyped, lm: Map<string, LVar>): Goal => {
    console.log('interpretT', pprintTypedAst(t));
    switch (t.type) {
        case 'conjunction':
        case 'disjunction':
            return buildCompoundLogic(t.terms, lm, t.type);
        case 'predicate':
            return applyF(lm.get(t.source.value), t.args.map((arg) => interpretE(arg, lm)));
            // return (p: Package) => {
            //     console.log('interpretedFrom', pprintTypedAst(t));
            //     const tname = t.source.value;
            //     if (!lm.has(tname)) {
            //         lm.forEach((v, k) => console.log(
            //             `${k} -> ${v.name}`
            //         ));
            //         throw new Error(`Predicate not found: ${tname}`);
            //     }
            //     const predName = lm.has(tname) ? lm.get(tname) : SLogic.fail(p);
            //     // const predicate = predName instanceof Unifiable ? predName.retrieve(p) : p.walk(predName);
            //     const predicate = p.walk<(...args: any[]) => any>(predName as any);
            //     if (predicate === undefined) {
            //         throw new Error(`Predicate not found: ${tname} undefined`);
            //     }
            //     if (typeof predicate === 'object') {
            //         if ('type' in predicate && predicate.type === 'logic_var') {
            //             console.warn('fail', '/////////////////////////////////');
            //             p.write();
            //             console.warn('fail', '/////////////////////////////////');
            //             return SLogic.fail(p);
            //         }
            //         throw new Error(`Predicate not found: ${tname} not a function, is a ${JSON.stringify(predicate, null, 2)}`);
            //     }
            //     if (typeof predicate !== 'function') {
            //         throw new Error(`Predicate not found: ${tname} not a function, is a ${typeof predicate}`);
            //     }
            //     console.log('prewalk');
            //     const argsWalked = t.args.map((arg) => interpretE(arg, lm));
            //     console.log('argsWalked', argsWalked);
            //     return predicate(...argsWalked)(p);
            // };
        case 'predicate_definition':
            const map = new Map();
            lm.forEach((v, k) => map.set(k, v));
            const argsList = t.args.map((arg) => interpretE(arg, lm));
            t.args.forEach((arg, i) => {
                map.set(arg.value, argsList[i]);
            });
            const freshTerm = argsList.reduce((acc, arg, i) => SLogic.conj(acc, SLogic.eq(t.args[i], arg)),
                buildCompoundLogic(t.body.terms, map, 'conjunction'));
            const newLvar = SLogic.lvar(t.name.value);
            map.set(t.name.value, newLvar);
            return SLogic.eq(newLvar, freshTerm);
    }
}

const interpretE = (t: ExpressionTyped, lm: Map<string, LVar>): LVar | string | number => {
    switch (t.type) {
        case 'identifier':
            if (lm.has(t.value)) {
                return lm.get(t.value) as LVar;
            }
            const nlvar = SLogic.lvar(t.value);
            lm.set(t.value, nlvar);
            return nlvar;
        case 'literal':
            return t.value;
    }
}

function buildCompoundLogic(terms: TermTyped[], lm: Map<string, LVar>, variety: 'conjunction' | 'disjunction'): (p: Package) => Stream {
    if (terms.length === 0) {
        return (p: Package) => SLogic.fail(p);
    } else if (terms.length === 1) {
        return interpretT(terms[0], lm);
    } else {
        const comparator = variety === 'conjunction' ? SLogic.conj : SLogic.disj;
        // const ppv: (q: Package) => Stream = terms.slice(0, -1).reduceRight((acc, nc) => comparator(acc, interpretT(nc, lm)), interpretT(terms[0], lm));
        let ppv: Goal | undefined = undefined;
        for (const term of terms) {
            if (ppv === undefined) {
                ppv = interpretT(term, lm);
            } else {
                ppv = comparator(ppv, interpretT(term, lm));
            }
        }
        if (ppv === undefined) {
            throw new Error('ppv is undefined');
        }
        return ppv;
    }
}

const builtins = {
    'unify': (itema: any, itemb: any) => SLogic.eq(itema, itemb),
    'eq': (itema: any, itemb: any) => SLogic.eq(itema, itemb),
    'set_key_of': (obj: any, key: string, value: any) => {
        console.log('set_key_value', obj, key, value);
        return setKeyValue(obj, key, value);
    }
};

// add builtins to the logic before the interpretation
const newMap = new Map<string, LVar>();
const listOfStatements = Object.entries(builtins).map(([key, value]) => {
    const lvar = SLogic.lvar(key);
    newMap.set(key, lvar);
    return SLogic.eq(lvar, value);
});

const interpretFromCode = (code: string, lvars1: string[]) => {
    const codeFromAst = codeToTypedAst(code);
    console.log('interpretFromCode', pprintTypedAst(codeFromAst));
    const lvars = lvars1.map((lvar) => SLogic.lvar(lvar));
    const lm = new Map<string, LVar>();
    newMap.forEach((lvar, key) => lm.set(key, lvar));
    lvars.forEach((lvar) => lm.set(lvar.name, lvar));
    const goal = interpretT(codeFromAst, lm);
    return SLogic.run(
        SLogic.and(...listOfStatements,
            goal),
        lvars
    );
};



export const sourceCode = `

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

console.log(interpretFromCode(sourceCode, ['qq']));

