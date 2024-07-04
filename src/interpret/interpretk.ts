import {eq} from 'src/eq';
import {ConjunctionGeneric, ExpressionGeneric, FreshGeneric, IdentifierGeneric, PredicateDefinitionGeneric, TermGeneric} from 'src/types/DsAstTyped';
import {Type} from 'src/types/EzType';
import {codeToAst} from 'src/redo/ast-desugar';
import {toBasicTypes} from 'src/interpret-types/type-pipe';
import {pprintTermT, pprintType} from 'src/redo/pprintgeneric';
import * as kn from './kanren';
import { builtinGoals } from './kbuiltins';
import { to_typed_lvar } from 'src/utils/to_conjunction';
import { make } from 'src/utils/make_better_typed';
import { renameVarBatch2 as renameVarBatch } from 'src/redo/freshenvar';

let varCounter = 0;
function newVar(prf = 'var') {
    return `$${prf}_${Math.random().toString(36).substring(7)}`;
}

// function argsRenameFn(ar: IdentifierGeneric<Type>[]): Map<string, string> {
//     const newMap = new Map<string, string>();
//     for (const aar of ar) {
//         newMap.set(aar.value, newVar());
//     }
//     return newMap;
// }

function alphaConvert(pr: PredicateDefinitionGeneric<Type>): PredicateDefinitionGeneric<Type> {
    console.warn('alphaConvert b4', pprintTermT(pr));
    const newArgs = pr.args.map((pr1) => [newVar('apd'), pr1] as const);
    const newBody = {...pr.body};
    const bodyFixed = make.conjunction1(
        ...renameVarBatch(newArgs.map(
        ([newName, oldName]) => [oldName.value, newName] as [string, string]
    ), newBody));
    const argsFixed = newArgs.map(([newName, oldName]) => make.identifier(oldName.info, newName));
    const outv: PredicateDefinitionGeneric<Type> = {
        ...pr,
        args: argsFixed,
        body: bodyFixed,
    };
    console.warn('alphaConvert after:', pprintTermT(bodyFixed));
    console.warn('alphaConvert after2:', pprintTermT(outv));
    return outv;
}

function alphaConvertFresh(pr: FreshGeneric<Type>): FreshGeneric<Type> {
    console.warn('alphaConvert', pprintTermT(pr));
    const newVars = pr.newVars.map((pr1) => [newVar('frsh'), pr1] as const);
    const newBody = pr.body;
    const outv = {
        ...pr,
        newVars: newVars.map(([newName, oldName]) => make.identifier(oldName.info, newName)),
        // body: renameVarBatch(newVars.map(
        //     ([newName, oldName]) => [oldName.value, newName] as [string, string]
        // ), newBody) as ConjunctionGeneric<Type>,
        body: make.conjunction1(
            ...renameVarBatch(newVars.map(
            ([newName, oldName]) => [oldName.value, newName] as [string, string]
        ), newBody)),
    };
    console.warn('alphaConvert after:', pprintTermT(outv));
    return outv;
}

const defToPredicate = (ast: PredicateDefinitionGeneric<Type>): kn.Goal => {
    // return (sc: kn.State): kn.LStream => {
        return kn.eq(
            kn.makelvar(ast.name.value),
            new kn.LPredicate(ast.name.value, (...args: kn.LTerm[]) => {
                const ast2 = alphaConvert(ast);
                return (sc2: kn.State): kn.LStream => {
                    // return new kn.ImmatureStream(
                    //     () => {
                    //         const ast2 = alphaConvert(ast);
                    //         const newArgs = args.map((arg) => {
                    //             return sc2.subst.find(arg);
                    //         });
                    //         // set each arg equal to the variable name
                    //         return kn.all(
                    //             ...newArgs.map((arg, i) => {
                    //                 return kn.eq(
                    //                     arg,
                    //                     kn.makelvar(ast2.args[i].value),
                    //                 );
                    //             }),
                    //             interpretPlus(ast2.body),
                    //         )(sc2);

                    //     }
                    // );
                
                // const ast2 = alphaConvert(ast);
                // const newArgs = args.map((arg) => {
                //     return sc2.subst.find(arg);
                // });
                const newArgs = args;
                // set each arg equal to the variable name
                // return kn.all(
                //     ...newArgs.map((arg, i) => {
                //         return kn.eq(
                //             arg,
                //             kn.makelvar(ast2.args[i].value),
                //         );
                //     }),
                //     interpretPlus(ast2.body),
                // )(sc2);
                // return new kn.ImmatureStream(() => {
                //     return kn.all(
                //         ...newArgs.map((arg, i) => {
                //             return kn.eq(
                //                 arg,
                //                 kn.makelvar(ast2.args[i].value),
                //             );
                //         }),
                //         interpretPlus(ast2.body),
                //     )(sc2)
                // });
                return kn.all(
                    ...newArgs.map((arg, i) => {
                        return kn.eq(
                            arg,
                            kn.makelvar(ast2.args[i].value),
                        );
                    }),
                    interpretPlus(ast2.body),
                )(sc2);
            }
            })
        );//(sc);
    // }
}

export function interpretPlus(
	ast: TermGeneric<Type> | TermGeneric<Type>[],
): kn.Goal {
	if (Array.isArray(ast)) {
		return kn.all(...ast.map(interpretPlus));
	}
	switch (ast.type) {
		case "conjunction":
			return kn.all(...ast.terms.map(interpretPlus));
		case "disjunction":
			return kn.either(
				...ast.terms.map(interpretPlus),
			);
        case "fresh":
            const bod = alphaConvertFresh(ast)
            return interpretPlus(bod.body);
		case "predicate_call": {
			const ast2333 = interpretExprListPlus(
				ast.args,
				"without_type",
				"without_io",
			);
            return kn.apply_pred(
                kn.makelvar(ast.source.value),
                ...ast2333
            );
		}
		// return `${interpretExpr(ast.source)}(${interpretExprListPlus(ast.args, 'withtype')})`;
		case "predicate_definition":
			return defToPredicate(ast);
		default:
			throw `Invalid ast type: ${ast}`;
	}
}
function interpretExprListPlus(
	ast: ExpressionGeneric<Type>[],
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): kn.LTerm[] {
	return ast.map((ee) =>
		interpretExpr(ee, withtype, withio),
	);
}
function interpretExpr(
	ast: ExpressionGeneric<Type>,
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): kn.LTerm {
	switch (ast.type) {
		case "identifier":
			return kn.makelvar(ast.value);
		case "literal":
			return kn.makeLiteral(ast.value);
	}
}
// function runWorlds(
// 	goal: kn.Goal,
// ): World[] {
// 	return worlds.flatMap((world) => goal.run(world));
// }

export function runFor(goal: kn.Goal, showInternals = false, vars2seek: string[] = [], numb: number | null = null) {
    const runs = kn.run(numb, kn.conj(
        builtinGoals,
        goal
    ));
    return runs.map((run) => {
        return run.toClean(showInternals, vars2seek);
    });
}

export const interpretFromCode = (
	code: string,
) => {
	const codeFromAst = toBasicTypes(codeToAst(code));
	console.log(
		"interpretFromCode",
		pprintTermT(codeFromAst),
	);
	const goal = interpretPlus(codeFromAst);
	// return runWorlds(goal, [builtinWorld]);
	const runs = kn.run(null, goal);
    return runs.map((run) => {
        return run.toMap();
    });
};