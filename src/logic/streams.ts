import { State } from "./State";
import { type AnyGoal, type CombinedStateStreamType, type FlatStream, type Goal2, type ImmatureStream, type MatureStream, type SingletonGoal, type SingletonStream, StreamFailed } from "./types";
// import {applyDeltaNablaRules} from './refine';

export function failed(
    a: CombinedStateStreamType | SingletonStream
): a is StreamFailed.StreamOver {
    if (typeof a === "string" && a !== StreamFailed.StreamOver) {
        throw new Error(`Invalid StreamFailed value: ${a}`);
    }
    return a === StreamFailed.StreamOver;
}

// export function singleToCombined(
//     a: SingletonStream
// ): CombinedStateStreamType {
//     if (failed(a)) {
//         return StreamFailed.StreamOver;
//     }
//     return a.success;
// }

// export function wrapSingleton(
//     a: State | StreamFailed.StreamOver
// ): SingletonStream {
//     if (a === StreamFailed.StreamOver) {
//         return StreamFailed.StreamOver;
//     }
//     return { success: a };
// }
// export function unwrapSingleton(
//     a: { success: State }
// ): State;
// export function unwrapSingleton(
//     a: StreamFailed.StreamOver
// ): StreamFailed.StreamOver;
// export function unwrapSingleton(
//     a: SingletonStream
// ): State | StreamFailed.StreamOver {
//     if (a === StreamFailed.StreamOver) {
//         return StreamFailed.StreamOver;
//     }
//     return a.success;
// }
// // Distinguish recursive iterators from states
// export function isSubIterator(
//     a: CombinedStateStreamType
// ): a is Iterable<ImmatureStream> {
//     if (typeof a === "string") {
//         return false;
//     }
//     return !failed(a) && !(a instanceof State) && (typeof a === 'object' && Symbol.iterator in a);
// }

// // Distinguish Singleton from regular goals
// export function isSingletonGoal(
//     a: AnyGoal
// ): a is SingletonGoal {
//     return a && typeof a !== "function" && "goal" in a && typeof a.goal === "function";
// }

// export function isGoal(
//     a: AnyGoal
// ): a is Goal2 {
//     return !isSingletonGoal(a);
// }

// // Useful functions for working with goals

// function* liftStream(
//     a1: ImmatureStream,
//     fn: Goal2
// ): FlatStream {
//     // These hold the iterables found inside a1, still need to process their contents
//     const preActivatedIterables: Array<ImmatureStream> = [a1];
//     const activatedIterables: Array<Iterator<CombinedStateStreamType>> = [];

//     // These hold the iterables that resulted from running fn on the iterables found in a1
//     const preActivatedOutputIterables: Array<ImmatureStream> = [];
//     const activatedOutputIterables: Array<Iterator<CombinedStateStreamType>> = [];
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     // for (const a of a1) {
//     //     if (failed(a)) {
//     //         yield StreamFailed.StreamOver;
//     //     } else if (a instanceof State) {
//     //         preActivatedOutputIterables.push(fn(a));
//     //     } else {
//     //         preActivatedIterables.push(a);
//     //     }
//     // }
//     // Now we process the iterables found in a1
//     while (preActivatedIterables.length > 0 || activatedIterables.length > 0 || preActivatedOutputIterables.length > 0 || activatedOutputIterables.length > 0) {
//         // Then, we process the iterables that resulted from running fn on the iterables found in a1
//         if (activatedOutputIterables.length > 0) {
//             const next = activatedOutputIterables.shift();
//             if (next) {
//                 const nextRes = next.next();
//                 if (!nextRes.done) {
//                     let prioritize = false;
//                     if (failed(nextRes.value)) {
//                         yield StreamFailed.StreamOver;
//                     } else if (!failed(nextRes.value) && isSubIterator(nextRes.value)) {
//                         preActivatedOutputIterables.push(nextRes.value);
//                     } else if (nextRes.value instanceof State) {
//                         yield nextRes.value;
//                         // prioritize = true;
//                         prioritize = false;
//                     } else {
//                         throw new Error("Unreachable");
//                     }

