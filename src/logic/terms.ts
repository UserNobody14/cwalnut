import type { AnyGoal, CleanOutput, Goal } from "./types";
import type { Subst } from "./Subst";
import type { State } from "./State";
import { applySwap } from "./swapUnify";
import { P } from "ts-pattern";
import type { MGoal } from "./streams";

function stringToHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash += (str.charCodeAt(i) * 31) ** (str.length - i);
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

// As classes:

export abstract class LTerm {
	// What type it is, unique to each subclass
	public abstract type: string;
	// How important it is for this term to be on the left side when running unify
	public abstract leftRank: number;
	// If there are exceptions to the leftRank rule, list them here
	public leftExceptions: Set<string> = new Set();
	public abstract equiv(v: this): boolean;
	public abstract hashCode(): number;
	public abstract occursCheck(v: LTerm): boolean;
	public abstract toString(): string;
	// Checks whether any lvars or unbound variables are in the term
	public abstract isLiteral(): boolean;
	public selfEquiv(v: LTerm): boolean {
		if (!v) throw new Error(`No v ${this.toString()}`);
		return this.type === v.type && this.equiv(v as this);
	}
	public abstract doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean;
	public map(
		f: (z: LTerm, original?: LTerm) => LTerm,
	): LTerm {
		return f(this, this);
	}
	public abstract nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null;
	public varUnifyEmptyScope(
		s: State,
		v: LLVar,
	): State | null {
		if (this.doesLvarOccur(v.name, (z) => s.find(z))) {
			// throw new Error(`Infinite loop between: ${this.toString()} and ${v.toString()}`);
			return null;
		}
		return s.extend(v, this);
	}
	// public abstract varUnifyHigherOrder(s: State, v: LLVar): State | null;
	public unite(s: State, v: LTerm): State | null {
		if (this.leftRank > v.leftRank) {
			return v.nonEquivalentUnite(s, this);
		}
		return this.nonEquivalentUnite(s, v);
	}

	public warn(msg: string) {
		// console.warn(msg);
	}

	// public abstract uniteScoped(s: State, v: LTerm, st: LocalScopeStore): [State, LocalScopeStore] | null;

	public reify(_s: Subst): LTerm {
		return this;
	}
	public abstract cleanOutput(): CleanOutput;
}
export class LLVar extends LTerm {
	type = "lvar";
	leftRank = 0;
	constructor(public name: string) {
		super();
	}

	public isLiteral(): boolean {
		return false;
	}

	toString(): string {
		return `$${this.name}`;
	}

	equiv = (v: LLVar): boolean => {
		return this.name === v.name;
	};

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}

	public doesLvarOccur(
		x: string,
		_find: (z: LTerm) => LTerm,
	): boolean {
		return this.name === x;
	}
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		throw new Error("LVars do not unite");
	}

	override varUnifyEmptyScope(
		s: State,
		v: LLVar,
	): State | null {
		return s.extend(this, v);
	}

	override reify(s: Subst): LTerm {
		const fv = s.find(this);
		if (fv instanceof LLVar) {
			return fv;
		}
		return fv.reify(s);
	}
	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.name);
		return strH ^ this.leftRank;
	}
	cleanOutput(): CleanOutput {
		return `?${this.name}`;
	}
}

export class LLiteral extends LTerm {
	leftRank = 50;
	type = "literal" as const;
	constructor(public value: string | boolean | number) {
		super();
	}
	public isLiteral(): boolean {
		return true;
	}
	toString(): string {
		return `${this.value}`;
	}

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}

	public equiv(v: LLiteral): boolean {
		return this.value === v.value;
	}
	public doesLvarOccur(
		_x: string,
		_find: (z: LTerm) => LTerm,
	): boolean {
		return false;
	}
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LLiteral && this.value === v.value)
			return s;
		// this.warn(`Failed to unite ${this.toString()} and ${v.toString()}`);
		return null;
	}

	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.value.toString());
		return strH ^ this.leftRank;
	}

	cleanOutput(): CleanOutput {
		return this.value;
	}
}

export class LEmpty extends LTerm {
	type = "empty" as const;
	leftRank = 100;

	public isLiteral(): boolean {
		return true;
	}
	toString(): string {
		return "[]";
	}

	public equiv(v: LEmpty): boolean {
		return v.type === this.type;
	}

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}

	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return false;
	}

	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LEmpty) return s;
		this.warn(
			`Failed to unite (Lempty) ${this.toString()} and ${v.toString()}`,
		);
		return null;
	}

	public hashCode(): number {
		// Add protections on the others?
		return this.leftRank;
	}

	cleanOutput(): CleanOutput {
		return [];
	}
}

