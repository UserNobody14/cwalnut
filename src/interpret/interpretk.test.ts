import { describe, expect, test } from '@jest/globals';
import { codeToAst } from 'src/redo/ast-desugar';
import { toBasicTypes, toDummyTypes } from 'src/interpret-types/type-pipe';
import { interpretPlus, runFor } from './interpretk';
import { freshenTerms } from 'src/redo/extractclosure';
import { builtinList } from "src/utils/builtinList";
import { pprintTermT, pprintTermTFlex } from 'src/redo/pprintgeneric';
import { pprintDsAst } from 'src/redo/pprintast';
import { modeExec } from 'src/mode/modeconvert';

const prcs = (srcc: string, varsToSelect = ['qq', 'aaa', 'bbb']) => toDummyTypes(freshenTerms(codeToAst(srcc), 'conjunction',
    [...builtinList, ...varsToSelect]
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


    //     test('appendo program', () => {
    //         const sourceCode = `
    // appendo = (a, b, ab) =>
    //     either:
    //         all:
    //             b = ab
    //             empty(a)
    //         all:
    //             rest(r, ab)
    //             rest(d, a)
    //             appendo(d, b, r)

    // einput = [1, 2, 3]
    // input2 = [4, 5, 6]
    // appendo(einput, input2, qq)
    // `;
    //         const res = interpretPlus(prcs(sourceCode));
    //         // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
    //         const resrun = runFor(res, false, ['qq']);
    //         expect(resrun).toEqual([{ qq: [
    //             "1", "2", "3", "4", "5", "6"
    //         ] }]);
    //     });



    test('appendo program 2', () => {
        const sourceCode = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            rest(r, ab)
            first(q, ab)
            first(q, a)
            rest(d, a)
            appendo(d, b, r)


einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`;
        const res = interpretPlus(prcs(sourceCode));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        // const resrun = runFor(res, false, ['qq']);
        const resrun = runFor(res, false, ["qq"], null);
        expect(resrun).toEqual([{
            qq: [
                "1", "2", "3", "4", "5", "6"
            ]
        }]);
    });

    test('appendo program 3', () => {
        const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]
`;
        const codev = codeToAst(sourceCode, true);
        const res = interpretPlus(modeExec(prcs(sourceCode, ["qq", "mid"])));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        // const resrun = runFor(res, false, ['qq']);
        const resrun = runFor(res, false, ["qq", "mid"], null);
        expect(resrun).toEqual([{
            qq: [
                "1", "2", "3", "4", "5", "6"
            ],
            mid: ["2", "3", "4", "5"]
        }]);
    });


    test('appendo program 4', () => {
        const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
either:
    qq = [1, ...mid, 6]
    qq = [45]
qq = [...einput, ...input2]
`;
        const codev = codeToAst(sourceCode, true);
        const res = interpretPlus(modeExec(prcs(sourceCode, ["qq", "mid"])));
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        // const resrun = runFor(res, false, ['qq']);
        const resrun = runFor(res, false, ["qq", "mid"], null);
        expect(resrun).toEqual([{
            qq: [
                "1", "2", "3", "4", "5", "6"
            ],
            mid: ["2", "3", "4", "5"]
        }]);
    });


    test('append-splat program', () => {
        const sourceCode = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            [q, ...d] = a
            ab = [q, ...r]
            appendo(d, b, r)

einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
            `;
        //         const ppv = codeToAst(sourceCode);
        //         // console.log(pprintDsAst(ppv));
        //         expect(
        //             pprintDsAst(ppv)
        //         ).toBe(
        //             `conj:
        // DEFINE appendo as (a, b, ab) => 
        //     disj:
        //         conj:
        //             empty(a)
        //             unify(b, ab)
        //         conj:
        //             cons(q, d, __fresh_28)
        //             unify(__fresh_28, a)
        //             cons(q, r, __fresh_31)
        //             unify(ab, __fresh_31)
        //             appendo(d, b, r)
        // list(__fresh_33, "1", "2", "3")
        // unify(einput, __fresh_33)
        // list(__fresh_34, "4", "5", "6")
        // unify(input2, __fresh_34)
        // appendo(einput, input2, qq)`);
        const ppr = prcs(sourceCode);
        // console.log(pprintTermTFlex(ppr, 'withouttype'));
        const res = interpretPlus(prcs(sourceCode));
        const resrun = runFor(res, false, ['qq'], null);
        expect(resrun).toEqual([{
            qq: [
                "1", "2", "3", "4", "5", "6"
            ]
        }]);
    });

    test('string to list', () => {
        const sourceCode = `
        val = ""
        gmr = "hello" + val
        string_to_list(gmr, qq)
        `;
        const res = interpretPlus(prcs(sourceCode));
        const resrun = runFor(res, false, ['qq'], null);
        expect(resrun).toEqual([{
            qq: [
                "h", "e", "l", "l", "o"
            ]
        }]);
    });
});
