import * as trm from "./terms";
import { makeList, makeLiteral, makeTie } from "./makelvar";
import type { CleanOutput, Goal } from "./types";
import { availableo } from "./availableo";
import { all, eq, either } from "./index";
import type { MGoal } from "./streams";
import {
	fresh5,
	fresh2,
	freshNom,
	fresh,
	freshNom2,
	freshNom3,
	fresh4,
	fresh3,
} from "./AnyFreshFn";
import * as kn from "./index";
import * as AnyFreshFn from "./AnyFreshFn";
import type { LTerm } from "./terms";

type Term = trm.LTerm;
const { either: disj, all: conj, eq: equals } = kn;

const qvar = (t: Term): trm.LPair | trm.LTerm => {
	return makeList([makeLiteral("var"), t]);
};
const qapp = (
	rator: Term,
	rand: Term,
): trm.LPair | trm.LTerm => {
	return makeList([
		makeLiteral("app"),
		makeList([rator, rand]),
	]);
};

export const qappVV = (a: Term, b: Term) =>
	qapp(qvar(a), qvar(b));

const qlam = (body: Term): trm.LPair | trm.LTerm => {
	return makeList([makeLiteral("lam"), body]);
};

export const lamTie = (a: trm.LNom, b: LTerm): LTerm => {
	return qlam(makeTie(a, b));
};
export const lamTie2 = (
	a: string | trm.LNom,
	b: CleanOutput | trm.LTerm,
): CleanOutput => {
	return qlam2(tieTag(a, b));
};

export const qlam2 = (b: CleanOutput): CleanOutput => {
	return ["lam", b];
};
export const qapp2 = (
	r1: CleanOutput | trm.LTerm,
	b1: CleanOutput | trm.LTerm,
): CleanOutput => {
	let r: CleanOutput | null = null;
	let b: CleanOutput | null = null;
	if (r1 instanceof trm.LTerm) {
		r = r1.cleanOutput();
	} else {
		r = r1;
	}
	if (b1 instanceof trm.LTerm) {
		b = b1.cleanOutput();
	} else {
		b = b1;
	}
	if (b === null || r === null) {
		throw new Error("qapp2: b or r is null");
	}
	return ["app", [r, b]];
};

export const qvar2 = (
	t: CleanOutput | trm.LTerm,
): CleanOutput => {
	if (t instanceof trm.LTerm) {
		return ["var", t.cleanOutput()];
	}
	return ["var", t];
};

export const tieTag = (
	str: string | trm.LNom,
	tr: Term | CleanOutput,
): CleanOutput => {
	return {
		name: str instanceof trm.LNom ? str.cleanOutput() : str,
		term: tr instanceof trm.LTerm ? tr.cleanOutput() : tr,
	};
};

export const suspTag = (
	str: string | trm.LNom,
	strB: string | trm.LNom,
	tr: Term | CleanOutput,
): CleanOutput => {
	return {
		swap: [
			cleanOutputOrReturn(str),
			cleanOutputOrReturn(strB),
		],
		term: tr instanceof trm.LTerm ? tr.cleanOutput() : tr,
	};
};

const rename = (
	e: Term,
	nnew: Term,
	a: Term,
	out: Term,
): MGoal => {
	return disj(
		conj(equals(qvar(a), e), equals(qvar(nnew), out)),
		fresh((y) => {
			return freshNom((aHat) =>
				conj(
					equals(qvar(y), e),
					equals(qvar(y), out),
					availableo(aHat, y),
				),
			);
		}),
		fresh4((rator, rand, ratoro, rando) => {
			return conj(
				equals(qapp(rator, rand), e),
				equals(qapp(ratoro, rando), out),
				rename(rator, nnew, a, ratoro),
				rename(rand, nnew, a, rando),
			);
		}),
		fresh3((body, r, bodyo) => {
			return freshNom2((c, cHat) => {
				return conj(
					equals(makeTie(c, body), e),
					rename(body, cHat, c, r),
					rename(r, nnew, a, bodyo),
					equals(makeTie(cHat, bodyo), out),
				);
			});
		}),
	);
};