export class LPair extends LTerm {
	type = "pair" as const;
	public leftRank = 4;
	public leftExceptions: Set<string> = new Set(["lvar"]);
	constructor(
		public readonly first: LTerm,
		public readonly second: LTerm,
	) {
		super();
	}

	public isLiteral(): boolean {
		return (
			this.first.isLiteral() && this.second.isLiteral()
		);
	}
	toString(): string {
		return `[${this.first.toString()}, ${this.second.toString()}]`;
	}

	map(f: (z: LTerm, orig?: LTerm) => LTerm): LTerm {
		return f(
			new LPair(this.first.map(f), this.second.map(f)),
			this,
		);
	}

	public equiv(v: LPair): boolean {
		return (
			this.first.selfEquiv(v.first) &&
			this.second.selfEquiv(v.second)
		);
	}

	public occursCheck(v: LTerm): boolean {
		return (
			this.selfEquiv(v) ||
			this.first.occursCheck(v) ||
			this.second.occursCheck(v)
		);
	}
	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return (
			find(this.first).doesLvarOccur(x, find) ||
			find(this.second).doesLvarOccur(x, find)
		);
	}
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LPair) {
			const sz = s.unify(this.first, v.first);
			if (sz) {
				return sz.unify(this.second, v.second);
			} else {
				return null;
			}
		}
		this.warn(
			`Failed to unite higher order lpair ${this.reify(s.subst).toString()} and ${v.reify(s.subst).toString()}`,
		);
		return null;
	}
	// public varUnifyEmptyScope(s: State, v: LLVar): State | null {
	//     return s.withLvar((v1) => (sc) => {
	//         return sc.withLvar((v2) => (sc2) => {
	//             const pairVariable = new LPair(v1, v2);
	//             const freshIncrement = sc2.extend(v, pairVariable).unify(this.first, v1);
	//             if (freshIncrement) {
	//                 return freshIncrement.updateLocal(
	//                     l => l.setPhi1(sc.i.local.phi1).setPhi2(sc.i.local.phi2)
	//                 ).unify(this.second, v2);
	//             }
	//             return null;
	//         });
	//     });
	// }
	/**
     * 
     *           [(and (variable? t₁) (pair? t₂))
           (let ([v₁ (variable (gensym))]
                 [v₂ (variable (gensym))])
             (match (unif φ₁ v₁ φ₂ (car t₂) (ext-subst σ t₁ (cons v₁ v₂)) χ xs)
               [#f #f]
               [`(,σ ,χ ,xs) (unif φ₁ v₂ φ₂ (cdr t₂) σ χ xs)]))]
     */
	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}
	public varUnifyHigherOrder(
		s: State,
		t1: LLVar,
	): State | null {
		// return s.withLvar((v1) => (sc) => {
		//     return sc.withLvar((v2) => (sc2) => {
		//         const pairVariable = new LPair(v1, v2);
		//         const freshIncrement = sc2.extend(t1, pairVariable).unify(this.first, v1);
		//         if (freshIncrement) {
		//             return freshIncrement.updateLocal(
		//                 l => l.setPhi1(sc.i.local.phi1).setPhi2(sc.i.local.phi2)
		//             ).unify(this.second, v2);
		//         }
		//         return null;
		//     }, 'as');
		// }, 'af');
		throw new Error("Method not implemented for now.");
	}

	override reify(s: Subst): LTerm {
		return new LPair(
			this.first.reify(s),
			this.second.reify(s),
		);
	}
	public cleanOutput(): CleanOutput {
		const sc1 = this.second.cleanOutput();
		if (Array.isArray(sc1)) {
			return [this.first.cleanOutput(), ...sc1];
		}
		// throw new Error("Not a list");
		return [this.first.cleanOutput(), sc1];
	}
}

export class LFunctor extends LTerm {
	// Holds a specific record of a set number of arguments
	type = "functor" as const;
	public leftRank = 3;
	constructor(
		public name: string,
		public fields: string[],
		public args: LTerm[],
	) {
		super();
	}
	public isLiteral(): boolean {
		return this.args.every((arg) => arg.isLiteral());
	}