//                     if (prioritize) {
//                         activatedOutputIterables.unshift(next);
//                     } else {
//                         activatedOutputIterables.push(next);
//                     }
//                 } else {
//                     // console.warn("Done1");
//                     if (nextRes.value) {
//                         throw new Error(`Unexpected value: ${JSON.stringify(nextRes.value, null, 2)}`);
//                     }
//                     yield StreamFailed.StreamOver;
//                 }
//             }
//         } 
//         if (activatedIterables.length > 0) {
//             // Now we process the iterables still found in a1
//             const next = activatedIterables.shift();
//             if (next) {
//                 const nextRes = next.next();
//                 if (!nextRes.done) {
//                     let prioritize = false;
//                     if (failed(nextRes.value)) {
//                         yield StreamFailed.StreamOver;
//                     } else if (isSubIterator(nextRes.value)) {
//                         preActivatedIterables.push(nextRes.value);
//                         // activatedIterables.push(nextRes.value[Symbol.iterator]());
//                     } else if (nextRes.value instanceof State) {
//                         // prioritize = true;
//                         prioritize = false;
//                         preActivatedOutputIterables.push(fn(nextRes.value));
//                     } else {
//                         throw new Error(`Unreachable2: ${JSON.stringify(nextRes.value, null, 2)}`);
//                     }

//                     if (prioritize) {
//                         activatedIterables.unshift(next);
//                     } else {
//                         activatedIterables.push(next);
//                     }
//                 } else {
//                     // console.warn("Done1");
//                     // yield StreamFailed.StreamOver;
//                     if (nextRes.value) {
//                         throw new Error(`Unexpected value: ${JSON.stringify(nextRes.value, null, 2)}`);
//                     }
//                 }
//             }
//         }
//         // First, we process the iterables that resulted from running fn on the iterables found in a1
//         if (preActivatedOutputIterables.length > 0) {
//             const next = preActivatedOutputIterables.shift();
//             if (next) {
//                 const nextIter = next[Symbol.iterator]();
//                 activatedOutputIterables.push(nextIter);
//             }
//         }
//         if (preActivatedIterables.length > 0) {
//             // Then, we process the iterables found in a1
//             const next = preActivatedIterables.shift();
//             if (next) {
//                 const nextIter = next[Symbol.iterator]();
//                 activatedIterables.push(nextIter);
//             }
//         }
//     }
// }

// export function* mapStreams(
//     goal: AnyGoal,
//     stream: ImmatureStream | Iterator<CombinedStateStreamType>
// ): ImmatureStream {

//     const streamIter = Symbol.iterator in stream ? stream[Symbol.iterator]() : stream;

//         const next = streamIter.next();
//         if (next.done) {
//             yield StreamFailed.StreamOver;
//         } else {
//             if (failed(next.value)) {
//                 yield StreamFailed.StreamOver;
//             } else if (isSubIterator(next.value)) {
//                 // outIter = mergeStreams(outIter, mapStreams(goal, next.value));
//                 yield mergeStreams(
//                     mapStreams(goal, next.value), 
//                     mapStreams(goal, streamIter)
//                 );
//             } else if (next.value instanceof State) {
//                 const res = applyGoal(goal, next.value);
//                 yield mergeStreams(res, 
//                     mapStreams(goal, streamIter)
//                 );
//             } else {
//                 throw new Error("Unreachable");
//             }
//         }
// }

// export function* mapStreams2(
//     goal: AnyGoal,
//     stream: ImmatureStream | Iterator<CombinedStateStreamType>
// ): ImmatureStream {
//     const streamIter = Symbol.iterator in stream ? stream[Symbol.iterator]() : stream;
//     const next = streamIter.next();
//         if (next.done) {
//             return;
//         } else {
//             if (failed(next.value)) {
//                 yield StreamFailed.StreamOver;
//             } else if (isSubIterator(next.value)) {
//                 // outIter = mergeStreams(outIter, mapStreams(goal, next.value));
//                 yield mergeStreams(
//                     mapStreams(goal, next.value), 
//                     mapStreams(goal, streamIter)
//                 );
//             } else if (next.value instanceof State) {
//                 const res = applyGoal(goal, next.value);
//                 yield mergeStreams(res, 
//                     mapStreams(goal, streamIter)
//                 );
//             } else {
//                 throw new Error("Unreachable");
//             }
//         }
// }


// export function* mergeStreams(
//     a1: ImmatureStream,
//     a2: ImmatureStream
// ): FlatStream {
//     const a2Stream = flattenStream(a2)[Symbol.iterator]();
//     for (const sc of flattenStream(a1)) {
//         if (!failed(sc)) {
//             yield sc;
//         } else {
//             yield StreamFailed.StreamOver;
//         }
//         const sc2 = a2Stream.next();
//         if (!sc2.done) {
//             if (!failed(sc2.value))  {
//                 yield sc2.value;
//             } else {
//                 yield StreamFailed.StreamOver;
//             }
//         }
//     }

