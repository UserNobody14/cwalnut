import {
    describe,
    test,
    expect,
} from '@jest/globals';
import { codeToAst } from './ast-desugar';
import { toBasicTypes } from 'src/interpret-types/type-pipe';
import { renameVarBatch2 as renameVarBatch } from './freshenvar';
import { make } from 'src/utils/make_better_typed';
import { captureEquality } from 'src/lens/compare';
import { pprintGeneric, pprintTermT } from './pprintgeneric';

describe('Replace/alpha-convert functions', () => {
    test('Simple alpha convert', () => {
        const bsource = `
        a = 1`;
        const res = codeToAst(bsource);
        const tvv = make.conjunction1(...toBasicTypes(res));
        const inv = renameVarBatch(new Map([["a", "b"]]), make.conjunction1(tvv));
        expect(inv).not.toBe(tvv);
        const inv2 = renameVarBatch(new Map([["b", "a"]]), make.conjunction1(...inv));
        expect(captureEquality(inv2[0], tvv)).toBe(true);

    });

    test("Multiple alpha convert", () => {
        const bsource = `
        a = 1
        b = 2
        c = 3
        `;
        const res = codeToAst(bsource);
        const tvv = make.conjunction1(...toBasicTypes(res));
        const inv = renameVarBatch(new Map([["a", "g"], ["b", "q"], ["c", "z"]]), make.conjunction1(tvv));
        expect(captureEquality(inv[0], tvv)).toBe(false);
        const inv2 = renameVarBatch(new Map([["g", "a"], ["q", "b"], ["z", "c"]]), make.conjunction1(...inv));
        expect(captureEquality(inv2[0], tvv)).toBe(true);
    });

    test("Nested alpha convert", () => {
        const bsource = `
        either:
            a = 1
            b = 2
            c = 3
            all:
                a = 1
                b = 2
        `;
        const res = codeToAst(bsource);
        const tvv = make.conjunction1(...toBasicTypes(res));
        const inv = renameVarBatch(new Map([["a", "g"], ["b", "q"], ["c", "z"]]), make.conjunction1(tvv));
        expect(captureEquality(inv[0], tvv)).toBe(false);
        const inv2 = renameVarBatch(new Map([["g", "a"], ["q", "b"], ["z", "c"]]), make.conjunction1(...inv));
        expect(captureEquality(inv2[0], tvv)).toBe(true);
    });

    test("Nested alpha convert 2", () => {
        const bsource = `
        all:
            a = 1
            b = 2
            either:
                a = 1
                b = 2
        `;
        const res = codeToAst(bsource);
        const tvv = make.conjunction1(...toBasicTypes(res));
        expect(pprintTermT(tvv)).toBe(`conj:
    unify(a: number, "1")
    unify(b: number, "2")
    disj:
        unify(a: number, "1")
        unify(b: number, "2")`)
        const inv = renameVarBatch(new Map([["a", "g"], ["b", "q"], ["c", "z"]]), make.conjunction1(tvv));
        expect(pprintTermT(inv)).toBe(`conj:
    unify(g: number, "1")
    unify(q: number, "2")
    disj:
        unify(g: number, "1")
        unify(q: number, "2")`)
        expect(captureEquality(inv[0], tvv)).toBe(false);
        const inv2 = renameVarBatch(new Map([["g", "a"], ["q", "b"], ["z", "c"]]), make.conjunction1(...inv));
        expect(captureEquality(inv2[0], tvv)).toBe(true);
    });

    test("Realistic nested alpha convert", () => {
        const bsource = `
either:
    all:
        empty(a)
        b = ab
    all:
        rest(d, a)
        rest(r, ab)
        appendo(d, b, r)
        `;
        const res = codeToAst(bsource);
        const tvv = make.conjunction1(...toBasicTypes(res));
        expect(pprintGeneric(tvv, (ctx, m) => {
            return ''
        })).toBe(`conj:
    disj:
        conj:
            empty(a)
            unify(b, ab)
        conj:
            rest(d, a)
            rest(r, ab)
            appendo(d, b, r)`);
        const inv = renameVarBatch(new Map([["a", "g"], ["ab", "q"], ["c", "z"]]), make.conjunction1(tvv));
        expect(pprintGeneric(inv, (ctx, m) => {
            return ''
        })).toBe(`conj:
    disj:
        conj:
            empty(g)
            unify(b, q)
        conj:
            rest(d, g)
            rest(r, q)
            appendo(d, b, r)`);
        expect(captureEquality(inv[0], tvv)).toBe(false);
        const inv2 = renameVarBatch(new Map([["g", "a"], ["q", "ab"], ["z", "c"]]), make.conjunction1(...inv));
        expect(captureEquality(inv2[0], tvv)).toBe(true);
    });
});