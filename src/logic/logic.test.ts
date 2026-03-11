import type * as trm from "./terms";
import { expect, it as test, describe } from "@jest/globals";
import { makeList, makeLiteral, makePair, makeTie, qlvar, qnom } from "./makelvar";
import { all, eq, run1 } from "./index";
import { fresh, fresh2, fresh3, freshNom, freshNom2, freshNom3 } from "./AnyFreshFn";
import { ezIn, ezq, ezTie } from "./ezeq";
import { availableo } from "./availableo";
import { qvar, qlam, qapp, tieTag, qlam2, qapp2, qvar2, betao, stepo, suspTag, substo7, lamTie } from "./testutils";

const qappVV = (a: trm.LTerm, b: trm.LTerm) => qapp(qvar(a), qvar(b));

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];
const a4 = qnom[4 + 0];
describe("checktk", () => {


  // Ensure that lvars being eq to structures that contain them are handled correctly
  test("Lvars properly handled", () => {
    const output = run1(
      1,
      ["x"],
      fresh((x) => {
        return eq(x,
          makeList([
            makeLiteral("a"),
            x
          ])
        );
      }),
    );
    expect(output).toHaveLength(0);
    const output2 = run1(
      1,
      ["x"],
      fresh((x) => {
        return eq(
          makeList([
            makeLiteral("a"),
            x
          ]),
          x
        );
      }),
    );
    expect(output2).toHaveLength(0);
    const output3 = run1(
      1,
      ["x"],
      fresh((x) => {
        return eq(
          x,
          x
        );
      }),
    );
    expect(output3).toHaveLength(1);
  });

  test("Lvars-X-Suspensions properly handled", () => {
    const output = run1(
      1,
      ["x"],
      fresh3((x, y, k) => {
        return freshNom2((z, j) => {
          return all(
            eq(
              makeTie(z, x),
              makeTie(j, y),
            ),
            eq(
              x,
              k
            )
          )
        })
      }),
    );
    expect(output).toHaveLength(1);
    const output2 = run1(
      1,
      ["x"],
      fresh3((x, y, k) => {
        return freshNom2((z, j) => {
          return all(
            eq(
              makeTie(z, x),
              makeTie(j, y),
            ),
            eq(
              k,
              x
            )
          )
        })
      }),
    );
    expect(output2).toHaveLength(1);
  });

  test("Self-Similar Suspensions properly handled", () => {
    const output = run1(
      1,
      ["x"],
      fresh3((x, y, k) => {
        return freshNom2((z, j) => {
          return all(
            eq(
              makeTie(z, x),
              makeTie(j, x),
            ),
            eq(
              x,
              makePair(z, j)
            )
          )
        })
      }),
    );
    expect(output).toHaveLength(0);
    const output2 = run1(
      1,
      ["x"],
      fresh3((x, y, k) => {
        return freshNom2((z, j) => {
          return all(
            eq(
              makeTie(z, x),
              y
            ),
            eq(
              makeTie(j, x),
              y
            ),
            eq(
              makePair(z, j),
              x
            )
          )
        })
      }),
    );
    expect(output2).toHaveLength(0);
  });


  /**
      (test
       (run* (x)
        (freshNom (a b)
          (substo (tie b `(lam ,(tie a `(var ,b)))) `(var ,a) x)))
       '((lam (tie-tag a.0 (var a.1)))))
      */
  test("Logic 36", () => {
    const output = run1(
      1,
      ["x"],
      freshNom2((a, b) => {
        return substo7(
          ezTie(b, lamTie(a, qvar(b))),
          qvar(a),
          qlvar.x
        );
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        x: qlam2(
          tieTag(
            a0, qvar(a1)
          )
        ),
      },
    ]);
  });
  /**
      (test 
       (run* (q)
        (freshNom (a b)
          (substo
           (tie a `(lam ,(tie a `(app (var ,a) (var ,b))))) b q)))
       '((lam (tie-tag a.0 (app (var a.0) (var a.1))))))
      */
  test("Logic 37", () => {

    const output = run1(
      1,
      ["q"],
      freshNom2((a, b) => {
        return substo7(
          ezTie(a, lamTie(a, qappVV(a, b))),
          b,
          qlvar.q
        );
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        q: qlam2(tieTag(a0, qapp(qvar(a0), qvar(a1)))),
      },
    ]);

  });
  /**
      (test
       (run 10 (q)
         (fresh (id/tm E out)
           (substo id/tm E out)
           (== `(,id/tm ,E ,out) q)))
       '(((tie-tag a.0 (var a.0)) _.0 _.0)
         (((tie-tag a.0 (var _.0)) _.1 (var _.0)) : ((a.0 . _.0)))
         (((tie-tag a.0 (lam (tie-tag a.1 (var a.0)))) _.0
           (lam (tie-tag a.1 _.0)))
          : ((a.1 . _.0)))
         (((tie-tag a.0
                    (lam (tie-tag a.1 (var (susp-tag ((a.2 a.0)) _.0)))))
           _.1 (lam (tie-tag a.1 (var _.0))))
          : ((a.1 . _.1) (a.2 . _.0) (a.0 . _.0)))
         ((tie-tag a.0 (app (var a.0) (var a.0))) _.0 (app _.0 _.0))


         (((tie-tag a.0
                    (lam (tie-tag a.1 (lam (tie-tag a.2 (var a.0))))))
           _.0 (lam (tie-tag a.1 (lam (tie-tag a.2 _.0)))))
          : ((a.1 . _.0) (a.2 . _.0)))


         (((tie-tag a.0
                    (app (var a.0) (var (susp-tag ((a.1 a.0)) _.0))))
           _.1 (app _.1 (var _.0)))
          : ((a.1 . _.0) (a.0 . _.0)))



         (((tie-tag a.0
                    (app (var (susp-tag ((a.1 a.0)) _.0)) (var a.0)))
           _.1 (app (var _.0) _.1))
          : ((a.1 . _.0) (a.0 . _.0)))




         (((tie-tag a.0
                    (lam
                     (tie-tag a.1
                              (lam
                               (tie-tag a.2
                                        (var (susp-tag ((a.3 a.0) (a.4 a.3)) _.0)))))))
           _.1 (lam (tie-tag a.1 (lam (tie-tag a.2 (var _.0))))))
          :
          ((a.1 . _.1) (a.2 . _.1) (a.0 . _.0) (a.4 . _.0)
           (a.3 . _.0)))




         (((tie-tag a.0
                    (lam (tie-tag a.1 (app (var a.0) (var a.0)))))
           _.0 (lam (tie-tag a.1 (app _.0 _.0))))
          : ((a.1 . _.0)))))
      
      */
  test("Logic 38", () => {

    const ooo16 = run1(
      10,
      ["q"],
      fresh3((idtm, E, out) => {
        return all(
          substo7(idtm, E, out),
          ezq([idtm, E, out], qlvar.q)
        );
      }));
    expect(ooo16).toHaveLength(10);
    expect(ooo16[0]).toEqual(
      {
        q: [
          tieTag(a0, qvar(a0)),
          "?$&0",
          "?$&0",
        ],
      });
    expect(ooo16[1]).toEqual(
      {
        q: [
          tieTag(a0, qvar2("?$&0")),
          "?$&1",
          qvar2("?$&0"),
        ],
      });
    expect(ooo16[2]).toEqual(
      {
        q: [
          tieTag(a0, qlam2(tieTag(a1, qvar(a0)))),
          "?$&0",
          qlam2(tieTag(a1, "?$&0")),
        ],
      });
    /**
     *          (((tie-tag a.0
                  (lam (tie-tag a.1 (var (susp-tag ((a.2 a.0)) _.0)))))
         _.1 (lam (tie-tag a.1 (var _.0))))
        : ((a.1 . _.1) (a.2 . _.0) (a.0 . _.0)))
     */
    expect(ooo16[3]).toEqual(
      {
        q: [
          tieTag(a0,
            qlam2(tieTag(a1, qvar2(
              suspTag(a2, a0, "?$&0")
            ))
            )
          ),
          "?$&1",
          // qapp2("?$&0", "?$&0"),
          qlam2(tieTag(a1, qvar2("?$&0"))),
        ],
      });
    // {
    //   q: [
    //     tieTag(a0, qlam2(tieTag(a1, qvar2(
    //       suspTag(a2, a0, "?$&0")
    //     )))),
    //     "?$&2",
    //     qlam2(tieTag(a1, qvar2("?$&0"))),
    //   ],
    // },
    /**
       ((tie-tag a.0 (app (var a.0) (var a.0))) _.0 (app _.0 _.0))
     * 
     */
    expect(ooo16[4]).toEqual(
      {
        q: [
          tieTag(a0, qapp2(qvar2(
            // suspTag(a1, a0, "?$&0")
            a0
          ),
            qvar(a0)
          )),
          "?$&0",
          // qlam2(tieTag(a1, "?$&4")),
          qapp2(
            "?$&0",
            "?$&0"
          )
        ],
      });
    /**
     *          (((tie-tag a.0
                  (lam (tie-tag a.1 (lam (tie-tag a.2 (var a.0))))))
         _.0 (lam (tie-tag a.1 (lam (tie-tag a.2 _.0)))))
        : ((a.1 . _.0) (a.2 . _.0)))
     */
    expect(ooo16[5]).toEqual(
      {
        q: [
          tieTag(a0,
            qlam2(
              tieTag(a1,
                qlam2(
                  tieTag(a2,
                    qvar2(a0)
                  )
                )
              ))),
          "?$&0",
          qlam2(
            tieTag(a1,
              qlam2(
                tieTag(a2, "?$&0")
              ))),
        ],
      });
    /**
     *          (((tie-tag a.0
                  (app (var a.0) (var (susp-tag ((a.1 a.0)) _.0))))
         _.1 (app _.1 (var _.0)))
        : ((a.1 . _.0) (a.0 . _.0)))
     */
    expect(ooo16[6]).toEqual(
      {
        q: [
          tieTag(a0,
            qapp2(
              qvar(a0),
              qvar2(
                suspTag(a1, a0, "?$&0")
              )
              // qlam2(tieTag(a2, qvar(a0))),
            )
          ),
          "?$&1",
          qapp2(
            // qlam2(tieTag(a2, "?$&6")),
            "?$&1",
            qvar2("?$&0")
          ),
        ],
      });
    /**
     *          (((tie-tag a.0
                  (app (var (susp-tag ((a.1 a.0)) _.0)) (var a.0)))
         _.1 (app (var _.0) _.1))
        : ((a.1 . _.0) (a.0 . _.0)))

     */
    expect(ooo16[7]).toEqual(
      {
        q: [
          tieTag(a0,
            qapp2(
              qvar2(
                suspTag(a1, a0, "?$&0")
              ),
              qvar(a0)
            )
          ),
          "?$&1",
          qapp2(
            qvar2("?$&0"),
            "?$&1"
          ),
          // qlam2(tieTag(a1, qapp2("?$&9", "?$&9"))),
        ],
      });
    /**
     *          (((tie-tag a.0
                  (lam
                   (tie-tag a.1
                            (lam
                             (tie-tag a.2
                                      (var (susp-tag ((a.3 a.0) (a.4 a.3)) _.0)))))))
         _.1 (lam (tie-tag a.1 (lam (tie-tag a.2 (var _.0))))))
        :
        ((a.1 . _.1) (a.2 . _.1) (a.0 . _.0) (a.4 . _.0)
         (a.3 . _.0)))
     */
    expect(ooo16[8]).toEqual(
      {
        q: [
          tieTag(a0, qlam2(tieTag(a1,
            qlam2(tieTag(a2,
              qvar2(
                suspTag(a3, a0, suspTag(a4, a3, "?$&0"))
              )
            ))
          )
          )
          ),
          "?$&1",
          qlam2(tieTag(a1, qlam2(tieTag(a2, qvar2("?$&0"))))),
        ],
      },
    );
    /**
     *          (((tie-tag a.0
                    (lam (tie-tag a.1 (app (var a.0) (var a.0)))))
           _.0 (lam (tie-tag a.1 (app _.0 _.0))))
          : ((a.1 . _.0)))))
     */
    expect(ooo16[9]).toEqual(
      {
        q: [
          tieTag(a0, qlam2(tieTag(a1,
            qapp2(qvar2(a0), qvar2(a0))
          ))),
          "?$&0",
          qlam2(tieTag(a1, qapp2("?$&0", "?$&0"))),
        ],
      },
    );

  });
  /**
  
      (test
       (run* (q)
         (freshNom (a b)
           (betao `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) q)))
       '((lam (tie-tag a.0 (var a.1)))))
      */
  test("Beta 38", () => {
    expect(
      run1(
        1,
        ["q"],
        freshNom2((a, b) => {
          return betao(
            // ezIn(["app", ["lam", ezTie(a, ["lam", ezTie(b, qvar(a))])], qvar(b), qlvar.q]),
            qapp(
              qlam(makeTie(a, qlam(makeTie(b, qvar(a))))),
              qvar(b)
            ),
            qlvar.q
          );
        }),
      )
    ).toEqual([
      {
        q: qlam2(tieTag(a0, qvar(a1)))
      },
    ]);


  });
  /**
 ;; ?beta (app (lam (a\ lam (b\ var a))) (var b)) (lam (c\var b)).
 (test "39"
  (run* (q)
    (freshNom (a b c)
      (betao `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) `(lam ,(tie c `(var ,b))))))
  '(_.0))
 */
  test("Beta 39", () => {
    expect(
      run1(
        5,
        ["q"],
        freshNom3((a, b, c) => {
          return betao(
            // ezIn(["app", ["lam", ezTie(a, ["lam", ezTie(b, qvar(a))])], qvar(b), lamTie(c, qvar(b))]),
            qapp(
              qlam(makeTie(a, qlam(makeTie(b, qvar(a))))),
              qvar(b)
            ),
            // qlvar.q
            qlam(makeTie(c, qvar(b)))
          );
        }),
      )
    ).toEqual([
      {
        q: "?q",
      },
    ]);

  });
  /**    
 ;; ?beta (app (lam (a\ lam (b\ var a))) (var b)) (lam (b\var b)).
 (test "40"
  (run* (q)
    (freshNom (a b)
      (betao `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) `(lam ,(tie b `(var ,b))))))
  '())
    */
  test("Beta 40", () => {
    expect(
      run1(
        10,
        ["q"],
        freshNom2((a, b) => {
          return betao(
            ezIn(["app", ["lam", ezTie(a, ["lam", ezTie(b, qvar(a))])], qvar(b)]),
            lamTie(b, qvar(b))
          );
        }),
      )
    ).toEqual([]);

  });
  /** 
      ;; ?beta (app (lam (a\ lam (b\ var a))) (var b)) (lam (b\var a)).
      (test "41"
       (run* (q)
         (freshNom (a b)
           (betao `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) `(lam ,(tie b `(var ,a))))))
       '())
      
      */
  test("Beta 41", () => {
    expect(
      run1(
        10,
        ["q"],
        freshNom2((a, b) => {
          return betao(
            ezIn(["app", ["lam", ezTie(a, ["lam", ezTie(b, qvar(a))])], qvar(b)]),
            lamTie(b, qvar(a))
          );
        }),
      )
    ).toEqual([]);
  });
  /**
      (test
       (run 3 (q)
         (fresh (t1 t2)
           (betao t1 t2)
           (== `(,t1 ,t2) q)))
       '(((app (lam (tie-tag a.0 (var a.0))) _.0) _.0)
         (((app
            (lam (tie-tag a.0 (var (susp-tag ((a.1 a.0)) _.0))))
            _.1)
           (var _.0))
          : ((a.1 . _.0) (a.0 . _.0)))
         (((app (lam (tie-tag a.0 (lam (tie-tag a.1 (var a.0)))))
                _.0)
           (lam (tie-tag a.1 _.0)))
          : ((a.1 . _.0)))))
      */
  test("Logic 43", () => {
    const output = run1(
      3,
      ["q1", "q2"],
      fresh2((t1, t2) => {
        return all(
          // eq(ezIn([t1, t2]), qlvar.q)
          eq(qlvar.q1, t1),
          eq(qlvar.q2, t2),
          betao(t1, t2),
        );
      }),
    );
    expect(output).toHaveLength(3);

    expect(
      output
    ).toEqual([
      {
        q1: qapp2(
          qlam2(tieTag(a0, qvar(a0))),
          "?$&0"
        ),
        q2: "?$&0",
      },
      {
        q1: qapp2(
          qlam2(tieTag(a0,
            qvar2(
              suspTag(
                a1,
                a0,
                "?$&0"
              )
            )
          )),
          "?$&1"
        ),
        q2: qvar2(
          "?$&0"
        ),
      },
      {
        q1: qapp2(
          qlam2(tieTag(a0, qlam2(tieTag(a1,
            qvar2(
              a0
            )
          )))),
          "?$&0"
        ),
        q2: qlam2(tieTag(a1, "?$&0")),
      },
    ]);
  });



  /**
      (test
       (run* (q)
         (freshNom (a b)
           (stepo `(app (lam ,(tie a `(lam ,(tie b `(var ,a))))) (var ,b)) q)))
       '((lam (tie-tag a.0 (var a.1)))))
  */
  test("Logic 44", () => {
    const output = run1(
      1,
      ["q"],
      freshNom2((a, b) => {
        return stepo(
          // ezIn(["app", ["lam", ezTie(a, ["lam", ezTie(b, qvar(a))])], qvar(b)]),
          qapp(
            lamTie(a, lamTie(b, qvar(a))),
            qvar(b)
          ),
          qlvar.q
        );
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        q: qlam2(
          tieTag(
            a0,
            qvar(a1)
          )
        ),
      },
    ]);
  });
  /**
      ;;; generate a quine (Omega)
      (test "44"
       (run 1 (Q)
         (freshNom (z)
           (hash z Q)
           (stepo Q Q)))
       '((app (lam (tie-tag a.0 (app (var a.0) (var a.0))))
              (lam (tie-tag a.0 (app (var a.0) (var a.0)))))))
  
  */
  test("Generate a Quine (Omega)", () => {
    const output = run1(
      1,
      ["Q"],
      freshNom((z) => {
        return all(
          availableo(z, qlvar.Q),
          stepo(qlvar.Q, qlvar.Q),
        );
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        Q: qapp2(
          qlam2(tieTag(a0, qapp(qvar(a0), qvar(a0)))),
          qlam2(tieTag(a0, qapp(qvar(a0), qvar(a0)))),
          // qlam2(tieTag(a1, qapp(qvar(a1), qvar(a1)))),
        )
      },
    ]);
  });


  /**
      (test
       (run* (t)
         (fresh (Y)
           (freshNom (f x g)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash g Y)
             (betao `(app ,Y (var ,g)) t))))
       '((app
          (lam
           (tie-tag a.0 (app (var a.1) (app (var a.0) (var a.0)))))
          (lam
           (tie-tag a.2 (app (var a.1) (app (var a.2) (var a.2))))))))
                                               
        ;; Y combinator
        ;;
        ;; Yx = x(Yx)
        
        ;; Y = λf.(λx.f (x x)) (λx.f (x x))
      */
  test("Logic 52: Y combinator", () => {
    const output = run1(
      1,
      ["t"],
      fresh((Y) => {
        return freshNom3((f, x, g) => {
          return all(
            eq(
              lamTie(f,

                qapp(
                  lamTie(x, qapp(qvar(f), qappVV(x, x))),
                  lamTie(x, qapp(qvar(f), qappVV(x, x))))
              ),
              Y
            ),
            availableo(g, Y),
            betao(qapp(Y, qvar(g)), qlvar.t)
          );
        });
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        t: qapp2(
          qlam2(tieTag(a0, qapp(qvar(a1),
            qappVV(a0, a0)
          ))),
          qlam2(tieTag(a2, qapp(qvar(a1),
            qappVV(a2, a2)
          ))
          )
        ),
      },
    ]);
  });
  /**
      (test
       (run* (t)
         (fresh (Y t1)
           (freshNom (f x g)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash g Y)
             (betao `(app ,Y (var ,g)) t1)
             (betao t1 t))))
       '((app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))))))
      
      */
  test("Logic 53: Y Combinator", () => {
    expect(
      run1(
        1,
        ["t"],
        fresh2((Y, t1) => {
          return freshNom3((f, x, g) => {
            return all(
              // eq(ezTie(f, qapp(lamTie(x, qapp(qvar(f), qappVV(x, x)))), lamTie(x, qapp(qvar(f), qappVV(x, x)))), Y),
              eq(
                qlam(
                  ezTie(
                    f,
                    qapp(
                      lamTie(x, qapp(qvar(f), qappVV(x, x))),
                      lamTie(x, qapp(qvar(f), qappVV(x, x))
                      )
                    )
                  )
                ),
                Y
              ),
              availableo(g, Y),
              betao(qapp(Y, qvar(g)), t1),
              betao(t1, qlvar.t)
            );
          });
        }),
      )
    ).toEqual([
      {
        t: qapp2(
          qvar2(a0),
          qapp2(
            // qlam2(tieTag(qnom[13], qapp(qvar(a2), qapp(qvar(qnom[13]), qvar(qnom[13]))))),
            qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))),
            // qlam2(tieTag(qnom[13], qapp(qvar(a2), qapp(qvar(qnom[13]), qvar(qnom[13]))))
            qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))),
          )
          // ),
        ),

      },
    ]);

  });
  /**
      (test
       (run 1 (q)
         (fresh (Y t1 t2)
           (freshNom (f x g)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash g Y)
             (betao `(app ,Y (var ,g)) t1)
             (betao t1 t2)
             (== `(,t1 ,t2) q))))
       '(((app
           (lam
            (tie-tag a.0 (app (var a.1) (app (var a.0) (var a.0)))))
           (lam
            (tie-tag a.2 (app (var a.1) (app (var a.2) (var a.2))))))
          (app (var a.1)
               (app
                (lam
                 (tie-tag a.2
                          (app (var a.1) (app (var a.2) (var a.2)))))
                (lam
                 (tie-tag a.2
                          (app (var a.1) (app (var a.2) (var a.2))))))))))
      */
  test("Logic 54: Y combinator", () => {
    expect(
      run1(
        1,
        ["q"],
        fresh3((Y, t1, t2) => {
          return freshNom3((f, x, g) => {
            return all(
              eq(
                qlam(
                  ezTie(
                    f,
                    qapp(
                      lamTie(x, qapp(qvar(f), qappVV(x, x))),
                      lamTie(x, qapp(qvar(f), qappVV(x, x))
                      )
                    )
                  )
                ),
                Y,
              ),
              availableo(g, Y),
              betao(qapp(Y, qvar(g)), t1),
              betao(t1, t2),
              ezq([t1, t2], qlvar.q)
            );
          });
        }),
      )
    ).toEqual([
      {
        q: [
          qapp2(
            qlam2(tieTag(a0, qapp(qvar(a1), qapp(qvar(a0), qvar(a0))))),
            qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),
          ),
          qapp2(
            qvar2("Nom(1)"),
            qapp2(
              qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),
              qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),
            )
          ),
        ],
      }
    ]);
  });

  test("Logic 55p: Y combinator", () => {
    const output1 = fresh3((Y, t1, t2) => {
      return freshNom3((f, x, g) => {
        return all(
          eq(
            qlam(
              ezTie(
                f,
                qapp(
                  lamTie(x, qapp(qvar(f), qappVV(x, x))),
                  lamTie(x, qapp(qvar(f), qappVV(x, x))
                  )
                )
              )
            ),
            Y,
          ),
          availableo(g, Y),
          betao(qapp(Y, qvar(g)), qlvar.qa),
          betao(qlvar.qa, qlvar.qb)
        );
      });
    });
    const output = run1(
      1,
      ["qa", "qb"],
      output1
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        qa: qapp2(
          qlam2(tieTag(a0, qapp(qvar(a1), qapp(qvar(a0), qvar(a0))))),
          // qlam2(tieTag(qnom[13], qapp(qvar(a2), qapp(qvar(qnom[13]), qvar(qnom[13])))))
          qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),
        ),
        qb: qapp2(
          qvar2("Nom(1)"),
          qapp2(
            // qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
            qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),
            // qlam2(tieTag(qnom[13], qapp(qvar(a2), qappVV(qnom[13], qnom[13]))))
            // qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
            qlam2(tieTag(a2, qapp(qvar(a1), qappVV(a2, a2)))),

          )
        )
      }
    ]);
  });

  /**
      (test
       (run 1 (q)
         (fresh (t1 t2)
           (freshNom (x y z)
             (==
              `(app (var ,x)
                    (app
                     (lam
                      ,(tie y
                            `(app (var ,x) (app (var ,y) (var ,y)))))
                     (lam
                      ,(tie z
                            `(app (var ,x) (app (var ,z) (var ,z)))))))
              t1)
             (==
              `(app (var ,x)
                    (app
                     (lam
                      ,(tie y
                            `(app (var ,x) (app (var ,y) (var ,y)))))
                     (lam
                      ,(tie y
                            `(app (var ,x) (app (var ,y) (var ,y)))))))
              t2)
             (== t1 t2)
             (== `((t1: ,t1) (t2: ,t2)) q))))
       '(((t1:
           (app (var a.0)
                (app
                 (lam
                  (tie-tag a.1
                           (app (var a.0) (app (var a.1) (var a.1)))))
                 (lam
                  (tie-tag a.2
                           (app (var a.0) (app (var a.2) (var a.2))))))))
          (t2:
           (app (var a.0)
                (app
                 (lam
                  (tie-tag a.1
                           (app (var a.0) (app (var a.1) (var a.1)))))
                 (lam
                  (tie-tag a.1
                           (app (var a.0) (app (var a.1) (var a.1)))))))))))
      
      */
  test("Logic 63", () => {
    expect(
      run1(
        1,
        ["q"],
        fresh2((t1, t2) => {
          return freshNom3((x, y, z) => {
            return all(
              eq(
                // ezIn(
                //   ["app", qvar(x),
                //     ["app",
                //       lamTie(y, ["app", qvar(x), ["app", qvar(y), qvar(y)]]),

                //       lamTie(z, ["app", qvar(x), ["app", qvar(z), qvar(z)]])
                //     ]
                //   ]
                // ),
                qapp(
                  qvar(x),
                  qapp(
                    qlam(
                      ezTie(y, qapp(qvar(x), qappVV(y, y))),
                    ),
                    lamTie(z, qapp(qvar(x), qappVV(z, z)))
                  ),
                ),
                t1
              ),
              eq(
                qapp(
                  qvar(x),
                  qapp(
                    qlam(
                      ezTie(y, qapp(qvar(x), qappVV(y, y))),
                    ),
                    lamTie(y, qapp(qvar(x), qappVV(y, y)))
                  ),
                ),
                t2
              ),
              eq(t1, t2),
              ezq([["t1", t1], ["t2", t2]], qlvar.q)
            );
          });
        }),
      )
    ).toEqual([


      {
        q: [
          ["t1", qapp2(
            qvar2("Nom(0)"),
            qapp2(
              qlam2(tieTag(a1,

                qapp2(qvar2(a0), qappVV(a1, a1).cleanOutput()),

              )),
              qlam2(tieTag(a2,

                qapp2(qvar2(a0), qappVV(a2, a2).cleanOutput()),

              )),

            ),
          )],
          ["t2", qapp2(
            qvar2("Nom(0)"),

            qapp2(

              qlam2(
                tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))
              ),
              qlam2(
                tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))
              )
            )
          )],
        ]
      }
    ]);
  });



});