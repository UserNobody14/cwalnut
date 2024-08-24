import type {
	ConjunctionGeneric,
	IdentifierGeneric,
	PredicateCallGeneric,
	PredicateDefinitionGeneric,
	TermGeneric,
} from "src/types/AstGeneric";
import { Map as ImmMap } from "immutable";
import { commonModes, Determinism, type Mode, type ModeDetType } from "./ModeDetType";
import { mapStreams, mergePossibilitiesGeneral } from "src/utils/iterop";
import { modeToString } from "./modeTypeToString";
import { type VarModeMap, listVarModes, varModesToKey, getVarMode, transformMode, expressionToKey } from "./listVarModes";
import { getPredModes, type DetTypeMap } from "./detTypeMap";
import { disjunction1, conjunction1, make } from "src/utils/make_better_typed";
import memoize from "just-memoize";

type EachArrangement =
	| [TermGeneric<string>[], VarModeMap, number]
	| null;
type ReturnArrangements = EachArrangement[];

export function* permutations<T>(t: T[]): Generator<T[]> {
	if (t.length === 0) {
		yield [];
	} else {
		for (let i = 0; i < t.length; i++) {
			const rest = t.slice(0, i).concat(t.slice(i + 1));
			for (const restPerm of permutations(rest)) {
				yield [t[i]].concat(restPerm);
			}
		}
	}
}

// More optimal version
// export function mapToModeDetO<T>(
// 	tt: TermGeneric<T>[],
// 	s1: VarModeMap,
// 	s2: DetTypeMap,
// 	currDetNum: number,
// 	bestDetNum1 = Number.POSITIVE_INFINITY,
// ): EachArrangement {
// 	const perms = permutations(tt);
// 	let best: EachArrangement = null;
// 	let bestDetNum = bestDetNum1;
// 	for (const perm of perms) {
// 		const outTerms: TermGeneric<string>[] = [];
// 		let currDetNum1 = currDetNum;
// 		let s = s1;
// 		let failed = false;
// 		for (const t of perm) {
// 			const zzz = mapOneModeDet(
// 				t,
// 				s,
// 				s2,
// 				currDetNum1,
// 				bestDetNum,
// 			);
// 			if (!zzz[0]) {
// 				failed = true;
// 				break;
// 			}
// 			const [tr, q, vv, nd] = zzz;
// 			outTerms.push(q);
// 			s = vv;
// 			currDetNum1 = nd;
// 		}
// 		if (failed) {
// 			continue;
// 		}
// 		if (currDetNum1 < bestDetNum) {
// 			best = [outTerms, s, currDetNum1];
// 			bestDetNum = currDetNum1;
// 			// return [outTerms, s, currDetNum1];
// 		}
// 	}
// 	return best;
// }

function mergeMaps(
	a: VarModeMap,
	b: VarModeMap,
): VarModeMap {
	let nm: VarModeMap = ImmMap();
	for (const [k, v] of b) {
		if (a.has(k) && a.get(k) !== v) {
			nm = nm.set(k, commonModes.error);
		} else {
			nm = nm.set(k, v);
		}
	}
	for (const [k, v] of a) {
		if (!b.has(k)) {
			nm = nm.set(k, v);
		}
	}
	return nm;
}

const unifyMode = memoize(
	function unifyMode<T>(
		t: PredicateCallGeneric<T>,
		predicateDets: DetTypeMap,
		s1: VarModeMap,
	):  [DetTypeMap, VarModeMap, Determinism] | null {
		const allModes = getPredModes(t.source.value, predicateDets);
		if (!allModes) {
			return null;
		}
		const modes = findMatchingMode<T>(t, s1, allModes);
		if (!modes) {
			return null;
		}
		let s = s1;
		for (let i = 0; i < t.args.length; i++) {
			if (t.args[i].type === "identifier") {
				const sNew = transformMode(s, t.args[i].value, modes.varModes[i]);
				if (sNew === null) {
					return null;
				}
				s = sNew;
			}
		}
		return [predicateDets, s, modes.det];
	},
	function cacheKey<T>(
		t: PredicateCallGeneric<T>,
		predicateDets: DetTypeMap,
		s1: VarModeMap,
	): string {
		return `${t.source.value} ${expressionToKey(s1, t.args)}+${predicateDets.size}`;
	}
);

