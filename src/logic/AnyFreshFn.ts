import type { State } from "./State";
import type { MGoal, MStream } from "./streams";
import type { LLVar, LNom } from "./terms";

// export type AnyFreshFn = ((v: LLVar) => AnyGoal) | ((v: LLVar, z: LLVar) => AnyGoal) | ((v: LLVar, z: LLVar, y: LLVar) => AnyGoal) | ((v: LLVar, z: LLVar, y: LLVar, x: LLVar) => AnyGoal);
// export function freshG(fn: (v: LLVar) => AnyGoal): AnyGoal;
// export function freshG(fn: (v: LLVar, z: LLVar) => AnyGoal): AnyGoal;
// export function freshG(fn: (v: LLVar, z: LLVar, y: LLVar) => AnyGoal): AnyGoal;
// export function freshG(fn: (v: LLVar, z: LLVar, y: LLVar, x: LLVar) => AnyGoal): AnyGoal;
// export function freshG(fn: AnyFreshFn): AnyGoal {
//     const fnArity = fn.length;
//     if (fnArity === 1) {
//         return call_fresh(fn as (v: LLVar) => AnyGoal);
//     } else if (fnArity === 2) {
//         return fresh2(fn as (v: LLVar, z: LLVar) => AnyGoal);
//     } else if (fnArity === 3) {
//         return fresh3(fn as (v: LLVar, z: LLVar, y: LLVar) => AnyGoal);
//     } else if (fnArity === 4) {
//         return fresh4(fn as (v: LLVar, z: LLVar, y: LLVar, x: LLVar) => AnyGoal);
//     } else {
//         throw new Error("Unsupported arity");
//     }
// }

