import { write } from "bun";

// Helper to generate unique IDs.
const uniqueId = () => Math.random().toString(36).substring(2, 8);

// Types for our parsed S-expressions.
type Atom = string | number;
type SExpr = Atom | SExpr[];

// This is a very basic parser and has limitations (e.g., doesn't handle
// strings with escaped quotes). But for simple lambda calculus expressions, it
// should be sufficient.
function parseSExpr(input: string): SExpr {
    // Add spaces around parentheses to make tokenization easier, but not if inside a string.
    const spacedInput = input.replace(/"[^"]*"|([()])/g, (match, group) => {
        if (group) {
            return ` ${group} `;
        }
        return match;
    });
    const tokens = spacedInput.trim().split(/\s+/);
    let position = 0;

    function parse(): SExpr {
        if (position >= tokens.length) {
            throw new Error("Unexpected end of input");
        }
        const token = tokens[position++];
        if (token === '(') {
            const list: SExpr[] = [];
            while (position < tokens.length && tokens[position] !== ')') {
                list.push(parse());
            }
            if (position >= tokens.length) {
                throw new Error("Unbalanced parentheses: missing ')'");
            }
            position++; // consume ')'
            return list;
        } else if (token === ')') {
            throw new Error("Unexpected ')'");
        } else {
            // It's an atom.
            if (token.startsWith('"') && token.endsWith('"')) {
                return token.slice(1, -1); // String literal.
            }
            const num = parseFloat(token);
            if (!isNaN(num) && num.toString() === token) {
                return num; // Number literal.
            }
            return token; // Symbol.
        }
    }

    const result = parse();
    if (position < tokens.length) {
        throw new Error("Extra content after S-expression");
    }
    return result;
}


// Data stores for our facts.
const literals: [string, string | number][] = [];
const fnApplications: [string, string, string][] = [];
const fnDefinitions: [string, string, string][] = [];

// To avoid creating duplicate literals for the same value.
const literalCache = new Map<string | number, string>();

function process(expr: SExpr, scope: Map<string, string>): string {
    if (typeof expr === 'string' || typeof expr === 'number') {
        // It's an atom.
        const atom = expr;
        if (typeof atom === 'string') {
            const fromScope = scope.get(atom);
            if (fromScope) {
                return fromScope; // It's a variable in scope.
            }
        }

        if (literalCache.has(atom)) {
            return literalCache.get(atom)!;
        }

        const id = uniqueId();
        literals.push([id, atom]);
        literalCache.set(atom, id);
        return id;
    }

    if (Array.isArray(expr)) {
        if (expr.length === 0) {
            // Represent empty list as a special literal '()'.
            const literal = "()";
            if (literalCache.has(literal)) {
                return literalCache.get(literal)!;
            }
            const id = uniqueId();
            literals.push([id, "()"]);
            literalCache.set(literal, id);
            return id;
        }

        // Check for (lambda (var) body).
        if (expr[0] === 'lambda' && expr.length === 3 && Array.isArray(expr[1]) && expr[1].length === 1) {
            const varName = expr[1][0];
            if (typeof varName !== 'string') {
                throw new Error("Lambda variable must be a symbol");
            }
            const body = expr[2];

            const defId = uniqueId();
            const varId = uniqueId();

            const newScope = new Map(scope);
            newScope.set(varName, varId);

            const bodyId = process(body, newScope);
            
            fnDefinitions.push([defId, varId, bodyId]);
            return defId;
        }

        // It's a function application (f arg1 arg2 ...).
        // We need to curry it: ((f arg1) arg2) ...
        let currentFnId = process(expr[0], scope);
        
        for (let i = 1; i < expr.length; i++) {
            const argId = process(expr[i], scope);
            const appId = uniqueId();
            fnApplications.push([appId, argId, currentFnId]);
            currentFnId = appId;
        }

        return currentFnId;
    }

    throw new Error(`Unknown expression type: ${JSON.stringify(expr)}`);
}

async function main() {
    // Example S-expressions.
    const sExprString1 = `(lambda (f) (lambda (x) (f x)))`;
    const sExprString2 = `(add 1 (multiply 2 3))`;
    const sExprString3 = `(cons "hello" (cons "world" ()))`;


    console.log("Processing expression 1:", sExprString1);
    const parsedSExpr1 = parseSExpr(sExprString1);
    process(parsedSExpr1, new Map());
    
    console.log("Processing expression 2:", sExprString2);
    const parsedSExpr2 = parseSExpr(sExprString2);
    process(parsedSExpr2, new Map());

    console.log("Processing expression 3:", sExprString3);
    const parsedSExpr3 = parseSExpr(sExprString3);
    process(parsedSExpr3, new Map());

    // Write facts to files.
    const literalsContent = literals.map(row => row.join('\t')).join('\n');
    await write('literals.facts', literalsContent);
    console.log('Wrote literals.facts');

    const fnApplicationsContent = fnApplications.map(row => row.join('\t')).join('\n');
    await write('fn_application.facts', fnApplicationsContent);
    console.log('Wrote fn_application.facts');

    const fnDefinitionsContent = fnDefinitions.map(row => row.join('\t')).join('\n');
    await write('fn_definitions.facts', fnDefinitionsContent);
    console.log('Wrote fn_definitions.facts');

}

main().catch(console.error); 