export function mapToModeDetDisj<T>(
	tt: TermGeneric<T>[],
	s1: VarModeMap,
	predicateDets: DetTypeMap,
	currDetNum: number,
	bestDetNum1 = Number.POSITIVE_INFINITY,
): EachArrangement {
	const s = s1;
	const oMap = tt.map((t) =>
		mapOneModeDet(t, s, predicateDets, currDetNum, bestDetNum1),
	);
	const realMap = oMap.some((tr) => !tr[0]);
	if (realMap) {
		return null;
	}
	const zzz = oMap.map(
		(tr) => tr[1] as TermGeneric<string>,
	);
	const vv = oMap.map(
		(tr) => tr[0] ? tr[2] as VarModeMap : undefined,
	).filter(v => !!v);
	const nd = oMap.map((tr) => tr[3] as number);
	// Average
	const currDetNum2 =
		nd.reduce((acc, v) => acc + v, 0) / nd.length;
	return [zzz, vv.reduce(mergeMaps), currDetNum2];
}

export function mapModeRearrange<T>(
	tt: TermGeneric<T>[],
	predicateDets: DetTypeMap,
): [TermGeneric<string>[], VarModeMap] {
	const s1: VarModeMap = ImmMap();
	// const dti = mapToModeDetO(
	// 	tt,
	// 	s1,
	// 	predicateDets,
	// 	0,
	// 	Number.POSITIVE_INFINITY,
	// );
	// if (dti === null) {
	// 	throw new Error(
	// 		"No valid mode/determinacy arrangement",
	// 	);
	// }
	// return [dti[0], dti[1]];
	const opt1 = mapOneModeDet(
		conjunction1(...tt),
		s1,
		predicateDets,
		0,
		Number.POSITIVE_INFINITY,
	);
	if (!opt1[0]) {
		throw new Error(
			"No valid mode/determinacy arrangement",
		);
	}
	const [_, q, vv] = opt1;
	return [[q], vv];
}

function mapQ<T>(
	q: EachArrangement,
	qfn: (q: TermGeneric<string>[]) => TermGeneric<T>,
): [
	true,
	TermGeneric<T>,
	VarModeMap,
	number,
] | [false] {
	if (!q) {
		return [false];
	}
	const [qq, vv, nd] = q;
	return [
		true,
		qfn(qq),
		vv,
		nd,
	];
}

type OneModeDetThing = [
	true,
	TermGeneric<string>,
	VarModeMap,
	number
] | [false];

function mapOneModeDet<T>(
	t: TermGeneric<T>,
	s: VarModeMap,
	predicateDets: DetTypeMap,
	currDetNum: number,
	bestDetNum: number,
): OneModeDetThing {
	switch (t.type) {
		case "conjunction": {
			// return mapQ(
			// 	mapToModeDetO(
			// 		t.terms,
			// 		s,
			// 		predicateDets,
			// 		currDetNum,
			// 		bestDetNum,
			// 	),
			// 	(conj) => conjunction1(...conj),
			// )
			const perms = permutations(t.terms);
			let best: OneModeDetThing = [false];
			let bestDetNum2 = bestDetNum;
			for (const perm of perms) {
				const outTerms: TermGeneric<string>[] = [];
				let currDetNum1 = currDetNum;
				let varModeMapEach = s;
				let failed = false;
				for (const t3 of perm) {
					const zzz = mapOneModeDet(
						t3,
						varModeMapEach,
						predicateDets,
						currDetNum1,
						bestDetNum2,
					);
					if (!zzz[0]) {
						failed = true;
						break;
					}
					const [tr, q, vv, nd] = zzz;
					outTerms.push(q);
					varModeMapEach = vv;
					currDetNum1 = nd;
				}
				if (failed) {
					continue;
				}
				if (currDetNum1 < bestDetNum2) {
					best = [true, conjunction1(...outTerms), varModeMapEach, currDetNum1];
					bestDetNum2 = currDetNum1;
					// return [outTerms, s, currDetNum1];
				}
			}
			return best
		}
		case "disjunction": {
			return mapQ(
				mapToModeDetDisj(
					t.terms,
					s,
					predicateDets,
					currDetNum,
					bestDetNum,
				),
				(disj) => disjunction1(...disj),
			)
		}
		case "fresh": {
			const sss = t.newVars.reduce((acc, v) => {
				return acc.set(v.value, commonModes.pass);
			}, s);
			const zzz = mapOneModeDet(
				t.body,
				sss,
				predicateDets,
				currDetNum,
				bestDetNum,
			);
			if (!zzz[0]) {
				return [false];
			}
			const [_, q, vv, nd] = zzz;
			return [
				true,
				make.fresh1(
					t.newVars.map((v) => ({
						...v,
						info: buildVarInformation<T>(vv, v),
					})),
					q,
				),
				vv,
				nd,
			];
		}
		case "with": {
			const zzz = mapOneModeDet(
				t.body,
				s,
				predicateDets,
				currDetNum,
				bestDetNum,
			);
			if (!zzz[0]) {
				return [false];
			}
			const [_, q, vv, nd] = zzz;
			return [
				true,
				{
					...t,
					name: {
						...t.name,
						info: "withtype",
					},
					body: q as ConjunctionGeneric<string>,
				},
				vv,
				nd,
			];
		}
		case "predicate_definition":
			return mapPredDefinitionModeDet(t, s, predicateDets);
		case "predicate_call": {
			// const allModes = predicateDets.get(t.source.value);
			// const allModes = getPredModes(t.source.value, predicateDets);
			// if (!allModes) {
			// 	throw new Error(`No modes for ${t.source.value}`);
			// }
			// const modes = findMatchingMode<T>(t, s1, allModes);
			// if (!modes) {
			// 	return [false];
			// }
			// for (let i = 0; i < t.args.length; i++) {
			// 	if (t.args[i].type === "identifier") {
			// 		// s = s.set(t.args[i].value, modes.varModes[i].);
			// 		const sNew = transformMode(s, t.args[i].value, modes.varModes[i]);
			// 		if (sNew === null) {
			// 			return [false];
			// 		}
			// 		s = sNew;
			// 	}
			// }
			const mp = unifyMode(t, predicateDets, s);
			if (!mp) {
				return [false];
			}
			const [predicateDets2, s22, det] = mp;
			const out = {
				...t,
				source: {
					...t.source,
					// value: `${t.source.value}/${modes.det}`,
					value: t.source.value,
					info: `${det}`,
				},
				args: t.args.map((a, i) => {
					if (a.type === "literal") {
						return a;
					}
					return {
						...a,
						// info: modes.varModes[i].to
						info: buildVarInformation<T>(s, a),
					};
				}),
			};
			return [true, out, s22, det];
		}
	}
}