// export function call_fresh(f: (v: LLVar) => AnyGoal): AnyGoal {
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield sc.withLvar((ff) => (sc2) => {
//             const f3 = f(ff);
//             if (isSingletonGoal(f3)) {
//                 return singleToCombined(f3.goal(sc2));
//             } else {
//                 return f3(sc2);
//             }
//         }, '$&');
//     };
// }

// export function call_fresh2(f: (v: LLVar, v2: LLVar) => AnyGoal): AnyGoal {
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield sc.withLvar((ff) => (sc2) => {
//             return sc2.withLvar((ff2) => (sc3) => {
//                 const f3 = f(ff, ff2);
//                 if (isSingletonGoal(f3)) {
//                     return singleToCombined(f3.goal(sc3));
//                 } else {
//                     return f3(sc3);
//                 }
//             }, '$&');
//         }, '$&');
//     };
// }

// export function call_fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => AnyGoal): AnyGoal {
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield sc.withLvar((ff) => (sc2) => {
//             return sc2.withLvar((ff2) => (sc3) => {
//                 return sc3.withLvar((ff3) => (sc4) => {
//                     const f3 = f(ff, ff2, ff3);
//                     if (isSingletonGoal(f3)) {
//                         return singleToCombined(f3.goal(sc4));
//                     } else {
//                         return f3(sc4);
//                     }
//                 }, '$&');
//             }, '$&');
//         }, '$&');
//     };
// }

// export const fresh = call_fresh;

// export function fresh2(f: (v: LLVar, v2: LLVar) => AnyGoal): AnyGoal {
//     return call_fresh2(f);
// }

// export function fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => AnyGoal): AnyGoal {
//     return call_fresh3(f);
//     // return call_fresh((v) => fresh2((v2, v3) => f(v, v2, v3)));
// }

// export function fresh4(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => AnyGoal): AnyGoal {
//     return call_fresh((v) => fresh3((v2, v3, v4) => f(v, v2, v3, v4)));
// }

// export function fresh5(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar, v5: LLVar) => AnyGoal): AnyGoal {
//     return call_fresh((v) => fresh4((v2, v3, v4, v5) => f(v, v2, v3, v4, v5)));
// }

// export function fresh6(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar, v5: LLVar, v6: LLVar) => AnyGoal): AnyGoal {
//     return call_fresh((v) => fresh5((v2, v3, v4, v5, v6) => f(v, v2, v3, v4, v5, v6)));
// }
// ;

// export function freshNom(
//     fn: (v: LNom) => AnyGoal
// ): AnyGoal {
//     // return (sc) => {
//     //     return sc.withNom(fn)
//     // }
//     // return function* (sc: State): MatureStream {
//     //     if (sc.fail) {
//     //         if (sc.allowFails) {
//     //             yield sc;
//     //         }
//     //     } else {
//     //         yield* sc.withNom(fn, '');
//     //     }
//     // };
//     return function* (sc: State): ImmatureStream {
//         yield StreamFailed.StreamOver;
//         yield sc.withNom((ff) => (sc2) => {
//             const f3 = fn(ff);
//             if (isSingletonGoal(f3)) {
//                 return singleToCombined(f3.goal(sc2));
//             } else {
//                 return f3(sc2);
//             }
//         }, '');
//     };
// }

// export function freshNom2(
//     fn: (v: LNom, v2: LNom) => AnyGoal
// ): AnyGoal {
//     return freshNom((v) => freshNom((v2) => fn(v, v2)));
// }

// export function freshNom3(
//     fn: (v: LNom, v2: LNom, v3: LNom) => AnyGoal
// ): AnyGoal {
//     return freshNom((v) => freshNom2((v2, v3) => fn(v, v2, v3)));
// }

// export function freshNom4(
//     fn: (v: LNom, v2: LNom, v3: LNom, v4: LNom) => AnyGoal
// ): AnyGoal {
//     return freshNom((v) => freshNom3((v2, v3, v4) => fn(v, v2, v3, v4)));
// }

// export function freshNom5(
//     fn: (v: LNom, v2: LNom, v3: LNom, v4: LNom, v5: LNom) => AnyGoal
// ): AnyGoal {
//     return freshNom((v) => freshNom4((v2, v3, v4, v5) => fn(v, v2, v3, v4, v5)));
// }

// export function freshNom6(
//     fn: (v: LNom, v2: LNom, v3: LNom, v4: LNom, v5: LNom, v6: LNom) => AnyGoal
// ): AnyGoal {
//     return freshNom((v) => freshNom5((v2, v3, v4, v5, v6) => fn(v, v2, v3, v4, v5, v6)));
// }

export type AnyFreshFn =
	| ((v: LLVar) => MGoal)
	| ((v: LLVar, z: LLVar) => MGoal)
	| ((v: LLVar, z: LLVar, y: LLVar) => MGoal)
	| ((v: LLVar, z: LLVar, y: LLVar, x: LLVar) => MGoal);
export function freshG(fn: (v: LLVar) => MGoal): MGoal;
export function freshG(
	fn: (v: LLVar, z: LLVar) => MGoal,
): MGoal;
export function freshG(
	fn: (v: LLVar, z: LLVar, y: LLVar) => MGoal,
): MGoal;
export function freshG(
	fn: (v: LLVar, z: LLVar, y: LLVar, x: LLVar) => MGoal,
): MGoal;
export function freshG(fn: AnyFreshFn): MGoal {
	const fnArity = fn.length;
	if (fnArity === 1) {
		return call_fresh(fn as (v: LLVar) => MGoal);
	} else if (fnArity === 2) {
		return fresh2(fn as (v: LLVar, z: LLVar) => MGoal);
	} else if (fnArity === 3) {
		return fresh3(
			fn as (v: LLVar, z: LLVar, y: LLVar) => MGoal,
		);
	} else if (fnArity === 4) {
		return fresh4(
			fn as (
				v: LLVar,
				z: LLVar,
				y: LLVar,
				x: LLVar,
			) => MGoal,
		);
	} else {
		throw new Error("Unsupported arity");
	}
}

// export function call_fresh(f: (v: LLVar) => MGoal): MGoal {
//     return (sc: State): MStream => sc.withLvar((ff) => (sc2) => {
//             const f3 = f(ff);
//             return f3(sc2);
//         }, '$&');
// }
// export const fresh = call_fresh;

// export function fresh2(f: (v: LLVar, v2: LLVar) => MGoal): MGoal {
//     // return call_fresh2(f);
//     return call_fresh((v) => call_fresh((v2) => f(v, v2)));
// }

// export function fresh3(f: (v: LLVar, v2: LLVar, v3: LLVar) => MGoal): MGoal {
//     // return call_fresh3(f);
//     return call_fresh((v) => fresh2((v2, v3) => f(v, v2, v3)));
// }

// export function fresh4(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => MGoal): MGoal {
//     return call_fresh((v) => fresh3((v2, v3, v4) => f(v, v2, v3, v4)));
// }

// export function fresh5(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar, v5: LLVar) => MGoal): MGoal {
//     return call_fresh((v) => fresh4((v2, v3, v4, v5) => f(v, v2, v3, v4, v5)));
// }

// export function fresh6(f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar, v5: LLVar, v6: LLVar) => MGoal): MGoal {
//     return call_fresh((v) => fresh5((v2, v3, v4, v5, v6) => f(v, v2, v3, v4, v5, v6)));
// }

export function freshInternal(
	f: (v: LLVar) => MGoal,
): MGoal {
	return (sc: State): MStream =>
		sc.withLvar(
			(ff) =>
				(sc2): MStream => {
					const f3 = f(ff);
					return f3(sc2);
				},
			"$&",
		);
}

export function freshInternal2(
	f: (v: LLVar, v2: LLVar) => MGoal,
): MGoal {
	return freshInternal((v) =>
		freshInternal((v2) => f(v, v2)),
	);
}

export function freshInternal3(
	f: (v: LLVar, v2: LLVar, v3: LLVar) => MGoal,
): MGoal {
	return freshInternal((v) =>
		freshInternal2((v2, v3) => f(v, v2, v3)),
	);
}

export function freshInternal4(
	f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => MGoal,
): MGoal {
	return freshInternal((v) =>
		freshInternal3((v2, v3, v4) => f(v, v2, v3, v4)),
	);
}

export function freshInternal5(
	f: (
		v: LLVar,
		v2: LLVar,
		v3: LLVar,
		v4: LLVar,
		v5: LLVar,
	) => MGoal,
): MGoal {
	return freshInternal((v) =>
		freshInternal4((v2, v3, v4, v5) =>
			f(v, v2, v3, v4, v5),
		),
	);
}

export function freshInternal6(
	f: (
		v: LLVar,
		v2: LLVar,
		v3: LLVar,
		v4: LLVar,
		v5: LLVar,
		v6: LLVar,
	) => MGoal,
): MGoal {
	return freshInternal((v) =>
		freshInternal5((v2, v3, v4, v5, v6) =>
			f(v, v2, v3, v4, v5, v6),
		),
	);
}

export function fresh(f: (v: LLVar) => MGoal): MGoal {
	return (sc) => [() => freshInternal(f)(sc)];
}

export const call_fresh = fresh;

export function fresh2(
	f: (v: LLVar, v2: LLVar) => MGoal,
): MGoal {
	return (sc) => [() => freshInternal2(f)(sc)];
}

export function fresh3(
	f: (v: LLVar, v2: LLVar, v3: LLVar) => MGoal,
): MGoal {
	return (sc) => [() => freshInternal3(f)(sc)];
}

export function fresh4(
	f: (v: LLVar, v2: LLVar, v3: LLVar, v4: LLVar) => MGoal,
): MGoal {
	return (sc) => [() => freshInternal4(f)(sc)];
}

export function fresh5(
	f: (
		v: LLVar,
		v2: LLVar,
		v3: LLVar,
		v4: LLVar,
		v5: LLVar,
	) => MGoal,
): MGoal {
	return (sc) => [() => freshInternal5(f)(sc)];
}

export function fresh6(
	f: (
		v: LLVar,
		v2: LLVar,
		v3: LLVar,
		v4: LLVar,
		v5: LLVar,
		v6: LLVar,
	) => MGoal,
): MGoal {
	return (sc) => [() => freshInternal6(f)(sc)];
}

export function freshNomInternal(
	fn: (v: LNom) => MGoal,
): MGoal {
	return (sc: State): MStream => {
		return sc.withNom(
			(ff) =>
				(sc2): MStream => {
					// return [() => fn(ff)(sc2)];
					const f3 = fn(ff);
					const fvv = f3(sc2);
					return fvv;
				},
			"",
		);
	};
}

export function freshNomInternal2(
	fn: (v: LNom, v2: LNom) => MGoal,
): MGoal {
	return freshNomInternal((v) =>
		freshNomInternal((v2) => fn(v, v2)),
	);
}

export function freshNomInternal3(
	fn: (v: LNom, v2: LNom, v3: LNom) => MGoal,
): MGoal {
	return freshNomInternal((v) =>
		freshNomInternal2((v2, v3) => fn(v, v2, v3)),
	);
}

export function freshNomInternal4(
	fn: (v: LNom, v2: LNom, v3: LNom, v4: LNom) => MGoal,
): MGoal {
	return freshNomInternal((v) =>
		freshNomInternal3((v2, v3, v4) => fn(v, v2, v3, v4)),
	);
}

export function freshNomInternal5(
	fn: (
		v: LNom,
		v2: LNom,
		v3: LNom,
		v4: LNom,
		v5: LNom,
	) => MGoal,
): MGoal {
	return freshNomInternal((v) =>
		freshNomInternal4((v2, v3, v4, v5) =>
			fn(v, v2, v3, v4, v5),
		),
	);
}

export function freshNomInternal6(
	fn: (
		v: LNom,
		v2: LNom,
		v3: LNom,
		v4: LNom,
		v5: LNom,
		v6: LNom,
	) => MGoal,
): MGoal {
	return freshNomInternal((v) =>
		freshNomInternal5((v2, v3, v4, v5, v6) =>
			fn(v, v2, v3, v4, v5, v6),
		),
	);
}

export function freshNom(fn: (v: LNom) => MGoal): MGoal {
	// return (sc: State): MStream => {
	//     return sc.withNom((ff) => (sc2): MStream => {
	//         // return [() => fn(ff)(sc2)];
	//         const f3 = fn(ff);
	//         const fvv = f3(sc2);
	//         return fvv;
	//     }, '')
	// };
	return (sc) => [() => freshNomInternal(fn)(sc)];
}

export function freshNom2(
	fn: (v: LNom, v2: LNom) => MGoal,
): MGoal {
	return (sc) => [() => freshNomInternal2(fn)(sc)];
}

export function freshNom3(
	fn: (v: LNom, v2: LNom, v3: LNom) => MGoal,
): MGoal {
	return (sc) => [() => freshNomInternal3(fn)(sc)];
}

export function freshNom4(
	fn: (v: LNom, v2: LNom, v3: LNom, v4: LNom) => MGoal,
): MGoal {
	return (sc) => [() => freshNomInternal4(fn)(sc)];
}

export function freshNom5(
	fn: (
		v: LNom,
		v2: LNom,
		v3: LNom,
		v4: LNom,
		v5: LNom,
	) => MGoal,
): MGoal {
	return (sc) => [() => freshNomInternal5(fn)(sc)];
}

export function freshNom6(
	fn: (
		v: LNom,
		v2: LNom,
		v3: LNom,
		v4: LNom,
		v5: LNom,
		v6: LNom,
	) => MGoal,
): MGoal {
	return (sc) => [() => freshNomInternal6(fn)(sc)];
}
