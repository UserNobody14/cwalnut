

import {
    filterModeWorlds,
    type ModeWorld,
    termToModeWorlds
} from './terms2varmodes';
import { test, describe, expect } from '@jest/globals';
import {codeToAst} from 'src/redo/ast-desugar';
import {toDummyTypes} from 'src/interpret-types/type-pipe';
import {freshenTerms} from 'src/redo/extractclosure';
import {builtinList} from 'src/utils/builtinList';
import { conjunction1 } from 'src/utils/make_better_typed';
import { defaultModes } from './defaultModes';
import { Determinism } from './ModeDetType';
import { pprintGeneric } from 'src/redo/pprintgeneric';

const prcs = (srcc: string) => toDummyTypes(freshenTerms(codeToAst(srcc), 'conjunction', 
[...builtinList, 'qq', 'aaa', 'bbb']
));

const termToModeWorldsSrc = (src: string): ModeWorld[] => {
    return filterModeWorlds(termToModeWorlds(conjunction1(...prcs(src)), defaultModes));
}


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
        const res = termToModeWorldsSrc(sourceCode);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = res;
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
        const res = termToModeWorldsSrc(sourceCode);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = res;
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
        const res = termToModeWorldsSrc(sourceCode);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = res;
        expect(resrun).toEqual([{ qq: 'bill' }, { qq: 'billronald' }]);
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
        const res = termToModeWorldsSrc(sourceCode);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = res[0];
        expect(resrun.det).toEqual(Determinism.SEMIDET);
        expect(pprintGeneric(resrun.termArrangement, (ct, mt) => `: ${mt.det}`)).toEqual(pprintGeneric(conjunction1(...prcs(sourceCode)), (ct, mt) => ""));
    });
});