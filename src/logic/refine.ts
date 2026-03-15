import {
	List as ImmList,
	Map as ImmMap,
	Record as ImmRecord,
	Set as ImmSet,
} from "immutable";
import {
	LEmpty,
	LLiteral,
	LLVar,
	LNom,
	LPair,
	LSuspension,
	type LTerm,
	LTie,
	pmtch,
} from "./terms";
import { Subst } from "./Subst";
import type {
	LPackage,
	NablaList,
	NablaPackage,
} from "./types";
import { match, P } from "ts-pattern";
import { applySwap } from "./swapUnify";
import type { State } from "./State";
import { type DeltaMap, emptyDelta } from "./DeltaMap";

const emptySigma = new Subst({ mp: ImmMap() });
/**
 * 
 * (define compose-subst
(λ (σ τ )
(let ((ˆσ (map
(λ (a) ‘(,(car a) . ,(apply-subst τ (cdr a))))
σ)))
(append
(filter (λ (a) (not (assq (car a) ˆσ))) τ )
(filter (λ (a) (not (eq? (car a) (cdr a)))) ˆσ)))))
 */

function composeSubst(sigma: Subst, tau: Subst): Subst {
	const sigma2 = sigma.mp
		.map((v, _k) => {
			return applySubst(tau, v);
		})
		.filter((v, k) => {
			if (v instanceof LLVar) {
				return k !== v.name;
			} else if (v instanceof LSuspension) {
				return k !== v.getLvar().name;
				// return true;
			} else return true;
		});
	const tau2 = tau.mp.filter((_v, k) => {
		return !sigma2.has(k);
	});
	const nTau = sigma2.merge(tau2);
	// if (nTau.size === 0) return null;
	if (
		nTau.some((v, k) => {
			return (
				(v instanceof LLVar && v.name === k) ||
				(v instanceof LSuspension && v.getLvar().name === k)
			);
		})
	) {
		throw new Error("Suspension in composeSubst");
	}
	return new Subst({
		mp: nTau,
	});
}

/**
 * 
(define unify
  (lambda (eqns sigma nabla fk)
    (let ((eqns (apply-subst sigma eqns)))
      (mv-let ((sigma^ delta) (apply-sigma-rules eqns fk))
        (unifyhash delta (compose-subst sigma sigma^) nabla fk)))))

(define unifyhash
  (lambda (delta sigma nabla fk)
    (let ((delta (apply-subst sigma delta))
          (nabla (apply-subst sigma nabla)))
      (let ((delta (delta-union nabla delta)))
        `(,sigma ,(apply-nabla-rules delta fk))))))
 */

export function unify(
	u: LTerm,
	v: LTerm,
	s: State,
): State | null {
	// const f3: ImmList<[LTerm, LTerm]> = ImmList([[u.reify(s.subst), v.reify(s.subst)]]);
	const sigma = s.subst;
	const eqns = remapEqns(ImmList([[u, v]]), sigma);
	const resS = applySigmaRules2(eqns, s.number);
	if (!resS) return null;
	const [sigmaHat, delta, inc] = resS;
	return unifyHash(
		delta,
		composeSubst(sigma, sigmaHat),
		s.delta,
		s.set("number", inc),
	);
}

export function unifyHash(
	delta: NablaList,
	sigma: Subst,
	nabla: DeltaMap,
	s: State,
): State | null {
	const delta2 = deltaToNabla(nabla);
	const d4 = applyNablaRules(
		remapEqns(delta.concat(delta2), sigma),
	);
	if (!d4) return null;
	return s.setSubst(sigma).setDelta(d4);
}

function remapEqns<T extends LTerm>(
	eqns: ImmList<[T, LTerm]>,
	sigma: Subst,
): ImmList<[T, LTerm]> {
	return eqns.map<[T, LTerm]>(([c, d]): [T, LTerm] => {
		const headV = applySubst(sigma, c) as T;
		// const headV = c;
		return [headV, applySubst(sigma, d)];
	});
}