//     while (true) {
//         const sc2 = a2Stream.next();
//         if (sc2.done) {
//             break;
//         }
//         if (!failed(sc2.value)) {
//             yield sc2.value;
//         }
//     }
// }

// export function* mergeStreams2(
//     a1: ImmatureStream | Iterator<CombinedStateStreamType>,
//     a2: ImmatureStream | Iterator<CombinedStateStreamType>
// ): FlatStream {
//     const a2Stream = flattenStream(a2)[Symbol.iterator]();
//     for (const sc of flattenStream(a1)) {
//         if (!failed(sc)) {
//             yield sc;
//         } else {
//             yield StreamFailed.StreamOver;
//         }
//         const sc2 = a2Stream.next();
//         if (!sc2.done) {
//             if (!failed(sc2.value))  {
//                 yield sc2.value;
//             } else {
//                 yield StreamFailed.StreamOver;
//             }
//         }
//     }

//     while (true) {
//         const sc2 = a2Stream.next();
//         if (sc2.done) {
//             break;
//         }
//         if (!failed(sc2.value)) {
//             yield sc2.value;
//         } else {
//             yield StreamFailed.StreamOver;
//         }
//     }
// }

// export function* trueFlattenStream(
//     a1: ImmatureStream
// ): FlatStream {
//     for (const sc of a1) {
//         if (failed(sc)) {
//             yield StreamFailed.StreamOver;
//         } else if (isSubIterator(sc)) {
//             yield* trueFlattenStream(sc);
//         } else if (sc instanceof State) {
//             yield sc;
//         } else {
//             throw new Error("Unreachable");
//         }
//     }
// }


// export function* flattenStream(
//     a1: ImmatureStream | Iterator<CombinedStateStreamType>,
// ): FlatStream {
//     // These hold the iterables found inside a1, still need to process their contents
//     const preActivatedIterables: Array<ImmatureStream> = Symbol.iterator in a1 ? [a1] : [];
//     const activatedIterables: Array<Iterator<CombinedStateStreamType>> = Symbol.iterator in a1 ? [] : [a1];

//     yield StreamFailed.StreamOver; // To prevent it from being empty

//     // Now we run through the iterables found in a1, holding off on all the additional iterables and yielding everything we can
//     while (preActivatedIterables.length > 0 || activatedIterables.length > 0) {
//         // First, we process the iterables found in a1
//         if (activatedIterables.length > 0) {
//             const next = activatedIterables.shift();
//             if (next) {
//                 const nextRes = next.next();
//                 if (!nextRes.done) {
//                     // let prioritize = false;
//                     if (failed(nextRes.value)) {
//                         yield StreamFailed.StreamOver;
//                     } else if (isSubIterator(nextRes.value)) {
//                         preActivatedIterables.push(nextRes.value);
//                     } else if (nextRes.value instanceof State) {
//                         yield nextRes.value;
//                     } else {
//                         throw new Error("Unreachable3");
//                     }
//                     activatedIterables.push(next);
//                 } else {
//                     yield StreamFailed.StreamOver;
//                 }
//             }
//         }
//         // Then, we process the iterables found inside a1
//         if (preActivatedIterables.length > 0) {
//             const next = preActivatedIterables.shift();
//             if (next) {
//                 const nextIter = next[Symbol.iterator]();
//                 activatedIterables.push(nextIter);
//             }
//         }
//     }
// }


// function* liftSingleton(
//     a1: ImmatureStream,
//     a: SingletonGoal
// ): FlatStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     for (const sc of flattenStream(a1)) {
//         if (failed(sc)) {
//             yield StreamFailed.StreamOver;
//         } else {
//             const sg = a.goal(sc);
//             if (failed(sg)) {
//                 yield StreamFailed.StreamOver;
//             } else {
//                 yield sg.success;
//             }
//         }
//     }
// }

