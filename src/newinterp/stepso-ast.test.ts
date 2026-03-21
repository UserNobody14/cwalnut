/**
 * Stepso tests via AST: substo2, betao, stepo, stepso defined as predicate definitions,
 * matching scenarios from src/logic/stepso.test.ts, stepso2.test.ts, stepso3.test.ts.
 * Expected values match the logic tests exactly (same qapp2/qlam2/qvar2/tieTag/suspTag shapes).
 */

import { test, describe, expect } from "@jest/globals";
import type {
	ExpressionGeneric,
	PredicateCallGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import type { CodeLocation } from "src/redo/codeloc";
import type { CleanOutput } from "src/logic/types";
import { interp } from "./interp";
import {
	disjunction1,
	Expression,
	ezmakeMaker,
	fresh1,
	freshNominal1,
	make,
	make_list_ast,
} from "src/utils/make_better_typed";
import { defaultCodeLocation } from "src/redo/codeloc";
import {
	qapp2,
	qlam2,
	qvar2,
	tieTag,
	suspTag,
	qapp,
	qvar,
	qappVV,
} from "src/logic/testutils";
import { qnom } from "src/logic/makelvar";
import { fresh } from "src/logic/AnyFreshFn";
import {
	conj,
	call,
	id,
	lit,
	def,
	cx,
	cl,
} from "./asttestutils";

function cxvar(
	output: ReturnType<typeof id>,
	input: ReturnType<typeof id>,
): TermGeneric<CodeLocation> {
	// return make_list_ast(output, [lit("var"), input], defaultCodeLocation);
	return cl.list(output, lit("var"), input);
}

function cxapp(
	output: ReturnType<typeof id>,
	source: ReturnType<typeof id>,
	target: ReturnType<typeof id>,
): TermGeneric<CodeLocation> {
	return fresh1(
		[cx.appargs],
		cl.list(cx.appargs, source, target),
		cl.list(output, lit("app"), cx.appargs),
	);
}

function cxlam(
	output: ReturnType<typeof id>,
	input: ReturnType<typeof id>,
) {
	return cl.list(output, lit("lam"), input);
}
function cxlamtie(
	output: ReturnType<typeof id>,
	nom: ReturnType<typeof id>,
	term: ReturnType<typeof id>,
) {
	return fresh1(
		[cx.interlam],
		cxlam(output, cx.interlam),
		cl.tie(cx.interlam, nom, term),
	);
}

/** CleanOutput version of app(var(a), var(b)). */
function qappVV2(a: string, b: string): CleanOutput {
	return qapp2(qvar2(a), qvar2(b));
}

// const cloc: CodeLocation = defaultCodeLocation;

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];

