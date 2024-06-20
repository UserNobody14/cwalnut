import type {
	IdentifierDsAst,
	LiteralDsAst,
	TermDsAst,
} from "src/types/DesugaredAst";
import { make_identifier } from "src/utils/make_desugared_ast";

export class ImmutableAstEnv {
	private lvarCounter = 0;
	private currentlyScopedLvars: IdentifierDsAst[] = [];
	private currentlyOperatingTerms: TermDsAst[] = [];

	// freshLvar(): IdentifierDsAst {
	//     const currLvars = make_identifier(`_lvar${this.lvarCounter++}`);
	//     this.currentlyScopedLvars.push(currLvars);
	//     return currLvars;
	// }

	// Only immutable operations are allowed

	cloneEnv(
		addTerms: TermDsAst[],
		addLvars: IdentifierDsAst[],
		lvarCounter: number,
	): ImmutableAstEnv {
		const newEnv = new ImmutableAstEnv();
		newEnv.lvarCounter = this.lvarCounter + lvarCounter;
		newEnv.currentlyScopedLvars = [
			...this.currentlyScopedLvars,
			...addLvars,
		];
		newEnv.currentlyOperatingTerms = [
			...this.currentlyOperatingTerms,
			...addTerms,
		];
		return newEnv;
	}

	withAdditionalTerms(terms: TermDsAst[]): ImmutableAstEnv {
		const newEnv = this.cloneEnv(terms, [], 0);
		return newEnv;
	}

	withScopedLvar(lvar: IdentifierDsAst): ImmutableAstEnv {
		const newEnv = this.cloneEnv([], [lvar], 0);
		return newEnv;
	}

	freshLvar(): [IdentifierDsAst, ImmutableAstEnv] {
		const currLvars = make_identifier(
			`_lvar${this.lvarCounter++}`,
		);
		return [currLvars, this.withScopedLvar(currLvars)];
	}

	getTerms(): TermDsAst[] {
		return this.currentlyOperatingTerms;
	}

	performOp<T>(
		op: (env: ImmutableAstEnv) => [T, ImmutableAstEnv],
	): T {
		return op(this)[0];
	}

	onSubEnv<T>(
		op: (env: ImmutableAstEnv) => ImmutableAstEnv,
	): ImmutableAstEnv {
		const newEnv = new ImmutableAstEnv();
		newEnv.currentlyOperatingTerms = [];
		newEnv.currentlyScopedLvars = [
			...this.currentlyScopedLvars,
		];
		return op(newEnv);
	}

	monadic1<T>(
		op: (env: [T, ImmutableAstEnv]) => [T, ImmutableAstEnv],
		list: T[],
	): [T[], ImmutableAstEnv] {
		return list.reduce<[T[], ImmutableAstEnv]>(
			([acc, env], item) => {
				const [newItem, newEnv] = op([item, env]);
				return [[...acc, newItem], newEnv];
			},
			[[], this],
		);
	}
}

// Represent an expression with an identifier/literal as the retrievable result, and ops that compose well with the above class
export class ImmutableExprAst {
	private currentIndicator: IdentifierDsAst | null = null;
	private currentLiteral: LiteralDsAst | null = null;
	// Terms held here temporarily, representing things that the expression needs in order to be true
	private currentTerms: TermDsAst[] = [];
}