// function* liftSingleton2(
//     a1: ImmatureStream,
//     a: SingletonGoal
// ): ImmatureStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     for (const sc of a1) {
//         if (failed(sc)) {
//             yield StreamFailed.StreamOver;
//         } else if (isSubIterator(sc)) {
//             yield liftSingleton2(sc, a);
//         } else if (sc instanceof State) {
//             const sg = a.goal(sc);
//             if (failed(sg)) {
//                 yield StreamFailed.StreamOver;
//             } else {
//                 yield sg.success;
//             }
//         } else {
//             throw new Error("Unreachable");
//         }
//     }
// }

// function liftSingleton3(
//     a: SingletonGoal
// ): Goal2 {
//     return function* (sc: State): ImmatureStream {
//         const sg = a.goal(sc);
//         if (failed(sg)) {
//             yield StreamFailed.StreamOver;
//         } else {
//             yield sg.success;
//         }
//     }
// }


// function liftGoal(
//     a: AnyGoal
// ): (i: ImmatureStream) => ImmatureStream {
//     if (isSingletonGoal(a)) {
//         return (i) => liftSingleton2(i, a);
//     } else {
//         return (i) => liftStream(i, a);
//     }
// }

// export function combineGoals(
//     a: AnyGoal,
//     a2: AnyGoal
// ): AnyGoal {
//     if (isSingletonGoal(a) && isSingletonGoal(a2)) {
//         return {
//             goal: (sc: State): SingletonStream => {
//                 const res = a.goal(sc);
//                 if (failed(res)) {
//                     return StreamFailed.StreamOver;
//                 } else {
//                     return a2.goal(res.success);
//                 }
//             }
//         };
//     } else if (isSingletonGoal(a) && !isSingletonGoal(a2)) {
//         // return {
//         //     goal: (sc: State): SingletonStream => {
//         //         const res = a.goal(sc);
//         //         if (failed(res)) {
//         //             return StreamFailed.StreamOver;
//         //         } else {
//         //             return a2(res.success);
//         //         }
//         //     }
//         // }
//         // return combineGoals(a2, a);
//         return function* (sc: State) {
//             const res = a.goal(sc);
//             yield StreamFailed.StreamOver; // To prevent it from being empty
//             if (!failed(res)) {
//                 // for (const sc2 of a2(res.success)) {
//                 //     yield sc2;
//                 // }
//                 yield a2(res.success);
//             } else {
//                 yield StreamFailed.StreamOver;
//             }
//         }
//     } else if (!isSingletonGoal(a) && isSingletonGoal(a2)) {
//         return combineGoals(a2, a);
//         // return (s) => liftSingleton(a(s), a2);
//         // return function* (s) {
//             // yield StreamFailed.StreamOver;
//             // yield liftSingleton2(a(s), a2);
//         // }
//     } else if (!isSingletonGoal(a) && !isSingletonGoal(a2)) {
//         return function* (sc: State) {
//             yield StreamFailed.StreamOver; // To prevent it from being empty
//             const res = a(sc);
//             yield liftStream(res, a2);
//         }
//     } else {
//         throw new Error("Unreachable");
//     }
// }

// export function* applyGoal(
//     a: AnyGoal,
//     sc: State
// ): ImmatureStream {
//     if (isSingletonGoal(a)) {
//         yield singleToCombined(a.goal(sc));
//     } else {
//         yield a(sc);
//     }
// }

// export function* iteratorToStream(
//     a: Iterator<CombinedStateStreamType>
// ): ImmatureStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     while (true) {
//         const next = a.next();
//         if (next.done) {
//             break;
//         }
//         if (failed(next.value)) {
//             yield StreamFailed.StreamOver;
//         } else if (isSubIterator(next.value)) {
//             yield next.value;
//         } else if (next.value instanceof State) {
//             yield next.value;
//         } else {
//             throw new Error("Unreachable");
//         }
//     }
// }

// export function firstOfStream(
//     a: ImmatureStream
// ): [State | StreamFailed.StreamOver, ImmatureStream | StreamFailed.StreamOver] {
//     const aIter = a[Symbol.iterator]();
//     const first = aIter.next();
//     if (first.done) {
//         return [StreamFailed.StreamOver, StreamFailed.StreamOver];
//     } else if (failed(first.value)) {
//         return [StreamFailed.StreamOver, iteratorToStream(aIter)];
//     } else if (isSubIterator(first.value)) {
//         const [firstOfStreamV, remainder] = firstOfStream(first.value);
//         return [firstOfStreamV, mergeStreams2(aIter, remainder)];
//     } else if (first.value instanceof State) {
//         return [first.value, iteratorToStream(aIter)];
//     } else {
//         return [StreamFailed.StreamOver, StreamFailed.StreamOver];
//     }
// }