/** substo2(Idtm, E, Out): Out is Idtm with E substituted (capture-avoiding). 
 * 
 * function substo2(idtm: Term, E: Term, out: Term): MGoal {
	// console.log('subst2::::');
   * ((fresh (a)
(== (tie a `(var ,a)) id/tm)
(== E out)))
   
	return (sc) =>
		either(
			freshNom((a) => {
				return all(
					eq(makeTie(a, qvar(a)), idtm),
					eq(E, out),
				);
			}),

     *         ((fresh (a)
(exist (B)
(hash a B)
(== (tie a `(var ,B)) id/tm)
(== `(var ,B) out))))
			freshNom((a) => {
				return fresh((B) => {
					return all(
						availableo(a, B, "2root"),
						eq(makeTie(a, qvar(B)), idtm),
						eq(qvar(B), out),
					);
				});
			}),
			
     *         ((fresh (a b)
(exist (E1 E1^)
(hash b E)
(== (tie a `(lam ,(tie b E1))) id/tm)
(== `(lam ,(tie b E1^)) out)
(substo (tie a E1) E E1^))))
     
			freshNom2((a, b) => {
				return fresh2((E1, E1Hat) => {
					return all(
						availableo(b, E, "3root"),
						eq(makeTie(a, qlam(makeTie(b, E1))), idtm),
						eq(qlam(makeTie(b, E1Hat)), out),
						substo2(makeTie(a, E1), E, E1Hat),
					);
				});
			}),
			
     *         ((fresh (a)
   (exist (E1 E2 E1^ E2^)
     (== (tie a `(app ,E1 ,E2)) id/tm)
     (== `(app ,E1^ ,E2^) out)
     (substo (tie a E1) E E1^)
     (substo (tie a E2) E E2^)))))))
     
			freshNom((a) => {
				return AnyFreshFn.fresh4((E1, E2, E1Hat, E2Hat) => {
					return all(
						eq(makeTie(a, qapp(E1, E2)), idtm),
						eq(qapp(E1Hat, E2Hat), out),
						substo2(makeTie(a, E1), E, E1Hat),
						substo2(makeTie(a, E2), E, E2Hat),
					);
				});
			}),
		)(sc);
}

 * 
 * 
*/
function substo2Def(): TermGeneric<CodeLocation> {
	return def(
		"substo2",
		[cx.Idtm, cx.E, cx.Out],
		conj(
			disjunction1(
				// Clause 1: Idtm = tie(a, var(a)) -> Out = E
				freshNominal1(
					[cx.A],
					fresh1(
						[cx.VarA, cx.TieA],
						cxvar(cx.VarA, cx.A),
						cl.tie(cx.Idtm, cx.A, cx.VarA),
						cl.unify(cx.E, cx.Out),
					),
				),
				// Clause 2: Idtm = tie(a, var(B)), hash(a,B) -> Out = var(B)
				freshNominal1(
					[cx.A],
					fresh1(
						[cx.B, cx.VarB, cx.TieA],
						cl.hash(cx.A, cx.B),
						cxvar(cx.VarB, cx.B),
						cl.tie(cx.Idtm, cx.A, cx.VarB),
						cxvar(cx.Out, cx.B),
					),
				),
				// Clause 3: Idtm = tie(a, lam(tie(b,E1))), hash(b,E) -> Out = lam(tie(b,E1Hat)), substo2(tie(a,E1), E, E1Hat)
				/**
     *         ((fresh (a b)
(exist (E1 E1^)
(hash b E)
(== (tie a `(lam ,(tie b E1))) id/tm)
(== `(lam ,(tie b E1^)) out)
(substo (tie a E1) E E1^))))
     */
				freshNominal1(
					[cx.A, cx.B],
					fresh1(
						[
							cx.E1,
							cx.E1Hat,
							cx.Body,
							cx.LamBody,
							cx.TieAE1,
							cx.OutTie,
						],
						cl.hash(cx.B, cx.E),
						cl.tie(cx.Idtm, cx.A, cx.LamBody),
						cxlamtie(cx.LamBody, cx.B, cx.E1),
						cl.tie(cx.TieAE1, cx.A, cx.E1),
						cl.substo2(cx.TieAE1, cx.E, cx.E1Hat),
						cxlamtie(cx.Out, cx.B, cx.E1Hat),
					),
				),
				// Clause 4: Idtm = tie(a, app(E1,E2)) -> Out = app(E1Hat,E2Hat)
				/**
		 *      *         ((fresh (a)
   (exist (E1 E2 E1^ E2^)
     (== (tie a `(app ,E1 ,E2)) id/tm)
     (== `(app ,E1^ ,E2^) out)
     (substo (tie a E1) E E1^)
     (substo (tie a E2) E E2^)))))))
		 */
				freshNominal1(
					[cx.A],
					fresh1(
						[
							cx.E1,
							cx.E2,
							cx.E1Hat,
							cx.E2Hat,
							cx.AppTerm,
							cx.Args,
							cx.Args2,
							cx.T1,
							cx.T2,
							cx.ArgsOut,
						],
						cl.tie(cx.Idtm, cx.A, cx.AppTerm),
						cxapp(cx.AppTerm, cx.E1, cx.E2),
						cl.tie(cx.T1, cx.A, cx.E1),
						cl.tie(cx.T2, cx.A, cx.E2),
						cxapp(cx.Out, cx.E1Hat, cx.E2Hat),
						cl.substo2(cx.T1, cx.E, cx.E1Hat),
						cl.substo2(cx.T2, cx.E, cx.E2Hat),
					),
				),
			),
		),
	);
}

