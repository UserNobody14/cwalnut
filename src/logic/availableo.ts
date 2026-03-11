import { unifyHash } from "./refine";
import { List as ImmList} from "immutable";
import type { State } from "./State";
import { LLVar, LNom, type LTerm } from "./terms";
import type { MGoal, MStream } from "./streams";


// export function availableo(
//   n: LNom,
//   t: LTerm,
//   src = 'root'
// ): SingletonGoal {
//   return {
//     goal: (state: State): SingletonStream => {
//     const uh = unifyHash(ImmList<[LNom, LTerm]>([[n, t]]), state.subst, state.delta, state);
//     if (uh) {
//       return { success: uh };
//     } else {
//       return StreamFailed.StreamOver;
//     }
//     }
//   }
// }


export function availableo(
  n: LNom,
  t: LTerm,
  src = 'root'
): MGoal {
  return (state: State): MStream => {
    const uh = unifyHash(ImmList<[LNom, LTerm]>([[n, t]]), state.subst, state.delta, state);
    if (uh) {
      // return { success: uh };
      return [uh];
    } else {
      // return StreamFailed.StreamOver;
      console.log(`availableo failed for ${n.toString()} ${t.toString()} ${src}`);
      // throw new Error(`availableo failed for ${n.toString()} ${t.toString()} ${src}`);
      return []
    }
  }
}


export function hash(
  n1: LTerm,
  t: LTerm,
  src = 'root'
): MGoal {
  return (state: State): MStream => {
    let n: LNom;
    if (n1 instanceof LLVar) {
      const n2 = state.find(n1);
      if (!(n2 instanceof LNom)) {
        // throw new Error(`hash failed for ${n1.toString()} ${t.toString()} ${src}`);
        return [];
      } else {
        n = n2;
      }
    } else if (!(n1 instanceof LNom)) {
      console.log(`hash failed extra ${n1.toString()} ${t.toString()} ${src}`);
      return [];
    } else {
      n = n1;
    }
    const uh = unifyHash(ImmList<[LNom, LTerm]>([[n, t]]), state.subst, state.delta, state);
    if (uh) {
      // return { success: uh };
      return [uh];
    } else {
      // return StreamFailed.StreamOver;
      console.log(`Hash failed for ${n.toString()} ${t.toString()} ${src}`);
      // throw new Error(`availableo failed for ${n.toString()} ${t.toString()} ${src}`);
      return []
    }
  }
}