/**
 * (define apply-subst
(λ (σ v )
(pmatch v
(,c (guard (not (pair? c))) c)
((tie ,a ,t) ‘(tie ,a ,(apply-subst σ t)))
((nom ) v )
((susp ,π ,x ) (apply-π π (get (x ) σ)))
((,x . ,y) ‘(,(apply-subst σ x ) . ,(apply-subst σ y))))))
 */

function applySubst(s: Subst, uv: LTerm): LTerm {
	if (typeof uv !== "object")
		throw new Error(`Not an object: ${uv}`);

	// console.warn("applySubst", uv.type);
	return match<LTerm, LTerm>(uv)
		.with(pmtch.nom, (uv) => {
			return uv;
		})
		.with(pmtch.tie, (uv) => {
			return new LTie(uv.name, applySubst(s, uv.term));
		})
		.with(pmtch.lvar, (uv) => {
			// return s.find(uv) ?? uv;
			return s.mp.get(uv.name, uv) ?? uv;
		})
		.with(pmtch.susp, (uv) => {
			return applySwap(uv.swap, applySubst(s, uv.term));
			// return uv.applySwaps(s.mp.get(uv.getLvar().name, uv.getLvar()));
		})
		.with(pmtch.pair, (uv) => {
			return new LPair(
				applySubst(s, uv.first),
				applySubst(s, uv.second),
			);
		})
		.otherwise(() => {
			return uv;
		});
}

/**
 * (define apply-∇-rules
(λ (δ fk )
(cond
((null? δ) empty-∇)
(else
(mv-let ((δ ∇) (one-step ∇-rules δ fk ))
(δ-union ∇ (apply-∇-rules δ fk )))))))

(empty-σ, empty-δ, and empty-∇ are defined in Appendix B.)
one-step takes three arguments: a function rules (either
σ-rules or ∇-rules); a list of constraints c ∗ ; and a failure
continuation fk .
*/

export function deltaToNabla(delta: DeltaMap): NablaList {
	return delta.varToNames.reduce<NablaList>(
		(acc, names, vr) => {
			const listOfNames = names.toArray();
			const lvar = new LLVar(vr);
			return acc.unshift(
				...listOfNames.map((name): [LNom, LLVar] => {
					return [new LNom(name), lvar];
				}),
			);
		},
		ImmList(),
	);
}

export function applyDeltaNablaRules(
	s: State,
): State | null {
	const delta = s.delta;
	if (delta.varToNames.size === 0) {
		return s;
	} else {
		const nablaRules = remapEqns<LNom>(
			deltaToNabla(delta),
			s.subst,
		);
		const nD = applyNablaRules(nablaRules);
		if (!nD) return null;
		return s.setDelta(nD);
	}
}

/**
 * 
 * 
(define nabla-rules
  (lambda (d delta)
    (pmatch d
      ((,a . ,c)
       (guard (not (pair? c)))
       `(,delta ,empty-nabla))
      ((,a . (tie-tag ,a^ ,t))
       (guard (eq? a^ a))
       `(,delta ,empty-nabla))
      ((,a . (tie-tag ,a^ ,t))
       (guard (not (eq? a^ a)))
       `(((,a . ,t) . ,delta) ,empty-nabla))
      ((,a . (nom-tag _))
       (guard (not (eq? a (cdr d))))
       `(,delta ,empty-nabla))
      ((,a . (susp-tag ,pi ,x))
       `(,delta ((,(apply-pi (reverse pi) a) . ,(x)))))
      ((,a . (,t1 . ,t2))
       (guard (untagged? t1))
       `(((,a . ,t1) (,a . ,t2) . ,delta) ,empty-nabla))
      (else #f))))
 */

