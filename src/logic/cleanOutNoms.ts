

import { match, P } from "ts-pattern";
import type { CleanOutput } from "./types";

function isTieObject(obj: CleanOutput): obj is { name: string; term: CleanOutput } {
    return typeof obj === 'object' && 'name' in obj && 'term' in obj;
}

function isSwapObject(obj: CleanOutput): obj is { swap: [string, string]; term: CleanOutput } {
    return typeof obj === 'object' && 'term' in obj && 'swap' in obj;
}

export type CarryThrough = {
    noms: number[],
    lvars: number[]
}

export function cleanOutNoms1(c: CleanOutput, carryThrough: CarryThrough): [CleanOutput, CarryThrough] {
    return match<CleanOutput, [CleanOutput, CarryThrough]>(c)
        .when(isTieObject, (tie) => {
            const [nomN, carryThrough2] = cleanOutNoms1(tie.name, carryThrough);
            const [termN, carryThrough3] = cleanOutNoms1(tie.term, carryThrough2);
            return [{
                name: nomN,
                term: termN
            }, carryThrough3]
            // return {
            //     name: tie.name,
            //     term: cleanOutNoms1(tie.term, carryThrough)
            // }
        })
        .when(isSwapObject, (nom) => {
            const [nomN1, carryThrough2] = cleanOutNoms1(nom.swap[0], carryThrough);
            const [nomN2, carryThrough3] = cleanOutNoms1(nom.swap[1], carryThrough2);
            const [termN, carryThrough4] = cleanOutNoms1(nom.term, carryThrough3);
            return [{
                swap: [nomN1, nomN2],
                term: termN
            }, carryThrough4]
            // return {
            //     swap: nom.swap,
            //     term: cleanOutNoms1(nom.term, carryThrough)
            // }
        })
        .when(
            (arr: CleanOutput): arr is CleanOutput[] => Array.isArray(arr) && !(typeof arr === 'string'),
            (arr) => {
                const [newArr, carryThrough2] = arr.reduce<[CleanOutput[], CarryThrough]>(([acc, carryThrough], item) => {
                    const [newItem, carryThrough2] = cleanOutNoms1(item, carryThrough);
                    return [[...acc, newItem], carryThrough2];
                }, [[], carryThrough]);
                return [newArr, carryThrough2];
            }
        )
        .when(
            // P.string.startsWith("Nom("),
            (nom: CleanOutput): nom is string => typeof nom === 'string' && nom.startsWith("Nom("),
            (nom): [CleanOutput, CarryThrough] => {
                const nomCore = nom.slice(4, -1);
                const nomNum = Number.parseInt(nomCore);
                const nomIndex = carryThrough.noms.indexOf(nomNum);
                if (nomIndex === -1) {
                    // carryThrough.noms.push(nomNum);
                    return [`Nom(${carryThrough.noms.length})`, {
                        ...carryThrough,
                        noms: [...carryThrough.noms, nomNum]
                    }];
                } else {
                    return [`Nom(${nomIndex})`, carryThrough];
                }

            }
        )
        .when(
            (lvar: CleanOutput): lvar is string => typeof lvar === 'string' && lvar.startsWith("?$&"),
            (lvar): [CleanOutput, CarryThrough] => {
                const lvarCore = lvar.slice(3);
                const lvarNum = Number.parseInt(lvarCore);
                const lvarIndex = carryThrough.lvars.indexOf(lvarNum);
                if (lvarIndex === -1) {
                    // carryThrough.lvars.push(lvarNum);
                    return [`?$&${carryThrough.lvars.length}`, {
                        ...carryThrough,
                        lvars: [...carryThrough.lvars, lvarNum]
                    }];
                } else {
                    return [`?$&${lvarIndex}`, carryThrough];
                }
            }
        )
        .when(
            (str: CleanOutput): str is string => typeof str === 'string',
            (str) => [str, carryThrough]
        )
        .when(
            (num: CleanOutput): num is number => typeof num === 'number',
            (num) => [num, carryThrough]
        )
        .when(
            (bool: CleanOutput): bool is boolean => typeof bool === 'boolean',
            (bool) => [bool, carryThrough]
        )
        .otherwise(() => {
            throw new Error("Unexpected");
        });
}