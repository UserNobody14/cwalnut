import type { PredicateCallGeneric } from "src/types/AstGeneric";

export function linkDirection<T>(
	a: string,
	b: string,
	prev: PredicateCallGeneric<T>[][],
	next: PredicateCallGeneric<T>[][]): {
		first: string;
		next: string;
	} | false {
	const prevA = prev.map((x) => x.find((y) => y.args.some((z) => z.value === a)));
	const nextB = next.map((x) => x.find((y) => y.args.some((z) => z.value === b)));
	if (prevA.every(x => !!x) && nextB.every(x => !!x ) && prevA.length > 0 && nextB.length > 0) {
		const prevB = prev.map((x) => x.find((y) => y.args.some((z) => z.value === b)));
		if (prevB.some(x => !!x)) {
			// throw new Error("Both a and b in prev");
			return false;
		}
		const nextA = next.map((x) => x.find((y) => y.args.some((z) => z.value === a)));
		if (nextA.some(x => !!x)) {
			// throw new Error("Both a and b in next");
			return false;
		}
		return {
			first: a,
			next: b,
		};
	} else {
		const prevB = prev.map((x) => x.find((y) => y.args.some((z) => z.value === b)));
		const nextA = next.map((x) => x.find((y) => y.args.some((z) => z.value === a)));
		if (prevB.every(x => !!x) && nextA.every(x => !!x) && prevB.length > 0 && nextA.length > 0) {
			return {
				first: b,
				next: a,
			};
		}
	}
	return false;
}