function nablaRules(
	a: LNom,
	d: LTerm,
	delta: NablaList,
): [NablaList, DeltaMap] | null {
	if (typeof d !== "object")
		throw new Error(`Not an object: ${d}`);

	return match<LTerm, NablaPackage | null>(d)
		.with(
			pmtch.nom,
			(d) => d.name === a.name,
			(_d) => null,
		)
		.with(
			pmtch.nom,
			(d) => d.name !== a.name,
			(_d) => [delta, emptyDelta],
		)
		.with(
			pmtch.tie,
			(d) => d.name.name === a.name,
			(_d) => [delta, emptyDelta],
		)
		.with(
			pmtch.tie,
			(d) => d.name.name !== a.name,
			(d): NablaPackage => [
				delta.unshift([a, d.term]),
				emptyDelta,
			],
		)
		.with(pmtch.susp, (d): NablaPackage | null => {
			// return [delta.unshift([d.applySwapsReversed(a) as LNom, d.getLvar()]), emptyDelta];
			if (a.name === d.swap[1].name) {
				return [
					delta.unshift([d.swap[0], d.term]),
					emptyDelta,
				];
			} else if (a.name === d.swap[0].name) {
				return [
					delta.unshift([d.swap[1], d.term]),
					emptyDelta,
				];
			} else {
				return [delta.unshift([a, d.term]), emptyDelta];
			}
		})
		.with(pmtch.lvar, (d) => {
			return [delta, emptyDelta.restrict([a], d)];
		})
		.with(pmtch.pair, (d): NablaPackage => {
			return [
				delta.unshift([a, d.first], [a, d.second]),
				emptyDelta,
			];
		})
		.with(pmtch.literal, () => {
			return [delta, emptyDelta];
		})
		.with(pmtch.empty, () => {
			return [delta, emptyDelta];
		})
		.otherwise(() => {
			console.error(
				"NablaRules",
				a.toString(),
				d.toString(),
			);
			return null;
		});
}

/**
 * (define apply-sigma-rules
  (lambda (eqns fk)
    (cond
      ((null? eqns) `(,empty-sigma ,empty-delta))
      (else
       (let ((eqn (car eqns)) (eqns (cdr eqns)))
         (mv-let ((eqns sigma delta) (or (sigma-rules eqn eqns) (fk)))
           (mv-let ((sigma^ delta^) (apply-sigma-rules eqns fk))
             `(,(compose-subst sigma sigma^) ,(delta-union delta^ delta)))))))))

(define apply-nabla-rules
  (lambda (delta fk)
    (cond
      ((null? delta) empty-nabla)
      (else
       (let ((c (car delta)) (delta (cdr delta)))
         (mv-let ((delta nabla) (or (nabla-rules c delta) (fk)))
           (delta-union nabla (apply-nabla-rules delta fk))))))))
 */

function applySigmaRules2(
	eqns: ImmList<[LTerm, LTerm]>,
	increment = 0,
): [Subst, NablaList, number] | null {
	if (eqns.size === 0)
		return [emptySigma, emptyNabla, increment];
	const eqn = eqns.first();
	if (!eqn) throw new Error("No eqn");
	const eqns1 = eqns.shift();
	const result = sigmaRules(eqn, eqns1, increment);
	if (!result) return null;
	const [eqns2, sigma, delta1, inc2] = result;
	const result2 = applySigmaRules2(eqns2, inc2);
	if (!result2) return null;
	const [sigma1, delta, inc3] = result2;
	const sigma3 = composeSubst(sigma, sigma1);
	if (!sigma3) return null;
	const delta3 = delta.concat(delta1);
	return [sigma3, delta3, inc3];
}

