import { test, describe, expect } from "@jest/globals";

import { codeToAst } from "src/redo/ast-desugar";
import {
	ExpressionDsAst,
	type PredicateDefinitionDsAst,
	type TermDsAst,
} from "src/types/DesugaredAst";
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
const predicateDefinitionExample: PredicateDefinitionDsAst =
	{
		type: "predicate_definition",
		name: ezlvar.father,
		args: [ezlvar.aaa, ezlvar.bbb],
		body: conjunction1(disjExample),
	};

describe("extract closures", () => {
	test("codeToAst", () => {
		const expectation1: TermDsAst[] = [
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
	test("codeToAst", () => {
		const expectation1: TermDsAst[] = [
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
});
