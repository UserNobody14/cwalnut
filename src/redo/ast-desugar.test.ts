import { test, describe, expect } from "@jest/globals";

import { codeToAst } from "src/redo/ast-desugar";
import { ExpressionDsAst } from "src/types/DesugaredAst";
import { conjunction1, disjunction1, ezlvar, list, make_literal_ast, make_predicate, mk_cons, mk_internal_append, set_key_of, to_empty, unify } from "src/utils/make_desugared_ast";
import { pprintDsAst } from "./pprintast";

describe("ast-desugar", () => {
    test("codeToAst", () => {
        const sourceCode = `
            father = (aaa, bbb) =>
                either:
                    all:
                        aaa = "mcbob"
                        bbb = "bob"
                    all:
                        bbb = "bill"
                        aaa = "bob"
            father("bob", qq)
            `;
        const res = codeToAst(sourceCode);
        const expectation1 = [conjunction1({
            type: "predicate_definition",
            name: ezlvar.father,
            args: [
                ezlvar.aaa,
                ezlvar.bbb,
            ],
            body: conjunction1(
                disjunction1(
                    conjunction1(
                        unify(
                            ezlvar.aaa,
                            make_literal_ast("mcbob")
                        ),
                        unify(
                            ezlvar.bbb,
                            make_literal_ast("bob")
                        )
                    ),
                    conjunction1(
                        unify(
                            ezlvar.bbb,
                            make_literal_ast("bill")
                        ),
                        unify(
                            ezlvar.aaa,
                            make_literal_ast("bob")
                        )
                    )
                )
            ),
        },
            make_predicate(ezlvar.father, [make_literal_ast("bob"), ezlvar.qq])
        )];
        expect(res).toEqual(expectation1);
    });

    test("append", () => {
        const sourceCode = `
either:
    qq = [1, ...mid, 6]
    qq = [45]`;
        const res = codeToAst(sourceCode);
        const expectation1 = [
            // conjunction1(
            disjunction1(
                conjunction1(
                    mk_cons(make_literal_ast(1), ezlvar.__fresh_2, ezlvar.__fresh_3),
                    mk_internal_append(ezlvar.mid, ezlvar.__fresh_1, ezlvar.__fresh_2),
                    mk_cons(make_literal_ast(6), ezlvar.__fresh_0, ezlvar.__fresh_1),
                    to_empty(ezlvar.__fresh_0),
                    unify(ezlvar.qq, ezlvar.__fresh_3),
                ),
                conjunction1(
                    list(ezlvar.qq, make_literal_ast(45)),
                )
            )
            // )
        ];
        expect(res).toEqual(expectation1);
    });

    test("append2", () => {
        const sourceCode = `
qq = [...einput, ...input2]
`;
        const res = codeToAst(sourceCode);
        const expectation1 = [
            // conjunction1(
            // mk_internal_append(ezlvar.__fresh_27, ezlvar.__fresh_28, ezlvar.input2),
            // // mk_internal_append(ezlvar.einput, ezlvar.__fresh_28, ezlvar.__fresh_29),
            // mk_internal_append(ezlvar.__fresh_28, ezlvar.__fresh_29, ezlvar.einput),
            mk_internal_append(ezlvar.einput, ezlvar.__fresh_1, ezlvar.__fresh_2),
            mk_internal_append(ezlvar.input2, ezlvar.__fresh_0, ezlvar.__fresh_1),
            to_empty(ezlvar.__fresh_0),
            unify(ezlvar.qq, ezlvar.__fresh_2),
            // )
        ];
        expect(res).toEqual(expectation1);
    });

    test("append3", () => {
        const sourceCode = `
        einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]`;
        const res = codeToAst(sourceCode);
        const expectation1 = [
            conjunction1(
                list(ezlvar.einput, make_literal_ast(1), make_literal_ast(2), make_literal_ast(3)),
                list(ezlvar.input2, make_literal_ast(4), make_literal_ast(5), make_literal_ast(6)),
                mk_internal_append(ezlvar.einput, ezlvar.__fresh_1, ezlvar.__fresh_2),
                mk_internal_append(ezlvar.input2, ezlvar.__fresh_0, ezlvar.__fresh_1),
                to_empty(ezlvar.__fresh_0),
                unify(ezlvar.qq, ezlvar.__fresh_2),            
                disjunction1(
                    conjunction1(
                        mk_cons(make_literal_ast(1), ezlvar.__fresh_5, ezlvar.__fresh_6),
                        mk_internal_append(ezlvar.mid, ezlvar.__fresh_4, ezlvar.__fresh_5),
                        mk_cons(make_literal_ast(6), ezlvar.__fresh_3, ezlvar.__fresh_4),
                        to_empty(ezlvar.__fresh_3),
                        unify(ezlvar.qq, ezlvar.__fresh_6),
                    ),
                    conjunction1(
                        list(ezlvar.qq, make_literal_ast(45)),
                    )
                ),
            )
        ];
        expect(pprintDsAst(res)).toEqual(pprintDsAst(expectation1));
        expect(res).toEqual(expectation1);
    });

    test("binary oneline", () => {
        const sourceCode = `all:
    vv = 1 or zz = 2
    ww = w.e`;
        const res = codeToAst(sourceCode);
        const expectation1 = [
            conjunction1(
                disjunction1(
                    unify(ezlvar.vv, make_literal_ast(1)),
                    unify(ezlvar.zz, make_literal_ast(2)),
                ),
                set_key_of(ezlvar.w, make_literal_ast("e"), ezlvar.ww),
            )
        ];
        expect(res).toEqual(expectation1);
    });

    test("binary twoline", () => {
        const sourceCode = `all:
    vv = 1 or zz = 2 or ww = 3

    ww = w.e`;
        const res = codeToAst(sourceCode);
        const expectation1 = [
            conjunction1(
                disjunction1(
                    unify(ezlvar.vv, make_literal_ast(1)),
                    unify(ezlvar.zz, make_literal_ast(2)),
                    unify(ezlvar.ww, make_literal_ast(3)),
                ),
                set_key_of(ezlvar.w, make_literal_ast("e"), ezlvar.ww),
            )
        ];
        expect(res).toEqual(expectation1);
    });

    test("compiles and runs on stuff", () => {
        const source4 = `
string1_or_num = (zza) =>
	either:
		zza = "string1"
		zza = 1
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]
j = 3 + 4
j = v
j = ooo
ssa = 1
string1_or_num(ssa)

membero(qq, einput)
`;

        const source5 = `

einput = [1, 2, 3, 4, 5]
j = 3
j = v
j = ooo

first(qq, einput)
`;


        const source6 = `


cwal_file << file "./target/cwal"

grammar_v1 = (str, ast) =>
    either:
        all:
            str = predname + "(" + remaining + ")"
            regex("/\w+", predname)
            grammar_v1(remaining, astremaining)
            ast = {
                "type": "predicate",
                "name": predname,
                "args": astremaining
            }
        all:
            fail()

fresh_pred_type = (astv, type_map, pred_type) =>
    astv = {
        "type": "predicate_call",
        "source": name,
        "args": avargs
    }
    for all tval in avargs:
        type_ast(tval)

type_ast = (ast, type_map) =>
    either:
        all:
            ast.type = "predicate_call"
            fresh_pred_type(ast, type_map, predtype)
            predtype(ast.args)
        all:
            ast.type = "predicate_definition"
            args = ast.args
            type_ast_curried = (t) =>
                type_ast(t, type_map, tblw)
            map(args, type_ast_curried, args_typed)
			## type_map[ast.name] = pred_type
            pred_typing_closure = (args) =>
                process_pred_instance(ast.body, args)
            pred_type = {
                "type": "predicate_definition",
                "body": pred_typing_closure
            }
        all:
            ast.type = "fresh"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "with"
            type_ast(ast.body, type_map, typeval)
        all:
			ast = {
				"type": "conjunction",
				"terms": ast_terms
			}
			split_string(ast_terms, ",", termsout)
            type_ast(start_ts, type_map)
        all:
            ast = {
				"type": "disjunction",
				"terms": ast_terms
			}
			split_string(ast_terms, ",", termsout)
            type_disjunction(termsout, type_map)


type_disjunction = (disj_terms, type_map1) =>
    either:
        disj_terms = []
        all:
            first(dterm, disj_terms)
            rest(remaining_dterms, disj_terms)
            type_ast(dterm, type_map1)
            type_disjunction(remaining_dterms, type_map1)



type_map_for_file = (filestring, tmap) =>
    INTERNAL_parse_cwal(filestring, ast)
    type_ast(ast, tmap)


`;

        const source65 = `


type_disjunction = (disj_terms, type_map) =>
    either:
        disj_terms = []
        all:
            first(dterm, disj_terms)
            rest(remaining_dterms, disj_terms)
            type_ast(dterm, type_map)
            type_disjunction(remaining_dterms, type_map)



type_map_for_file = (filestring, tmap) =>
    INTERNAL_parse_cwal(filestring, ast)
    type_ast(ast, tmap)


`;
        const source_file = `
cwal_file << file "./target/cwal"
`
        const source7 = `

grammar_v1 = (str, ast) =>
    either:
        all:
            str = predname + "(" + remaining + ")"

            regex2("/\\w+", predname)
            grammar_v1(remaining, astremaining)
            ast = {
                "type": "predicate",
                "name": predname,
                "args": astremaining
            }
        all:
            fail()
`;

        const source8 = `
fresh_pred_type = (astv, type_map, pred_type) =>
    astv = {
        "type": "predicate_call",
        "source": name,
        "args": avargs
    }
    for all tval in avargs:
        type_ast(tval)

type_ast = (ast, type_map) =>
    either:
        all:
            ast.type = "predicate_call"
            fresh_pred_type(ast, type_map, predtype)
            predtype(ast.args)
        all:
            ast.type = "predicate_definition"
            args = ast.args
            type_ast_curried = (t) =>
                type_ast(t, type_map, tblw)
            map(args, type_ast_curried, args_typed)
            type_map[ast.name] << pred_type
            pred_typing_closure = (args) =>
                process_pred_instance(ast.body, args)
            pred_type = {
                "type": "predicate_definition",
                "body": pred_typing_closure
            }
        all:
            ast.type = "fresh"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "with"
            type_ast(ast.body, type_map, typeval)
        all:
            ast.type = "conjunction"
            termsv = ast.terms
            first(start_ts, termsv)
            type_ast(start_ts, type_map)
        all:
            ast.type = "disjunction"
            type_disjunction(ast.terms, type_map)
`;

        expect(() => codeToAst(source4)).not.toThrow();
        expect(() => codeToAst(source5)).not.toThrow();
        expect(() => codeToAst(source6)).not.toThrow();
        expect(() => codeToAst(source65)).not.toThrow();
        expect(() => codeToAst(source_file)).not.toThrow();
        expect(() => codeToAst(source7)).not.toThrow();
    });
});