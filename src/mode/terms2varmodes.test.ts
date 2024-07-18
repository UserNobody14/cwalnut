

import {
    filterModeWorlds,
    mergeVarModes,
    type ModeWorld,
    termToModeWorlds
} from './terms2varmodes';
import { test, describe, expect } from '@jest/globals';
import {codeToAst} from 'src/redo/ast-desugar';
import {toDummyTypes} from 'src/interpret-types/type-pipe';
import {freshenTerms} from 'src/redo/extractclosure';
import {builtinList} from 'src/utils/builtinList';
import { conjunction1, make } from 'src/utils/make_better_typed';
import { defaultModes } from './defaultModes';
import { Determinism, type Mode } from './ModeDetType';
import { pprintGeneric } from 'src/redo/pprintgeneric';
import { Map as ImmMap } from 'immutable';
import { take } from 'src/utils/iterop';
import type { PredicateCallGeneric } from 'src/types/DsAstTyped';
import type { SimpleType } from 'src/types/EzType';

const prcs = (srcc: string, eVars = ['qq', 'aaa', 'bbb']) => toDummyTypes(freshenTerms(codeToAst(srcc), 'conjunction', 
[...builtinList, ...eVars]
));

const termToModeWorldsSrc = (src: string): ModeWorld[] => {
    // return filterModeWorlds(termToModeWorlds(conjunction1(...prcs(src)), defaultModes));
    return take(termToModeWorlds(conjunction1(...prcs(src)), defaultModes), 5);
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

    test('appendo program 5', () => {
        const sourceCode = `
einput = 1
`;
        const presults = conjunction1(...prcs(sourceCode, ['einput']));
        const res = take(termToModeWorlds(presults, defaultModes), 5);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const resrun = res[0];
        expect(resrun.det).toEqual(Determinism.DET);
        expect(pprintGeneric(resrun.termArrangement, (ct, mt) => "")).toEqual(pprintGeneric(presults, (ct, mt) => ""));
    });

    test('equivalence Check', () => {
        const sourceCode = `
        einput = 1
        `;
        const prd = make.predicate_call(make.lvar.unify(make.simple_type('never')), [
            make.lvar.einput(make.simple_type('never')),
            make.literal('number', "1"),
            ]);
        const presults = conjunction1(...prcs(sourceCode));
        const prd2 = freshenG(prd);
        expect(presults).toEqual(prd2);
        const opt = take(termToModeWorlds(conjunction1(prd2), defaultModes), 5);
        expect(opt).toHaveLength(2);
        expect(opt.map(oo => oo.varModes)).toEqual([
            ImmMap({ einput: { from: 'ground', to: 'ground' } }),
            ImmMap({ einput: { from: 'free', to: 'ground' } })
        ]);
        expect(opt.map(oo => oo.det)).toEqual([
            Determinism.DET,
            Determinism.DET,
        ]);
    });

    test('Merge var modes test', () => {
        const varModeMap1 = ImmMap<string, Mode>([[ 'qq', { from: 'free', to: 'ground' } ]]);
        const varModeMap2 = ImmMap<string, Mode>([[ 'qq', { from: 'ground', to: 'ground' } ]]);
        const varModeMap3 = ImmMap<string, Mode>([[ 'qq', { from: 'free', to: 'free' } ]]);
        const res = mergeVarModes(varModeMap1, varModeMap2);
        expect(res).toEqual(ImmMap<string, Mode>([[ 'qq', { from: 'free', to: 'ground' } ]]));
        const res2 = mergeVarModes(varModeMap3, varModeMap1);
        expect(res2).toEqual(ImmMap<string, Mode>([[ 'qq', { from: 'free', to: 'ground' } ]]));
    });

    test('Pred call grammar check', () => {
        const prd = make.predicate_call(make.lvar.unify(make.simple_type('never')), [
            make.lvar.einput(make.simple_type('never')),
            make.literal('number', "1"),
            ]);
        const sourceCode = `
einput = 1
`;
        const res = prcs(sourceCode);
        // runFor(interpretPlus(prcs(sourceCode)), ['qq'])
        const prd3 = freshenG(prd);
        expect(pprintGeneric(res, (ct, mt) => "")).toEqual(pprintGeneric(prd3, (ct, mt) => ""));
    });

    test('Pred call test', () => {
        const prd = freshenG(make.predicate_call(make.lvar.unify(make.simple_type('never')), [
            make.lvar.aaa(make.simple_type('never')),
            make.literal('number', "1"),
            ]));
        const opt = take(termToModeWorlds(conjunction1(prd), defaultModes), 5);
        // expect(opt).toEqual([{ qq: 'bill' }]);
        const resrun = opt[0];
        expect(pprintGeneric(resrun.termArrangement, (ct, mt) => "")).toEqual(pprintGeneric(prd, (ct, mt) => ""));
        expect(opt).toHaveLength(2);
        expect(opt.map(oo => oo.varModes)).toEqual([
            ImmMap({ aaa: { from: 'ground', to: 'ground' } }),
            ImmMap({ aaa: { from: 'free', to: 'ground' } })
        ]);
        expect(opt.map(oo => oo.det)).toEqual([
            Determinism.DET,
            Determinism.DET,
        ]);
    });
    test('Pred call test cnj', () => {
        const prd = make.predicate_call(make.lvar.unify(make.simple_type('never')), [
            make.lvar.aaa(make.simple_type('never')),
            make.literal('number', "1"),
            ]);
        const opt = take(termToModeWorlds(make.conjunction([prd]), defaultModes), 5);
        // expect(opt).toEqual([{ qq: 'bill' }]);
        const resrun = opt[0];
        expect(pprintGeneric(resrun.termArrangement, (ct, mt) => "")).toEqual(pprintGeneric(conjunction1(prd), (ct, mt) => ""));
        expect(opt).toHaveLength(2);
        expect(opt.map(oo => oo.varModes)).toEqual([
            ImmMap({ aaa: { from: 'ground', to: 'ground' } }),
            ImmMap({ aaa: { from: 'free', to: 'ground' } })
        ]);
        expect(opt.map(oo => oo.det)).toEqual([
            Determinism.DET,
            Determinism.DET,
        ]);
    });
});

function freshenG(prd: PredicateCallGeneric<SimpleType>) {
    const prd2 = freshenTerms([prd], 'conjunction',
        [...builtinList, 'qq', 'aaa', 'bbb']
    );
    const prd3 = conjunction1(...toDummyTypes(prd2));
    return prd3;
}
