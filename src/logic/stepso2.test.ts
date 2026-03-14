import {
	describe,
	expect,
	it as test,
} from "@jest/globals";
import { makeTie, qlvar, qnom } from "./makelvar";
import { all, eq, run1 } from "./index";
import {
	fresh,
	fresh2,
	fresh4,
	freshNom2,
	freshNom3,
	freshNom4,
	freshNom5,
	freshNom6,
} from "./AnyFreshFn";
import { ezq, ezTie } from "./ezeq";
import { availableo } from "./availableo";
import {
	qvar,
	qlam,
	qapp,
	tieTag,
	qlam2,
	qapp2,
	qvar2,
	qappVV,
	stepso,
	suspTag,
	lamTie,
} from "./testutils";

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];
describe("stepso2", () => {
	/**
  (test
   (run1* (q)
     (freshNom (a b)
       (stepso `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) q)))
   '((app (lam (tie-tag a.0 (lam (tie-tag a.1 (var a.0))))) (var a.1))
     (lam (tie-tag a.0 (var a.1)))))
  */
	test("Logic 45: reflexive transitive closure of stepo", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => {
					return stepso(
						qapp(lamTie(a, lamTie(b, qvar(a))), qvar(b)),
						qlvar.q,
					);
				}),
			),
		).toEqual([
			{
				q: qapp2(
					qlam2(tieTag(a0, qlam2(tieTag(a1, qvar(a0))))),
					qvar2("Nom(1)"),
				),
			},
		]);
	}, 2000);
	/**
        (test
         (run1 3 (q)
           (fresh (M N)
             (stepso M N)
             (== `(,M ,N) q)))
         '((_.0 _.0)
           ((app (lam (tie-tag a.0 (var a.0))) _.0) _.0)
           (((app
              (lam (tie-tag a.0 (var (susp-tag ((a.1 a.0)) _.0))))
              _.1)
             (var _.0))
            : ((a.1 . _.0) (a.0 . _.0)))))
        
        */
	test("Logic 47: reflexive transitive closure of stepo", () => {
		expect(
			run1(
				3,
				["q"],
				fresh2((M, N) => {
					return all(stepso(M, N), ezq([M, N], qlvar.q));
				}),
			),
		).toEqual([
			{
				q: ["?$&0", "?$&0"],
			},
			{
				q: [
					qapp2(qlam2(tieTag(a0, qvar2(a0))), "?$&0"),
					"?$&0",
				],
			},
			{
				q: [
					qapp2(
						qlam2(
							tieTag(a0, qvar2(suspTag(a1, a0, "?$&0"))),
						),
						"?$&1",
					),
					qvar2("?$&0"),
				],
			},
		]);
	});
	/**
     * 
     *         ;; combinator generation
        
        ;; I combinator
        (test
         (run1 1 (I)
           (fresh (E)
             (freshNom (a b)
               (== `(lam ,(tie b E)) I)
               (hash a I)
               (stepso `(app ,I (var ,a)) `(var ,a)))))
         '((lam (tie-tag a.0 (var a.0)))))
        */
	test("Logic 48: I combinator", () => {
		const output = run1(
			1,
			["I"],
			fresh((E) => {
				return freshNom2((a, b) => {
					return all(
						eq(qlam(makeTie(b, E)), qlvar.I),
						availableo(a, qlvar.I),
						stepso(qapp(qlvar.I, qvar(a)), qvar(a), 0),
					);
				});
			}),
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				I: qlam2(tieTag(a0, qvar(a0))),
			},
		]);
	});
	/**
        (test
         (run1 3 (I)
           (fresh (E)
             (freshNom (a b)
               (== `(lam ,(tie b E)) I)
               (hash a I)
               (stepso `(app ,I (var ,a)) `(var ,a)))))
         '((lam (tie-tag a.0 (var a.0)))
           (lam
            (tie-tag a.0
                     (app (lam (tie-tag a.1 (var a.0))) (var a.0))))
           ((lam
             (tie-tag a.0
                      (app (lam (tie-tag a.1 (var a.0)))
                           (var (susp-tag ((a.2 a.0) (a.3 a.2) (a.4 a.3)) _.0)))))
            : ((a.0 . _.0) (a.2 . _.0) (a.4 . _.0) (a.3 . _.0)))))
        
        */
	test("Logic 49: I combinator", () => {
		const output = run1(
			3,
			["I"],
			fresh((E) => {
				return freshNom2((a, b) => {
					return all(
						eq(qlam(makeTie(b, E)), qlvar.I),
						availableo(a, qlvar.I),
						stepso(qapp(qlvar.I, qvar(a)), qvar(a)),
					);
				});
			}),
		);
		expect(output).toHaveLength(3);
		expect(output).toEqual([
			{
				I: qlam2(tieTag(a0, qvar(a0))),
			},
			{
				I: qlam2(
					tieTag(
						a0,
						qapp2(qlam2(tieTag(a1, qvar(a0))), qvar(a0)),
					),
				),
			},
			{
				I: qlam2(
					tieTag(
						a0,
						qapp2(
							lamTie(a1, qvar(a0)),
							qvar2(
								suspTag(
									a2,
									a0,
									suspTag(
										qnom[3],
										a2,
										suspTag(qnom[4], qnom[3], "?$&0"),
									),
								),
							),
						),
					),
				),
			},
		]);
	});
	/**
     *         ;; W combinator
        
        ; Wxy => xyy

        (test
         (run1 1 (W)
           (fresh (E)
             (freshNom (x y c)
               (== `(lam ,(tie c E)) W)
               (hash x W)
               (hash y W)
               (stepso `(app (app ,W (var ,x)) (var ,y))
                       `(app (app (var ,x) (var ,y)) (var ,y))))))
         '((lam
            (tie-tag a.0
                     (lam
                      (tie-tag a.1
                               (app (app (var a.0) (var a.1)) (var a.1))))))))
        */
	test("Logic 50: W Combinator", () => {
		const output = run1(
			1,
			["W"],
			fresh((E) => {
				return freshNom3((x, y, c) => {
					return all(
						eq(lamTie(c, E), qlvar.W),
						availableo(x, qlvar.W),
						availableo(y, qlvar.W),
						stepso(
							qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
							qapp(qapp(qvar(x), qvar(y)), qvar(y)),
						),
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				W: qlam2(
					tieTag(
						a0,
						qlam2(
							tieTag(
								a1,
								qapp(qapp(qvar(a0), qvar(a1)), qvar(a1)),
							),
						),
					),
				),
			},
		]);
	}, 2000);

	test("Logic 50: W Combinator IO1", () => {
		const output = run1(
			1,
			["W"],
			fresh((E) => {
				return freshNom5((x, y, c, aa1, aa2) => {
					return all(
						eq(lamTie(c, E), qlvar.W),
						availableo(x, qlvar.W),
						availableo(y, qlvar.W),
						eq(
							qlvar.W,
							qlam(
								makeTie(
									aa1,
									qlam(
										makeTie(
											aa2,
											qapp(
												qapp(qvar(aa1), qvar(aa2)),
												qvar(aa2),
											),
										),
									),
								),
							),
						),
						stepso(
							qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
							qapp(qapp(qvar(x), qvar(y)), qvar(y)),
						),
					);
				});
			}),
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				W: qlam2(
					tieTag(
						a0,
						qlam2(
							tieTag(
								a1,
								qapp(qapp(qvar(a0), qvar(a1)), qvar(a1)),
							),
						),
					),
				),
			},
		]);
	}, 2000);

	test("Logic 50: W Combinator IO2", () => {
		const output = run1(
			1,
			["W", "Z"],
			fresh4((E, EHat, Eh2, Eh3) => {
				return freshNom5((x, y, c, aa0, aa1) => {
					return all(
						eq(lamTie(c, E), qlvar.W),
						availableo(x, qlvar.W),
						availableo(y, qlvar.W),
						eq(
							qlvar.W,
							qlam(
								makeTie(
									aa0,
									qlam(
										makeTie(
											aa1,
											qapp(
												qapp(qvar(aa0), qvar(aa1)),
												qvar(aa1),
											),
										),
									),
								),
							),
						),
						eq(qlvar.Z, qapp(qapp(qvar(EHat), Eh2), Eh3)),
						stepso(
							qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
							qlvar.Z,
						),
					);
				});
			}),
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				W: qlam2(
					tieTag(
						a0,
						qlam2(
							tieTag(
								a1,
								qapp(qapp(qvar(a0), qvar(a1)), qvar(a1)),
							),
						),
					),
				),
				Z: qapp2(qapp(qvar(a2), qvar(a3)), qvar(a3)),
			},
		]);
	}, 2000);
	/**
        (test
         (run1 1 (W)
           (fresh (E)
             (freshNom (x y c d)
               (== `(lam ,(tie c `(lam ,(tie d E)))) W)
               (hash x W)
               (hash y W)
               (stepso `(app (app ,W (var ,x)) (var ,y))
                       `(app (app (var ,x) (var ,y)) (var ,y))))))
         '((lam
            (tie-tag a.0
                     (lam
                      (tie-tag a.1
                               (app (app (var a.0) (var a.1)) (var a.1))))))))

        */
	test.skip("Logic 51: W combinator", () => {
		const output = run1(
			1,
			["W"],
			fresh((E) => {
				return freshNom4((x, y, c, d) => {
					return all(
						eq(qlam(ezTie(c, lamTie(d, E))), qlvar.W),
						availableo(x, qlvar.W),
						availableo(y, qlvar.W),
						stepso(
							qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
							qapp(qappVV(x, y), qvar(y)),
						),
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				W: qlam2(
					tieTag(
						a0,
						qlam2(
							tieTag(
								a1,
								qapp(qapp(qvar(a0), qvar(a1)), qvar(a1)),
							),
						),
					),
				),
			},
		]);
	}, 2000);
	/**
     * 
     *         
        ;; B' combinator
        
        ; B'xyz => y(xz)
        (test
         (run1 1 (B^)
           (fresh (E)
             (freshNom (x y z c d e)
               (== `(lam ,(tie c `(lam ,(tie d `(lam ,(tie e E)))))) B^)
               (hash x B^)
               (hash y B^)
               (hash z B^)       
               (stepso `(app (app (app ,B^ (var ,x)) (var ,y)) (var ,z))
                       `(app (var ,y) (app (var ,x) (var ,z)))))))
         '((lam
            (tie-tag a.0
                     (lam
                      (tie-tag a.1
                               (lam
                                (tie-tag a.2
                                         (app (var a.1) (app (var a.0) (var a.2)))))))))))
        


        */

	test.skip("Logic 52: B-prime combinator", () => {
		const output = run1(
			1,
			["bHat"],
			fresh((E) => {
				return freshNom6((x, y, z, c, d, e) => {
					return all(
						eq(
							lamTie(c, lamTie(d, lamTie(e, E))),
							qlvar.bHat,
						),
						availableo(x, qlvar.bHat),
						availableo(y, qlvar.bHat),
						availableo(z, qlvar.bHat),
						stepso(
							qapp(
								qapp(qapp(qlvar.bHat, qvar(x)), qvar(y)),
								qvar(z),
							),
							qapp(qvar(y), qapp(qvar(x), qvar(z))),
						),
						// ezIn(["app", ["app", qapp(qlvar.bHat, qvar(x)), qvar(y)], qvar(z)]),
						// ezIn(["app", qvar(y), ["app", qvar(x), qvar(z)]])
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				bHat: qlam2(
					tieTag(
						a0,
						qlam2(
							tieTag(
								a1,
								qlam2(
									tieTag(
										a2,
										qapp(
											qvar(a1),
											qapp(qvar(a0), qvar(a2)),
										),
									),
								),
							),
						),
					),
				),
			},
		]);
	}, 2000);
});