function applyNablaRules(
	delta: NablaList,
): DeltaMap | null {
	if (delta.size === 0) return emptyDelta;
	// const [c, ...delta2] = delta;
	const c = delta.first();
	if (!c) throw new Error("No c");
	const delta2 = delta.shift();
	const result = nablaRules(c[0], c[1], delta2);
	if (!result) return null;
	const [delta3, nabla] = result;
	const nabla2 = applyNablaRules(delta3);
	if (!nabla2) return null;
	return nabla.union(nabla2);
}
/**
 * (define σ-rules
(λ (eqn )
(pmatch eqn
((,c . ,ˆc)
(guard (not (pair? c)) (equal? c ˆc))
‘(, ,empty-σ ,empty-δ))
(((tie ,a ,t) . (tie ,ˆa ,ˆt))
(guard (eq? a ˆa))
‘(((,t . ,ˆt) . ,) ,empty-σ ,empty-δ))
(((tie ,a ,t) . (tie ,ˆa ,ˆt))
(guard (not (eq? a ˆa)))
(let ((ˆu (apply-π ‘((,a ,ˆa)) ˆt)))
‘(((,t . ,ˆu) . ,) ,empty-σ ((,a . ,ˆt)))))
(((nom ) . (nom ))
(guard (eq? (car eqn) (cdr eqn)))
‘(, ,empty-σ ,empty-δ))
(((susp ,π ,x ) . (susp ,ˆπ ,ˆx))
(guard (eq? (x ) (ˆx)))
(let ((δ (map (λ (a) ‘(,a . ,(x )))
(disagreement-set π ˆπ))))
‘(, ,empty-σ ,δ)))
(((susp ,π ,x ) . ,t)
(guard (not (occurs√
(x ) t)))
(let ((σ ‘((,(x ) . ,(apply-π (reverse π) t)))))
‘(,(apply-subst σ ) ,σ ,empty-δ)))
((,t . (susp ,π ,x ))
(guard (not (occurs√
(x ) t)))
(let ((σ ‘((,(x ) . ,(apply-π (reverse π) t)))))
‘(,(apply-subst σ ) ,σ ,empty-δ)))
(((,t1 . ,t2 ) . (,ˆt1 . ,ˆt2))
(guard (untagged? t1 ) (untagged? ˆt1))
‘(((,t1 . ,ˆt1) (,t2 . ,ˆt2) . ,) ,empty-σ ,empty-δ))
(else #f))))
 */

const emptyNabla: NablaList = ImmList();

