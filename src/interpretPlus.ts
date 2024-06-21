import {
	WorldGoal,
	type LogicValue,
	PredicateLogic,
	World,
	LogicPredicate,
	LogicLvar,
	LogicLiteral,
	eq,
} from "./WorldGoal";
import { builtinWorld } from "./builtinWorld";
import { SLogic } from "./logic";
import { codeToTypedAst } from "./typing";
import { pprintTypedAst } from "./pprintType";
import type {
	ExpressionTyped,
	TermTyped,
} from "./types/DesugaredAstTyped";

export function interpretPlus(
	ast: TermTyped | TermTyped[],
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
		case "predicate": {
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
					new PredicateLogic((...args: LogicValue[]) => {
						return new WorldGoal((world) => {
							const newWorld1 = new World(
								builtinWorld.lvars,
							);
							for (let i = 0; i < ast.args.length; i++) {
								// const freshened = world.walk(args[i]);
								newWorld1.addLvar(
									ast.args[i].value,
									args[i],
								);
							}
							const runTerms = interpretPlus(ast.body);
							const res = runTerms.run(newWorld1);
							return new WorldGoal((world2) => {
								// console.log(':::::::::::applying predicate', ast.name.value, args.map(a => a.toString()));
								const res2 = new World(
									new Map(world.lvars),
								);
								// const res2 = world
								// const walkGoals: WorldGoal[] = [];
								// for (let i = 0; i < ast.args.length; i++) {
								//     const walkRes = world2.getLvar(ast.args[i].value);
								//     if (walkRes) {
								//         // res2.addLvar(ast.args[i].value, walkRes);
								//         if (walkRes instanceof LogicLvar) {
								//             const walked = world2.walk(walkRes);
								//             if (walked) {
								//                 walkGoals.push(eq(args[i], walked));
								//             } else {
								//                 console.error('walked is undefined', walkRes);
								//                 return [World.fail];
								//             }
								//         } else {
								//             walkGoals.push(eq(args[i], walkRes));
								//         }
								//     } else {
								//         return [World.fail];
								//     }
								// }
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
							// const wgg = WorldGoal.and(
							//     freshenVarsGoal,
							//     // ...ast.args.map((arg, i) => WorldGoal.eq(new LogicValue(SLogic.lvar(arg.value)), args[i])),
							//     interpretPlus(ast.body)
							// );
							// return wgg.run(newWorld);
							// const astvv = interpretPlus(ast.body);
							// return astvv.run(newWorld);
						});
					}),
				),
			);
		default:
			throw `Invalid ast type: ${ast}`;
	}
}
function interpretExprListPlus(
	ast: ExpressionTyped[],
	withtype: "withtype" | "without_type" = "without_type",
	withio: "withio" | "without_io" = "without_io",
): LogicValue[] {
	return ast.map((ee) =>
		interpretExpr(ee, withtype, withio),
	);
}
function interpretExpr(
	ast: ExpressionTyped,
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

function runFor(goal: WorldGoal, vars2seek: string[]) {
	const worlds = runWorlds(goal, [builtinWorld]);
	return worlds.map((world) => {
		const res: Record<string, any> = {};
		for (const v of vars2seek) {
			res[v] = world.getLvar(v);
		}
		return res;
	});
}

export const interpretFromCode = (
	code: string,
	lvars1: string[],
) => {
	const codeFromAst = codeToTypedAst(code);
	console.log(
		"interpretFromCode",
		pprintTypedAst(codeFromAst),
	);
	const goal = interpretPlus(codeFromAst);
	// return runWorlds(goal, [builtinWorld]);
	return runFor(goal, lvars1);
};
const sourceCode2 = `

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
// console.log(interpretFromCode2(sourceCode2, ['qq']).map((world) => world.toString()).toString());
// console.log(runFor(interpretPlus(codeToTypedAst(sourceCode2)), ['qq']));
