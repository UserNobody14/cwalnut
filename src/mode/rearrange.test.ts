import { describe, expect, test } from '@jest/globals';
import { codeToAst } from 'src/redo/ast-desugar';
import {toBasicTypes, toDummyTypes} from 'src/interpret-types/type-pipe';
import { freshenTerms } from 'src/redo/extractclosure';
import { builtinList } from "src/utils/builtinList";
import { Map as ImmMap } from 'immutable';
import { commonModes, makeDet, type ModeDetType } from "./ModeDetType";
import {mapModeRearrange, mapToModeDetDisj, mapToModeDetO, permutations} from './rearrange';
import { pprintGeneric } from 'src/pprint/pprintgeneric';
import { defaultModes } from './defaultModes';
import type { TermGeneric } from 'src/types/AstGeneric';

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
    // test('Simple father program', () => {
    //     const sourceCode = `
    //     father("bob", qq)
    //     `;
    //     const [res, mpp] = mapToModeDet(prcs(sourceCode),ImmMap(),  modeDetTypes1);
    //     console.log(res, mpp.toJS());
    //     expect(res).not.toBeNull();
    //     expect(mpp).not.toBeNull();
    // });

    test('More sophisticated program', () => {
        const sourceCode = `
einput = [1, 2, 3]
input2 = [4, 5, 6]
qq = [...einput, ...input2]

either:
    qq = [1, ...mid, 6]
    qq = [45]`;

        const [res, mpp] = mapModeRearrange(prcs(sourceCode), defaultModes);
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

describe('rearrange.ts functionality', () => {
    describe('mapToModeDetO function', () => {
        test('should return the best arrangement based on determinacy number', () => {
            // Placeholder for setup, assuming specific inputs and outputs
            const terms: TermGeneric<unknown>[] = []; // Assuming specific terms
            const s1 = ImmMap<string, string>();
            const s2 = ImmMap<string, ModeDetType[]>();
            const currDetNum = 0;

            // Placeholder for expected output, assuming a specific arrangement is the best
            const expectedArrangement = [
                [], // Assuming specific terms rearranged
                ImmMap<string, string>(), // Assuming specific string mappings
                0 // Assuming determinacy number
            ];

            const result = mapToModeDetO(terms, s1, s2, currDetNum);
            expect(result).toEqual(expectedArrangement);
        });

        // Additional tests for edge cases, error handling, etc.
    });

    describe('mapToModeDetDisj function', () => {
        test('should handle disjunctions correctly', () => {
            // Placeholder for setup, assuming specific inputs and outputs
            const terms: TermGeneric<unknown>[] = []; // Assuming specific terms for disjunction
            const s1 = ImmMap<string, string>();
            const s2 = ImmMap<string, ModeDetType[]>();
            const currDetNum = 0;

            // Placeholder for expected output, assuming a specific handling of disjunctions
            const expectedArrangement = null; // Assuming disjunction handling leads to no valid arrangement

            const result = mapToModeDetDisj(terms, s1, s2, currDetNum);
            expect(result).toEqual(expectedArrangement);
        });

        // Additional tests for various scenarios and edge cases
    });

    // Additional describe blocks for other functions as needed
});