/** betao(T1, T2): one beta step, T1 = app(lam(tie(b,E)), E') -> T2 = E'' via substo2. */
function betaoDef(): TermGeneric<CodeLocation> {
	return def(
		"betao",
		[cx.T1, cx.EHatHat],
		conj(
			freshNominal1(
				[cx.b],
				fresh1(
					[cx.E, cx.EHat, cx.TieBE, cx.Lam],
					cxapp(cx.T1, cx.Lam, cx.EHat),
					cl.tie(cx.TieBE, cx.b, cx.E),
					cxlam(cx.Lam, cx.TieBE),
					cl.substo2(cx.TieBE, cx.EHat, cx.EHatHat),
				),
			),
		),
	);
}

/** stepo(T1, T2): single step (beta or congruence). */
function stepoDef(): TermGeneric<CodeLocation> {
	return def(
		"stepo",
		[cx.T1, cx.T2],
		conj(
			disjunction1(
				conj(cl.betao(cx.T1, cx.T2)),
				fresh1(
					[cx.M, cx.N, cx.MHat],
					cxapp(cx.T1, cx.M, cx.N),
					cxapp(cx.T2, cx.MHat, cx.N),
					cl.stepo(cx.M, cx.MHat),
				),
				fresh1(
					[cx.M, cx.N, cx.NHat],
					cxapp(cx.T1, cx.M, cx.N),
					cxapp(cx.T2, cx.M, cx.NHat),
					cl.stepo(cx.N, cx.NHat),
				),
			),
		),
	);
}

/** stepso(T1, T2): reflexive-transitive closure of stepo. */
function stepsoDef(): TermGeneric<CodeLocation> {
	return def(
		"stepso",
		[cx.T1, cx.T2],
		conj(
			disjunction1(
				cl.unify(cx.T1, cx.T2),
				fresh1(
					[cx.T],
					cl.stepo(cx.T1, cx.T),
					cl.stepso(cx.T, cx.T2),
				),
			),
		),
	);
}

/** AST for all lambda/stepso predicates. */
function stepsoAst(): TermGeneric<CodeLocation>[] {
	return [
		substo2Def(),
		betaoDef(),
		stepoDef(),
		stepsoDef(),
	];
}

describe("stepso via AST (stepso.test.ts)", () => {
	test.skip("Logic 64", () => {
		// Build input: app(Y, var(z)) and app(var(z), app(Y, var(z))) both stepso to t.
		// Y = lam(tie(f, app(lam(tie(x,...)), lam(tie(x,...))))), hash(z,Y), then two stepso goals.
		/**
	 *             eq(
              lamTie(
                f,
                qapp(
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                ),
              ),
              Y,
            ),
	 */
		const main = fresh1(
			[cx.Y],
			conj(
				freshNominal1(
					[cx.z, cx.f, cx.x],
					fresh1(
						[
							cx.Vz,
							cx.Vf,
							cx.Vx,
							cx.AppXX,
							cx.AppFXX,
							cx.LamX,
							cx.AppLams,
							cx.AppYVz,
							cx.Input1,
							cx.Input2,
						],
						// Y = lam(tie(f, app(lam(tie(x, app(var(f), app(var(x), var(x))))), lam(tie(x, app(var(f), app(var(x), var(x))))))))
						cxvar(cx.Vz, cx.z),
						cxvar(cx.Vf, cx.f),
						cxvar(cx.Vx, cx.x),
						cxapp(cx.AppXX, cx.Vx, cx.Vx),
						cxapp(cx.AppFXX, cx.Vf, cx.AppXX),
						cxlamtie(cx.LamX, cx.x, cx.AppFXX),
						cxapp(cx.AppLams, cx.LamX, cx.LamX),
						cxlamtie(cx.Y, cx.f, cx.AppLams),
						cl.hash(cx.z, cx.Y),
						cxapp(cx.Input1, cx.Y, cx.Vz),
						cxapp(cx.AppYVz, cx.Y, cx.Vz),
						cxapp(cx.Input2, cx.Vz, cx.AppYVz),
						// availableo(z, Y),
						// stepso(qapp(Y, qvar(z)), qlvar.t),
						// stepso(
						// 	qapp(qvar(z), qapp(Y, qvar(z))),
						// 	qlvar.t,
						// ),
						cl.stepso(cx.Input1, cx.t),
						cl.stepso(cx.Input2, cx.t),
					),
				),
			),
		);
		const ast = [...stepsoAst(), main];
		const states = interp(2, ast, {
			vars: ["t"],
			extraNum: 100000,
		});
		expect(states.length).toBe(2);
		// Same expected as stepso.test.ts Logic 64
		expect(states).toEqual([
			{
				t: qapp2(
					qvar(a0),
					qapp2(
						qlam2(
							tieTag(a1, qapp(qvar(a0), qappVV(a1, a1))),
						),
						qlam2(
							tieTag(a1, qapp(qvar(a0), qappVV(a1, a1))),
						),
					),
				),
			},
			{
				t: qapp2(
					qvar(a0),
					qapp2(
						qvar(a0),
						qapp2(
							qlam2(
								tieTag(a1, qapp(qvar(a0), qappVV(a1, a1))),
							),
							qlam2(
								tieTag(a1, qapp(qvar(a0), qappVV(a1, a1))),
							),
						),
					),
				),
			},
		]);
	}, 60000);
});