function cleanOutputOrReturn(
	str: string | trm.LNom,
): CleanOutput {
	return str instanceof trm.LNom ? str.cleanOutput() : str;
}

function subst(
	e: Term,
	nnew: Term,
	a: trm.LNom,
	out: Term,
): MGoal {
	return disj(
		all(equals(qvar(a), e), equals(nnew, out)),
		fresh((y) => {
			return all(
				equals(qvar(y), e),
				equals(qvar(y), out),
				availableo(a, y),
			);
		}),
		fresh4((rator, rand, ratoro, rando) => {
			return all(
				equals(qapp(rator, rand), e),
				equals(qapp(ratoro, rando), out),
				rename(rator, nnew, a, ratoro),
				rename(rand, nnew, a, rando),
			);
		}),
		fresh3((body, r, bodyo) => {
			return freshNom2((c, cHat) => {
				return conj(
					equals(makeTie(c, body), e),
					rename(body, cHat, c, r),
					subst(r, nnew, a, bodyo),
					equals(makeTie(cHat, bodyo), out),
				);
			});
		}),
		fresh5((body, r, bodyo, laml, out2) => {
			return freshNom2((c, cHat) => {
				return all(
					equals(qlam(laml), e),
					equals(makeTie(c, body), laml),
					rename(body, cHat, c, r),
					subst(r, nnew, a, bodyo),
					equals(makeTie(cHat, bodyo), out2),
					equals(qlam(out2), out),
				);
			});
		}),
	);
}

export function subst5(
	e: Term,
	nnew: Term,
	a: trm.LNom,
	out: Term,
): MGoal {
	return disj(
		all(equals(qvar(a), e), equals(nnew, out)),
		fresh((y) => {
			return all(
				equals(qvar(y), e),
				equals(qvar(y), out),
				availableo(a, y),
			);
		}),
		fresh4((rator, rand, ratorres, randres) => {
			return all(
				equals(qapp(rator, rand), e),
				equals(qapp(ratorres, randres), out),
				subst5(rator, nnew, a, ratorres),
				subst5(rand, nnew, a, randres),
			);
		}),
		fresh3((body, bodyres) => {
			return freshNom2((c) => {
				return conj(
					equals(qlam(makeTie(c, body)), e),
					equals(qlam(makeTie(c, bodyres)), out),
					availableo(c, a),
					availableo(c, nnew),
					subst5(body, nnew, a, bodyres),
				);
			});
		}),
		// fresh5((body, r, bodyo, laml, out2) => {
		//   return freshNom2((c, cHat) => {
		//     return all(
		//       equals(qlam(laml), e),
		//       equals(makeTie(c, body), laml),
		//       subst5(body, cHat, c, r),
		//       subst5(r, nnew, a, bodyo),
		//       equals(makeTie(cHat, bodyo), out2),
		//       equals(qlam(out2), out),
		//     );
		//   });
		// }),
	);
}

/**
 * The first subst o example shows that [b/a]λa.ab ≡α λc.cb.
(run∗ (q)
(fresh (a b)
(subst o
‘(lam ,(./ a ‘(app (var ,a) (var ,b)))) ‘(var ,b) a q))) ⇒
((lam (tie a0 (app (var a0 ) (var a1 )))))
Naive substitution would have produced λb.bb instead.
This second example shows that [a/b]λa.b ≡α λc.a.
(run∗ (x )
(fresh (a b)
(subst o ‘(lam ,(./ a ‘(var ,b))) ‘(var ,a) b x ))) ⇒
((lam (tie a0 (var a1 ))))
Naive substitution would have produced λa.a instead.
 */
