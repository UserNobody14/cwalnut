import { describe, expect, it as test } from "@jest/globals";
import { qlvar, qnom } from "./makelvar";
import { all, eq, run1 } from "./index";
import { fresh, fresh2, freshNom3 } from "./AnyFreshFn";
import { ezTie } from "./ezeq";
import { availableo } from "./availableo";
import {
  qvar,
  qlam,
  qapp,
  tieTag,
  stepo,
  stepso,
  qappVV,
  lamTie,
  qlam2,
  qapp2,
  qvar2,
} from "./testutils";

const a0 = qnom[0 + 0];
const a1 = qnom[1 + 0];
const a2 = qnom[2 + 0];
const a3 = qnom[3 + 0];

describe("stepso", () => {
  /**
      (test
       (run1 1 (t)
         (fresh (Y)
           (freshNom (z f x)
             (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                     (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                 Y)
             (hash z Y)
             (stepso `(app ,Y (var ,z)) t)
             (stepso `(app (var ,z) (app ,Y (var ,z))) t))))
       '((app (var a.0)
              (app
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))
               (lam
                (tie-tag a.1
                         (app (var a.0) (app (var a.1) (var a.1)))))))))
      
      */
  test("Logic 64", () => {
    const output = run1(
      2,
      ["t"],
      fresh((Y) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              lamTie(
                f,
                qapp(
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                  qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                ),
              ),
              Y,
            ),
            availableo(z, Y),
            stepso(qapp(Y, qvar(z)), qlvar.t),
            stepso(qapp(qvar(z), qapp(Y, qvar(z))), qlvar.t),
          );
        });
      }),
      100000,
    );
    expect(output).toHaveLength(2);
    expect(output).toEqual([
      {
        t: qapp2(
          qvar(a0),
          qapp2(
            qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
            qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
          ),
        ),
      },
      {
        t: qapp2(
          qvar(a0),
          qapp2(
            qvar(a0),
            qapp2(
              qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
              qlam2(tieTag(a1, qapp(qvar(a0), qappVV(a1, a1)))),
            ),
          ),
        ),
      },
    ]);
  });
  /**
                              (test
                               (run1 1 (Y)
                                 (fresh (t1 t2)
                                   (freshNom (z f x)
                                     (== `(lam ,(tie f `(app (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x)))))
                                                             (lam ,(tie x `(app (var ,f) (app (var ,x) (var ,x))))))))
                                         Y)
                                     (hash z Y)
                                     (stepo `(app ,Y (var ,z)) t1)
                                     (stepo `(app (var ,z) (app ,Y (var ,z))) t2)
                                     (stepso t1 t2))))
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

  test("Logic 65: Y combinator", () => {
    const output = run1(
      1,
      ["Y"],
      fresh2((t1, t2) => {
        return freshNom3((z, f, x) => {
          return all(
            eq(
              // ezTie(f, ["app", ["lam", ezTie(x, ["app", qvar(f), ["app", qvar(x), qvar(x)]])], ["lam", ezTie(x, ["app", qvar(f), ["app", qvar(x), qvar(x)]])]]),
              qlam(
                ezTie(
                  f,
                  qapp(
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                    qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
                  ),
                ),
              ),
              qlvar.Y,
              // qlam(f)
            ),
            availableo(z, qlvar.Y),
            stepo(qapp(qlvar.Y, qvar(z)), t1),
            stepo(qapp(qvar(z), qapp(qlvar.Y, qvar(z))), t2),
            stepso(t1, t2),
          );
        });
      }),
    );
    expect(output).toHaveLength(1);
    expect(output).toEqual([
      {
        Y: qlam2(
          tieTag(
            a0,
            qapp(
              lamTie(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1)))),
              lamTie(a1, qapp(qvar(a0), qapp(qvar(a1), qvar(a1)))),
            ),
          ),
        ),
      },
    ]);
  });
});
