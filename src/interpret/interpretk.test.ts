import { describe, expect, test } from '@jest/globals';
import { codeToAst } from 'src/redo/ast-desugar';
import {toBasicTypes} from 'src/interpret-types/type-pipe';
import {interpretPlus, runFor} from './interpretk';
import { freshenTerms } from 'src/redo/extractclosure';
import { builtinList } from 'src/utils/make_desugared_ast';

const prcs = (srcc: string) => toBasicTypes(freshenTerms(codeToAst(srcc), 'conjunction', 
[...builtinList, 'qq', 'aaa', 'bbb']
));

describe('Interpret simple cwal programs', () => {
    test('Simple father program', () => {
        const sourceCode = `
        val.father = (aaa, bbb) =>
            either:
                all:
                    aaa = "mcbob"
                    bbb = "bob"
                all:
                    bbb = "bill"
                    aaa = "bob"
        val.father("bob", qq)
        `;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, false, ['qq']);
        expect(resrun).toEqual([{ qq: 'bill' }]);
    });

    test('Simple father program2', () => {
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
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, false, ['qq']);
        expect(resrun).toEqual([{ qq: 'bill' }]);
    });

    test('Simple father program3', () => {
        const sourceCode = `
        father = (aaa, bbb) =>
            either:
                all:
                    aaa = "mcbob"
                    bbb = "bob"
                all:
                    bbb = "bill"
                    aaa = "bob"
                all:
                    bbb = "billronald"
                    aaa = "bob"
        father("bob", qq)
        `;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, false, ['qq']);
        expect(resrun).toEqual([{ qq: 'bill' }, { qq: 'billronald' }]);
    });


    test('Simple disjunction program', () => {
        const sourceCode = `
        either:
            qq = "bill"
            qq = "billronald"
            qq = "dobbles"
        `;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, false, ['qq']);
        expect(resrun).toEqual([{ qq: 'bill' }, { qq: 'billronald' }, { qq: 'dobbles' }]);
    });


    test('Simple membero program', () => {
        const sourceCode = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            fresh bbrest:
                rest(bbrest, bb)
                membero(a, bbrest)

einput = [1, 2, 3, 4, 5]
j = 1
j = v

membero(qq, einput)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        // const resrun = runFor(res, false, ['qq']);
        const resrun = runFor(res, false, ['qq']);
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
        const resrun = runFor(res, false, ['qq']);
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
            b = ab
            empty(a)
        all:
            rest(r, ab)
            rest(d, a)
            appendo(d, b, r)

einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = runFor(res, false, ['qq']);
        expect(resrun).toEqual([{ qq: [
            "1", "2", "3", "4", "5"
        ] }]);
    });



    test('appendo program 2', () => {
        const sourceCode = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            rest(r, ab)
            rest(d, a)
            appendo(d, b, r)

einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        // const resrun = runFor(res, false, ['qq']);
        const resrun = runFor(res, true);
        expect(resrun).toEqual([{ qq: [
            "1", "2", "3", "4", "5"
        ] }]);
    });

});
