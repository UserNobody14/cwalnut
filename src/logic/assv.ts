import type { List as ImmList } from "immutable";
import { type LPair, LLVar } from "./terms";

export function assv(
	pairs: ImmList<LPair>,
	u: LLVar,
): LPair | false {
	if (!u) throw new Error("No u (assv)");
	for (const ppr of pairs) {
		if (
			ppr.first instanceof LLVar &&
			ppr.first.name === u.name &&
			// not same second
			!ppr.second.selfEquiv(u)
		)
			return ppr;
	}
	return false;
}

export function assvS(
	pairs: ImmList<LPair>,
	u: string,
): LPair | false {
	if (!u) throw new Error("No u (assv)");
	for (const ppr of pairs) {
		if (
			ppr.first instanceof LLVar &&
			ppr.first.name === u &&
			// not same second
			!ppr.second.selfEquiv(ppr.first)
		)
			return ppr;
	}
	return false;
}
