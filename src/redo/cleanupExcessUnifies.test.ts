import { cleanupExcessUnifies, filterOutUnifyCalls, filterUnifyPredicateCalls, groupUnifies, refactorTermsToMergeUnifies, refactorUnifications, simplifyOneUnification, simplifyUnifyChain } from './cleanupExcessUnifies';
import {make, toPred2_, conjunction1} from 'src/utils/make_better_typed';
import type { TermGeneric, PredicateCallGeneric } from 'src/types/AstGeneric';
import { describe, test, expect } from '@jest/globals';
import { pprintQuick } from 'src/pprint/pprintgeneric';
import {Map as ImmMap, Set as ImmSet} from 'immutable';

describe('cleanupExcessUnifies', () => {
    test('returns terms unchanged with pass flag true', () => {
        const terms: TermGeneric<'info'> = make.predicate_call(make.identifier('info', 'test'), []);
        const result = cleanupExcessUnifies(terms, true);
        expect(result).toEqual(terms);
    });

    // Additional tests for cleanupExcessUnifies without unification and with unification
});

describe('refactorTermsToMergeUnifies 1', () => {

    const {
        a,
        b,
        c,
        d,
        e,
        g,
        h,
        i,
        z,
        qq,
        dd,
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);

    const {
        appendoY_5,
        appendoZ_5,
        appendoZ_91,
        einputZ_85,
        einputY_85,
        input2Z_87,
        input2Y_87,
        a_0_disj_0,
        a_0_disj_1,
        a_0_disj_2,
        b_1_disj_0,
        b_1_disj_1,
        ab_2_disj_0,
        ab_2_disj_1,
        ab_2_disj_2,
        a_0_disj_0Z_51,
        a_0_disj_0Y_51,
        b_1_disj_0Z_53,
        b_1_disj_0Y_53,
        ab_2_disj_0Z_55,
        ab_2_disj_0Y_55,
        b_1_disj_1Z_75,
        b_1_disj_1Y_75,
        rZ_77,
        rY_77,
        qZ_65,
        qY_65,
        a_0_disj_1Z_67,
        a_0_disj_1Y_67,
        a_0_disj_2Z_71,
        a_0_disj_2Y_71,
        dZ_73,
        dY_73,
        a_0Z_19,
                        a_0Y_19,
        a_0Z_23,
        a_0Y_23,
        a_0Z_27,
        a_0Y_27,
        ab_2Z_31,
        ab_2Y_31,
        ab_2Z_35,
        ab_2Y_35,
        ab_2Z_39,
        ab_2Y_39,
        b_1Z_43,
        b_1Y_43,
        b_1Z_47,
        b_1Y_47,
        a_0,
        b_1,
        ab_2,
        ab,
        einput,
        input2,
        appendo,
        appendoY_91,
        r,
        q,
        ab_2_disj_1Z_59,
        ab_2_disj_2Y_63,
        ab_2_disj_1Y_59,
        ab_2_disj_2Z_63,
    } = make.lvar2('info' as const);
    const {
        empty,
        rest,
        first,
        appendo_recur_0
    } = make.pred2('info' as const);
    test('merges separate unifications correctly', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            unify(b, c)
        ]);
        const [result, _] = refactorTermsToMergeUnifies(terms);
        // Expect a single unify term with merged variables
        expect(result).toEqual([make.conjunction([
            unify(a, b, c)
        ])]);
    });

    test('preserves non-unify terms', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            other()
        ]);
        const [result, _] = refactorTermsToMergeUnifies(terms);
        // Expect both the merged unify term and the non-unify term to be present
        expect(result).toEqual([make.conjunction([
            unify(a, b),
            other()
        ])]);
    });

    test('merges separate unifications correctly 2', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            unify(b, c),
            unify(a, c)
        ]);
        const [result, _] = refactorTermsToMergeUnifies(terms);
        // Expect a single unify term with merged variables
        expect(result).toEqual([make.conjunction([
            unify(a, b, c)
        ])]);
    });

    test('With pred def', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            unify(b, c),
            unify(a, c),
            make.predicate_definition(
                d,
                [z, e],
                conjunction1(
                    unify(z, e),
                    unify(qq, dd)
                )
            ),
            other()
        ]);
        const [result, _] = refactorTermsToMergeUnifies(terms);
        // Expect a single unify term with merged variables
        expect(result).toEqual([make.conjunction([
            unify(a, b, c),
            make.predicate_definition(
                d,
                [z, e],
                conjunction1(
                    unify(z, e),
                    unify(qq, dd)
                )
            ),
            other()
        ])]);
    });

    test(
        'With disjunction', () => {
            const terms: TermGeneric<'info'> = make.conjunction([
                unify(a, b),
                unify(b, c),
                unify(a, c),
                make.disjunction([
                    other(),
conjunction1(                    unify(g, h),
                    unify(g, i))
                ])
            ]);
            const [result, _] = refactorTermsToMergeUnifies(terms);
            // Expect a single unify term with merged variables
            expect(result).toEqual([make.conjunction([
                unify(a, b, c),
                make.disjunction([
                    conjunction1(
                    other(),
                    ),
                    conjunction1(
                        unify(g, h, i)
                    )
                ])
            ])]);
        }
    )

    test (
        'With real conj',
        () => {
            const trms = make.conjunction([
                unify(a, a_0),
                unify(b, b_1),
                unify(ab, ab_2),
                unify(a_0Z_19, a_0Y_19, a_0),
                unify(a_0Y_19, a_0_disj_0),
                unify(a_0Z_23, a_0Y_23, a_0Z_19),
                unify(a_0Y_23, a_0_disj_1),
                unify(a_0Z_27, a_0Y_27, a_0Z_23),
                unify(a_0Y_27, a_0_disj_2),
                unify(ab_2Z_31, ab_2Y_31, ab_2),
                unify(ab_2Y_31, ab_2_disj_0),
                unify(ab_2Z_35, ab_2Y_35, ab_2Z_31),
                unify(ab_2Y_35, ab_2_disj_1),
                unify(ab_2Z_39, ab_2Y_39, ab_2Z_35),
                unify(ab_2Y_39, ab_2_disj_2),
                unify(b_1Z_43, b_1Y_43, b_1),
                unify(b_1Y_43, b_1_disj_0),
                unify(b_1Z_47, b_1Y_47, b_1Z_43),
                unify(b_1Y_47, b_1_disj_1),
            ]);
            const [result, _] = refactorTermsToMergeUnifies(trms);
            const exTerm = [make.conjunction([
                unify(b, b_1, b_1Z_43, b_1Y_43, b_1Z_47, b_1Y_47, b_1_disj_0, b_1_disj_1),
                unify(ab, ab_2, ab_2Z_31, ab_2Y_31, ab_2Z_35, ab_2Y_35, ab_2Z_39, ab_2Y_39, ab_2_disj_0, ab_2_disj_1, ab_2_disj_2),
                unify(a, a_0, a_0Z_19, a_0Y_19, a_0Z_23, a_0Y_23, a_0Z_27, a_0Y_27, a_0_disj_0, a_0_disj_1, a_0_disj_2),
            ])];
            const [ext2] = refactorTermsToMergeUnifies(exTerm[0]);
            // Expect a single unify term with merged variables
            expect(result).toEqual(exTerm);
        }
    )
    /**
     *     conj:
        unify(appendoY_5, appendo_recur_0)
        unify(appendoZ_5, appendoY_5, appendo)
        unify(appendoZ_91, appendoY_91, appendoZ_5)
        unify(einputZ_85, einputY_85, einput)
        unify(input2Z_87, input2Y_87, input2)
        DEFINE [appendo] as (a, b, ab) => 
            fresh a_0, b_1, ab_2:
                conj:
                    unify(a, a_0)
                    unify(b, b_1)
                    unify(ab, ab_2)
                    unify(a_0Z_19, a_0Y_19, a_0)
                    unify(a_0Y_19, a_0_disj_0)
                    unify(a_0Z_23, a_0Y_23, a_0Z_19)
                    unify(a_0Y_23, a_0_disj_1)
                    unify(a_0Z_27, a_0Y_27, a_0Z_23)
                    unify(a_0Y_27, a_0_disj_2)
                    unify(ab_2Z_31, ab_2Y_31, ab_2)
                    unify(ab_2Y_31, ab_2_disj_0)
                    unify(ab_2Z_35, ab_2Y_35, ab_2Z_31)
                    unify(ab_2Y_35, ab_2_disj_1)
                    unify(ab_2Z_39, ab_2Y_39, ab_2Z_35)
                    unify(ab_2Y_39, ab_2_disj_2)
                    unify(b_1Z_43, b_1Y_43, b_1)
                    unify(b_1Y_43, b_1_disj_0)
                    unify(b_1Z_47, b_1Y_47, b_1Z_43)
                    unify(b_1Y_47, b_1_disj_1)
                    disj:
                        conj:
                            unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0)
                            unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0)
                            unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0)
                            unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                            empty(a_0_disj_0Y_51)
                        conj:
                            unify(ab_2_disj_1Z_59, ab_2_disj_1Y_59, ab_2_disj_1)
                            unify(ab_2_disj_2Z_63, ab_2_disj_2Y_63, ab_2_disj_2)
                            unify(qZ_65, qY_65, q)
                            unify(a_0_disj_1Z_67, a_0_disj_1Y_67, a_0_disj_1)
                            unify(a_0_disj_2Z_71, a_0_disj_2Y_71, a_0_disj_2)
                            unify(dZ_73, dY_73, d)
                            unify(b_1_disj_1Z_75, b_1_disj_1Y_75, b_1_disj_1)
                            unify(rZ_77, rY_77, r)
                            rest(r, ab_2_disj_1Y_59)
                            first(q, ab_2_disj_2Y_63)
                            first(qY_65, a_0_disj_1Y_67)
                            rest(d, a_0_disj_2Y_71)
                            appendo_recur_0(dY_73, b_1_disj_1Y_75, rY_77)
        list(einput, "1", "2", "3")
        list(input2, "4", "5", "6")
        appendoY_91(einputY_85, input2Y_87, qq)
     */

        test('With more advanced predicate', () => {

            /**
             *                 unify,
                empty,
                rest,
                first
             */
            const terms: TermGeneric<'info'> = make.conjunction([
                unify(appendoY_5, appendoZ_5, appendo),
                unify(appendoZ_91, appendoY_91, appendoZ_5),
                unify(einputZ_85, einputY_85, einput),
                unify(input2Z_87, input2Y_87, input2),
                make.predicate_definition(
                    appendo,
                    [a, b, ab],
                    conjunction1(
                        unify(a, a_0),
                        unify(b, b_1),
                        unify(ab, ab_2),
                        unify(a_0Z_19, a_0Y_19, a_0),
                        unify(a_0Y_19, a_0_disj_0),
                        unify(a_0Z_23, a_0Y_23, a_0Z_19),
                        unify(a_0Y_23, a_0_disj_1),
                        unify(a_0Z_27, a_0Y_27, a_0Z_23),
                        unify(a_0Y_27, a_0_disj_2),
                        unify(ab_2Z_31, ab_2Y_31, ab_2),
                        unify(ab_2Y_31, ab_2_disj_0),
                        unify(ab_2Z_35, ab_2Y_35, ab_2Z_31),
                        unify(ab_2Y_35, ab_2_disj_1),
                        unify(ab_2Z_39, ab_2Y_39, ab_2Z_35),
                        unify(ab_2Y_39, ab_2_disj_2),
                        unify(b_1Z_43, b_1Y_43, b_1),
                        unify(b_1Y_43, b_1_disj_0),
                        unify(b_1Z_47, b_1Y_47, b_1Z_43),
                        unify(b_1Y_47, b_1_disj_1),
                        make.disjunction([
                            conjunction1(
                                unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                                unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                                unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                                unify(b_1_disj_0Y_53, ab_2_disj_0Y_55),
                                empty(a_0_disj_0Y_51)
                            ),
                            conjunction1(
                                unify(ab_2_disj_1Z_59, ab_2_disj_1Y_59, ab_2_disj_1),
                                unify(ab_2_disj_2Z_63, ab_2_disj_2Y_63, ab_2_disj_2),
                                unify(qZ_65, qY_65, q),
                                unify(a_0_disj_1Z_67, a_0_disj_1Y_67, a_0_disj_1),
                                unify(a_0_disj_2Z_71, a_0_disj_2Y_71, a_0_disj_2),
                                unify(dZ_73, dY_73, d),
                                unify(b_1_disj_1Z_75, b_1_disj_1Y_75, b_1_disj_1),
                                unify(rZ_77, rY_77, r),
                                rest(r, ab_2_disj_1Y_59),
                                first(q, ab_2_disj_2Y_63),
                                first(qY_65, a_0_disj_1Y_67),
                                rest(d, a_0_disj_2Y_71),
                                appendo_recur_0(dY_73, b_1_disj_1Y_75, rY_77)
                            )
                        ])
                    )
                )
            ]);

            const [result, _] = refactorTermsToMergeUnifies(terms);
            const exTerm = [make.conjunction([
                unify(appendoY_5, appendoZ_5, appendo, appendoZ_91, appendoY_91),
                unify(einputZ_85, einputY_85, einput),
                unify(input2Z_87, input2Y_87, input2),
                make.predicate_definition(
                    appendo,
                    [a, b, ab],
                    conjunction1(
                        unify(a, a_0, a_0Z_19, a_0Y_19, a_0Z_23, a_0Y_23, a_0Z_27, a_0Y_27),
                        unify(b, b_1, b_1Z_43, b_1Y_43, b_1Z_47, b_1Y_47),
                        unify(ab, ab_2, ab_2Z_31, ab_2Y_31, ab_2Z_35, ab_2Y_35, ab_2Z_39, ab_2Y_39),
                        make.disjunction([
                            conjunction1(
                                unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0, a_0_disj_1Z_67, a_0_disj_1Y_67, a_0_disj_1, a_0_disj_2Z_71, a_0_disj_2Y_71, a_0_disj_2),
                                unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0, b_1_disj_1Z_75, b_1_disj_1Y_75, b_1_disj_1),
                                unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0, ab_2_disj_1Z_59, ab_2_disj_1Y_59, ab_2_disj_1),
                                unify(b_1_disj_0Y_53, ab_2_disj_0Y_55),
                                empty(a_0_disj_0Y_51)
                            ),
                            conjunction1(
                                unify(ab_2_disj_1Z_59, ab_2_disj_1Y_59, ab_2_disj_1, ab_2_disj_2Z_63, ab_2_disj_2Y_63, ab_2_disj_2, qZ_65, qY_65, q),
                                unify(a_0_disj_1Z_67, a_0_disj_1Y_67, a_0_disj_1, a_0_disj_2Z_71, a_0_disj_2Y_71, a_0_disj_2, dZ_73, dY_73, d),
                                rest(r, ab_2_disj_1Y_59),
                                first(q, ab_2_disj_2Y_63),
                                first(qY_65, a_0_disj_1Y_67),
                                rest(d, a_0_disj_2Y_71),
                                appendo_recur_0(dY_73, b_1_disj_1Y_75, rY_77)
                            )
                        ])
                    )
                )
            ])];
            expect(pprintQuick(result)).toEqual(pprintQuick(exTerm));
            // Expect a single unify term with merged variables
            expect(result).toEqual(exTerm);





        });
});

