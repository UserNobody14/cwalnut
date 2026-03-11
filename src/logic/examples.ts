import {makeEmpty, makeList, makeLiteral, makePair, qlvar, qnom} from './makelvar';
import {all, run1, eq, either} from './index';
import { freshNom, fresh2, freshNom3, fresh, freshNom2, fresh3, call_fresh } from "./AnyFreshFn";
import { availableo } from "./availableo";
import {stepo, qvar, qlam, qapp, stepso, qappVV} from './testutils';
import {ezTie} from './ezeq';
import * as kn from './index';
import * as trm from './terms';
import {type MGoal, takeT} from './streams';
import {emptyState} from './State';

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

console.log("OP1", output);


const output2 = run1(
    3,
    ["Y"],
    fresh2((t1, t2) => {
      return freshNom3((z, f, x) => {
        return all(
          eq(
            // ezTie(f, ["app", ["lam", ezTie(x, ["app", qvar(f), ["app", qvar(x), qvar(x)]])], ["lam", ezTie(x, ["app", qvar(f), ["app", qvar(x), qvar(x)]])]]),
            qlam(
              ezTie(f, qapp(
                qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))), 
                qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))))
              )
            ),
            qlvar.Y
            // qlam(f)
          ),
          availableo(z, qlvar.Y),
          stepo(qapp(qlvar.Y, qvar(z)), t1),
          stepo(qapp(qvar(z), qapp(qlvar.Y, qvar(z))), t2),
          stepso(t1, t2)
        )
      });
    }),
  );

/**
 *                                '((lam
                                  (tie-tag a.0
                                           (app
                                            (lam
                                             (tie-tag a.1
                                                      (app (var a.0) (app (var a.1) (var a.1)))))
                                            (lam
                                             (tie-tag a.1
                                                      (app (var a.0) (app (var a.1) (var a.1))))))))))
 */
console.log("OP2", output2);

const output3 = run1(
    3,
    ["I"],
    fresh((E) => {
      return freshNom2((a, b) => {
        return all(
          eq(qlam(ezTie(b, E)), qlvar.I),
          availableo(a, qlvar.I),
          stepso(qapp(qlvar.I, qvar(a)), qvar(a))
        );
      });
    }),
  );

console.log('OP3', output3);


const cons = (
  a: trm.LTerm,
  v: trm.LTerm,
  l: trm.LTerm,
): MGoal => {
  return (sc) => {
      console.log("cons:", sc.reify(a).toString(), sc.reify(v).toString(), sc.reify(l).toString());
      // return applyGoal(kn.eq(makePair(a, v), l), sc);
      return [() => kn.eq(makePair(a, v), l)(sc)];
  };
};
const appendo = (
  l: trm.LTerm,
  s: trm.LTerm,
  o: trm.LTerm,
  // loc = 'None'
): MGoal => {
  console.log("appendo:", l.toString(), s.toString(), o.toString());
  return (sc) => [
      () => kn.either(
          kn.all(kn.eq(l, makeEmpty()), kn.eq(s, o)),
          fresh3((a, d, res) =>
              kn.all(
                  kn.eq(makePair(a, d), l),
                  kn.eq(makePair(a, res), o),
                  // kn.apply_pred(
                  //     qlvar.appendo,
                  //     d,
                  //     s,
                  //     res,
                  // ),
                  call_fresh(
                      // () => appendo(d, s, res),
                      () => kn.apply_pred(
                          qlvar.appendo,
                          d,
                          s,
                          res,
                      ),
                  )
              ),
          ),
      )(sc)
  ];
};

const cc1 =             takeT(
  [emptyState],
  3
);
if (cc1.length !== 1) throw new Error("cc1");

const outv = kn.run1(
  1,
  ['qq', 'mid'],
  kn.all(
      kn.eq(
          qlvar.appendo,
          new trm.LPredicate("appendo", appendo),
      ),
      kn.eq(
          qlvar.einput,
          makeList([
              makeLiteral("1"),
              makeLiteral("2"),
              makeLiteral("3"),
          ]),
      ),
      kn.eq(
          qlvar.input2,
          makeList([
              makeLiteral("4"),
              makeLiteral("5"),
              makeLiteral("6"),
          ]),
      ),
      appendo(
          qlvar.einput,
          qlvar.__fresh_1,
          qlvar.__fresh_2,
      ),
      appendo(
          qlvar.input2,
          qlvar.__fresh_0,
          qlvar.__fresh_1,
      ),
      kn.eq(makeEmpty(), qlvar.__fresh_0),
      kn.eq(qlvar.qq, qlvar.__fresh_2),
      kn.either(
          kn.all(
              // kn.eq(makeEmpty(), qlvar.__fresh_3),
              // kn.eq(
              //     qlvar.qq,
              //     qlvar.__fresh_6,
              // ),


              cons(
                  makeLiteral("1"),
                  qlvar.__fresh_5,
                  qlvar.__fresh_6,
              ),
              cons(
                  makeLiteral("6"),
                  qlvar.__fresh_3,
                  qlvar.__fresh_4,
              ),
              kn.eq(makeEmpty(), qlvar.__fresh_3),
              appendo(
                  qlvar.mid,
                  qlvar.__fresh_4,
                  qlvar.__fresh_5,
              ),
              kn.eq(
                  qlvar.qq,
                  qlvar.__fresh_6,
              ),
          ),
          kn.all(
              kn.eq(
                  qlvar.qq,
                  makeList([makeLiteral("45")]),
              ),
          ),
      )
  ),
);
console.log(outv);

