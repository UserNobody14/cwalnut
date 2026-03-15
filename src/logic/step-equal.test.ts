import * as kn from "./index";
import {
	describe,
	expect,
	it as test,
} from "@jest/globals";
import { qlvar, qnom } from "./makelvar";
import { all } from "./index";
import { fresh, freshNom3 } from "./AnyFreshFn";
import { ezIn, ezTie } from "./ezeq";
import { availableo } from "./availableo";
import {
	qvar,
	qlam,
	qapp,
	tieTag,
	qappVV,
	stepEqualo,
	stepEqualo2,
	qlam2,
	qapp2,
} from "./testutils";

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];

describe.skip("Step equal", () => {
	/**
           (test
            (run1 1 (W)
              (fresh (E)
                (freshNom (x y c)
                  (== `(lam ,(tie c E)) W)
                  (hash x W)
                  (hash y W)
                  (step-equalo `(app (app ,W (var ,x)) (var ,y))
                               `(app (app (var ,x) (var ,y)) (var ,y))))))
            '((lam
               (tie-tag a.0
                        (lam
                         (tie-tag a.1
                                  (app (app (var a.0) (var a.1)) (var a.1))))))))
           
           */
	test("Logic 66", () => {
		const output = kn.run1(
			1,
			["W"],
			fresh((E) => {
				return freshNom3((x, y, c) => {
					return all(
						kn.eq(qlam(ezTie(c, E)), qlvar.W),
						availableo(x, qlvar.W),
						availableo(y, qlvar.W),
						stepEqualo2(
							// ezIn(["app", qapp(qlvar.W, qvar(x)), qvar(y)]),
							qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
							// ezIn(["app", ["app", qvar(x), qvar(y)], qvar(y)])
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
				W: tieTag(qnom.a0, qapp(qnom.a0, qnom.a1)),
			},
		]);
	});
	/**
        (test
         (run1 1 (Y)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (step-equalo `(app ,Y (var ,z)) `(app (var ,z) (app ,Y (var ,z))))))
         '((lam
            (tie-tag a.0
                     (app
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1)))))
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1))))))))))
        */
	test("Logic 67 check", () => {
		const output = kn.run1(
			1,
			["Y"],
			freshNom3((z, f, x) => {
				return all(
					kn.eq(
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
						qlvar.Y,
					),
					availableo(z, qlvar.Y),
					stepEqualo2(
						qapp(qlvar.Y, qvar(z)),
						qapp(qvar(z), qapp(qlvar.Y, qvar(z))),
					),
				);
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				Y: qlam2(
					tieTag(
						a0,
						qapp2(
							qlam2(
								tieTag(
									a1,
									qapp(qvar(a0), qapp(qvar(a1), qvar(a1))),
								),
							),
							qlam2(
								tieTag(
									a1,
									qapp(qvar(a0), qapp(qvar(a1), qvar(a1))),
								),
							),
						),
					),
				),
			},
		]);
	});
	/**
        (test
         (run1 1 (Y)
           (freshNom (z f x)
             (fresh (U)
               (== `(lam ,(tie f `(app ,U ,U))) Y)
               (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                       (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                   Y)
               (hash z Y)
               (step-equalo `(app ,Y (var ,z)) `(app (var ,z) (app ,Y (var ,z)))))))
         '((lam
            (tie-tag a.0
                     (app
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1)))))
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1))))))))))
        
    */
	test("Logic 682", () => {
		const output = kn.run1(
			1,
			["Y"],
			freshNom3((z, f, x) => {
				return fresh((U) => {
					return all(
						kn.eq(qlam(ezTie(f, qapp(U, U))), qlvar.Y),
						kn.eq(
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
							qlvar.Y,
						),
						availableo(z, qlvar.Y),
						stepEqualo(
							qapp(qlvar.Y, qvar(z)),
							qapp(qvar(z), qapp(qlvar.Y, qvar(z))),
						),
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				Y: qlam2(
					tieTag(
						a0,
						qapp2(
							qlam2(
								tieTag(
									a1,
									qapp(qvar(a0), qapp(qvar(a1), qvar(a1))),
								),
							),
							qlam2(
								tieTag(
									a1,
									qapp(qvar(a0), qapp(qvar(a1), qvar(a1))),
								),
							),
						),
					),
				),
			},
		]);
	});
	/**    
        (printf "this test takes a while...\n")
        (test "68"
          (run1 1 (Y)
            (freshNom (z f x)
              (fresh (U)
                (== `(lam ,(tie f `(app ,U ,U))) Y)
                (hash z Y)
                (step-equalo `(app ,Y (var ,z)) `(app (var ,z) (app ,Y (var ,z)))))))
         '((lam
            (tie-tag a.0
                     (app
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1)))))
                      (lam
                       (tie-tag a.1
                                (app (var a.0) (app (var a.1) (var a.1))))))))))
    */
	test("Logic 68", () => {
		const output = kn.run1(
			1,
			["Y"],
			freshNom3((z, f, x) => {
				return fresh((U) => {
					return all(
						kn.eq(qlam(ezTie(f, qapp(U, U))), qlvar.Y),
						availableo(z, qlvar.Y),
						stepEqualo(
							qapp(qlvar.Y, qvar(z)),
							qapp(qvar(z), qapp(qlvar.Y, qvar(z))),
						),
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				Y: tieTag(qnom.a0, qapp(qnom.a0, qnom.a1)),
			},
		]);
	}, 1000);
	/**
                                (printf "this test takes a while...\n")
        (test "69"
          (run1 1 (Y)
            (freshNom (z f x)
              (fresh (U)
                (== `(lam ,(tie f `(app ,U ,U))) Y)
                (hash z Y)
                (step-equalo `(app (var ,z) (app ,Y (var ,z))) `(app ,Y (var ,z))))))
          '((lam
             (tie-tag a.0
                      (app
                       (lam
                        (tie-tag a.1
                                 (app (var a.0) (app (var a.1) (var a.1)))))
                       (lam
                        (tie-tag a.1
                                 (app (var a.0) (app (var a.1) (var a.1))))))))))
         */

	test("Logic 67", () => {
		const output = kn.run1(
			1,
			["Y"],
			freshNom3((z, f, x) => {
				return fresh((U) => {
					return all(
						kn.eq(qlam(ezTie(f, qapp(U, U))), qlvar.Y),
						availableo(z, qlvar.Y),
						stepEqualo(
							qapp(qvar(z), qapp(qlvar.Y, qvar(z))),
							qapp(qlvar.Y, qvar(z)),
						),
					);
				});
			}),
			100000,
		);
		expect(output).toHaveLength(1);
		expect(output).toEqual([
			{
				Y: {
					name: "Nom(nom_0_2)",
					term: "?term_3",
				},
			},
		]);
	}, 1000);
});
