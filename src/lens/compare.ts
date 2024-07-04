import {TermGeneric} from 'src/types/DsAstTyped';
import {P, match} from 'ts-pattern';
////////
////////
// Capture equality


const matchfn = <T>(pt: T) => [{
    "type": pt
}, {
    "type": pt
}] as const;


export function captureEquality<T>(a1: TermGeneric<T>, b1: TermGeneric<T>): boolean {
    if (a1.type !== b1.type) {
        return false;
    }
    return match([a1, b1])
    .with(matchfn('conjunction'), ([a, b]) => {
        if (a.terms.length !== b.terms.length) {
            return false;
        }
        return a.terms.every((t, i) => captureEquality(t, b.terms[i]));
    })
    .with(matchfn('disjunction'), ([a, b]) => {
        if (a.terms.length !== b.terms.length) {
            return false;
        }
        return a.terms.every((t, i) => captureEquality(t, b.terms[i]));
    })
    .with(matchfn('fresh'), ([a, b]) => {
        if (a.newVars.length !== b.newVars.length) {
            return false;
        }
        return a.newVars.every((v, i) => v.value === b.newVars[i].value);
    })
    .with(matchfn('with'), ([a, b]) => {
        return a.name.value === b.name.value && captureEquality(a.body, b.body);
    })
    .with(matchfn('predicate_definition'), ([a, b]) => {
        if (a.args.length !== b.args.length) {
            return false;
        }
        return a.name.value === b.name.value && a.args.every((v, i) => v.value === b.args[i].value) && captureEquality(a.body, b.body);
    })
    .with(matchfn('predicate_call'), ([a, b]) => {
        if (a.args.length !== b.args.length) {
            return false;
        }
        return a.source.value === b.source.value && a.args.every((v, i) => {
            if (v.type === "identifier") {
                return v.value === b.args[i].value;
            }
            return true;
        });
    })
    .with([{ type: P.string }, { type: P.string }], ([a, b]) => {
        if (a.type !== b.type) {
            return false;
        } else {
            console.warn("Unknown equality fail potentially", a, b);
            return false;
        }
    })
    .exhaustive();

}