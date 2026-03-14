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
import { availableo } from "./availableo";
import { qvar, suspTag, tieTag } from "./testutils";

describe("logic3", () => {
	/**
      (test
       (run1* (q)
        (fresh (x y z)
          (freshNom (a)
            (== x a)
            (freshNom (a b)
              (== y a)
              (== `(,x ,y ,z ,a ,b) q)))))
        '((a.0 a.1 _.0 a.1 a.2)))
      */
	test("Logic 17", () => {
		expect(
			run1(
				1,
				["q"],
				fresh3((x, y, z) => {
					return freshNom((a) => {
						return all(
							eq(x, a),
							freshNom2((a, b) => {
								return all(
									eq(y, a),
									ezq([x, y, z, a, b], qlvar.q),
								);
							}),
						);
					});
				}),
			),
		).toEqual([
			{
				q: [
					// "?$&0",
					// "?$&1",
					// "?$&2",
					// "?$&1",
					// "?$&2",
					"Nom(0)",
					"Nom(1)",
					"?$&0",
					"Nom(1)",
					"Nom(2)",
				],
			},
		]);
	});
	/**
      (test
       (run1* (q)
        (freshNom (a b)
          (== (tie a `(foo ,a 3 ,b)) q)))
       '((tie-tag a.0 (foo a.0 3 a.1))))
      */
	test("Logic 18", () => {
		expect(
			run1(
				3,
				["q"],
				freshNom2((a, b) => {
					return eq(ezTie(a, ["foo", a, 3, b]), qlvar.q);
				}),
			),
		).toEqual([
			{
				// q: ezTie("?$&0", ["foo", "?$&0", 3, "?$&1"]),
				q: tieTag(qnom[0], ["foo", "Nom(0)", 3, "Nom(1)"]),
			},
		]);
	});
	/**
      (test
        (run1* (q) (freshNom (a b) (== `(foo ,a ,a) `(foo ,b ,b))))
        '())
      */
	test("Logic 19", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => {
					return ezq(["foo", a, a], ["foo", b, b]);
				}),
			),
		).toEqual([]);
	});
	/**
      (test
        (run1* (q) (freshNom (a b) (== (tie a a) (tie b b))))
        '(_.0))
      */
	test("Logic 20", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => {
					return eq(ezTie(a, a), ezTie(b, b));
				}),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	/**
      (test
       (run1* (q) (freshNom (a b) (== (tie a q) (tie b b))))
       '(a.0))
      */
	test("Logic 21", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => {
					return eq(ezTie(a, qlvar.q), ezTie(b, b));
				}),
			),
		).toEqual([
			{
				q: "Nom(0)",
			},
		]);
	});
	/**
      (test
       (run1* (q)
        (fresh (t u)
          (freshNom (a b c d)
            (== `(lam ,(tie a `(lam ,(tie b `(var ,a))))) t)
            (== `(lam ,(tie c `(lam ,(tie d `(var ,c))))) u)
            (== t u))))
       '(_.0))
      */
	test("Logic 22", () => {
		expect(
			run1(
				1,
				["q"],
				fresh2((t, u) => {
					return freshNom4((a, b, c, d) => {
						return all(
							ezq(
								[
									"lam",
									ezTie(a, ["lam", ezTie(b, qvar(a))]),
								],
								t,
							),
							ezq(
								[
									"lam",
									ezTie(c, ["lam", ezTie(d, qvar(c))]),
								],
								u,
							),
							ezq(t, u),
						);
					});
				}),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	/**
      (test
       (run1* (q)
        (fresh (t u)
          (freshNom (a b c d)
            (== `(lam ,(tie a `(lam ,(tie b `(var ,a))))) t)
            (== `(lam ,(tie c `(lam ,(tie d `(var ,d))))) u)
            (== t u))))
       '())
      */
	test("Logic 23", () => {
		expect(
			run1(
				1,
				["q"],
				fresh2((t, u) => {
					return freshNom4((a, b, c, d) => {
						return all(
							ezq(
								[
									"lam",
									ezTie(a, ["lam", ezTie(b, qvar(a))]),
								],
								t,
							),
							ezq(
								[
									"lam",
									ezTie(c, ["lam", ezTie(d, qvar(d))]),
								],
								u,
							),
							ezq(t, u),
						);
					});
				}),
			),
		).toEqual([]);
	});
	/**
      (test
       (run1* (q) (freshNom (a) (hash a a)))
       '())
      */
	test("Logic 24", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom((a) => {
					return availableo(a, a);
				}),
			),
		).toEqual([]);
	});
	/**
      (test
       (run1* (q) (freshNom (a) (hash a 5)))
       '(_.0))
      */
	test("Logic 25", () => {
		expect(
			run1(
				10,
				["q"],
				freshNom((a) => {
					return availableo(a, makeLiteral(5));
				}),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	test("Logic 25p", () => {
		expect(
			run1(
				10,
				["q"],
				// eq(qlvar.x, makeLiteral(2))
				(sc) => [sc],
				// freshNom((a) => {
				//   return availableo(a, makeLiteral(5));
				// }),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	/**
      (test
       (run1* (q) (freshNom (a) (hash a (tie a a))))
       '(_.0))
      */
	test("Logic 26", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom((a) => {
					return availableo(a, ezTie(a, a));
				}),
			),
		).toEqual([
			{
				q: "?q",
			},
		]);
	});
	/**
      (test
       (run1* (q) (freshNom (a b) (hash a (tie b a))))
       '())
      */
	test("Logic 27", () => {
		expect(
			run1(
				1,
				["q"],
				freshNom2((a, b) => {
					return ezq(a, ezTie(b, a));
				}),
			),
		).toEqual([]);
	});
	/**
      (test
       (run1* (k)
        (fresh (t)
          (freshNom (a)
            (hash a k) 
            (== `(5 ,(tie a a) ,t) k))))
       '(((5 (tie-tag a.0 a.0) _.0) : ((a.0 . _.0)))))
      */
	test("Logic 28", () => {
		expect(
			run1(
				1,
				["k"],
				fresh((t) => {
					return freshNom((a) => {
						return all(
							availableo(a, qlvar.k),
							ezq([5, ezTie(a, a), t], qlvar.k),
						);
					});
				}),
			),
		).toEqual([
			{
				k: [5, tieTag(qnom[0], qnom[0]), "?$&0"],
			},
		]);
	});
	/**
      (test
       (run1* (k)
        (fresh (t)
          (freshNom (a)
            (hash a k) 
            (== `(5 ,(tie a a) ,t) k)
            (== `(foo ,a 7) t))))
       '())
      */
	test("Logic 29", () => {
		expect(
			run1(
				1,
				["k"],
				fresh((t) => {
					return freshNom((a) => {
						return all(
							ezq(a, qlvar.k),
							ezq([5, ezTie(a, a), t], qlvar.k),
							ezq(["foo", a, 7], t),
						);
					});
				}),
			),
		).toEqual([]);
	});
	/**
      (test
       (run1* (k)
        (fresh (t)
          (freshNom (a b)
            (== (tie a (tie b t)) k) 
            (hash a t)
            (== `((,a ,b) ,b) t))))
       '())
      */
	test("Logic 30", () => {
		expect(
			run1(
				10,
				["k"],
				fresh((t) => {
					return freshNom2((a, b) => {
						return all(
							eq(ezTie(a, ezTie(b, t)), qlvar.k),
							availableo(a, t),
							ezq([[a, b], b], t),
						);
					});
				}),
			),
		).toEqual([]);
	});

	test("Logic 30p", () => {
		expect(
			run1(
				10,
				["k"],
				fresh((t) => {
					return freshNom2((a, b) => {
						return all(
							availableo(a, t),
							ezq([[a, b], b], t),
						);
					});
				}),
			),
		).toEqual([]);
	});
	/**
      (test
       (run1* (k)
        (fresh (t)
          (freshNom (a b)
            (== (tie a (tie b t)) k) 
            (hash a t)
            (== `(,b ,(tie a `(,a (,b ,b)))) t))))
       '((tie-tag a.0 (tie-tag a.1 (a.1 (tie-tag a.0 (a.0 (a.1 a.1))))))))
      */
	test("Logic 31", () => {
		expect(
			run1(
				1,
				["k"],
				fresh((t) => {
					return freshNom2((a, b) => {
						return all(
							eq(ezTie(a, ezTie(b, t)), qlvar.k),
							availableo(a, t),
							ezq([b, ezTie(a, [a, [b, b]])], t),
						);
					});
				}),
			),
		).toEqual([
			{
				k: tieTag(
					qnom[0],
					tieTag(qnom[1], [
						"Nom(1)",
						tieTag(qnom[0], [
							"Nom(0)",
							["Nom(1)", "Nom(1)"],
						]),
					]),
				),
			},
		]);
	});
	/**
      (test
       (run1* (q)
        (fresh (k1 k2 t u)
          (freshNom (a b c d)
            (== (tie a (tie b t)) k1) 
            (hash a t)
            (== (tie c (tie d u)) k2)
            (hash c u)
            (== k1 k2)
            (== `(,k1 ,k2) q))))
       '((((tie-tag a.0 (tie-tag a.1 (susp-tag ((a.1 a.2) (a.0 a.3)) _.0)))
          (tie-tag a.3 (tie-tag a.2 _.0)))
         :
         ((a.3 . _.0) (a.1 . _.0) (a.0 . _.0)))))
       */
	test("Logic 32", () => {
		expect(
			run1(
				1,
				["q"],
				fresh4((k1, k2, t, u) => {
					return freshNom4((a, b, c, d) => {
						return all(
							eq(ezTie(a, ezTie(b, t)), k1),
							availableo(a, t),
							eq(ezTie(c, ezTie(d, u)), k2),
							availableo(c, u),
							eq(k1, k2),
							ezq([k1, k2], qlvar.q),
						);
					});
				}),
			),
		).toEqual([
			{
				q: [
					tieTag(
						qnom[0],
						tieTag(
							qnom[1],
							suspTag(
								qnom[1],
								qnom[2],
								suspTag(qnom[0], qnom[3], "?$&0"),
							),
						),
					),
					tieTag(
						qnom[3],
						tieTag(
							qnom[2],
							"?$&0",
							// suspTag(
							//   qnom[1], qnom[3],
							//   suspTag(
							//     qnom[0], qnom[2],
							//     "?$&4"
							//   )
							// )
						),
					),
				],
			},
		]);
	});
	/**
      (test
       (run1* (q)
        (fresh (k1 k2 t u)
          (freshNom (a b c d)
            (== (tie a (tie b t)) k1) 
            (hash a t)
            (== `(,b ,b) t)
            (== (tie c (tie d u)) k2)
            (hash c u)
            (== `(,d ,d) u)
            (== k1 k2)
            (== `(,k1 ,k2) q))))
       '(((tie-tag a.0 (tie-tag a.1 (a.1 a.1)))
          (tie-tag a.2 (tie-tag a.3 (a.3 a.3))))))
      */
	test("Logic 33", () => {
		expect(
			run1(
				1,
				["q"],
				fresh4((k1, k2, t, u) => {
					return freshNom4((a, b, c, d) => {
						return all(
							eq(ezTie(a, ezTie(b, t)), k1),
							availableo(a, t),
							ezq([b, b], t),
							eq(ezTie(c, ezTie(d, u)), k2),
							availableo(c, u),
							ezq([d, d], u),
							eq(k1, k2),
							ezq([k1, k2], qlvar.q),
						);
					});
				}),
			),
		).toEqual([
			{
				q: [
					tieTag(
						qnom[0],
						tieTag(qnom[1], makeList([qnom[1], qnom[1]])),
					),
					// tieTag(qnom[2], tieTag(qnom[3], makeList([qnom[3], qnom[3]]))),
					// tieTag(qnom[0], tieTag(qnom[1], makeList([qnom[1], qnom[1]]))),
					tieTag(
						qnom[2],
						tieTag(qnom[3], makeList([qnom[3], qnom[3]])),
					),
				],
			},
		]);
	});
	/**
      (test
       (run1* (q)
         (freshNom (a b)
           (fresh (x y)
             (== (tie a (tie a x)) (tie a (tie b y)))
             (== `(,x ,y) q))))
       '((((susp-tag ((a.0 a.1)) _.0) _.0) : ((a.0 . _.0)))))
      */
	test("Logic 34", () => {
		expect(
			run1(
				7,
				["q"],
				freshNom2((a, b) => {
					return fresh2((x, y) => {
						return all(
							eq(
								ezTie(a, ezTie(a, x)),
								ezTie(a, ezTie(b, y)),
							),
							ezq([x, y], qlvar.q),
						);
					});
				}),
			),
		).toEqual([
			{
				q: [
					// tieTag(qnom.a0, qapp(qnom.a0, qnom.a1)),
					suspTag(qnom[0], qnom[1], "?$&0"),
					"?$&0",
				],
			},
		]);
	});
	/**
      (test 
       (run1* (q)
        (freshNom (a b)
          (fresh (x y)
            (conde
              ((== (tie a (tie b `(,x ,b))) (tie b (tie a `(,a ,x)))))
              ((== (tie a (tie b `(,y ,b))) (tie b (tie a `(,a ,x)))))
              ((== (tie a (tie b `(,b ,y))) (tie b (tie a `(,a ,x)))))
              ((== (tie a (tie b `(,b ,y))) (tie a (tie a `(,a ,x))))))
            (== `(,x ,y) q))))
       '((a.0 a.1)
        (_.0 (susp-tag ((a.0 a.1)) _.0))
        ((_.0 (susp-tag ((a.0 a.1)) _.0)) : ((a.0 . _.0)))))
      
      */

	test("Logic 35p", () => {
		expect(
			run1(
				4,
				["q"],
				freshNom2((a, b) => {
					return fresh2((x, y) => {
						return all(
							either(
								ezq(
									ezTie(a, ezTie(b, [x, b])),
									ezTie(b, ezTie(a, [a, x])),
								),
								ezq(
									ezTie(a, ezTie(b, [y, b])),
									ezTie(b, ezTie(a, [a, x])),
								),
								ezq(
									ezTie(a, ezTie(b, [b, y])),
									ezTie(b, ezTie(a, [a, x])),
								),
								ezq(
									ezTie(a, ezTie(b, [b, y])),
									ezTie(a, ezTie(a, [a, x])),
								),
							),
							ezq([x, y], qlvar.q),
						);
					});
				}),
			),
		).toEqual([
			// {
			//   q: [qnom[1].cleanOutput(), "?$&1"],
			// },
			// {
			//   // q: [qnom[1], qnom[2]],
			//   q: [qnom[0].cleanOutput(), qnom[1].cleanOutput()],
			// },

			{
				q: ["Nom(0)", "Nom(1)"],
			},
			{
				q: ["?$&0", suspTag(qnom[0], qnom[1], "?$&0")],
			},
			{
				q: ["?$&0", suspTag(qnom[0], qnom[1], "?$&0")],
			},
		]);
	});
});