// function* toImmStream(
//     a: Iterator<CombinedStateStreamType>,
//     remainderIter: Iterator<CombinedStateStreamType> | StreamFailed.StreamOver
// ): ImmatureStream {
//     if (remainderIter === StreamFailed.StreamOver) {
//         yield* iteratorToStream(a);
//     } else {
//         yield StreamFailed.StreamOver; // To prevent it from being empty
//         yield* mergeAllIters(a, remainderIter);
//     }
// }

// export function firstOfIter(
//     a: Iterator<CombinedStateStreamType>
// ): [State | StreamFailed.StreamOver, Iterator<CombinedStateStreamType> | StreamFailed.StreamOver] {
//     const aIter = a;
//     const first = aIter.next();
//     if (first.done) {
//         return [StreamFailed.StreamOver, StreamFailed.StreamOver];
//     } else if (first.value instanceof State || failed(first.value)) {
//         return [first.value, aIter];
//     } else if (isSubIterator(first.value)) {
//         const [firstOfStreamV, remainder] = firstOfIter(first.value[Symbol.iterator]());
//         const outIter: ImmatureStream = toImmStream(aIter, remainder);
//         return [firstOfStreamV, outIter[Symbol.iterator]()];
//     } else {
//         return [StreamFailed.StreamOver, StreamFailed.StreamOver];
//     }
// }

// export function* mergeAllStreams(
//     ...a: ImmatureStream[]
// ): ImmatureStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     const queue: Array<ImmatureStream> = [...a];
//     while (queue.length > 0) {
//         const next = queue.shift();
//         if (next) {
//             const [first, remainder] = firstOfStream(next);
//             yield first;
//             if (remainder !== StreamFailed.StreamOver) {
//                 queue.push(remainder);
//             }
//         }
//     }
// }

// export function* mergeAllIters(
//     ...a: Iterator<CombinedStateStreamType>[]
// ): ImmatureStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     const queue: Array<Iterator<CombinedStateStreamType>> = [...a];
//     while (queue.length > 0) {
//         const next = queue.shift();
//         if (next) {
//             const [first, remainder] = firstOfIter(next);
//             yield first;
//             if (remainder !== StreamFailed.StreamOver) {
//                 queue.push(remainder);
//             }
//         }
//     }
// }


// export function mergeGoalsList(
//     ...a1: AnyGoal[]
// ): AnyGoal {
//     const a = remerged(a1);
//     return function* (sc: State): ImmatureStream {
//         const queue: Array<Iterator<CombinedStateStreamType>> = [];
//         yield StreamFailed.StreamOver; // To prevent it from being empty
//         for (const g of a) {
//             const [first, remainder] = firstOfIter(applyGoal(g, sc)[Symbol.iterator]());
//             yield first;
//             if (remainder !== StreamFailed.StreamOver) {
//                 queue.push(remainder);
//             }
//         }
//         yield mergeAllIters(...queue);
//     }
// }



// function mergeSingletonGoals(a: SingletonGoal[]): Goal2 {
//     return function* (sc: State): ImmatureStream {
//         const allResults = a.map((g) => g.goal(sc)).filter((g): g is { success: State; } => !failed(g));
//         if (allResults.length === 0) {
//             yield StreamFailed.StreamOver;
//         } else {
//             for (const sg of allResults) {
//                 yield sg.success;
//             }
//         }
//     };
// }

// export function remerged(
//     a: AnyGoal[]
// ): Goal2[] {
//     const a1 = sortGoalList(a);
//     return a1.map((g): Goal2 => {
//         if (g.length === 1) {
//             const firstElement = g[0];
//             if (!isSingletonGoal(firstElement)) {
//                 return firstElement;
//             } else {
//                 return liftSingleton3(firstElement);
//             }
//         } else if (g.every(isSingletonGoal)) {
//                 return mergeSingletonGoals(g);
//         } else {
//             throw new Error("Unreachable");
//         }
//     });
// }