	toString(): string {
		return `${this.name}(${this.args.map((arg, i) => `'${this.fields[i]}': ${arg.toString()}`).join(", ")})`;
	}
	public equiv(v: LFunctor): boolean {
		return (
			this.name === v.name &&
			this.args.every((arg, i) =>
				arg.selfEquiv(v.args[i]),
			) &&
			this.fields.every((field, i) => field === v.fields[i])
		);
	}

	public occursCheck(v: LTerm): boolean {
		return (
			this.selfEquiv(v) ||
			this.args.some((arg) => arg.occursCheck(v))
		);
	}

	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return this.args.every((arg) =>
			find(arg).doesLvarOccur(x, find),
		);
	}
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		throw new Error("Method not implemented for now.");
		// if (!(v instanceof LFunctor)) return null;
		// if (this.name !== v.name) return null;
		// if (this.args.length !== v.args.length) return null;
		// const sz = this.args.reduce<State | null>((acc, arg, i) => {
		//     if (acc === null) return null;
		//     return acc.unify(acc.find(arg), acc.find(v.args[i]));
		// }, s);
		// if (sz) return sz;
		// return null;
	}
	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}

	public cleanOutput(): CleanOutput {
		return {
			name: this.name,
			fields: this.fields,
			args: this.args.map((arg) => arg.cleanOutput()),
		};
	}

	override reify(s: Subst): LTerm {
		return new LFunctor(
			this.name,
			this.fields,
			this.args.map((arg) => arg.reify(s)),
		);
	}
}
export class LNom extends LTerm {
	type = "nom" as const;
	leftRank = 5;
	public leftExceptions: Set<string> = new Set(["lvar"]);
	constructor(public readonly name: string) {
		super();
	}

	public isLiteral(): boolean {
		return true;
	}

	map(f: (z: LTerm) => LTerm): LTerm {
		const nm = f(this);
		if (nm instanceof LNom) return nm;
		throw new Error("Not a nom");
	}

	equiv(v: LNom): boolean {
		// Just for trivial equivalence
		return this.name === v.name;
	}

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}

	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return false;
	}
	toString(): string {
		return `?_${this.name}`;
	}
	/**
     *           [(and (name? t₁) (variable? t₂))
           (let ([n₂ (gen-name φ₁ t₁ φ₂)])
             (and n₂
                  (list (ext-subst σ t₂ n₂) χ (cons t₂ xs))))]
          [(and (variable? t₁) (name? t₂))
           (let ([n₁ (gen-name φ₂ t₂ φ₁)])
             (and n₁
                  (list (ext-subst σ t₁ n₁) χ (cons t₁ xs))))]
     */
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LNom && this.name === v.name) return s;
		this.warn(
			`Failed to unite higher order ${this.toString()} and ${v.toString()}`,
		);
		return null;
	}

	/**
     *           [(and (name? t₁) (variable? t₂))
           (let ([n₂ (gen-name φ₁ t₁ φ₂)])
             (and n₂
                  (list (ext-subst σ t₂ n₂) χ (cons t₂ xs))))]
     */
	public varUnifyHigherOrder(
		s: State,
		v: LLVar,
	): State | null {
		throw new Error("Method not implemented for now.");
	}

	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.name);
		return strH ^ this.leftRank;
	}

	public cleanOutput(): CleanOutput {
		return `Nom(${this.name})`;
	}
}