function findMatchingMode<T>(t: PredicateCallGeneric<T>, s1: VarModeMap, allModes: ModeDetType[]) {
	const currentVarStates = t.args.map((a) => a.type === "literal"
		? "ground"
		: s1.get(a.value, "free")
	);
	const modes = allModes.find((m) => {
		if (m.varModes.length !== t.args.length) {
			return false;
		}
		for (let i = 0; i < t.args.length; i++) {
			if (m.varModes[i].from !== currentVarStates[i]) {
				return false;
			}
		}
		return true;
	});
	return modes;
}

function* permuteModes<T>(
	args: IdentifierGeneric<T>[],
	possibleModes: Mode[],
): Iterable<ModeDetType> {
	function* mdg(): Iterator<Mode> {
		for (const mode of possibleModes) {
			yield mode;
		}
	}
	const eee = mergePossibilitiesGeneral<Mode>(
		args.map(() => mdg()),
	);
	for (const e of eee) {
		yield {
			varModes: e,
			det: Determinism.DET, // So that the determinism returned will be an actually relevant number
		};
	}
}


function mapPredDefinitionModeDet<T>(
	t: PredicateDefinitionGeneric<T>,
	s1: VarModeMap,
	predicateDets: DetTypeMap,
): [
			true,
			TermGeneric<string>,
			VarModeMap,
			number,
	  ] {

		// const zzz = mapToModeDetO(
		// 	t.body.terms,
		// 	s1,
		// 	predicateDets,
		// 	0,
		// 	Number.POSITIVE_INFINITY,
		// );
		// return 
	// const s = s1.set(t.name.value, commonModes.out);
	// const pmtm = [...permuteModes(t.args, [commonModes.in, commonModes.out, commonModes.pass])];
	// for (const eachModality of pmtm) {
	// 	const s2Recursion = s2.set(
	// 		t.name.value,
	// 		[
	// 			eachModality
	// 		],
	// 	);
	// 	const zzz = mapToModeDetO(
	// 		t.body.terms,
	// 		s,
	// 		s2Recursion,
	// 		0,
	// 		Number.POSITIVE_INFINITY,
	// 	);
	// 	if (zzz === null) {
	// 		continue;
	// 	}
	// 	const [q, vv, nd] = zzz;
	// 	const actualArrangement = mapToModeDetO(
	// 		t.body.terms,
	// 		s,
	// 		s2Recursion.set(
	// 			t.name.value,
	// 			[
	// 				{
	// 					varModes: eachModality.varModes,
	// 					det: nd,
	// 				}
	// 			],
	// 		),
	// 		0,
	// 		nd
	// 	);
	// 	if (actualArrangement === null) {
	// 		continue;
	// 	}
	// 	const [qq, vvv, nnd] = actualArrangement;
	// 	return [
	// 		true,
	// 		{
	// 			type: 'predicate_definition',
	// 			name: {
	// 				...t.name,
	// 				info: "withtype",
	// 			},
	// 			args: t.args.map((a) => ({
	// 				...a,
	// 				info: "in",
	// 			})),
	// 			body: {
	// 				...t.body,
	// 				terms: qq,
	// 			},
	// 		},
	// 		vvv,
	// 		nnd,
	// 	];
	// }
	
	throw new Error("No valid mode/determinacy arrangement for predicate definition");
}

