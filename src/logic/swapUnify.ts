import { LLVar, type LNom, LPair, LSuspension, type LTerm, LTie } from "./terms";


function reduceSuspension(
    [swapA, swapB]: readonly [LNom, LNom],
    orig: LSuspension
): LSuspension | LLVar {
    const [oswapA, oswapB] = orig.swap;
    const [a, b] = [swapA.name, swapB.name];
    // The suspension is swapping the following terms
    const [aHat, bHat] = [oswapA.name, oswapB.name];
    if (bHat === a && aHat === b) {
        return orig.term;
    }
    if (bHat === b && aHat === a) {
        return orig.term;
    }
    // if (b === aHat) {
    //     return applySwap([swapA, oswapB], orig.term) as LSuspension;
    // }
    return new LSuspension(
        [swapA, swapB],
        orig
    );
}

const isName = (z: LTerm): z is LNom => z.type === 'nom';


export function applySwap(
    [swapA, swapB]: readonly [LNom, LNom],
    z: LTerm
): LTerm {
    if (z instanceof LLVar) {
        return new LSuspension(
            [swapA, swapB],
            z
        );
    } else if (isName(z)) {
        if (z.name === swapA.name) {
            return swapB;
        } else if (z.name === swapB.name) {
            return swapA;
        } else {
            return z;
        }
    } else if (z instanceof LLVar) {
        return new LSuspension(
            [swapA, swapB],
            z
        );
    } else if (z instanceof LSuspension) {
        return reduceSuspension([swapA, swapB], z);
    } else if (z instanceof LPair) {
        return new LPair(
            applySwap([swapA, swapB], z.first),
            applySwap([swapA, swapB], z.second)
        );
    } else if (z instanceof LTie) {
        return new LTie(applySwap([swapA, swapB], z.name) as LNom, applySwap([swapA, swapB], z.term));
    }
    return z;
    // return u.map((z, orig) => {
    //     if (isName(z)) {
    //         if (z.name === swapA.name) {
    //             return swapB;
    //         } else if (z.name === swapB.name) {
    //             return swapA;
    //         } else {
    //             return z;
    //         }
    //     } else if (z instanceof LLVar) {
    //         return new LSuspension(
    //             [swapA, swapB],
    //             z
    //         );
    //     } if (z instanceof LSuspension && orig && orig instanceof LSuspension) {
    //         return reduceSuspension([swapA, swapB], orig);
    //     } if (z instanceof LSuspension && !orig) {
    //         throw new Error("Unexpected suspension");
    //     }
    //     return z;
    // });
    // const swap2 = v.map((z) => {
    //     if (z instanceof LNom && z.name === v.name.name) {
    //         return this.name;
    //     }
    //     return z;
    // });
    // return s.unify(swap1, v)?.unify(swap2, this) ?? null;
}

export function applySwap3(
    swaps: [LNom, LNom][],
    u: LTerm
) {
    return swaps.reduce((acc, [swapA, swapB]) => {
        return applySwap([swapA, swapB], acc);
    }, u);
}