/**
 *         (cond
          [(and (constant? t₁) (constant? t₂))
           (and (eqv? t₁ t₂)
                (list σ χ xs))]
          [(and (constant? t₁) (variable? t₂))
           (list (ext-subst σ t₂ t₁) χ (cons t₂ xs))]
          [(and (variable? t₁) (constant? t₂))
           (list (ext-subst σ t₁ t₂) χ (cons t₁ xs))]
          [(and (variable? t₁) (variable? t₂))
           (list σ (ext-par χ φ₁ t₁ φ₂ t₂) xs)]
          [(and (name? t₁) (name? t₂))
           (and (same-name? φ₁ t₁ φ₂ t₂)
                (list σ χ xs))]
          [(and (name? t₁) (variable? t₂))
           (let ([n₂ (gen-name φ₁ t₁ φ₂)])
             (and n₂
                  (list (ext-subst σ t₂ n₂) χ (cons t₂ xs))))]
          [(and (variable? t₁) (name? t₂))
           (let ([n₁ (gen-name φ₂ t₂ φ₁)])
             (and n₁
                  (list (ext-subst σ t₁ n₁) χ (cons t₁ xs))))]
          [(and (tie? t₁) (tie? t₂))
           (unif (ext-scp φ₁ (tie-name t₁))
                 (tie-term t₁)
                 (ext-scp φ₂ (tie-name t₂))
                 (tie-term t₂)
                 σ χ xs)]
          [(and (pair? t₁) (pair? t₂))
           (match (unif φ₁ (car t₁) φ₂ (car t₂) σ χ xs)
             [#f #f]
             [`(,σ ,χ ,xs) (unif φ₁ (cdr t₁) φ₂ (cdr t₂) σ χ xs)])]
          [(and (variable? t₁) (tie? t₂))
           (let* ([n₁ (or (gen-name φ₂ (tie-name t₂) φ₁)
                          (name (gensym (name-symb (tie-name t₂)))))]
                  [v₁ (variable (gensym))])
             (unif (ext-scp φ₁ n₁)
                   v₁
                   (ext-scp φ₂ (tie-name t₂))
                   (tie-term t₂)
                   (ext-subst σ t₁ (tie n₁ v₁))
                   χ
                   (cons t₁ xs)))]
          [(and (tie? t₁) (variable? t₂))
           (let* ([n₂ (or (gen-name φ₁ (tie-name t₁) φ₂)
                          (name (gensym (name-symb (tie-name t₁)))))]
                  [v₂ (variable (gensym))])
             (unif (ext-scp φ₁ (tie-name t₁))
                   (tie-term t₁)
                   (ext-scp φ₂ n₂)
                   v₂
                   (ext-subst σ t₂ (tie n₂ v₂))
                   χ
                   (cons t₂ xs)))]
          [(and (variable? t₁) (pair? t₂))
           (let ([v₁ (variable (gensym))]
                 [v₂ (variable (gensym))])
             (match (unif φ₁ v₁ φ₂ (car t₂) (ext-subst σ t₁ (cons v₁ v₂)) χ xs)
               [#f #f]
               [`(,σ ,χ ,xs) (unif φ₁ v₂ φ₂ (cdr t₂) σ χ xs)]))]
          [(and (pair? t₁) (variable? t₂))
           (let ([v₁ (variable (gensym))]
                 [v₂ (variable (gensym))])
             (match (unif φ₁ (car t₁) φ₂ v₁ (ext-subst σ t₂ (cons v₁ v₂)) χ xs)
               [#f #f]
               [`(,σ ,χ ,xs) (unif φ₁ (cdr t₁) φ₂ v₂ σ χ xs)]))]
          [else #f]))))
 */

export class LTie extends LTerm {
	type = "tie" as const;
	public leftRank = 2;
	public readonly leftExceptions: Set<string> = new Set([
		"lvar",
	]);
	constructor(
		public name: LNom,
		public term: LTerm,
	) {
		super();
	}

	public isLiteral(): boolean {
		return this.term.isLiteral();
	}

