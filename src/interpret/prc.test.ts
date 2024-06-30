import { describe, expect, test } from '@jest/globals';
import { codeToAst } from 'src/redo/ast-desugar';
import {toBasicTypes} from 'src/interpret-types/type-pipe';
import {interpretPlus, runFor} from './prc';

const prcs = (srcc: string) => toBasicTypes(codeToAst(srcc));

describe('Interpret simple cwal programs', () => {
    test('Simple father program', () => {
        const sourceCode = `
        val.father = (a, b) =>
            either:
                all:
                    a = "mcbob"
                    b = "bob"
                all:
                    b = "bill"
                    a = "bob"
        val.father("bob", qq)
        `;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, ['qq']);
        expect(resrun).toEqual([{ qq: 'bill' }]);
    });

    test('Simple membero program', () => {
        const sourceCode = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]

membero(qq, einput)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, ['qq']);
        expect(resrun).toEqual([
            { qq: "1" },
            { qq: "2" },
            { qq: "3" },
            { qq: "4" },
            { qq: "5" },
        
        ]);
    });

    test('Simple membero program 2', () => {
        const sourceCode = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]

membero(qq, einput)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, ['qq']);
        expect(resrun).toEqual([
            { qq: "1" },
            { qq: "2" },
            { qq: "3" },
            { qq: "4" },
            { qq: "5" },
        
        ]);
    }
    );


    test('appendo program', () => {
        const sourceCode = `
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
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, ['qq']);
        expect(resrun).toEqual([{ qq: [
            "1", "2", "3", "4", "5"
        ] }]);
    });

});
