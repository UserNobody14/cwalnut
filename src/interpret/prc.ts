import {
	WorldGoal,
	type LogicValue,
	PredicateLogic,
	World,
	LogicPredicate,
	LogicLvar,
	LogicLiteral,
} from "src/WorldGoal";
import { eq } from "src/eq";
import { builtinWorld } from "src/interpret/builtins";
import { codeToTypedAst } from "src/typing";
import { pprintTypedAst } from "src/pprintType";
import type {
	ExpressionTyped,
	TermTyped,
} from "src/types/DesugaredAstTyped";
import { ExpressionGeneric, IdentifierGeneric, PredicateDefinitionGeneric, TermGeneric } from "src/types/DsAstTyped";
import { Type } from "src/types/EzType";
import { codeToAst, toAst } from "src/redo/ast-desugar";
import { toBasicTypes } from "src/interpret-types/type-pipe";
import { pprintTermT } from "src/redo/pprintgeneric";
import { renameVarBatch } from "src/redo/freshenvar";

let varCounter = 0;
function newVar() {
    return `var${varCounter++}`;
}

function argsRenameFn(ar: IdentifierGeneric<Type>[]): Map<string, string> {
    const newMap = new Map<string, string>();
    for (const aar of ar) {
        newMap.set(aar.value, newVar());
    }
    return newMap;
}

const defToPredicate = (ast: PredicateDefinitionGeneric<Type>) => {
    return new PredicateLogic((...args: LogicValue[]) => {
        return new WorldGoal((world) => {
            // const argRenameMap = argsRenameFn(ast1.args); 
            // const ast = renameVarBatch(argRenameMap, ast1) as PredicateDefinitionGeneric<Type>;
            const newWorld1 = new World(
                builtinWorld.lvars,
            );
            for (let i = 0; i < ast.args.length; i++) {
                newWorld1.addLvar(
                    ast.args[i].value,
                    args[i],
                );
            }
            const runTerms = interpretPlus(ast.body);
            const res = runTerms.run(newWorld1);
            return new WorldGoal((world2) => {
                const res2 = new World(
                    new Map(world.lvars),
                );
                const walkedArgsReturned = ast.args.map(
                    (arg) => {
                        const respLvar = world2.getLvar(
                            arg.value,
                        );
                        if (respLvar) {
                            return world2.walk(respLvar);
                        }
                            return undefined;
                    },
                );
                if (
                    walkedArgsReturned.some(
                        (w) => w === undefined,
                    )
                ) {
                    return [World.fail];
                }
                const walkGoals = walkedArgsReturned.map(
                    (walked, i) => eq(args[i], walked),
                );
                return WorldGoal.and(...walkGoals).run(
                    res2,
                );
            }).runAll(res);
        });
    });
}

export function interpretPlus(
	ast: TermGeneric<Type> | TermGeneric<Type>[],
): WorldGoal {
	if (Array.isArray(ast)) {
		return WorldGoal.and(...ast.map(interpretPlus));
	}
	switch (ast.type) {
		case "conjunction":
			return WorldGoal.and(...ast.terms.map(interpretPlus));
		case "disjunction":
			return WorldGoal.disj(
				...ast.terms.map(interpretPlus),
			);
		case "predicate_call": {
			const ast2333 = interpretExprListPlus(
				ast.args,
				"without_type",
				"without_io",
			);
			// console.log('predicate', ast.source.value, ast2333.map(a => a.toString()));
			return WorldGoal.pred(ast.source.value, ast2333);
		}
		// return `${interpretExpr(ast.source)}(${interpretExprListPlus(ast.args, 'withtype')})`;
		case "predicate_definition":
			return eq(
				new LogicLvar(ast.name.value),
				new LogicPredicate(
					defToPredicate(ast)
				),
			);
		default:
			throw `Invalid ast type: ${ast}`;
	}
}
function interpretExprListPlus(
	ast: ExpressionGeneric<Type>[],
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): LogicValue[] {
	return ast.map((ee) =>
		interpretExpr(ee, withtype, withio),
	);
}
function interpretExpr(
	ast: ExpressionGeneric<Type>,
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): LogicValue {
	switch (ast.type) {
		case "identifier":
			if (withtype === "withtype") {
				// return `${ast.value}: ${pprintType(ast.contextualType)}`;
				return new LogicLvar(ast.value);
			}
				return new LogicLvar(ast.value);
		case "literal":
			return new LogicLiteral(ast.value);
	}
}
function runWorlds(
	goal: WorldGoal,
	worlds: World[] = [new World(new Map())],
): World[] {
	return worlds.flatMap((world) => goal.run(world));
}

export function runFor(goal: WorldGoal, vars2seek: string[]) {
	const worlds = runWorlds(goal, [builtinWorld]);
	return worlds.map((world) => {
		const res: Record<string, any> = {};
		for (const v of vars2seek) {
			res[v] = world.getLvar(v)?.value;
		}
		return res;
	});
}

export const interpretFromCode = (
	code: string,
	lvars1: string[],
) => {
	const codeFromAst = toBasicTypes(codeToAst(code));
	console.log(
		"interpretFromCode",
		pprintTermT(codeFromAst),
	);
	const goal = interpretPlus(codeFromAst);
	// return runWorlds(goal, [builtinWorld]);
	return runFor(goal, lvars1);
};