	map(f: (z: LTerm) => LTerm): LTerm {
		return f(
			new LTie(this.name.map(f) as LNom, this.term.map(f)),
		);
	}
	equiv(v: LTie): boolean {
		const selfEquivA =
			this.name.selfEquiv(v.name) &&
			this.term.selfEquiv(v.term);
		// const selfEquivB = (
		//     this.isLiteral() && v.isLiteral() && applySwap([this.name, v.name], this.term).selfEquiv(v.term) && (
		//         notFreeIn4(true, this.name, v.term) ?? false
		//     )
		// );
		// return selfEquivA || selfEquivB;
		return selfEquivA;
	}

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v) || this.term.occursCheck(v);
	}

	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return this.term.doesLvarOccur(x, find);
	}
	toString(): string {
		return `(${this.name.toString()}) => ${this.term.toString()}`;
	}
	public reify(_s: Subst): LTerm {
		return new LTie(this.name, this.term.reify(_s));
	}
	/** 
     * 
     * 
     * (./ a M ) and (./ b N ) are α-equivalent if and only
if a and b are the same nom and M is α-equivalent
to N , or if (susp ((a b)) M ) is α-equivalent to N and
(# b M ).
    */
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LTie) {
			throw new Error("Not implemented for now");
		} else {
			return null;
		}
	}
	/** 
     *           [(and (variable? t₁) (tie? t₂))
           (let ([n₁ (name (gensym (name-symb (tie-name t₂))))]
                 [v₁ (variable (gensym))])
             (unif (ext-scp φ₁ n₁)
                   v₁
                   (ext-scp φ₂ (tie-name t₂))
                   (tie-term t₂)
                   (ext-subst σ t₁ (tie n₁ v₁))
                   χ
                   xs))]
    */
	// public varUnifyEmptyScope(s: State, v: LLVar) {
	//     return s.withLvar((v1) => (sc) => {
	//         return sc.withNom((n1) => (sc2) => {
	//             const t1 = new LTie(n1, v1);
	//             return sc2.updateLocal(
	//                 l => l.extendScopePhi1(this.name).extendScopePhi2(n1)
	//             ).extend(v, t1).unify(this.term, v1);
	//         });
	//     });
	// }

	// public varUnifyEmptyScope(s: State, v: LLVar) {
	//     return s.withLvar((v1) => (sc) => {
	//         return sc.withNom((n1) => (sc2) => {
	//             const t1 = new LTie(n1, v1);
	//             return sc2.updateLocal(
	//                 l => l.extendScopePhi1(this.name).extendScopePhi2(n1)
	//             ).extend(v, t1).unify(this.term, v1);
	//         });
	//     });
	// }

	/**
                 *           
          [(and (variable? t₁) (tie? t₂))
           (let* ([n₁ (or (gen-name φ₂ (tie-name t₂) φ₁)
                          (name (gensym (name-symb (tie-name t₂)))))]
                  [v₁ (variable (gensym))])
             (unif (ext-scp φ₁ n₁)
                   v₁
                   (ext-scp φ₂ (tie-name t₂))
                   (tie-term t₂)
                   (ext-subst σ t₁ (tie n₁ v₁))
                   χ
                   (cons t₁ xs)))]

                 */

	public varUnifyHigherOrder(
		s: State,
		t1: LLVar,
	): State | null {
		// const possibleN1 = genName(s.i.local.phi1, this.name, s.i.local.phi2);
		// return s.withLvar((v1) => (sc) => {
		//     if (possibleN1) {
		//         const t1New = new LTie(possibleN1, v1);
		//         return sc.updateLocal(
		//             l => l.extendScopePhi1(this.name).extendScopePhi2(possibleN1).addLvar(t1)
		//         ).extend(t1, t1New).unify(this.term, v1);
		//     } else {
		//         return sc.withNom((n1) => (sc2) => {
		//             const t1New = new LTie(n1, v1);
		//             return sc2.updateLocal(
		//                 l => l.extendScopePhi1(this.name).extendScopePhi2(n1).addLvar(t1)
		//             ).extend(t1, t1New).unify(this.term, v1);
		//         }, 'tn');
		//     }
		// }, 'tf');
		throw new Error("Not implemented for now");
	}

	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}
	/** 
             *           [(and (tie? t₁) (variable? t₂))
           (let* ([n₂ (or (gen-name φ₁ (tie-name t₁) φ₂)
                          (name (gensym (name-symb (tie-name t₁)))))]
                  [v₂ (variable (gensym))])
             (unif (ext-scp φ₁ (tie-name t₁))
                   (tie-term t₁)
                   (ext-scp φ₂ n₂)
                   v₂
                   (ext-subst σ t₂ (tie n₂ v₂))
                   χ
                   (cons t₂ xs)))]
            */

	public cleanOutput(): CleanOutput {
		return {
			name: this.name.cleanOutput(),
			term: this.term.cleanOutput(),
		};
	}
}

export type LPredicateFn = (...args: LTerm[]) => MGoal;

export class LPredicate extends LTerm {
	type = "predicate" as const;
	public leftRank = 6;
	constructor(
		public readonly name: string,
		public readonly fn: LPredicateFn,
	) {
		super();
	}
	public isLiteral(): boolean {
		return false;
	}
	equiv(v: LPredicate): boolean {
		return this.name === v.name;
	}

	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}

	public doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return false;
	}
	toString(): string {
		return `Predicate(${this.name})`;
	}
	public nonEquivalentUnite(
		s: State,
		v: LTerm,
	): State | null {
		if (v instanceof LPredicate && this.name === v.name)
			return s;
		return null;
	}
	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}
	public cleanOutput(): CleanOutput {
		return `Predicate(${this.name})`;
	}
}

export class LConstraint<
	T extends LTerm,
	Z extends LTerm,