/**
 * ;; Adopted from this code in examples/lam.apl from alphaProlog release 'aprolog-0.3'
;; (see http://homepages.inf.ed.ac.uk/jcheney/programs/aprolog/)
 
;; (* correct substitution *)
 
;; pred subst (id\tm) tm tm.
;; subst (a\var a) E E.
;; subst (a\var B) E (var B) :- a # B.
;; subst (a\app E1 E2) E (app E1' E2') :- subst (a\E1) E E1', subst (a\E2) E E2'.
;; subst (a\lam (b\E1)) E (lam (b\E1')) / b # E :- subst (a\E1) E E1'.
 
(define substo
  (lambda (id/tm E out)
    (conde
      ((fresh (a)
         (== (tie a `(var ,a)) id/tm)
         (== E out)))
      ((fresh (a)
         (exist (B)
           (hash a B)
           (== (tie a `(var ,B)) id/tm)
           (== `(var ,B) out))))
      ((fresh (a b)
         (exist (E1 E1^)
           (hash b E)
           (== (tie a `(lam ,(tie b E1))) id/tm)
           (== `(lam ,(tie b E1^)) out)
           (substo (tie a E1) E E1^))))
      ((fresh (a)
         (exist (E1 E2 E1^ E2^)
           (== (tie a `(app ,E1 ,E2)) id/tm)
           (== `(app ,E1^ ,E2^) out)
           (substo (tie a E1) E E1^)
           (substo (tie a E2) E E2^)))))))
 */
