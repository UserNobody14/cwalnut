import { Map as ImmMap } from "immutable";
import { type ModeDetType, makeDet, commonModes } from "./ModeDetType";

export const defaultModes = ImmMap<string, ModeDetType[]>({
    'internal_append': [
        makeDet.det(
            commonModes.in,
            commonModes.in,
            commonModes.in
        ),
        // append(free, ground, ground).
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
            commonModes.in
        ),
        // append(ground, free, ground).
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
            commonModes.in
        ),
        // append(ground, ground, free).
        makeDet.semidet(
            commonModes.in,
            commonModes.in,
            commonModes.out
        ),
        // append(free, free, ground).
        makeDet.multi(
            commonModes.out,
            commonModes.out,
            commonModes.in
        )
    ],
    // TODO: variadic?
    'list': [
        makeDet.det(
            commonModes.in,
            commonModes.in
        ),
        makeDet.det(
            commonModes.in,
            commonModes.in,
            commonModes.in
        ),
        makeDet.det(
            commonModes.in,
            commonModes.in,
            commonModes.in
        ),
        makeDet.det(
            commonModes.in,
            commonModes.in,
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
            commonModes.out,
            commonModes.out
        ),
    ],
    'cons': [
        makeDet.det(
            commonModes.in,
            commonModes.in,
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.in,
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.out,
            commonModes.in
        ),
        makeDet.multi(
            commonModes.out,
            commonModes.out,
            commonModes.in
        ),
        makeDet.multi(
            commonModes.out,
            commonModes.in,
            commonModes.out
        ),
        // makeDet.nondet(
        //     commonModes.in,
        //     commonModes.out,
        //     commonModes.out
        // )
    ],
    // empty(ground).
    'empty': [
        makeDet.det(
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.in
        )
    ],
    'unify': [
        makeDet.det(
            commonModes.in,
            commonModes.in
        ),
        makeDet.semidet(
            commonModes.in,
            commonModes.out
        ),
        makeDet.semidet(
            commonModes.out,
            commonModes.in
        )
    ],
});