// export function sortGoalList(
//     a: AnyGoal[]
// ): AnyGoal[][] {
//     // Group by singleton and regular goals
//     const grouped = a.reduce<AnyGoal[][]>(([currGroup, ...restGroups], g) => {
//         if (isSingletonGoal(g)) {
//             if (currGroup.length > 0 && isSingletonGoal(currGroup[0])) {
//                 return [[g, ...currGroup], ...restGroups];
//             } else {
//                 return [[g], currGroup, ...restGroups];
//             }
//         } else {
//             return [[g], currGroup, ...restGroups];
//         }
//     }, [[]]);
//     const regrouped = grouped.filter((g) => g.length > 0);
//     return regrouped;
// }

// export function combineGoalsAll(
//     fgoal: AnyGoal,
//     ...a: AnyGoal[]
// ): AnyGoal {
//     if (a.length === 0) {
//         return fgoal;
//     }
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver; // To prevent it from being empty
//         let goal1 = applyGoal(fgoal, sc);
//         for (const g of a) {
//             goal1 = mapStreams(g, goal1);
//         }
//         yield* goal1;
//     }
// }


// export function combineGoalsList(
//     fgoal: AnyGoal,
//     ...a: AnyGoal[]
// ): AnyGoal {
//     if (a.length === 0) {
//         return fgoal;
//     }
//     return a.reduce<AnyGoal>(combineGoals, fgoal);
// }

// function* emptyStream(): FlatStream {
//     yield StreamFailed.StreamOver;
// }

// function toIterGoal(
//     g: AnyGoal,
// ): Goal2 {
//     if (isSingletonGoal(g)) {
//         return liftSingleton3(g);
//     } else {
//         return g;
//     }
// }

// function* simpleMerge(
//     a: ImmatureStream,
//     b: ImmatureStream
// ): FlatStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     const aa = trueFlattenStream(a);
//     const bb = trueFlattenStream(b);
//     const aaIter = aa[Symbol.iterator]();
//     const bbIter = bb[Symbol.iterator]();
//     while (true) {
//         const aaNext = aaIter.next();
//         const bbNext = bbIter.next();
//         if (aaNext.done && bbNext.done) {
//             break;
//         }
//         if (!aaNext.done) {
//             yield aaNext.value;
//         }
//         if (!bbNext.done) {
//             yield bbNext.value;
//         }
//     }
// }

// function simpleMergeAll(
//     ...a: ImmatureStream[]
// ): FlatStream {
//     return a.reduce<FlatStream>((acc, next): FlatStream => simpleMerge(acc, next), emptyStream());
// }

// function* simpleMap(
//     g: AnyGoal,
//     stream: ImmatureStream
// ): FlatStream {
//     const g2 = toIterGoal(g);
//     for (const sc of flattenStream(stream)) {
//         if (failed(sc)) {
//             yield StreamFailed.StreamOver;
//         } else {
//             yield* flattenStream(g2(sc));
//         }
//     }
// }

// function simpleMap2(
//     g: AnyGoal,
//     stream: ImmatureStream
// ): ImmatureStream[] {
//     const g2 = toIterGoal(g);
//     const mappedAll = [];
//     for (const sc of trueFlattenStream(stream)) {
//         if (failed(sc)) {
//             mappedAll.push(emptyStream());
//         } else {
//             mappedAll.push(g2(sc));
//         }
//     }
//     return mappedAll;
// }

// function* simpleMap3(
//     g2: Goal2,
//     stream: ImmatureStream
// ): ImmatureStream {
//     for (const sc of trueFlattenStream(stream)) {
//         if (failed(sc)) {
//             yield StreamFailed.StreamOver;
//         } else {
//             yield* g2(sc);
//         }
//     }
// }

// function* simpleMapAll(
//     g: AnyGoal,
//     // ...streams: ImmatureStream[]
//     stream: ImmatureStream
// ): ImmatureStream {
//     // return simpleMergeAll(...streams.map((s) => simpleMap(g, s)));
//     yield StreamFailed.StreamOver;
//     yield* simpleMergeAll(...simpleMap2(g, stream));
// }

// export function simpleCombine(
//     a: AnyGoal,
//     ...b: AnyGoal[]
// ): AnyGoal {
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield* b.reduce<ImmatureStream>((acc, next) => simpleMapAll(next, acc), toIterGoal(a)(sc));
//     }
// }

// export function simpleCombine2(
//     a: AnyGoal,
//     ...b: AnyGoal[]
// ): AnyGoal {
//     // return function* (sc: State): ImmatureStream {
//     //     yield StreamFailed.StreamOver;
//     //     // yield* b.reduce<ImmatureStream>((acc, next) => simpleMapAll(next, acc), toIterGoal(a)(sc));