> extends LTerm {
	// Wraps a term in a constraint, when the term is reified/unified, the constraint is applied
	type = "constraint" as const;
	public leftRank = -1;
	constructor(
		public term: T,
		public constraintKind: string,
		public constraintArgs: Z[],
		public constraint: (
			s: State,
			curr: T,
			args: Z[],
		) => State | null,
	) {
		super();
	}

	public isLiteral(): boolean {
		return false;
	}

	equiv(v: LConstraint<T, Z>): boolean {
		return (
			this.term.selfEquiv(v.term) &&
			this.constraintKind === v.constraintKind &&
			this.constraintArgs.every((arg, i) =>
				arg.selfEquiv(v.constraintArgs[i]),
			)
		);
	}

	public occursCheck(v: LTerm): boolean {
		return (
			this.selfEquiv(v) ||
			this.term.occursCheck(v) ||
			this.constraintArgs.some((arg) => arg.occursCheck(v))
		);
	}

	doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return (
			this.term.doesLvarOccur(x, find) ||
			this.constraintArgs.some((arg) =>
				arg.doesLvarOccur(x, find),
			)
		);
	}

	toString(): string {
		return `Constraint: ${this.term.toString()} ${this.constraintKind} ${this.constraintArgs.map((arg) => arg.toString()).join(" ")}`;
	}

	nonEquivalentUnite(s: State, v: LTerm): State | null {
		// naively unify the term, then apply the constraint
		const sz = s.unify(s.find(this.term), s.find(v));
		if (!sz) return null;
		const nt = this.term.reify(sz.subst) as T;
		const nts = this.constraint(
			sz,
			nt,
			this.constraintArgs,
		);
		return nts;
	}
	public cleanOutput(): CleanOutput {
		return {
			term: this.term.cleanOutput(),
			constraintKind: this.constraintKind,
			constraintArgs: this.constraintArgs.map((arg) =>
				arg.cleanOutput(),
			),
		};
	}

	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}

	public reify(s: Subst): LTerm {
		return new LConstraint(
			this.term.reify(s) as T,
			this.constraintKind,
			this.constraintArgs.map((arg) => arg.reify(s) as Z),
			this.constraint,
		);
	}
}
export class LStaticClosure extends LTerm {
	type = "staticclosure" as const;
	leftRank = 1;
	constructor(
		public level: number,
		public scope: unknown,
		public name: LNom,
		public closure: LTerm,
	) {
		super();
	}

	public isLiteral(): boolean {
		return false;
	}
	/**
     * 
     * Static closures support the following operations:
• ext(𝜙, a) adds the name a to the scope 𝜙. If a has been previously added to 𝜙, then this
older one is shadowed and its corresponding level becomes unusable.
• db(𝜙, a) is Just ℓ where ℓ is the de Bruijn level of a w.r.t the scope 𝜙, if a is not shadowed
in 𝜙; otherwise, the result is Nothing.
• db(𝜙, ℓ) is Just ℓ, if ℓ is available in 𝜙; otherwise, the result is Nothing
     */
	equiv(v: LStaticClosure): boolean {
		return this.closure === v.closure;
	}
	public occursCheck(v: LTerm): boolean {
		return this.selfEquiv(v);
	}
	doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return false;
	}
	nonEquivalentUnite(s: State, v: LTerm): State | null {
		if (
			v instanceof LStaticClosure &&
			this.closure === v.closure
		)
			return s;
		return null;
	}
	toString(): string {
		return `Closure(${this.closure})`;
	}
	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}
	public cleanOutput(): CleanOutput {
		return {
			level: this.level,
			scope: "YET TO IMPLEMENT",
			name: this.name.cleanOutput(),
			closure: this.closure.cleanOutput(),
		};
	}
}

export class LSuspension extends LTerm {
	type = "susp" as const;
	leftRank = 1;
	constructor(
		public readonly swap: [LNom, LNom],
		public term: LLVar | LSuspension,
	) {
		super();
	}
	equiv(v: LSuspension): boolean {
		return (
			(v.swap[0].selfEquiv(this.swap[0]) &&
				v.swap[1].selfEquiv(this.swap[1]) &&
				v.term.selfEquiv(this.term)) ||
			// TODO: maybe wrong?
			(this.getLvar().equiv(v.getLvar()) &&
				this.disagreementSet(v).size === 0)
		);
	}

	public occursCheck(v: LTerm): boolean {
		if (v instanceof LSuspension) {
			return this.getLvar().occursCheck(v.getLvar());
		}
		return this.getLvar().occursCheck(v);
	}

	public isLiteral(): boolean {
		return false;
	}

	public map(f: (z: LTerm, orig?: LTerm) => LTerm): LTerm {
		const mappedTerm = this.term.map(f);
		if (mappedTerm instanceof LSuspension) {
			return f(
				new LSuspension(
					[this.swap[0], this.swap[1]],
					mappedTerm,
				),
				this,
			);
		} else if (mappedTerm instanceof LLVar) {
			return f(
				new LSuspension(
					[this.swap[0], this.swap[1]],
					mappedTerm,
				),
				this,
			);
		} else throw new Error("Not a suspension!");
	}