function buildVarInformation<T>(
	stateMapBefore: VarModeMap,
	v: IdentifierGeneric<T>,
): string {
	return modeToString(stateMapBefore.get(v.value, commonModes.pass));
}

// function mapToModeDetInner<T>(
// 	tt: TermGeneric<T>[],
// 	s1: ImmMap<string, string>,
// 	s2: ImmMap<string, ModeDetType[]>,
// ): EachArrangement {
// 	let detNum = 0;
// 	let s = s1;
// 	const out: TermGeneric<string>[] = [];
// 	for (const t of tt) {
// 		switch (t.type) {
// 			case "conjunction": {
// 				const dti = mapToModeDetInner(t.terms, s, s2);
// 				if (dti === null) {
// 					return null;
// 				}
// 				const [q, vv, nd] = dti;
// 				detNum += nd;
// 				s = vv;
// 				out.push({
// 					...t,
// 					terms: q,
// 				});
// 				break;
// 			}
// 			case "disjunction": {
// 				const dti = mapToModeDetInner(t.terms, s, s2);
// 				if (dti === null) {
// 					return null;
// 				}
// 				const [q, vv, nd] = dti;
// 				detNum += nd;
// 				s = vv;
// 				out.push({
// 					...t,
// 					terms: q,
// 				});
// 				break;
// 			}
// 			case "fresh": {
// 				const sss = t.newVars.reduce((acc, v) => {
// 					return acc.set(v.value, "free");
// 				}, s);
// 				const dti = mapToModeDetInner(
// 					t.body.terms,
// 					sss,
// 					s2,
// 				);
// 				if (dti === null) {
// 					return null;
// 				}
// 				const [q, vv, nd] = dti;
// 				detNum += nd;
// 				s = vv;
// 				out.push({
// 					...t,
// 					newVars: t.newVars.map((v) => ({
// 						...v,
// 						info: vv.get(v.value, "free"),
// 					})),
// 					body: {
// 						...t.body,
// 						terms: q,
// 					},
// 				});
// 				break;
// 			}
// 			case "with": {
// 				const dti = mapToModeDetInner(t.body.terms, s, s2);
// 				if (dti === null) {
// 					return null;
// 				}
// 				const [q, vv, nd] = dti;
// 				detNum += nd;
// 				s = vv;
// 				out.push({
// 					...t,
// 					name: {
// 						...t.name,
// 						info: "withtype",
// 					},
// 					body: {
// 						...t.body,
// 						terms: q,
// 					},
// 				});
// 				break;
// 			}
// 			case "predicate_definition":
// 				throw new Error("Not implemented");
// 			case "predicate_call": {
// 				const allModes = s2.get(t.source.value);
// 				if (!allModes) {
// 					throw new Error(`No modes for ${t.source.value}`);
// 				}
// 				const currentVarStates = t.args.map((a) =>
// 					a.type === "literal"
// 						? "ground"
// 						: s.get(a.value, "free"),
// 				);
// 				const modes = allModes.find((m) => {
// 					if (m.varModes.length !== t.args.length) {
// 						return false;
// 					}
// 					for (let i = 0; i < t.args.length; i++) {
// 						if (
// 							m.varModes[i].from !== currentVarStates[i]
// 						) {
// 							return false;
// 						}
// 					}
// 					return true;
// 				});
// 				if (!modes) {
// 					return null;
// 				}
// 				out.push({
// 					...t,
// 					source: {
// 						...t.source,
// 						value: `${t.source.value}/${modes.det}`,
// 						info: `${modes.det}`,
// 					},
// 					args: t.args.map((a, i) => {
// 						if (a.type === "literal") {
// 							return a;
// 						}
// 						return {
// 							...a,
// 							info: modes.varModes[i].to,
// 						};
// 					}),
// 				});
// 				for (let i = 0; i < t.args.length; i++) {
// 					if (t.args[i].type === "identifier") {
// 						s = s.set(
// 							t.args[i].value,
// 							modes.varModes[i].to,
// 						);
// 					}
// 				}
// 				detNum += modes.det;
// 				break;
// 			}
// 		}
// 	}
// 	return [out, s, detNum];
// }
