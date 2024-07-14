import { describe, expect, test } from '@jest/globals';
import { codeToAst } from 'src/redo/ast-desugar';
import {toBasicTypes, toDummyTypes} from 'src/interpret-types/type-pipe';
import { freshenTerms } from 'src/redo/extractclosure';
import { builtinList } from "src/utils/builtinList";
import { Map as ImmMap } from 'immutable';
import { mapToModeDet } from './mode';
import { commonModes, makeDet, type ModeDetType } from "./ModeDetType";
import {mapModeRearrange, permutations} from './rearrange';
import { pprintGeneric } from 'src/redo/pprintgeneric';
import { defaultModes } from './defaultModes';

const prcs = (srcc: string) => toDummyTypes(freshenTerms(codeToAst(srcc), 'conjunction', 
[...builtinList, 'qq', 'aaa', 'bbb']
));

const modeDetTypes1 = ImmMap<string, ModeDetType[]>({
    'father': [
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.in,
        ),
        makeDet.multi(
            commonModes.out,
            commonModes.out,
        )
    ]
});


const modeDetTypes3 = ImmMap<string, ModeDetType[]>({
    'father': [
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.in,
        ),
        makeDet.multi(
            commonModes.out,
            commonModes.out,
        )
    ]
});

describe('Interpret simple cwal programs', () => {
    test('Simple father program', () => {
        const sourceCode = `
        father("bob", qq)
        `;
        const [res, mpp] = mapToModeDet(prcs(sourceCode),ImmMap(),  modeDetTypes1);
        console.log(res, mpp.toJS());
        expect(res).not.toBeNull();
        expect(mpp).not.toBeNull();
    });

    test('More sophisticated program', () => {
        const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]`;

        const [res, mpp] = mapModeRearrange(prcs(sourceCode), defaultModes);
        console.log(res, mpp.toJS(), pprintGeneric(res, (ct, mt) => `: ${mt}`));
        expect(res).not.toBeNull();
        expect(mpp).not.toBeNull();
    });

    test('More sophisticated program 2', () => {
        const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
either:
    qq = [1, ...mid, 6]
    qq = [45]
qq = [...einput, ...input2]
`;

        const [res, mpp] = mapModeRearrange(prcs(sourceCode), defaultModes);
        console.log(res, mpp.toJS(), pprintGeneric(res, (ct, mt) => `: ${mt}`));
        expect(res).not.toBeNull();
        expect(mpp).not.toBeNull();
    });

    // Test permutation
    test('permute program', () => {
        const arr = [1, 2, 3];
        // Expect permutations to be valid
        const perms = permutations(arr);
        const examplePerms = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];
        expect([...perms]).toEqual(examplePerms);
    });


});