	public reify(_s: Subst): LTerm {
		const rT = this.getLvar().reify(_s);
		if (rT instanceof LLVar)
			return this.formSuspension(this.toSwapList(), rT);
		if (rT instanceof LSuspension)
			return this.formSuspension(
				[...this.toSwapList(), ...rT.toSwapList()],
				rT.getLvar(),
			);
		return this.applySwaps(rT);
	}

	formSuspension(
		s: [LNom, LNom][],
		v: LLVar,
	): LSuspension | LLVar {
		if (s.length === 0) return v;
		return new LSuspension(
			s[0],
			this.formSuspension(s.slice(1), v),
		);
	}

	doesLvarOccur(
		x: string,
		find: (z: LTerm) => LTerm,
	): boolean {
		return this.term.doesLvarOccur(x, find);
	}

	getLvar(): LLVar {
		if (this.term instanceof LLVar) return this.term;
		return this.term.getLvar();
	}

	toSwapList(): [LNom, LNom][] {
		if (this.term instanceof LSuspension)
			return [
				[this.swap[0], this.swap[1]],
				...this.term.toSwapList(),
			];
		return [this.swap];
	}

	toReverseSwapList(): [LNom, LNom][] {
		return [...this.toSwapList()].reverse();
	}

	replaceLvar(v: LLVar): LLVar | LSuspension {
		if (this.term instanceof LLVar)
			return new LSuspension(this.swap, v);
		return new LSuspension(
			this.swap,
			this.term.replaceLvar(v),
		);
	}

	applySwaps(v: LTerm): LTerm {
		const swaps = this.toSwapList();
		return this.applySwapsToTerm(swaps, v);
	}

	private applySwapsToTerm(
		swaps: [LNom, LNom][],
		v: LTerm,
	): LTerm {
		return swaps.reduceRight(
			(acc, [a, b]) => applySwap([a, b], acc),
			v,
		);
	}

	applySwapsReversed(v: LTerm) {
		const swaps = this.toReverseSwapList();
		return this.applySwapsToTerm(swaps, v);
	}

	/**
     * Finding the disagreement set of two lists of swaps π
and ˆπ requires forming a set of all the noms in those
lists, then applying both π and ˆπ to each nom a in this
set. If (apply-π π a) and (apply-π ˆπ a) produce different
noms, then a is in the disagreement set. (filter and remove-
duplicates are defined in Appendix A.3.)
(define disagreement-set
(λ (π ˆπ)
(filter
(λ (a) (not (eq? (apply-π π a) (apply-π ˆπ a))))
(remove-duplicates
(append (apply append π) (apply append ˆπ))))))
     */

	disagreementSet(v: LSuspension | LLVar): Set<string> {
		console.log("Disagreement set query");
		const allNoms = this.getCombinedSwaps(v);
		const disagreementSet = new Set<string>();
		for (const nom of allNoms) {
			const thisNom = this.applySwaps(
				new LNom(nom),
			) as LNom;
			if (v instanceof LLVar) {
				if (thisNom.name !== nom) {
					disagreementSet.add(nom);
				}
				continue;
			}
			const vNom = v.applySwaps(new LNom(nom)) as LNom;
			if (thisNom.name !== vNom.name) {
				disagreementSet.add(nom);
			}
		}
		return disagreementSet;
	}

	private getCombinedSwaps(v: LSuspension | LLVar) {
		const thisSwapList = this.toSwapList();
		const thisSwapSet = new Set(
			thisSwapList.flat().map((a) => a.name),
		);
		if (v instanceof LLVar) return thisSwapSet;
		const vSwapList = v.toSwapList();
		const vSwapSet = new Set(
			vSwapList.flat().map((a) => a.name),
		);
		const allNoms = new Set([...thisSwapSet, ...vSwapSet]);
		return allNoms;
	}

	// addDisagreementSetToState(s: State, disagreementSet: Set<string>): State | null {
	//     let s2: State | null = s;
	//     for (const nom of disagreementSet) {
	//         const n1 = new LNom(nom);
	//         if (s2 === null) return null;
	//         s2 = availableo3(s2, n1, this)
	//     }
	//     return s2;
	// }