function substo2(idtm: Term, E: Term, out: Term): MGoal {
	// console.log('subst2::::');
	/**
   * ((fresh (a)
(== (tie a `(var ,a)) id/tm)
(== E out)))
   */
	return (sc) =>
		either(
			freshNom((a) => {
				return all(
					eq(makeTie(a, qvar(a)), idtm),
					eq(E, out),
				);
			}),

			/**
     *         ((fresh (a)
(exist (B)
(hash a B)
(== (tie a `(var ,B)) id/tm)
(== `(var ,B) out))))
     */
			freshNom((a) => {
				return fresh((B) => {
					return all(
						availableo(a, B, "2root"),
						eq(makeTie(a, qvar(B)), idtm),
						eq(qvar(B), out),
					);
				});
			}),
			/**
     *         ((fresh (a b)
(exist (E1 E1^)
(hash b E)
(== (tie a `(lam ,(tie b E1))) id/tm)
(== `(lam ,(tie b E1^)) out)
(substo (tie a E1) E E1^))))
     */
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
			/**
     *         ((fresh (a)
   (exist (E1 E2 E1^ E2^)
     (== (tie a `(app ,E1 ,E2)) id/tm)
     (== `(app ,E1^ ,E2^) out)
     (substo (tie a E1) E E1^)
     (substo (tie a E2) E E2^)))))))
     */
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

export function substo4(
	E: Term,
	ad: Term,
	a: trm.LNom,
	out: Term,
): MGoal {
	return fresh((idtm) =>
		all(eq(idtm, makeTie(a, ad)), substo2(idtm, E, out)),
	);
}

// // we read y # x as y 6 = z and y # (E, x) as y /∈ F V (E)∪(x).

// const maybeNom = (a: Term): Goal => {
//   return fresh((b) => (
//     either(
//       eq(a, b),
//       freshNom((c) => (
//         eq(a, c)
//       ))
//     )
//   ));
// }

// /**
//  * pred subst (id\tm) tm tm.
// subst(x\T) E U :- U is T{E/var x}.

// pred subst2 id tm tm tm.
// subst2 a (var a) E E.
// subst2 a (var b) E (var b).
// subst2 a (app E1 E2) E (app E1' E2') :- subst2 a E1 E E1', subst2 a E2 E E2'.
// subst2 a (lam (b\E1)) E (lam(b\E1')) :- b # E, subst2 a E1 E E1'.
//  */
function substo3(
	idtm: Term,
	e: Term,
	u: Term,
	z: Term,
): MGoal {
	return either(
		freshNom((x) => {
			return fresh((aa) =>
				all(
					all(
						// eq(makeTie(x, idtm), idtm),
						// maybeNom(x),
						eq(idtm, aa),
						eq(qvar(aa), e),
						eq(u, z),
						// subst(idtm, e, u),
					),
				),
			);
		}),
		freshNom2((a, b) => {
			return all(eq(qvar(a), e), eq(qvar(b), z));
		}),
		fresh4((e1, e2, e1Hat, e2Hat) => {
			return all(
				eq(qapp(e1, e2), e),
				eq(qapp(e1Hat, e2Hat), z),
				substo3(idtm, e1, u, e1Hat),
				substo3(idtm, e2, u, e2Hat),
			);
		}),

		freshNom((b) => {
			return fresh2((e1, e1Hat) => {
				return all(
					availableo(b, u),
					eq(qlam(makeTie(b, e1)), e),
					eq(qlam(makeTie(b, e1Hat)), z),
					substo3(idtm, e1, u, e1Hat),
				);
			});
		}),
	);
}

/**
 * (define substo  
  (lambda (e new a out)
    (conde
      ((== `(var ,a) e) (== new out))
      ((exists (y)
         (== `(var ,y) e)
         (== `(var ,y) out)
         (hash a y)))
      ((exists (rator ratorres rand randres)
         (== `(app ,rator ,rand) e)
         (== `(app ,ratorres ,randres) out)
         (substo rator new a ratorres)
         (substo rand new a randres)))
      ((exists (body bodyres)
         (fresh (c)
           (== `(lam ,(tie c body)) e)
           (== `(lam ,(tie c bodyres)) out)
           (hash c a)
           (hash c new)
           (substo body new a bodyres)))))))
 */
function substo6(
	e: Term,
	nnew: Term,
	a: trm.LNom,
	out: Term,
): MGoal {
	return (sc) => [
		() =>
			disj(
				all(eq(qvar(a), e), eq(nnew, out)),
				fresh((y) => {
					return all(
						eq(qvar(y), e),
						eq(qvar(y), out),
						availableo(a, y),
					);
				}),
				fresh4((rator, rand, ratorres, randres) => {
					return all(
						eq(qapp(rator, rand), e),
						eq(qapp(ratorres, randres), out),
						substo6(rator, nnew, a, ratorres),
						substo6(rand, nnew, a, randres),
					);
				}),
				fresh2((body, bodyres) => {
					return freshNom((c) => {
						return all(
							eq(qlam(makeTie(c, body)), e),
							eq(qlam(makeTie(c, bodyres)), out),
							availableo(c, a),
							availableo(c, nnew),
							substo6(body, nnew, a, bodyres),
						);
					});
				}),
			)(sc),
	];
}

export function substo7(
	idtm: Term,
	E: Term,
	// ad: Term,
	// a: trm.LNom,
	out: Term,
): MGoal {
	// return fresh(
	//   (ad) => freshNom(
	//     (a) => all(
	//       eq(idtm, makeTie(a, ad)),
	//       substo6(ad, E, a, out),
	//       // substo2(idtm, E, out)
	//     )
	//   )
	// );
	return substo2(idtm, E, out);
}

/**
 * 
 * 
 * 
 * ;; Adopted from this code in examples/lam.apl from alphaProlog release 'aprolog-0.3'
;; (see http://homepages.inf.ed.ac.uk/jcheney/programs/aprolog/)
 
;; pred beta tm tm.
;; beta (app (lam (b\E)) E') E'' :- subst(b\E) E' E''.
 
(define betao
  (lambda (t1 E^^)
    (freshNom (b)
      (fresh (E E^)
        (== `(app (lam ,(tie b E)) ,E^) t1)
        (substo (tie b E) E^ E^^)))))
 

beta (app (lam (b\E)) E') E'' :- subst(b\E) E' E''.
*/
function betao(t1: Term, EHatHat: Term): MGoal {
	// return (sc) => [
	//   () => freshNom((b) => {
	//     return fresh2((E, EHat) => {
	//       console.log('betao:');
	//       return all(
	//         equals(
	//           qapp(
	//             qlam(makeTie(b, E)),
	//             EHat
	//           ),
	//           t1
	//         ), // ["app", ["lam", ezTie(b, E)], EHat]
	//         // substo7(ezTie(b, E), EHat, EHatHat),
	//         // substo6(E, EHat, b, EHatHat),
	//         substo2(makeTie(b, E), EHat, EHatHat),
	//         // subst(E, EHat, b, EHatHat),
	//       );
	//     });
	//   })(sc)
	// ];
	return freshNom((b) => {
		return fresh2((E, EHat) => {
			// console.log('betao:');
			return all(
				equals(qapp(qlam(makeTie(b, E)), EHat), t1),
				substo2(makeTie(b, E), EHat, EHatHat),
			);
		});
	});
}

function liftG(g: MGoal): MGoal {
	return (sc) => [() => g(sc)];
}

/**
 *     ;; Adopted from this code in examples/lam.apl from alphaProlog release 'aprolog-0.3'
    ;; (see http://homepages.inf.ed.ac.uk/jcheney/programs/aprolog/)
    
    ;; (* single step reduction *)
    ;; pred step tm tm.
    ;; step M M' :- beta M M'.
    ;; step (app M N) (app M' N) :- step M M'.
    ;; step (app M N) (app M N') :- step N N'.
    ;; step (lam (x\M)) (lam (x\M')) :- step M M'.
    
    ;; My reducer will not go under lambda's
    (define stepo
      (lambda (t1 t2)
        (conde
          ((betao t1 t2))
          ((exist (M N M^)
             (== `(app ,M ,N) t1)
             (== `(app ,M^ ,N) t2)
             (stepo M M^)))
          ((exist (M N N^)
             (== `(app ,M ,N) t1)
             (== `(app ,M ,N^) t2)
             (stepo N N^))))))
 */
function stepo(t1: Term, t2: Term, depth = 0): MGoal {
	return either(
		betao(t1, t2),
		fresh3((M, N, MHat) => {
			// console.log('stepo: 1');
			return all(
				eq(qapp(M, N), t1), // qapp(M, N)
				eq(qapp(MHat, N), t2), // qapp(MHat, N),
				stepo(M, MHat, depth + 1),
			);
		}),
		fresh3((M, N, NHat) => {
			// console.log('stepo: 2');
			return all(
				eq(qapp(M, N), t1), // qapp(M, N)
				eq(qapp(M, NHat), t2), // qapp(M, NHat),
				stepo(N, NHat, depth + 1),
			);
		}),
	);
}

/**          
  ;; reflexive transitive closure of stepo
  (define stepso
    (lambda (t1 t2)
      (conde
        ((== t1 t2))
        ((fresh (t)
           (stepo t1 t)
           (stepso t t2))))))
  */
function stepso(t1: Term, t2: Term, depth = 0): MGoal {
	return either(
		eq(t1, t2),
		fresh((t) => {
			return all(stepo(t1, t), stepso(t, t2, depth + 1));
		}),
	);
}

/**
    (define step-equalo
      (lambda (t1 t2)
        (conde
          ((== t1 t2))
          ((fresh (t1^)
             (stepo t1 t1^)
             (step-equalo t1^ t2)))
          ((fresh (t2^)
             (stepo t2 t2^)
             (step-equalo t1 t2^))))))
    */

function stepEqualo(
	t1: LTerm,
	t2: LTerm,
	depth = 0,
): MGoal {
	return either(
		eq(t1, t2),
		fresh((t1Hat) => {
			return all(
				stepo(t1, t1Hat),
				stepEqualo(t1Hat, t2, depth + 1),
			);
		}),
		fresh((t2Hat) => {
			return all(
				stepo(t2, t2Hat),
				stepEqualo(t1, t2Hat, depth + 1),
			);
		}),
	);
}

export function stepEqualo2(
	t1: LTerm,
	t2: LTerm,
	depth = 0,
): MGoal {
	return stepEqualo(t1, t2, depth);
}

export {
	subst,
	stepEqualo,
	substo2,
	rename,
	qvar,
	qapp,
	qlam,
	stepo,
	stepso,
	betao,
};