function sigmaRules(
	eqn: [LTerm, LTerm],
	eqns: ImmList<[LTerm, LTerm]>,
	increment = 0,
): LPackage | null {
	// console.log("sigmaRules", [eqn[0].toString(), eqn[1].toString()],
	// eqns.size,
	// eqns.map(([a, b]) => [a.type, b.type]).toArray());
	return (
		match<[LTerm, LTerm], LPackage | null>(eqn)
			.with(
				[pmtch.other, pmtch.other],
				([a, b]) => {
					return a.selfEquiv(b);
				},
				([_a, _b]): LPackage | null => {
					return [eqns, emptySigma, emptyNabla, increment];
				},
			)
			.with(
				[pmtch.pair, pmtch.empty],
				[pmtch.empty, pmtch.pair],
				[pmtch.pair, pmtch.literal],
				[pmtch.literal, pmtch.pair],
				([_a, _b]) => {
					return null;
				},
			)
			// .with([pmtch.nom, pmtch.nom], ([a, b]) => {
			//   return a.name === b.name;
			// }, ([_c, _c2]): LPackage | null => {
			//   return [eqns, emptySigma, emptyNabla, increment];
			// })
			.with(
				[pmtch.tie, pmtch.tie],
				([a, b]) => {
					return a.name.name === b.name.name;
				},
				([c, c2]): LPackage | null => {
					return [
						eqns.unshift([c.term, c2.term]),
						emptySigma,
						emptyNabla,
						increment,
					];
				},
			)
			.with(
				[pmtch.tie, pmtch.tie],
				([a, b]) => {
					return a.name.name !== b.name.name;
				},
				([a, b]): LPackage | null => {
					const aa = a.name;
					const aHat = b.name;
					const t = a.term;
					const tHat = b.term;
					const uHat = applySwap([aa, aHat], tHat);
					if (tHat.selfEquiv(aa)) {
						return null;
					}
					return [
						eqns.unshift([t, uHat]),
						emptySigma,
						ImmList([[aa, tHat]]),
						increment,
					];
				},
			)
			// .with([pmtch.literal, pmtch.literal],
			//   ([a, b]) => {
			//     return a.value !== b.value;
			//   },
			//    ([_a, _b]) => {
			//   // return [eqns, emptySigma, emptyNabla, increment];
			//   return null;
			// })
			// .with([pmtch.empty, pmtch.other], ([_a, _b]) => {
			//   return null;
			// })
			.with(
				[pmtch.lvar, pmtch.lvar],
				([a, b]) => {
					return a.name !== b.name;
				},
				([a, b]): LPackage | null => {
					// return [eqns, emptySigma, emptyNabla, increment];
					return updateGeneral(a, b, eqns, increment);
				},
			)
			.with(
				[pmtch.lvar, pmtch.notsusp],
				([a, b]) => {
					return b.occursCheck(a);
				},
				([_a, _b]): LPackage | null => {
					return null;
				},
			)
			.with(
				[pmtch.notsusp, pmtch.lvar],
				([a, b]) => {
					return a.occursCheck(b);
				},
				([_a, _b]): LPackage | null => {
					return null;
					// return [eqns, emptySigma, emptyNabla, increment];
				},
			)
			.with(
				[pmtch.susp, pmtch.lvar],
				([a, b]) => {
					return !a.occursCheck(b);
				},
				([a, b]): LPackage | null => {
					return updateSuspension(a, b, eqns, increment);
					// return updateGeneral(a, b, eqns, increment);
				},
			)
			.with(
				[pmtch.lvar, pmtch.susp],
				([a, b]) => {
					return !b.occursCheck(a);
				},
				([a, b]): LPackage | null => {
					return updateGeneral(b, a, eqns, increment);
				},
			)
			.with(
				[pmtch.lvarOrSusp, pmtch.lvarOrSusp],
				([a, b]) => {
					return a.occursCheck(b) || b.occursCheck(a);
				},
				([c, c2]): LPackage | null => {
					return applyDisagreements(c, c2, eqns, increment);
				},
			)
			.with(
				[pmtch.susp, pmtch.other],
				([a, b]) => {
					return !b.occursCheck(a);
				},
				([a, b]): LPackage | null => {
					return updateSuspension(a, b, eqns, increment);
				},
			)
			.with(
				[pmtch.other, pmtch.susp],
				([a, b]) => {
					return !a.occursCheck(b);
				},
				([a, b]): LPackage | null => {
					// console.log(`sigmaRules notsusp susp ${a.toString()} ${b.toString()}`);
					return updateSuspension(b, a, eqns, increment);
				},
			)
			.with(
				[pmtch.lvar, pmtch.notsusp],
				([a, b]) => {
					return !b.occursCheck(a);
				},
				([a, b]): LPackage | null => {
					// console.log("sigmaRules lvar notsusp1", a.toString(), b.toString());
					return updateGeneral(b, a, eqns, increment);
				},
			)
			.with(
				[pmtch.notsusp, pmtch.lvar],
				([a, b]) => {
					return !a.occursCheck(b);
				},
				([a, b]): LPackage | null => {
					// console.log("sigmaRules lvar notsusp2", a.toString(), b.toString());
					return updateGeneral(a, b, eqns, increment);
				},
			)
			.with(
				[pmtch.pair, pmtch.pair],
				([a, b]): LPackage | null => {
					// return [eqns, ImmMap(), ImmMap()];
					if (a.first.selfEquiv(b.first)) {
						if (a.second.selfEquiv(b.second)) {
							return [
								eqns,
								emptySigma,
								emptyNabla,
								increment,
							];
						}
						return [
							eqns.unshift([a.second, b.second]),
							emptySigma,
							emptyNabla,
							increment,
						];
					} else if (a.second.selfEquiv(b.second)) {
						return [
							eqns.unshift([a.first, b.first]),
							emptySigma,
							emptyNabla,
							increment,
						];
					}
					return [
						eqns.unshift(
							[a.first, b.first],
							[a.second, b.second],
						),
						emptySigma,
						emptyNabla,
						increment,
					];
				},
			)
			.otherwise(() => {
				// console.log(`sigmaRules otherwise ${eqn[0].toString()} ${eqn[1].toString()}`);
				return null;
			})
	);
}

