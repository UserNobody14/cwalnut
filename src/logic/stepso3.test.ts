import { describe, expect, it as test } from "@jest/globals";
import { qlvar, qnom } from './makelvar';
import { all, eq, run1 } from './index';
import { fresh, fresh2, fresh3, freshNom3 } from "./AnyFreshFn";
import { ezIn, ezq, ezTie } from './ezeq';
import { availableo } from "./availableo";
import { qvar, qlam, qapp, tieTag, qlam2, qapp2, qvar2, qappVV, stepso } from './testutils';

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
describe("stepso3", () =>{


  /**
      (test
       (run1 1 (t)
         (fresh (Y)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t)
             (stepso `(app ,Y (var ,z)) t))))
       '((app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))
               (lam
                (tie-tag a.2
                         (app (var a.0) (app (var a.2) (var a.2)))))))))
      
      */
  test("Logic 56", () => {
    const output = run1(
      1,
      ["t"],
      fresh((Y) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(

              qlam(
                ezTie(
                  f,
                  qapp(
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x))))
                  )
                )
              )
              , Y),
            availableo(z, Y),
            stepso(
              qapp(qvar(z), qapp(Y, qvar(z)))
              , qlvar.t),
            stepso(qapp(Y, qvar(z)), qlvar.t)
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
          qvar2(a0),
          qapp2(
            qlam2(
              tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))
            ),
            qlam2(
              tieTag(a2, qapp2(qvar2(a0), qappVV(a2, a2)))
            )
          )
        )
      },
    ]);

  });
  /**
      (test
       (run1 1 (Y)
         (fresh (t)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t)
             (stepso `(app ,Y (var ,z)) t))))
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
  test("Logic 57: Y combinator", () => {
    const output = run1(
      1,
      ["Y"],
      fresh((t) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              qlvar.Y,

              qlam(ezTie(f, qapp(
                qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                qlam(ezTie(x, qapp(qvar(f), qappVV(x, x))))
              )
              ))

            ),
            availableo(z, qlvar.Y),
            stepso(
              qapp(qvar(z), qapp(qlvar.Y, qvar(z)))
              , t),
            stepso(qapp(qlvar.Y, qvar(z)), t)
          );
        });
      }),
    );
    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        Y: qlam2(
          tieTag(a0, qapp2(
            qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))),
            qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))
            )
          )
          )
        
        )
      }
    ]);

  });
  /**
      (test
       (run1 1 (Y)
         (fresh (t E)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) ,E))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t)
             (stepso `(app ,Y (var ,z)) t))))
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
  test.skip("Logic 58: Y combinator", () => {
    const output = run1(
      1,
      ["Y"],
      fresh2((t, E) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              qlam(
                ezTie(f, qapp(

                  qlam(ezTie(x, qapp(qvar(f), qapp(qvar(x), E)))),
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))))),
              ),
              qlvar.Y
            ),
            availableo(z, qlvar.Y),
            stepso(qapp(qvar(z), qapp(qlvar.Y, qvar(z))), t),
            stepso(qapp(qlvar.Y, qvar(z)), t)
          );
        });
      }),
      100000
    );

    expect(output).toHaveLength(1);

    expect(
      output
    ).toEqual([
      {
        Y: qlam2(
          tieTag(a0, qapp2(

            qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))),
              qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))
              )
            )
          )
        )
      },
    ]);
  });
  /**
      (test
       (run1 1 (Y)
         (fresh (t E)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) ,E)))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t)
             (stepso `(app ,Y (var ,z)) t))))
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
  test.skip("Logic 59: Y combinator", () => {
    const output = run1(
      1,
      ["Y"],
      fresh2((t, E) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              qlam(
                ezTie(f, qapp(
                  qlam(ezTie(x, qapp(qvar(f), E))),
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x))))
                ))
              ),
              qlvar.Y
            ),
            availableo(z, qlvar.Y),
            stepso(
              qapp(qvar(z), qapp(qlvar.Y, qvar(z)))
              , t),
            stepso(
              qapp(qlvar.Y, qvar(z))
              , t)
          );
        });
      }),
      100000
    );

    expect(output).toHaveLength(1);
    expect(
      output
    ).toEqual([
      {
        Y: qlam2(
          tieTag(a0, qapp2(
            qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))),
            qlam2(tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1))))
            )
          )
        )
      },
    ]);
  });
  /**
      (test
       (run1 1 (q)
         (fresh (Y t1 t2)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t1)
             (stepso `(app ,Y (var ,z)) t2)
             (== `((t1: ,t1) (t2: ,t2)) q))))
       '(((t1:
          (app (var a.0)
            (app
              (lam
                (tie-tag a.1
                  (app
                    (lam
                      (tie-tag a.2
                        (app (var a.1) (app (var a.2) (var a.2)))))
                    (lam
                      (tie-tag a.2
                        (app (var a.1) (app (var a.2) (var a.2))))))))
              (var a.0))))
         (t2:
           (app
             (lam
               (tie-tag a.1
                 (app
                   (lam
                     (tie-tag a.2
                       (app (var a.1) (app (var a.2) (var a.2)))))
                   (lam
                     (tie-tag a.2
                       (app (var a.1) (app (var a.2) (var a.2))))))))
             (var a.0))))))
      */
  test("Logic 60", () => {
    const outputr = run1(
      1,
      ["q"],
      fresh3((Y, t1, t2) => {
        return freshNom3((z, f, x) => {
          return all(
            // eq(ezTie(f, qapp(qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))), qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))))), Y),
            eq(
              qlam(
                ezTie(
                  f,
                  qapp(
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))
                    )
                  )
                )
              ),
              Y
            ),
            availableo(z, Y),
            stepso(qapp(qvar(z), qapp(Y, qvar(z))), t1),
            stepso(ezIn(qapp(Y, qvar(z))), t2),
            ezq([["t1", t1], ["t2", t2]], qlvar.q)
          );
        });
      })
    );
    expect(outputr).toHaveLength(1);
    expect(
      outputr
    ).toEqual([
      {
        q: [
          ["t1", qapp2(
            qvar2(a0),
            qapp2(
              qlam2(tieTag(a1, qapp2(
                qlam2(tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2))))),
                qlam2(tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2)))))
              ))),
              qvar2(a0)

            ),
          )],
          ["t2", qapp2(
            qlam2(tieTag(a1,

              qapp2(

                qlam2(
                  tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2))))
                ),
                qlam2(
                  tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2))))
                )
              )
            )
            ),
            qvar2(a0),
          )],
        ]
      },
    ]);

  });
  /**
      (test
       (run1 3 (q)
         (fresh (Y t1 t2)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app (var ,z) (app ,Y (var ,z))) q))))
       '((app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app
                          (lam
                           (tie-tag a.2
                                    (app (var a.1) (app (var a.2) (var a.2)))))
                          (lam
                           (tie-tag a.2
                                    (app (var a.1) (app (var a.2) (var a.2))))))))
               (var a.0)))
         (app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))
               (lam
                (tie-tag a.2
                         (app (var a.0) (app (var a.2) (var a.2)))))))
         (app (var a.0)
              (app (var a.0)
                   (app
                    (lam
                     (tie-tag a.1
                              (app (var a.0) (app (var a.1) (var a.1)))))
                    (lam
                     (tie-tag a.1
                              (app (var a.0) (app (var a.1) (var a.1))))))))))
      */
  test("Logic 61", () => {
    const output = run1(
      3,
      ["q"],
      fresh3((Y, t1, t2) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              qlam(
                ezTie(f,
                  qapp(
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x))))
                  )
                )
              )
              , Y),
            availableo(z, Y),
            stepso(qapp(qvar(z), qapp(Y, qvar(z))), qlvar.q)
          );
        });
      }),
    );
    expect(output).toHaveLength(3);
    expect(
      output
    ).toEqual([



      {
        q: qapp2(
          qvar2(a0),
          qapp2(
            qlam2(
              tieTag(
                a1,
                qapp2(
                  qlam2(tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2))))),
                  qlam2(tieTag(a2, qapp(qvar(a1), qapp(qvar(a2), qvar(a2)))))
                )
              )
            ),
            qvar2(a0)
          ),
        ),
      },
      {
        q: qapp2(
          qvar2(a0),
          qapp2(
            qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))),
            qlam2(tieTag(a2, qapp(qvar(a0), qapp(qvar(a2), qvar(a2))))
            )
          ),
        ),
      },
      {
        q: qapp2(
          qvar2(a0),
          qapp2(
            qvar2(a0),
            qapp2(
              qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))),
              qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))
              )

            ),
          ),
        )
      },




    ]);

  });
  /**
      (test
       (run1 3 (q)
         (fresh (Y t1 t2)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app ,Y (var ,z)) q))))
       '((app
          (lam
           (tie-tag a.0
                    (app
                     (lam
                      (tie-tag a.1
                               (app (var a.0) (app (var a.1) (var a.1)))))
                     (lam
                      (tie-tag a.1
                               (app (var a.0) (app (var a.1) (var a.1))))))))
          (var a.2))
         (app
          (lam
           (tie-tag a.0 (app (var a.1) (app (var a.0) (var a.0)))))
          (lam
           (tie-tag a.2 (app (var a.1) (app (var a.2) (var a.2))))))
         (app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))))))
      */
  test("Logic 62", () => {

    const output = run1(
      3,
      ["q"],
      fresh3((Y, t1, t2) => {
        return freshNom3((z, f, x) => {
          return all(
            // eq(ezTie(f, qapp(qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))), qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))))), Y),
            eq(
              qlam(
                ezTie(f, qapp(
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x))))))
              )
              , Y),
            availableo(z, Y),
            stepso(qapp(Y, qvar(z)), qlvar.q)
          );
        });
      })
    );
    expect(output).toHaveLength(3);
    expect(
      output
    ).toEqual([
      {
        q: qapp2(
          qlam2(
            tieTag(a0, qapp2(
              qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1))))),
              qlam2(tieTag(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1)))))
            ))
          ),
          qvar2(a2)
        )
      },
      {
        q: qapp2(
          qlam2(
            tieTag(a0, qapp2(qvar2(a1), qappVV(a0, a0)))
          ),
          qlam2(
            tieTag(a2, qapp2(qvar2(a1), qappVV(a2, a2)))
          ),
        )
      }, {
        q: qapp2(
          qvar2(a0),
          qapp2(
            qlam2(
              tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))
            ),
            qlam2(
              tieTag(a1, qapp2(qvar2(a0), qappVV(a1, a1)))
            )
          ),
        )

      }
    ]);


  });


});