//     // }
//     const a2 = toMGoal(a);
//     const b2 = b.map(toMGoal);
//     return liftMGoal(allM([a2, ...b2]));
// }

// export function simpleDisjunct(
//     ...b: AnyGoal[]
// ): AnyGoal {
//     // return function* (sc: State): ImmatureStream {
//     //     yield StreamFailed.StreamOver;
//     //     yield* simpleMergeAll(...b.map((g) => toIterGoal(g)(sc)));
//     // }
//     return liftMGoal(eitherM(b.map(toMGoal)));
// }


export type MDelay = () => MStream;
export type MStream = [State, MDelay] | [MDelay] | [State] | [];
export type MGoal = (m: State) => MStream;

function inc(
    a: MStream    
): MStream {
    return [() => a];
}


// function singletonToMGoal(
//     a: SingletonGoal
// ): MGoal {
//     return (m) => {
//         const res = a.goal(m);
//         if (failed(res)) {
//             return [];
//         } else {
//             return [res.success];
//         }
//     };
// }

// function regToMGoal(
//     z: Goal2
// ): MGoal {
//     return (m): MStream => {
//         const res = z(m)[Symbol.iterator]();
//         return regMGoalIter(z, m, res);
//     };
// }

// function toMGoal(
//     aa: AnyGoal
// ): MGoal {
//     if (isSingletonGoal(aa)) {
//         return singletonToMGoal(aa);
//     } else {
//         return regToMGoal(aa);
//     }
// }

// function liftMGoal(
//     a: MGoal
// ): Goal2 {
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield* wrapMStream(a(sc));
//     }
// }


// function* wrapMStream(
//     a: MStream
// ): ImmatureStream {
//     yield StreamFailed.StreamOver; // To prevent it from being empty
//     if (a.length === 0) {
//         yield StreamFailed.StreamOver;
//     } else if (a.length === 1) {
//         const [c] = a;
//         if (c instanceof State) {
//             yield c;
//         } else {
//             yield wrapMStream(c());
//         }
//     } else if (a.length === 2) {
//         const [c, f] = a;
//         yield c;
//         yield* wrapMStream(f());
//     } else {
//         throw new Error("Unreachable");
//     }
// }

// function regMGoalIter(
//     z: Goal2,
//     m: State,
//     res: Iterator<CombinedStateStreamType>
// ): MStream {
//     const next = res.next();
//     if (next.done) {
//         return [];
//     } else if (failed(next.value)) {
//         return [() => regMGoalIter(z, m, res)];
//     } else if (isSubIterator(next.value)) {
//         const itr1 = next.value[Symbol.iterator]();
//         return [() => mplus(regMGoalIter(z, m, itr1), () => regMGoalIter(z, m, res))];
//     } else if (next.value instanceof State) {
//         return [next.value, () => regMGoalIter(z, m, res)];
//     } else {
//         throw new Error("Unreachable");
//     }
// }


/**(define bind
  (lambda (a-inf g)
    (case-inf a-inf
      (() #f)
      ((f) (inc (bind (f) g)))
      ((a) (g a))
      ((a f) (mplus (g a) (lambdaf@ () (bind (f) g)))))))
 */

// Maps directly through
export function bind(
    cInf: MStream,
    g: MGoal
): MStream {
    if (cInf.length === 0) {
        return [];
    } else if (cInf.length === 1) {
        const [f] = cInf;
        if (f instanceof State) {
            // return [() => g1(f)];
            return g(f);
        }
        // return [() => bind(f(), g1)];
        return [() => bind(f(), g)];
    } else if (cInf.length === 2) {
        const [a, f] = cInf;
        return mplus(g(a), () => bind(f(), g));
        // return mplus([() => g1(c)], () => [() => bind(f(), g1)]);
    } else {
        // return g1(cInf[0]);
        throw new Error("Unreachable");
    }
}

/**
 * (define mplus
  (lambda (a-inf f)
    (case-inf a-inf
      (() (f))
      ((f^) (inc (mplus (f) f^)))
      ((a) (choice a f))
      ((a f^) (choice a (lambdaf@ () (mplus (f) f^)))))))
 */