describe("stepso via AST (stepso2.test.ts)", () => {
	test("Logic 45: reflexive transitive closure", () => {
		// stepso(app(lam(tie(a, lam(tie(b, var(a))))), var(b)), q)
		const main = freshNominal1(
			[cx.a, cx.b],
			fresh1(
				[
					cx.Va,
					cx.Vb,
					cx.TieB,
					cx.LamB,
					cx.TieA,
					cx.OuterLam,
					cx.AppArgs,
					cx.Input,
				],
				cxvar(cx.Va, cx.a),
				cxvar(cx.Vb, cx.b),
				cl.tie(cx.TieB, cx.b, cx.Va),
				cxlam(cx.LamB, cx.TieB),
				cl.tie(cx.TieA, cx.a, cx.LamB),
				cxlam(cx.OuterLam, cx.TieA),
				cl.list(cx.AppArgs, cx.OuterLam, cx.Vb),
				cl.list(cx.Input, lit("app"), cx.AppArgs),
				cl.stepso(cx.Input, cx.q),
			),
		);
		const ast = [...stepsoAst(), main];
		const states = interp(1, ast, { vars: ["q"] });
		expect(states.length).toBe(1);
		// Same expected as stepso2.test.ts Logic 45
		expect(states).toEqual([
			{
				q: qapp2(
					qlam2(
						tieTag(
							"Nom(0)",
							qlam2(tieTag("Nom(1)", qvar2("Nom(0)"))),
						),
					),
					qvar2("Nom(1)"),
				),
			},
		]);
	}, 10000);

	test("Logic 47: stepso M N, first 3 answers", () => {
		const main = fresh1(
			[cx.M, cx.N],
			conj(
				cl.stepso(cx.M, cx.N),
				cl.list(cx.q, cx.M, cx.N),
			),
		);
		const ast = [...stepsoAst(), main];
		const states = interp(3, ast, { vars: ["q"] });
		expect(states.length).toBe(3);
		// Same expected as stepso2.test.ts Logic 47
		expect(states).toEqual([
			{ q: ["?$&0", "?$&0"] },
			{
				q: [
					qapp2(
						qlam2(tieTag("Nom(0)", qvar2("Nom(0)"))),
						"?$&0",
					),
					"?$&0",
				],
			},
			{
				q: [
					qapp2(
						qlam2(
							tieTag(
								"Nom(0)",
								qvar2(suspTag("Nom(0)", "Nom(1)", "?$&0")),
							),
						),
						"?$&1",
					),
					qvar2("?$&0"),
				],
			},
		]);
	}, 15000);

	test("Logic 48: I combinator", () => {
		// I = lam(tie(b, E)), hash(a, I), stepso(app(I, var(a)), var(a)) -> I = lam(tie(a.0, var(a.0)))
		const main = fresh1(
			[cx.E],
			conj(
				freshNominal1(
					[cx.a, cx.b],
					fresh1(
						[
							cx.Va,
							cx.Vb,
							cx.TieB,
							cx.LamB,
							cx.TieA,
							cx.OuterLam,
							cx.AppArgs,
							cx.Input,
						],
						cxlamtie(cx.I, cx.b, cx.E),
						cl.hash(cx.a, cx.I),
						cxvar(cx.Va, cx.a),
						cxapp(cx.Input, cx.I, cx.Va),
						cl.stepso(cx.Input, cx.Va),
					),
				),
			),
		);
		const ast = [...stepsoAst(), main];
		const states = interp(1, ast, { vars: ["I"] });
		expect(states.length).toBe(1);
		// Same expected as stepso2.test.ts Logic 48
		expect(states).toEqual([
			{
				I: qlam2(tieTag("Nom(0)", qvar2("Nom(0)"))),
			},
		]);
	}, 10000);
});

