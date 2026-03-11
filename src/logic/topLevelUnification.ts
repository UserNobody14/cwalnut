
import { unify } from "./refine";
import type { State } from "./State";
import type {LTerm} from './terms';
import { type SingletonStream, StreamFailed } from "./types";

// export function topLevelUnification(s: State, u: LTerm, v: LTerm): State | null {
//     if (s.timev !== 0 && Date.now() - s.timev > 1000) {
//         console.warn("Time limit exceeded");
//         throw new Error("Time limit exceeded");
//     }
//     if (s.fail) {
//         return null;
//     }
//     const unrefinedState = s.unify(u, v);
//     if (unrefinedState) {
//         const lvarList = unrefinedState.i.local.lvarList;
//         if (lvarList.size === 0) {
//             return unrefinedState;
//         } else {

//         }
//     }
//     return null;
// }



// export function* topLevelUnificationY(s: State, u: LTerm, v: LTerm): Iterable<State> {
//     if (s.timev !== 0 && Date.now() - s.timev > 1000) {
//         console.warn("Time limit exceeded");
//         throw new Error("Time limit exceeded");
//     }
//     // if (s.fail) {
//     //     yield State.toFail();
//     // } else {
//         if (s.i.local.lvarList.size > 0) {
//             console.warn("Lvar list not empty");
//             throw new Error("Lvar list not empty");
//         }
//         // const unrefinedState = s.updateLocal(l => l.setLvarList(ImmList())).unify(u, v);
//         const unrefinedState = s.unify(u, v);
//         if (unrefinedState) {
//             const lvarList = unrefinedState.i.local.lvarList;
//             if (lvarList.size === 0) {
//                 yield unrefinedState;
//             } else {
//                 // yield* unrefinedState.applyConstraints(lvarList.toArray());
//                 // yield unrefinedState.applyOneConstraint(lvarList.toArray()).resetLvarList();
//                 // const lvarConstraintTest = unrefinedState.c.constraints.toArray().flatMap(
//                 //     (c) => c.lvars.toArray()
//                 // );
//                 const lvarCs = unrefinedState.c.constraints.keySeq().toArray().map(
//                     k => new LLVar(k)
//                 )
//                 yield unrefinedState.applyOneConstraint(lvarCs).resetLvarList();
//             }
//         } else {
//             yield State.toFail();
//         }
//     // }
// }


export function topLevelUnificationS(s: State, u: LTerm, v: LTerm): SingletonStream {
    if (s.timev !== 0 && Date.now() - s.timev > 1000) {
        console.warn("Time limit exceeded");
        throw new Error("Time limit exceeded");
    }
    // if (s.i.local.lvarList.size > 0) {
    //     console.warn("Lvar list not empty");
    //     throw new Error("Lvar list not empty");
    // }
    // const unrefinedState = s.updateLocal(l => l.setLvarList(ImmList())).unify(u, v);
    // const unrefinedState = s.unify(u, v);
    const unrefinedState = unify(u, v, s);
    if (unrefinedState) {
        // const lvarList = unrefinedState.i.local.lvarList;
        // const lvarCs = unrefinedState.c.constraints.keySeq().toArray().map(
        //     k => new LLVar(k)
        // )
        // if (lvarCs.length === 0) {
        //     return {
        //         success: unrefinedState
        //     };
        // } else {
        //     // yield* unrefinedState.applyConstraints(lvarList.toArray());
        //     // yield unrefinedState.applyOneConstraint(lvarList.toArray()).resetLvarList();
        //     // const lvarConstraintTest = unrefinedState.c.constraints.toArray().flatMap(
        //     //     (c) => c.lvars.toArray()
        //     // );
        //     // const constrainedState = unrefinedState.applyOneConstraint(lvarCs);
        //     // if (failed(constrainedState)) {
        //     //     return StreamFailed.StreamOver;
        //     // }
        //     // return wrapSingleton(constrainedState.success.resetLvarList());
        //     // return wrapSingleton(repeatedlyRunConstraints(unrefinedState, 20));
            return {
                success: unrefinedState
            };
        // }
    } else {
        return StreamFailed.StreamOver;
    }
}
