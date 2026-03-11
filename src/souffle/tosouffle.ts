import type { TermGeneric } from "src/types/AstGeneric";
import fs from "node:fs";
import type { CodeLocation } from "src/redo/codeloc";
import { codeToAst } from "src/redo/desugar-with-linenums";

/**
 * // INPUTS:
// Idea: remove disjunction & conj tables and make pred def connect directly to each pred_call statement?
.decl pred_def(name: uservar, param_id: indicator, statement_id: indicator)
.input

.decl code_location(id: location_id, line_min: number, col_min: number, line_max: number, col_max: number)
.input

.decl parameter_declaration(param_id: indicator, idx: number, prm: uservar)
.input

.decl disjunction_statement(id: indicator, idx: number, further_st: indicator)
.input

.decl conjunction_statement(id: indicator, idx: number, further_st: indicator)
.input

.decl predicate_call_statement(stid: indicator, name: uservar, idx: number, params: param_call_id)
.input

.decl predicate_call_parameter(param_id: param_call_id, idx: number, prm: literalexpr, isliteral: number)
.input

.decl literal_strings(literal_id: number, str: symbol)
.input

.decl literal_numbers(literal_id: number, num: number)
.input

 */

interface AllLists {
    pred_def: { id: string, name: string, param_id: string, statement_id: string }[];
    code_location: { id: string, line_min: number, col_min: number, line_max: number, col_max: number }[];
    parameter_declaration: { param_id: string, idx: number, prm: string }[];
    disjunction_statement: { id: string, idx: number, further_st: string }[];
    conjunction_statement: { id: string, idx: number, further_st: string }[];
    predicate_call_statement: { stid: string, name: string, idx: number, params: string }[];
    predicate_call_parameter: { param_id: string, idx: number, prm: string, isliteral: number }[];
    literal_strings: { literal_id: string, str: string }[];
    literal_numbers: { literal_id: string, num: number }[];
}

// TODO: adjust the termgeneric so that info can be passed in for larger objects
function toSouffleObj(
    term: TermGeneric<CodeLocation>,
    rootId?: string,
    allLists0?: AllLists
): AllLists {
    // Go through the terms and convert them to souffle, adding the data items to a series of lists, and then output as csv
    let allLists: AllLists = allLists0 ??  {
        pred_def: [],
        code_location: [],
        parameter_declaration: [],
        disjunction_statement: [],
        conjunction_statement: [],
        predicate_call_statement: [],
        predicate_call_parameter: [],
        literal_strings: [],
        literal_numbers: [],
    };
    switch (term.type) {
        case "predicate_definition": {
            const { name, args, body } = term;
            const name_string = name.value;
            const pred_id = getNewId();
            const param_id = getNewId();
            const statement_id = getNewId();
            allLists.code_location.push({ id: statement_id, ...name.info });
            for (let idx = 0; idx < args.length; idx++) {
                const prm = args[idx].value;
                allLists.parameter_declaration.push({ param_id, idx, prm });
            }
            allLists.pred_def.push({ id: pred_id, name: name_string, param_id, statement_id });
            allLists = toSouffleObj(body, statement_id, allLists);
            break;
        }
        case "disjunction": {
            const { terms } = term;
            const id = rootId ?? getNewId();
            for (let idx = 0; idx < terms.length; idx++) {
                const further_st = getNewId();
                allLists.disjunction_statement.push({ id, idx, further_st });
                allLists = toSouffleObj(terms[idx], further_st, allLists)
            }
            break;
        }
        case "conjunction": {
            const { terms } = term;
            const id = rootId ?? getNewId();
            for (let idx = 0; idx < terms.length; idx++) {
                const further_st = getNewId();
                allLists.conjunction_statement.push({ id, idx, further_st });
                allLists = toSouffleObj(terms[idx], further_st, allLists)
            }
            break;
        }
        case "predicate_call": {
            const { args, source } = term;
            const stid = rootId ?? getNewId();
            const name = source.value;
            const idx = 0;
            const params = getNewId();
            allLists.code_location.push({ id: stid, ...source.info });
            allLists.predicate_call_statement.push({ stid, name, idx, params });
            for (let idx = 0; idx < args.length; idx++) {
                const prm = args[idx].value;
                const isliteral = args[idx].type === "literal" ? 1 : 0;
                if (args[idx].type === "literal") {
                    const literal_id = getNewId();
                    // TODO allow nums & bools too.
                    allLists.literal_strings.push({ literal_id, str: prm });
                    allLists.predicate_call_parameter.push({ param_id: params, idx, prm: literal_id, isliteral });
                } else {
                    allLists.predicate_call_parameter.push({ param_id: params, idx, prm, isliteral: 0 });
                }
            }
            break;
        }
        case "fresh": {
            // temporary
            // throw new Error("Not implemented");
            // TODO: fix this and add fresh into datalog
            const { body: {terms} } = term;
            const id = rootId ?? getNewId();
            for (let idx = 0; idx < terms.length; idx++) {
                const further_st = getNewId();
                allLists.conjunction_statement.push({ id, idx, further_st });
                allLists = toSouffleObj(terms[idx], further_st, allLists)
            }
            break;
        }
        default:
            throw new Error(`Unknown term type: ${term.type}`);
    }
    return allLists;
}

function toSouffleCsvStringOrdered(valueList: AllLists[keyof AllLists]) {
    return valueList.map(row => {
        // Ensure the order of the columns is correct
        if ('param_id' in row) {
            if ('statement_id' in row) {
                return [row.id, row.name, row.param_id, row.statement_id];
            } else if ('isliteral' in row) {
                return [row.param_id, row.idx, row.prm, row.isliteral];
            } else {
                return [row.param_id, row.idx, row.prm];
            }
        } else if ('further_st' in row) {
            return [row.id, row.idx, row.further_st];
        } else if ('stid' in row) {
            return [row.stid, row.name, row.idx, row.params];
        } else if ('id' in row) {
            return [row.id, row.line_min, row.col_min, row.line_max, row.col_max];
        } else if ('literal_id' in row) {
            if ('str' in row) {
                return [row.literal_id, row.str];
            } else {
                return [row.literal_id, `${row.num}`];
            }
        } else {
            throw new Error('Unknown row type');
        }
    })
    .map(row => `${row.join('\t')}\n`)
    .join('');
}

function toSouffleCsv(allLists: AllLists) {
    for (const [key, value] of Object.entries(allLists)) {
        // Create a file named after the key, and write the values to it in tab separated csv format, with no header
        // e.g. pred_def.csv

        // Open the file
        const file = fs.openSync(`./src/souffle/${key}.facts`, 'w');
        // Write the values to the file
        // for (const row of value) {
        // }
        fs.writeSync(file, toSouffleCsvStringOrdered(value));

    }
}

function getNewId() {
    return Math.random().toString(36).substring(7);
}

export function codeToSouffle(s: string) {
    const codeC = codeToAst(s, true);
    let allLists: AllLists = {
        pred_def: [],
        code_location: [],
        parameter_declaration: [],
        disjunction_statement: [],
        conjunction_statement: [],
        predicate_call_statement: [],
        predicate_call_parameter: [],
        literal_strings: [],
        literal_numbers: [],
    };
    for (const term of codeC) {
        allLists = toSouffleObj(term);
    }
    toSouffleCsv(allLists);
}