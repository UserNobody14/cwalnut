// import { interpretFromCode } from "src/interpretPlus";

// basic example
const source1 = `
a = 1
b = 2
`;

const source2 = `
a.foo = 1
a.bar = 2
b.foo = 1
a = b
qq = a
`;

// should fail
const source3 = `
a = {foo: 1, bar: 2}
b = {foo: 1}
a = b
`;

// work on?
const source4 = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]

membero(qq, einput)
`;

const source5 = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            rest(d, a)
            appendo(d, b, r)
            rest(r, ab)

einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`;

const source6 = `


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

const source7 = `

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

// function displayVars(
// 	source: string = source2,
// 	varsv: string[] = ["qq"],
// ) {
// 	const vfr = interpretFromCode(source, varsv);
// 	console.log("-----------------------");
// 	for (const f of vfr) {
// 		for (const k in f) {
// 			console.log(k, f[k].toString());
// 		}
// 	}
// }
// displayVars(source2, ['qq', 'a', 'b']);
// displayVars(source4, ['qq']);
// displayVars(source3, ['a']);
// displayVars(source7, ["qq"]);