const outputv = run1(
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
);
console.log("Outputv: ", outputv);

// const output4 = kn.run1(
//     1,
//     ["Y"],
//     freshNom3((z, f, x) => {
//       return fresh((U) => {
//         return all(
//           kn.eq(qlam(
//             ezTie(f, qapp(U, U))
//           ), qlvar.Y),
//           kn.eq(
//             qlam(
//               ezTie(
//                 f,
//                 qapp(
//                   qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))),
//                   qlam(ezTie(x, qapp(qvar(f), qappVV(x, x)))
//                   )
//               ),
//               )
//             ),
//             qlvar.Y),
//           availableo(z, qlvar.Y, 'OP4'),
//           stepEqualo(
//             qapp(qlvar.Y, qvar(z)), 
//             qapp(qvar(z), qapp(qlvar.Y, qvar(z)))
//           )
//         );
//       });
//     }),
//   );

// console.log("Output: ", output4);


// const outgoal = stepEqualo(
//         qapp(qlvar.Y, qvar(qnom.z)), 
//         qapp(qvar(qnom.z), qapp(qlvar.Y, qvar(qnom.z)))
//       );
// console.log("Outgoal formed");
// const outSeq = outgoal(emptyState);
// console.log("OutSeq formed");
// const sequenceIterator = outSeq[Symbol.iterator]();
// console.log("SeqIter formed", sequenceIterator);
//   const nOutSeq = sequenceIterator.next();
//   console.log("NOutSeq formed", nOutSeq);


// /**
//  * Double check what you know about iterators
//  */

// function* genS1() {
//   yield 1;
//   yield 2;
//   yield 3;
//   // throw new Error("This is an error");
//   console.log("This is the end(?)");
//   yield 4;
// }

// function stepEqualo2(t1: LTerm, t2: LTerm, depth = 0): Goal {
//   console.log(`stepEqualo: ${depth} ${t1.toString()} ${t2.toString()}`);
//   return either(
//     eq(t1, t2),
//     // either(
//       fresh((t1Hat) => {
//         return all(
//           stepo(t1, t1Hat),
//           stepEqualo2(t1Hat, t2, depth + 1)
//         );
//       }),
//       fresh((t2Hat) => {
//         return all(
//           stepo(t2, t2Hat),
//           stepEqualo2(t1, t2Hat, depth + 1)
//         );
//       })
//     // )
//   );
// }

// const g = genS1();
// console.log(g.next());
// console.log(g.next());
// console.log(g.next());
// console.log(g.next());



// const output5 = kn.run1(
//   1,
//   ["Y"],
//   outgoal
// );

// console.log("Output: ", output5);

// const output6 = kn.run1(
//   1,
//   ["Y"],
//   freshNom3((z, f, x) => {
//     return fresh((U) => {
//       return all(
//         kn.eq(qlam(
//           ezTie(f, qapp(U, U))
//         ), qlvar.Y),
//         availableo(z, qlvar.Y),
//         // stepEqualo(ezIn(qapp(qlvar.Y, qvar(z))), ezIn(
//         //   ["app", qvar(z), qapp(qlvar.Y, qvar(z))]))
//         stepEqualo(
//           qapp(qlvar.Y, qvar(z)),
//           qapp(qvar(z), qapp(qlvar.Y, qvar(z)))
//         )
//       );
//     });
//   }),
// );

// console.log("Output: ", output6);

// const output7 = run1(
//   1,
//   ["W"],
//   fresh((E) => {
//     return freshNom3((x, y, c) => {
//       return all(
//         eq(qlam(ezTie(c, E)), qlvar.W),
//         availableo(x, qlvar.W),
//         availableo(y, qlvar.W),
//         stepso(
//           qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
//           qapp(qapp(qvar(x), qvar(y)), qvar(y))
//         )
//       );
//     });
//   }),
// );

// console.log("Output6///////////////////////////\n: ", output7);


// const output8 = run1(
//   1,
//   ["W"],
//   fresh((E) => {
//     return freshNom3((x, y, c) => {
//       return all(
//         // eq(qlam(ezTie(c, E)), qlvar.W),
//         // availableo(x, qlvar.W),
//         // availableo(y, qlvar.W),
//         stepso(
//           qapp(qapp(qlvar.W, qvar(x)), qvar(y)),
//           qapp(qapp(qvar(x), qvar(y)), qvar(y))
//         )
//       );
//     });
//   }),
// );

// console.log("Output8///////////////////////////\n: ", output8);

// const output9 = run1(
//   1,
//   ["W"],
//   stepso(
//     qapp(qapp(qlvar.W, qvar(qnom.x)), qvar(qnom.y)),
//     qapp(qapp(qvar(qnom.x), qvar(qnom.y)), qvar(qnom.y))
//   )
// );

// console.log("Output9///////////////////////////\n: ", output9);