	// addDisagreementSet(s: State, v: LSuspension | LLVar): State | null {
	//     // For each item in the disagreement set, add an availableo restriction:
	//     const disagreementSet = this.disagreementSet(v);
	//     if (disagreementSet.size === 0) return s;
	//     return this.addDisagreementSetToState(s, disagreementSet);
	// }

	nonEquivalentUnite(s: State, v1: LTerm): State | null {
		const v = v1.reify(s.subst);
		if (v instanceof LSuspension) {
			if (
				this.swap[0].selfEquiv(v.swap[0]) &&
				this.swap[1].selfEquiv(v.swap[1])
			) {
				return s.unify(this.term, v.term);
			} else if (
				this.swap[1].selfEquiv(v.swap[0]) &&
				this.swap[0].selfEquiv(v.swap[1])
			) {
				// return s.unify(this.term, v.term);
				return s.unify(this.term, v.term);
			}

			if (v.getLvar().selfEquiv(this.getLvar())) {
				throw new Error(
					"Unification of two suspensions with the same lvar",
				);
				// return this.addDisagreementSet(s, v);
			} else {
				// if (this.disagreementSet(v).size > 0) {
				//     console.warn(`Disagreement set ${this.disagreementSet(v).size}`);
				//     return this.addDisagreementSet(s, v);
				//     // return null;
				// } else {
				//     // return null;
				//     // return s.unify(this.term, v.term);
				//     return s.unify(this.term, applySwap(this.swap, v));
				//     // return s.unify(this.getLvar(), v.applySwapsReversed(this));
				//     // return
				// }
				// const tvar = this.getLvar();
				// const vvar = v.getLvar();
				// Generate an lvar, unify it with both terms, then add the swapunifieseq constraint
				// return s.withLvar((lvar) => (sc) => {
				//     const nState = sc.extend(
				//         this.getLvar(),
				//         this.applySwapsReversed(lvar),
				//     ).extend(
				//         v.getLvar(),
				//         v.applySwapsReversed(lvar),
				//     ).pushLvar(lvar);
				//     if (nState === null) return null;
				//     // return nState;
				//     return addSwapUnifiesConstraint(nState, lvar, this.swap, v.swap);
				//     // return sc.extend(tvar, this).extend(lvar, v).unify(this.term, tvar).unify(v.term, lvar).addConstraint(
				//     //     new LConstraint(
				//     //         tvar,
				//     //         'swapunifieseq',
				//     //         [lvar],
				//     //         (s, curr, args) => {
				//     //             return s.unify(curr, applySwap([args[0], this.swap[1]], v));
				//     //         }
				//     //     )
				//     // );
				// });
				return s.extend(
					this.getLvar(),
					this.applySwapsReversed(v),
				);
			}
		}
		// return s.unify(this.term, applySwap(this.swap, v))?.unify(this.term, applySwap(this.swap, v)) ?? null;
		return s.extend(
			this.getLvar(),
			this.applySwapsReversed(v),
		);
		// return s.unify(this.getLvar(), this.applySwapsReversed(v));
	}
	toString(): string {
		return `Susp([${this.toSwapList()
			.map(([a, b]) => `${a.toString()} -> ${b.toString()}`)
			.join(", ")}] ${this.getLvar().toString()})`;
	}

	public varUnifyEmptyScope(
		s: State,
		v: LLVar,
	): State | null {
		// if (this.getLvar().selfEquiv(v)) return this.addDisagreementSet(s, v)
		// return swapUnifyConstrainAll(s, this, v)?.pushLvar(v)?.pushLvar(this.getLvar()) ?? null;
		return s.extend(v, this);
	}

	public hashCode(): number {
		// Hash the value, plus a unique number for the type
		const strH = stringToHash(this.toString());
		return strH ^ this.leftRank;
	}
	public cleanOutput(): CleanOutput {
		return {
			swap: [
				this.swap[0].cleanOutput(),
				this.swap[1].cleanOutput(),
			],
			term: this.term.cleanOutput(),
		};
	}
}

export const pmtch = {
	nom: P.instanceOf(LNom),
	susp: P.instanceOf(LSuspension),
	tie: P.instanceOf(LTie),
	pair: P.instanceOf(LPair),
	literal: P.instanceOf(LLiteral),
	lvar: P.instanceOf(LLVar),
	empty: P.instanceOf(LEmpty),
	notsusp: P.not(P.instanceOf(LSuspension)),
	lvarOrSusp: P.union(
		P.instanceOf(LLVar),
		P.instanceOf(LSuspension),
	),
	other: P.any,
};
