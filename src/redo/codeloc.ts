import type Parser from 'tree-sitter';
export const defaultCodeLocation = { line_min: 0, col_min: 0, line_max: 0, col_max: 0 };


export function tocloc(node: Parser.SyntaxNode): CodeLocation {
    return {
        line_min: node.startPosition.row,
        col_min: node.startPosition.column,
        line_max: node.endPosition.row,
        col_max: node.endPosition.column,
    };
}

export function mergecloc(a: CodeLocation, b: CodeLocation): CodeLocation {
    const line_min = Math.min(a.line_min, b.line_min);
    let col_min = a.col_min;
    if (a.line_min === b.line_min) {
        col_min = Math.min(a.col_min, b.col_min);
    } else if (a.line_min > b.line_min) {
        col_min = b.col_min;
    }
    const line_max = Math.max(a.line_max, b.line_max);
    let col_max = a.col_max;
    if (a.line_max === b.line_max) {
        col_max = Math.max(a.col_max, b.col_max);
    } else if (a.line_max < b.line_max) {
        col_max = b.col_max;
    }
    return { line_min, col_min, line_max, col_max };
}

export function mergeClocs(clocs: CodeLocation[]): CodeLocation {
    if (clocs.length === 0) {
        return defaultCodeLocation;
    }
    return clocs.reduce(mergecloc);
}

export interface CodeLocation {
    line_min: number;
    col_min: number;
    line_max: number;
    col_max: number;
}