describe("stepso via AST (stepso3.test.ts)", () => {
	test("Logic 56", () => {
		// stepso(app(var(z), app(Y, var(z))), t), stepso(app(Y, var(z)), t) with Y = Y combinator shape
		/**
	 * 			fresh((Y) => {
				return freshNom3((z, f, x) => {
					return all(
						eq(
							qlam(
								ezTie(
									f,
									qapp(
										qlam(
											ezTie(x, qapp(qvar(f), qappVV(x, x))),
										),
										qlam(
											ezTie(x, qapp(qvar(f), qappVV(x, x))),
										),
									),
								),
							),
							Y,
						),
						availableo(z, Y),
						stepso(
							qapp(qvar(z), qapp(Y, qvar(z))),
							qlvar.t,
						),
						stepso(qapp(Y, qvar(z)), qlvar.t),
					);
				});
			}),
	 */
		const main = fresh1(
			[cx.Y],
			conj(
				freshNominal1(
					[cx.z, cx.f, cx.x],
					fresh1(
						[
							cx.Vz,
							cx.Vf,
							cx.Vx,
							cx.AppLams,
							cx.LamX,
							cx.AppFXX,
							cx.AppXX,
							cx.AppYVz,
							cx.Y,
							cx.Input1,
							cx.Input2,
						],
						cxvar(cx.Vz, cx.z),
						cxvar(cx.Vf, cx.f),
						cxvar(cx.Vx, cx.x),
						cxapp(cx.AppFXX, cx.Vf, cx.AppXX),
						cxapp(cx.AppXX, cx.Vx, cx.Vx),
						cxlamtie(cx.LamX, cx.x, cx.AppFXX),
						cxapp(cx.AppLams, cx.LamX, cx.LamX),
						cxlamtie(cx.Y, cx.f, cx.AppLams),
						cl.hash(cx.z, cx.Y),
						cxapp(cx.AppYVz, cx.Y, cx.Vz),
						cxapp(cx.Input1, cx.Vz, cx.AppYVz),
						cxapp(cx.Input2, cx.Y, cx.Vz),
						cl.stepso(cx.Input1, cx.t),
						cl.stepso(cx.Input2, cx.t),
					),
				),
			),
		);
		const ast = [...stepsoAst(), main];
		const states = interp(1, ast, {
			vars: ["t"],
			extraNum: 100000,
		});
		expect(states.length).toBe(1);
		// Same expected as stepso3.test.ts Logic 56 (two lams with distinct nominals Nom(1) and Nom(2))
		const body1 = qapp2(
			qvar2("Nom(0)"),
			qappVV2("Nom(1)", "Nom(1)"),
		);
		const body2 = qapp2(
			qvar2("Nom(0)"),
			qappVV2("Nom(2)", "Nom(2)"),
		);
		expect(states).toEqual([
			{
				t: qapp2(
					qvar2("Nom(0)"),
					qapp2(
						qlam2(tieTag("Nom(1)", body1)),
						qlam2(tieTag("Nom(2)", body2)),
					),
				),
			},
		]);
	}, 60000);
});
