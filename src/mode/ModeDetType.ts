
export enum Determinism {
    DET = 0,
    SEMIDET = 1,
    MULTI = 2,
    NONDET = 3,
    ERROR = 4,
    FAILURE = 5
}
// Indicates what state a variable is in
// type string = {
//     type: Type,
//     varstate: string,
// }
// Indicates which mode/determinacy a predicate is in


export type ModeDetType = {
    varModes: Mode[];
    det: Determinism;
};

export type Mode = {
    from: string;
    to: string;
};

export const makeDet = {
    det: (...modes: Mode[]): ModeDetType => ({
        varModes: modes,
        det: Determinism.DET,
    }),
    semidet: (...modes: Mode[]): ModeDetType => ({
        varModes: modes,
        det: Determinism.SEMIDET,
    }),
    nondet: (...modes: Mode[]): ModeDetType => ({
        varModes: modes,
        det: Determinism.NONDET,
    }),
    multi: (...modes: Mode[]): ModeDetType => ({
        varModes: modes,
        det: Determinism.MULTI,
    }),
};

export const commonModes = {
    out: {
        from: 'free',
        to: 'ground',
    },
    in: {
        from: 'ground',
        to: 'ground',
    },
};