function updateSuspension(
	b: LSuspension,
	a: LTerm,
	eqns: ImmList<[LTerm, LTerm]>,
	increment: number,
): LPackage | null {
	// if (a instanceof LSuspension) {

	//   const newLvar = new LLVar(`$&${increment}`);
	//   const aNew = a.applySwapsReversed(newLvar);
	//   const aLvar = a.getLvar();
	//   const bNew = b.applySwapsReversed(newLvar);
	//   const bLvar = b.getLvar();

	//   const sigma = new Subst({
	//     mp: ImmMap([[bLvar.name, bNew], [aLvar.name, aNew]])
	//   });
	//   const remappedEqs = remapEqns(eqns, sigma);
	//   return [remappedEqs, sigma, emptyNabla, increment + 1];
	// }
	return updateGeneral(
		b.applySwapsReversed(a),
		b.getLvar(),
		eqns,
		increment,
	);
}

function randomString(): string {
	return Math.random()
		.toString(36)
		.substring(7)
		.toUpperCase();
}

function updateGeneral(
	b: LTerm,
	a: LLVar,
	eqns: ImmList<[LTerm, LTerm]>,
	increment: number,
): LPackage | null {
	// if (b instanceof LSuspension) {
	//   const newLvar = new LLVar(`$&${increment}`);
	//   const bLvar = b.getLvar();
	//   const sigma = new Subst({
	//     mp: ImmMap([[a.name, b.applySwaps(newLvar)], [bLvar.name, newLvar]])
	//   });
	//   const remappedEqs = remapEqns(eqns, sigma);
	//   return [remappedEqs, sigma, emptyNabla, increment + 1];
	// } else if (b instanceof LLVar) {
	//     const newLvar = new LLVar(`$&${increment}`);
	//     const sigma = new Subst({
	//       mp: ImmMap([[a.name, newLvar], [b.name, newLvar]])
	//     });
	//     const remappedEqs = remapEqns(eqns, sigma);
	//     return [remappedEqs, sigma, emptyNabla, increment + 1];
	// }
	const sigma = new Subst({
		mp: ImmMap([[a.name, b]]),
	});
	const remappedEqs = remapEqns(eqns, sigma);
	return [remappedEqs, sigma, emptyNabla, increment];
}

function splitUpPairs(
	aP: LPair,
	bP: LPair,
): [LTerm, LTerm][] {
	const res =
		aP.second instanceof LPair && bP.second instanceof LPair
			? splitUpPairs(aP.second, bP.second)
			: [[aP.second, bP.second] as [LTerm, LTerm]];
	if (aP.first.selfEquiv(bP.first)) {
		return res;
	}
	return [[aP.first, bP.first], ...res];
}

function applyDisagreements(
	a: LLVar | LSuspension,
	b: LLVar | LSuspension,
	eqns: ImmList<[LTerm, LTerm]>,
	increment: number,
): LPackage | null {
	const c = a instanceof LSuspension ? a : b;
	const c2 = a instanceof LSuspension ? b : a;
	if (c instanceof LLVar) {
		return [eqns, emptySigma, emptyNabla, increment];
	}
	const disagreementSet = c.disagreementSet(c2);
	const dgSet = ImmSet([...disagreementSet]);
	if (!dgSet || !dgSet.size)
		return [eqns, emptySigma, emptyNabla, increment];
	return [
		eqns,
		emptySigma,
		ImmList([
			...dgSet
				.toArray()
				.map((xz): [LNom, LTerm] => [new LNom(xz), a]),
		]),
		increment,
	];
}