// The internal function that operates on an array of unifies (refactorUnifications)
describe('refactor unification array', () => {
    const {
        a,
        b,
        c,
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    test('merges separate unifications correctly', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            unify(b, c)
        ]);
        const [result, _] = refactorUnifications(terms, []);
        // Expect a single unify term with merged variables
        expect(result).toEqual(make.conjunction([
            unify(a, b, c)
        ]));
    });
    test('preserves non-unify terms', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            other()
        ]);
        const [result, _] = refactorUnifications(terms, []);
        // Expect both the merged unify term and the non-unify term to be present
        expect(pprintQuick(result)).toEqual(pprintQuick(make.conjunction([
            unify(a, b),
            other()
        ])));
    });
});

describe('filterOutUnifyCalls', () => {
    const {
        a,
        b,
        c,
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    test('filters out unify terms', () => {
        const terms: TermGeneric<'info'>[] = [
            unify(a, b),
            other()
        ];
        const result = filterOutUnifyCalls(terms);
        // Expect only the non-unify term to be present
        expect(result).toEqual([other()]);
    });

    test('preserves non-unify terms', () => {
        const terms: TermGeneric<'info'>[] = [
            unify(a, b),
            other()
        ];
        const result = filterOutUnifyCalls(terms);
        // Expect only the non-unify term to be present
        expect(result).toEqual([other()]);
    });
});

describe('filterUnifyPredicateCalls', () => {
    const {
        a,
        b,
        c,
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    test('filters out non-unify terms', () => {
        const terms: TermGeneric<'info'>[] = [
            unify(a, b),
            other(c),
            other(c)
        ];
        const result = filterUnifyPredicateCalls(terms);
        // Expect only the unify term to be present
        expect(result).toEqual([unify(a, b)]);
    });

    test('preserves unify terms', () => {
        const terms: TermGeneric<'info'>[] = [
            other(a),
            unify(a, b),
            other(a)
        ];
        const result = filterUnifyPredicateCalls(terms);
        // Expect only the unify term to be present
        expect(result).toEqual([unify(a, b)]);
    });
});

describe('groupUnifies', () => {
    const {
        a,
        b,
        c,
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    test('groups unifies with common variables', () => {
        const allUnifies: PredicateCallGeneric<'info'>[] = [
            unify(a, b),
            unify(b, c)
        ];
        const result = groupUnifies(allUnifies);
        // Expect a single unify term with merged variables
        expect(result).toEqual([unify(a, b, c)]);
    });
    test('unifies common variables 2', () => {
        const allUnifies: PredicateCallGeneric<'info'>[] = [
            unify(a, b),
            unify(b, c),
            unify(a, c)
        ];
        const result = groupUnifies(allUnifies);
        expect(result).toEqual([unify(a, b, c)]);
    });

    test('preserves non-unify terms', () => {
        const terms: PredicateCallGeneric<'info'>[] = [
            unify(a, b),
            other()
        ];
        // Expect both the merged unify term and the non-unify term to be present
        expect(() => groupUnifies(terms)).toThrow();
    });
});


describe('simplifyUnifyChain', () => {
    const {
        a,
        b,
        c,
        d
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    test('cleans up simple unneeded unify chain', () => {
        const terms: TermGeneric<'info'> = make.conjunction([
            unify(a, b),
            unify(b, c),
            unify(d, c),
        ]);
        const [result, _] = simplifyUnifyChain(terms);
        expect(result).toEqual([
            unify(a, c)
        ]);
    });
});


describe('simplifyOneUnify', () => {
    const {
        a,
        b,
        c,
        d
    } = make.lvar2('info' as const);
    const {
        unify,
        other
    } = make.pred2('info' as const);
    const term = conjunction1(
        unify(a, b),
        unify(b, c),
        other(c),
        other(d)
    );
    test('cleans up simple unneeded unify chain 1', () => {
        const [result, [ss1, ss2]] = simplifyOneUnification(
            
            [], 
            
            [[unify(b, c), other(c), other(d)]]
            , unify(a, b), [ImmMap(), ImmSet()]
        );
        expect(ss1).toEqual(ImmMap({}));
        expect(result).toEqual(
            unify(a, b)
        );
    });
    test('cleans up simple unneeded unify chain 2', () => {
        const [result, [ss1, ss2]] = simplifyOneUnification(
            
            [[unify(a, b)]], 
            [
                [other(c), other(d)]
            ], unify(b, c), [ImmMap({
                a: 'c'
            }), ImmSet()]
        );
        expect(ss1).toEqual(ImmMap({
            a: 'c',
            c: 'b'
        }));
        expect(result).toEqual(
            unify()
        );
    });
});

/**
 *                             unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0)
                            empty(a_0_disj_0Y_51)
                            unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0)
                            unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0)
                            unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
 */

describe(
    "simplify example unification", () => {
        const {
            a,
            b,
            c,
            d,
            a_0_disj_0Z_51,
            a_0_disj_0Y_51,
            b_1_disj_0Z_53,
            b_1_disj_0Y_53,
            ab_2_disj_0Z_55,
            ab_2_disj_0Y_55,
            a_0_disj_0,
            b_1_disj_0,
            ab_2_disj_0,
        } = make.lvar2('info' as const);
        const {
            unify,
            other,
            empty
        } = make.pred2('info' as const);
        const term = conjunction1(
            other(ab_2_disj_0),
            unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
            empty(a_0_disj_0Y_51),
            other(a_0_disj_0),
            unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
            unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
            unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
        );

        test('cleans up example unification', () => {
            const rs = cleanupExcessUnifies(term);
            expect(pprintQuick(rs)).toEqual(pprintQuick(conjunction1(

                // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                // unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                // unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                // unify(b_1_disj_0Z_53, ab_2_disj_0Z_55, b_1_disj_0),
                unify( b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0, ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                other(ab_2_disj_0),
                empty(a_0_disj_0Y_51),
                other(a_0_disj_0),
            )));
        });

        test('simplify unify chain', () => {
            const [rs, _ss] = simplifyUnifyChain(term);
            expect(pprintQuick(rs)).toEqual(pprintQuick([
                conjunction1(
                    // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0)

                    other(ab_2_disj_0),
                    unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    empty(a_0_disj_0Y_51),
                    other(a_0_disj_0),
                    unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                    unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                    unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                )
            ]));

        });

        test('refactorTermsToMergeUnifies ', () => {
            const [rs, _ss] = refactorTermsToMergeUnifies(term);
            expect(pprintQuick(rs)).toEqual(pprintQuick([
                conjunction1(
                    // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0)

                    // other(ab_2_disj_0),
                    // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0),
                    // unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                    // unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                    // unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                    unify( b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0, ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                    unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    other(ab_2_disj_0),
                    empty(a_0_disj_0Y_51),
                    other(a_0_disj_0),
                )
            ]));
        });

        test('groupUnifies', () => {
            const utem = 
            filterUnifyPredicateCalls(term.terms);
            expect(
                utem
            ).toEqual(
                [
                    unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                    unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                    unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                ]
            )
            const rs = groupUnifies(
                utem
            );
            if (!rs) throw new Error('Expected groupUnifies to return a value');
            expect(pprintQuick(rs)).toEqual(pprintQuick([
                    // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0)

                    // other(ab_2_disj_0),
                    // unify(a_0_disj_0Z_51, a_0_disj_0Y_51, a_0_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0),
                    // unify(b_1_disj_0Z_53, b_1_disj_0Y_53, b_1_disj_0),
                    // unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0),
                    // unify(b_1_disj_0Y_53, ab_2_disj_0Y_55)
                    unify(ab_2_disj_0Z_55, ab_2_disj_0Y_55, ab_2_disj_0, b_1_disj_0Y_53),
                    // other(ab_2_disj_0),
                    // empty(a_0_disj_0Y_51),
                    // other(a_0_disj_0),
                
            ]));
        });


    }
);