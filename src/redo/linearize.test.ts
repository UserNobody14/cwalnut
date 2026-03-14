import { describe, test, expect } from "@jest/globals";
import { linearize } from "./linearize";
import { codeToAst } from "./ast-desugar";
import {
	gatherVarInstanceInfo,
	intoVarsGeneric,
	mapVarsToState,
} from "src/lens/into-vars";
import { countVarsInCalls } from "../lens/into-vars";
import { mapToTypedQuick } from "src/mode/modeconvert";
import { toDummyTypes } from "src/interpret-types/type-pipe";
import {
	pprintGeneric,
	pprintQuick,
} from "src/pprint/pprintgeneric";
import { Map as ImmMap, Set as ImmSet } from "immutable";
import type { TermGeneric } from "src/types/AstGeneric";
import {
	type Builtin,
	builtinList,
} from "src/utils/builtinList";
import { freshenTerms } from "./extractclosure";
import {
	interpretPlus,
	runFor,
} from "src/interpret/interpretk";

describe("Linearize", () => {
	test("linearize doesnt destroy vals", () => {
		const sourceCode = `
val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;
		expect(linearize(codeToAst(sourceCode))).not.toBeNull();
	});

	test("linearize ensures each var used at most once 1", () => {
		const sourceCode = `
val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;
		const res = linearize(codeToAst(sourceCode));
		const numv = getFilteredVarInstanceInfo(res);
		expect(numv).toEqual(ImmMap());
	});

	test("linearize ensures each var used at most once 2", () => {
		const sourceCode = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            rest(r, ab)
            first(q, ab)
            first(q, a)
            rest(d, a)
            appendo(d, b, r)


einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`;
		const res = linearize(codeToAst(sourceCode));
		console.log(pprintQuick(res));
		const numv = getFilteredVarInstanceInfo(res);
		expect(numv).toEqual(ImmMap());
	});

	test("linearize ensures each var used at most once 3", () => {
		const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]
`;
		const res = linearize(
			codeToAst(sourceCode),
			ImmSet(["qq", "mid"]),
		);
		console.log(pprintQuick(res));
		const numv = getFilteredVarInstanceInfo(res);
		expect(numv).toEqual(ImmMap());
	});

	test("Simple membero program 2", () => {
		const sourceCode = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]

membero(qq, einput)
`;

		const res = linearize(codeToAst(sourceCode));
		console.log(pprintQuick(res));
		const numv = getFilteredVarInstanceInfo(res);
		expect(numv).toEqual(ImmMap());
	});
});

function getFilteredVarInstanceInfo(
	res: TermGeneric<undefined>[],
) {
	return countVarsInCalls(toDummyTypes(res)).filter(
		(v, k) => v > 2 && !builtinList.includes(k as Builtin),
	);
}

/**
 *     conj:
        unify(appendoY_5, appendo_recur_0)
        unify(appendoZ_5, appendoY_5, appendo)
        unify(appendoY_91, appendoZ_5)
        DEFINE [appendo] as (a, b, ab) => 
            fresh a_0, b_1, ab_2:
                conj:
                    unify(a_0Z_19, a_0Y_19, a)
                    unify(a_0Y_19, a_0_disj_0)
                    unify(a_0Z_23, a_0Y_23, a_0Z_19)
                    unify(a_0Y_23, a_0_disj_1)
                    unify(a_0Y_27, a_0_disj_2)
                    unify(ab_2Z_31, ab_2Y_31, ab)
                    unify(ab_2Y_31, ab_2_disj_0)
                    unify(ab_2Z_35, ab_2Y_35, ab_2Z_31)
                    unify(ab_2Y_35, ab_2_disj_1)
                    unify(ab_2Y_39, ab_2_disj_2)
                    unify(b_1Z_43, b_1Y_43, b)
                    unify(b_1Y_43, b_1_disj_0)
                    unify(b_1Y_47, b_1_disj_1)
                    disj:
                        conj:
                            empty(a_0_disj_0)
                            unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                        conj:
                            rest(r, ab_2_disj_1)
                            first(q, ab_2_disj_2)
                            first(q, a_0_disj_1)
                            rest(d, a_0_disj_2)
                            appendo_recur_0(d, b_1_disj_1, r)
        list(einput, "1", "2", "3")
        list(input2, "4", "5", "6")
        appendoY_91(einput, input2, qq)
 */
