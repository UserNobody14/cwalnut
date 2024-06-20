import { TermTyped, ExpressionTyped } from './types/DesugaredAstTyped';
import { Type } from './types/Types';

//////////// Pretty printing
function indentStr(indent: number, multiLineInput: string): string {
    const indentToAdd = "    ".repeat(indent);
    const lines = multiLineInput.split("\n");
    const indentedLines = lines.map((line) => indentToAdd + line);
    return indentedLines.join("\n");
}
function dedentStr(multiLineInput: string, maxDedent = Number.POSITIVE_INFINITY): string {
    const lines = multiLineInput.split("\n");
    const dedentedLines = lines.map((line) => {
        let dedentCount = 0;
        while (line.startsWith("    ") && dedentCount < maxDedent) {
            line = line.slice(4);
            dedentCount++;
        }
        return line;
    });
    return dedentedLines.join("\n");
}
// Template string version of the above functions

export const indent = (strings: TemplateStringsArray, ...values: any[]): string => {
    // dedent the input string, then indent all values and combine
    const dedented = strings.map(str => dedentStr(str));
    const indentedValues = values.map((value) => {
        if (!value) {
            return "";
        } else if (typeof value === "string") {
            return indentStr(1, value);
        } else if (typeof value === 'object' && 'toString' in value) {
            return indentStr(1, value.toString());
        } else {
            return indentStr(1, JSON.stringify(value, null, 4));
        }
    });
    let result = "";
    for (let i = 0; i < dedented.length; i++) {
        result += dedented[i];
        if (i < indentedValues.length) {
            result += indentedValues[i];
        }
    }
    return result;
};

export function pprintTypedAst(ast: TermTyped | TermTyped[]): string {
    if (Array.isArray(ast)) {
        return ast.map(pprintTypedAst).join('\n');
    }
    switch (ast.type) {
        case 'conjunction':
            return `conj:
${ast.terms.map(pprintTypedAst).map(ii => indentStr(1, ii)).join('\n')}`;
        case 'disjunction':
            return `disj:
${ast.terms.map(pprintTypedAst).map(ii => indentStr(1, ii)).join('\n')}`;
        case 'predicate':
            return `${pprintExprAst(ast.source)}(${pprintExprListAst(ast.args, 'withtype')})`;
        case 'predicate_definition':
            return `DEFINE ${ast.name.value} as (${pprintExprListAst(ast.args)}) => 
${indentStr(1, pprintTypedAst(ast.body.terms))}`;
        default:
            throw `Invalid ast type: ${ast}`;
    }
}
function pprintExprListAst(ast: ExpressionTyped[], withtype: 'withtype' | 'without_type' = 'without_type',
    withio: 'withio' | 'without_io' = 'without_io'): string {
    return ast.map(ee => pprintExprAst(ee, withtype, withio)).join(', ');
}
function pprintExprAst(ast: ExpressionTyped, withtype: 'withtype' | 'without_type' = 'without_type',
    withio: 'withio' | 'without_io' = 'without_io'): string {
    switch (ast.type) {
        case 'identifier':
            if (withtype === 'withtype') {
                return `${ast.value}: ${pprintType(ast.contextualType)}`;
            } else {
                return ast.value;
            }
        case 'literal':
            return JSON.stringify(ast.value);
    }
}
export function pprintType(ast: Type): string {
    switch (ast.type) {
        case 'simple_type':
            return ast.name;
        case 'hkt':
            return `${ast.args.map(pprintType).join(', ')} => ${pprintType(ast.apply(ast.args))}`;
        case 'type_var':
            return `\$${ast.name}`;
        case 'mono_predicate':
            return `Pred(${ast.args.map(pprintType).join(', ')})`;
        case 'union':
            return `(${ast.options.map(pprintType).join(' | ')})`;
        case 'complex_type':
            return `${ast.name}<${ast.args.map(pprintType).join(', ')}>`;
    }
}
