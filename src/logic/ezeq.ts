import { match, P } from "ts-pattern";
import { type LNom, LTerm } from "./terms";
import { makeList, makeLiteral, makeLNom, makeTie } from "./makelvar";
import { eq } from ".";
import type { MGoal } from "./streams";

type EzTerm = string | number | boolean | EzTerm[] | LTerm;
type SubEzTerm = string | number | boolean | LTerm;

export function ezTermToLTerm(term: EzTerm): LTerm {
    if (Array.isArray(term)) {
        return makeList(term.map(ezTermToLTerm));
    }
    return match<SubEzTerm, LTerm>(term)
    .with(P.string, (s) => makeLiteral(s))
    .with(P.number, (n) => makeLiteral(n))
    .with(P.boolean, (b) => makeLiteral(b))
    .with(P.instanceOf(LTerm), (t) => t)
    .exhaustive();
}

export const ezIn = ezTermToLTerm;

export function ezq(a: EzTerm, b: EzTerm): MGoal {
    return eq(ezTermToLTerm(a), ezTermToLTerm(b));
}

export function ezTie(name: string | LNom, term: EzTerm): LTerm {
    return makeTie(typeof name === 'string' ? makeLNom(name) : name, ezTermToLTerm(term));
}