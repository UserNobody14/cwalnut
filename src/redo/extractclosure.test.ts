import { test, describe, expect } from "@jest/globals";

import { codeToAst } from "src/redo/ast-desugar";
import type {
	ExpressionGeneric,
	 PredicateDefinitionGeneric,
	 TermGeneric,
} from "src/types/AstGeneric";
import {
	conjunction1,
	disjunction1,
	ezlvar,
	list,
	make_literal_ast,
	make_predicate,
	mk_cons,
	mk_internal_append,
	set_key_of,
	to_empty,
	unify,
} from "src/utils/make_desugared_ast";
import { pprintDsAst } from "../pprint/pprintast";
import {
	findCommonClosureVars,
	freshenTerms,
} from "./extractclosure";
import { make } from "src/utils/make_better_typed";

const disjExample = disjunction1(
	conjunction1(
		unify(ezlvar.aaa, make_literal_ast("mcbob")),
		unify(ezlvar.bbb, make_literal_ast("bob")),
	),
	conjunction1(
		unify(ezlvar.bbb, make_literal_ast("bill")),
		unify(ezlvar.aaa, make_literal_ast("bob")),
	),
);
const predicateDefinitionExample: PredicateDefinitionGeneric<undefined> =
	{
		type: "predicate_definition",
		name: ezlvar.father,
		args: [ezlvar.aaa, ezlvar.bbb],
		body: conjunction1(disjExample),
	};

describe("extract closures", () => {
	test("codeToAst1", () => {
		const expectation1: TermGeneric<undefined>[] = [
			predicateDefinitionExample,
			make_predicate(ezlvar.father, [
				make_literal_ast("bob"),
				ezlvar.qq,
			]),
		];
		const { allVarsUsed, commonVars, nestedVars } =
			findCommonClosureVars(expectation1);
		expect(allVarsUsed.toList().toJS()).toContain("qq");
		expect(commonVars.toList().toJS()).toContain("father");
		expect(commonVars.toList().toJS()).not.toContain("aaa");
	});
	test("codeToAst2", () => {
		const expectation1: TermGeneric<undefined>[] = [
			predicateDefinitionExample,
			disjExample,
			make_predicate(ezlvar.father, [
				make_literal_ast("bob"),
				ezlvar.qq,
			]),
		];
		const { allVarsUsed, commonVars, nestedVars } =
			findCommonClosureVars(expectation1);
		expect(allVarsUsed.toList().toJS()).toContain("qq");
		expect(commonVars.toList().toJS()).toContain("father");

		expect(nestedVars.toList().toJS()).toContain("aaa");
		expect(nestedVars.toList().toJS()).toContain("bbb");
	});

	/**
    conj:
        unify(membero, membero_recur_0, memberoY_50)
        unify(einput, einputY_48)
        DEFINE [membero] as (a, bb) => 
            fresh a_0, bb_1:
                conj:
                    unify(bb, bb_1_disj_0, bb_1_disj_1)
                    unify(a, a_0_disj_0, a_0_disj_1)
                    disj:
                        conj:
                            unify(a_0_disj_0, a_0_disj_0Y_30)
                            unify(bb_1_disj_0, bb_1_disj_0Y_32)
                            first(a_0_disj_0Y_30, bb_1_disj_0Y_32)
                        conj:
                            unify(bb_1_disj_1, bb_1_disj_1Y_36)
                            unify(a_0_disj_1, a_0_disj_1Y_38)
                            unify(bbrest, bbrestY_40)
                            rest(bbrest, bb_1_disj_1Y_36)
                            membero_recur_0(a_0_disj_1Y_38, bbrestY_40)
        list(einput, "1", "2", "3", "4", "5")
        memberoY_50(qq, einputY_48)
	 */

	test("codeToAst3", () => {
		const {
			a,
			bb,
			membero,
			membero_recur_0,
			memberoY_50,
			einput,
			einputY_48,
			a_0,
			bb_1,
			bb_1_disj_0,
			bb_1_disj_1,
			a_0_disj_0,
			a_0_disj_1,
			a_0_disj_0Y_30,
			bb_1_disj_0Y_32,
			bb_1_disj_1Y_36,
			a_0_disj_1Y_38,
			bbrest,
			bbrestY_40,
			
		} = ezlvar;
		const {
			rest,
			first
		} = make.pred2(undefined);
		const expectation1: TermGeneric<undefined>[] = [
			unify(membero, membero_recur_0, memberoY_50),
			unify(einput, einputY_48),
			{
				type: "predicate_definition",
				name: membero,
				args: [a, bb],
				body: conjunction1(
					make.fresh(
						[a_0, bb_1],
						conjunction1(
							unify(bb, bb_1_disj_0, bb_1_disj_1),
							unify(a, a_0_disj_0, a_0_disj_1),
							disjunction1(
								conjunction1(
									unify(a_0_disj_0, a_0_disj_0Y_30),
									unify(bb_1_disj_0, bb_1_disj_0Y_32),
									first(a_0_disj_0Y_30, bb_1_disj_0Y_32),
								),
								conjunction1(
									unify(bb_1_disj_1, bb_1_disj_1Y_36),
									unify(a_0_disj_1, a_0_disj_1Y_38),
									unify(bbrest, bbrestY_40),
									rest(bbrest, bb_1_disj_1Y_36),
									make_predicate(membero_recur_0, [a_0_disj_1Y_38, bbrestY_40]),
								),
							),
						)
					)
				),
			}
		];
		const { allVarsUsed, commonVars, nestedVars } =
			findCommonClosureVars(expectation1);
		expect(allVarsUsed.toList().toJS()).toContain("membero");
		expect(nestedVars.toList().toJS()).toContain("membero_recur_0");
		// expect(commonVars.toList().toJS()).toContain("membero_recur_0");

		expect(nestedVars.toList().toJS()).toContain("a_0");
	});
});