// Merges bound streams
export function mplus(
    aInf: MStream,
    f: MDelay
): MStream {
    if (aInf.length === 0) {
        return f();
    } else if (aInf.length === 1) {
        const [a] = aInf;
        if (a instanceof State) {
            return [a, f];
        }
        const fHat = a;
        return [() => mplus(f(), fHat)];
    } else if (aInf.length === 2) {
        const [a, fHat] = aInf;
        // return [cInf[0], () => mplus(cInf[1], f)];
        return [a, () => mplus(f(), fHat)];
    } else {
        // return [cInf[0], f];
        throw new Error("Unreachable");
    }
}

export function mplusStar(
    g: MStream[],
): MStream {
    if (g.length === 0) {
        return [];
    }
    if (g.length === 1) {
        return g[0];
    }
    const [first, ...rest] = g;
    // return rest.reduce<MStream>((acc, next) => mplus(acc, () => next), first);
    return mplus(first, () => mplusStar(rest));
    // return [() => mplus(first, () => mplusStar(rest))];
}

// export function mplusStar2(
//     g: MGoal[],
// ): MGoal {
//     if (g.length === 0) {
//         return emptyGoal;
//     }
//     if (g.length === 1) {
//         return g[0];
//     }
//     const [first, ...rest] = g;
//     // return rest.reduce<MStream>((acc, next) => mplus(acc, () => next), first);
//     return mplus(first, () => mplusStar(rest));
//     // return [() => mplus(first, () => mplusStar(rest))];
// }
/**
 * (define-syntax bind*
  (syntax-rules ()
    ((_ e) e)
    ((_ e g0 g ...)
     (let ((a-inf e))
       (and a-inf (bind* (bind a-inf g0) g ...))))))
 */
export function bindStar(
    e: MStream,
    g1: MGoal[]
): MStream {
    if (g1.length === 0) {
        return e;
    }
    if (e.length === 0) {
        return [];
    }
    if (g1.length === 1) {
        // return g1[0];
        return bind(e, g1[0]);
        // return [() => bind(cInf, g1[0])];
        // return [() => g1[0]]
    }
    const [first, ...rest] = g1;
    // return [() => bindStar(
    //     [() => bind(cInf, first)],
    //     rest
    // )];
    return bindStar(
        bind(e, first),
        rest
    );
}

const emptyGoal: MGoal = (_m) => [];

export function eitherM(
    g1: MGoal[]
): MGoal {
    if (g1.length === 0) {
        return (m) => [m];
    }
    if (g1.length === 1) {
        // return mplus(cInf, () => g1[0](cInf[0]));
        return (sc) => [() => g1[0](sc)];
    }
    // const [first, ...rest] = g1;
    // return (m) => mplus(first(m), () => mconde(rest)(m));
    // return (m) => mplusStar(g1.map((g) => bindStar([m], [g])));
    return (m) => [() => mplusStar(g1.map((g) => bindStar(g(m), [])))];
    // return mconde(
    //     mplus(cInf, () => first(cInf[0])),
    //     rest
    // );
}

export function allM(
    g1: MGoal[]
): MGoal {
    if (g1.length === 0) {
        return (_m) => [];
    }
    if (g1.length === 1) {
        return g1[0];
    }
    const [first, ...rest] = g1;
    // return (m) => [() => bindStar([() => first(m)], rest)];
    return (m) => bindStar(first(m), rest);
    // return (m) => g1.reduce<MStream>((acc, next) => bindStar(acc, () => next(m)), []);
}

export function takeT(iterable1: MStream, length1: number, maxL = 1000): State[] {
    const CONSTANT_MAX_LENGTH = maxL;
    let maxLength = CONSTANT_MAX_LENGTH;
    const out: State[] = [];
    let iterable = iterable1;
    // let length = length1;
    while (out.length < length1) {
        maxLength--;
        if (maxLength === 0) {
            throw new Error(`Max length reached: ${CONSTANT_MAX_LENGTH}, Searching for ${length1}, found ${out.length}`);
        }
        if (iterable.length === 0) {
            // console.log("StreamOver");
            return out;
            // break;
        } else if (iterable.length === 1) {
            const [c] = iterable;
            if (c instanceof State) {
                out.push(c);
                return out;
            } else {
                // console.log('ITERABLE F1', out.length);
                iterable = c();
            }
        } else if (iterable.length === 2) {
            const [c, f] = iterable;
            out.push(c);
            // console.log('ITERABLE F2', out.length);
            if (out.length === length1) {
                return out;
            }
            iterable = f();
        } else {
            throw new Error("Unreachable");
            // break;
        }
    }
    return out;
}