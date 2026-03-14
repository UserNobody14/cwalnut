import {
	describe,
	expect,
	it as test,
} from "@jest/globals";
import {
	makeList,
	makeLiteral,
	qlvar,
	qnom,
} from "./makelvar";
import type { Goal, Goal2 } from "./types";
import { all, either, eq, run1 } from "./index";
import {
	fresh,
	fresh2,
	fresh3,
	fresh4,
	freshNom,
	freshNom2,
	freshNom4,
} from "./AnyFreshFn";
import { ezIn, ezq, ezTie } from "./ezeq";
import type { MGoal } from "./streams";

describe("logic2", () => {
	/**
  (test "7"
   (run1 2 (q)
    (fresh (x y z)
      (conde
        ((== `(,x ,y ,z ,x) q))
        ((== `(,z ,y ,x ,z) q)))))
   '((_.0 _.1 _.2 _.0)
     (_.0 _.1 _.2 _.0)))
  */
	test("Nominal extensions", () => {
		const ooo12 = run1(
			2,
			["q"],
			fresh3((x, y, z) => {
				return either(
					eq(makeList([x, y, z, x]), qlvar.q),
					eq(makeList([z, y, x, z]), qlvar.q),
				);
			}),
		);
		expect(ooo12).toEqual([
			{
				// q: "[_.0, _.1, _.2, _.0]",
				q: ["?$&0", "?$&1", "?$&2", "?$&0"],
			},
			{
				// q: "[_.0, _.1, _.2, _.0]",
				q: ["?$&0", "?$&1", "?$&2", "?$&0"],
			},
		]);
	});
	/**
  (test "8"
   (run1 5 (q)
    (let loop ()
      (conde
        ((== #f q))
        ((== #t q))
        ((loop)))))
   '(#f #t #f #t #f))
  */

	test("Check goal run1ning", () => {
		expect(() => {
			const ooo13 = run1(
				5,
				["q"],
				fresh((q) => {
					const loop = (): MGoal => {
						return either(
							eq(makeLiteral(false), qlvar.q),
							eq(makeLiteral(true), qlvar.q),
							fresh((qw) => {
								return loop();
							}),
						);
					};
					return loop();
				}),
			);
		}).not.toThrow();
	});

	test("Nominal extensions bool", () => {
		const ooo13 = run1(
			5,
			["q"],
			fresh((g) => {
				const loop = (): MGoal => {
					return either(
						eq(makeLiteral(false), qlvar.q),
						eq(makeLiteral(true), qlvar.q),
					);
				};
				return loop();
			}),
		);
		expect(ooo13).toEqual([
			{
				q: false,
			},
			{
				q: true,
			},
		]);
	});

	test("Nominal extensions loop", () => {
		const ooo13 = run1(
			5,
			["q"],
			fresh((q) => {
				const loop = (): MGoal => {
					return either(
						eq(makeLiteral(false), qlvar.q),
						eq(makeLiteral(true), qlvar.q),
						fresh((qw) => {
							console.log("LOOPING");
							return loop();
						}),
					);
				};
				return loop();
			}),
		);
		expect(ooo13).toEqual([
			{
				q: false,
			},
			{
				q: true,
			},
			{
				q: false,
			},
			{
				q: true,
			},
			{
				q: false,
			},
		]);
	});
	/**
  (define anyo 
    (lambda (g)
      (conde
        (g)
        ((anyo g)))))
  */
	// function anyo(g: Goal): Goal {
	//     // return either(g, fresh((qw) => anyo(g)));
	//     return function* (scc) {
	//         yield* g(scc);
	//         yield* anyo(g)(scc);
	//     }
	// }
	function anyo(g: MGoal): MGoal {
		return either(
			g,
			fresh((qw) => anyo(g)),
		);
		// return function* (scc) {
		//   // yield* anyo(g)(scc);
		//   while (true) {
		//     const gce = g(scc);
		//     yield* gce;
		//   }
		// }
	}

	// test("Logic minuzz", () => {
	//   const ooo14 = run1(
	//     1,
	//     ["q"],
	//     anyo(eq(makeLiteral(false), makeLiteral(true))),
	//   );
	//   expect(ooo14).toEqual([
	//   ]);
	// });
	/**
  (test "9"
   (run1 5 (q)
    (conde
      ((anyo (== #f q)))
      ((== #t q))))
   '(#t #f #f #f #f))
  */
	test("Logic pluszzz", () => {
		const ooo14 = run1(
			5,
			["q"],
			either(
				anyo(eq(makeLiteral(false), qlvar.q)),
				eq(makeLiteral(true), qlvar.q),
			),
		);
		expect(ooo14).toEqual([
			{
				q: true,
			},
			{
				q: false,
			},
			{
				q: false,
			},
			{
				q: false,
			},
			{
				q: false,
			},
		]);
	});
	/**
  (test "10"
   (run1 10 (q)
     (anyo 
      (conde
        ((== 1 q))
        ((== 2 q))
        ((== 3 q)))))
   '(1 2 3 1 2 3 1 2 3 1))
  */
	test("Logic any seq", () => {
		const ooo15 = run1(
			10,
			["q"],
			anyo(
				either(
					eq(makeLiteral(1), qlvar.q),
					eq(makeLiteral(2), qlvar.q),
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo15).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
			{
				q: 1,
			},
		]);
	});
	/**
  (test "11"
   (run1 3 (q)
    (let ((nevero (anyo (== #f #t))))
      (conde
        ((== 1 q))
        (nevero)
        ((conde
           ((== 2 q))
           (nevero)
           ((== 3 q)))))))
   '(1 2 3))
  */
	test("Logic nevertest", () => {
		const nevero = anyo(
			eq(makeLiteral(false), makeLiteral(true)),
		);
		const ooo16 = run1(
			2,
			["q"],
			either(
				eq(makeLiteral(2), qlvar.q),
				nevero,
				eq(makeLiteral(3), qlvar.q),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plus nevertest 2", () => {
		const nevero = anyo(
			eq(makeLiteral(false), makeLiteral(true)),
		);
		const ooo16 = run1(
			3,
			["q"],
			either(
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(1), qlvar.q),
				nevero,
				eq(makeLiteral(2), qlvar.q),
				nevero,
				eq(makeLiteral(3), qlvar.q),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plus emptytest 2", () => {
		const ooo16 = run1(
			15,
			["q"],
			either(
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(1), qlvar.q),
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(2), qlvar.q),
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(3), qlvar.q),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plus nevertest 3", () => {
		const ooo16 = run1(
			5,
			["q"],
			either(
				eq(makeLiteral(1), qlvar.q),
				either(
					eq(makeLiteral(2), qlvar.q),
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plus nevertest 33", () => {
		const nevero = anyo(
			eq(makeLiteral(false), makeLiteral(true)),
		);
		const ooo16 = run1(
			5,
			["q"],
			either(
				eq(makeLiteral(1), qlvar.q),
				// eq(makeLiteral(false), makeLiteral(true)),
				either(
					eq(makeLiteral(2), qlvar.q),
					eq(makeLiteral(false), makeLiteral(true)),
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plus nevertest 34", () => {
		const ooo16 = run1(
			3,
			["q"],
			either(
				eq(makeLiteral(1), qlvar.q),
				eq(makeLiteral(false), makeLiteral(true)),
				either(
					eq(makeLiteral(false), makeLiteral(true)),
					eq(makeLiteral(2), qlvar.q),
					eq(makeLiteral(false), makeLiteral(true)),
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});

	test("Logic plusm", () => {
		const nevero = anyo(
			eq(makeLiteral(false), makeLiteral(true)),
		);
		const ooo16 = run1(
			3,
			["q"],
			either(
				eq(makeLiteral(1), qlvar.q),
				either(
					eq(makeLiteral(2), qlvar.q),
					nevero,
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	}, 5000);

	test("Logic plussss", () => {
		const nevero = anyo(
			eq(makeLiteral(false), makeLiteral(true)),
		);
		const ooo16 = run1(
			3,
			["q"],
			either(
				eq(makeLiteral(1), qlvar.q),
				nevero,
				either(
					eq(makeLiteral(2), qlvar.q),
					nevero,
					eq(makeLiteral(3), qlvar.q),
				),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	}, 5000);
	/**
  (test "12"
    (run1* (q) (freshNom (a) (== a a)))
    '(_.0))
  */
	test("Logic plus2", () => {
		expect(
			run1(
				1,
				["q"],
				fresh((a) => eq(a, a)),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	/**
  (test 
   (run1* (q) (freshNom (a) (== a 5)))
   '())
  */
	test("Logic 14", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom((a) => ezq(a, 5)),
			),
		).toEqual([]);
	});
	/**
      (test
        (run1* (q) (freshNom (a b) (== a b)))
        '())
      */
	test("Logic 15", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => eq(a, b)),
			),
		).toEqual([]);
	});
	/**
      (test
        (run1* (q) (freshNom (a b) (== b q)))
        '(a.0))
      */
	test("Logic 16", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => eq(b, qlvar.q)),
			),
		).toEqual([
			{
				q: "Nom(0)",
			},
		]);
	});
});
