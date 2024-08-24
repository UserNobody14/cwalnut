import { Set as ImmSet } from "immutable";
import { countVarsInCalls, mapPredCalls, mapPredCallsRemovable } from "src/lens/into-vars";
import type { TermGeneric } from "src/types/AstGeneric";
import { make } from "src/utils/make_better_typed";

export function cleanupLinearUnifies<T>(
	term: TermGeneric<T>[],
	ignore: ImmSet<string> = ImmSet(),
	pass = false,
): TermGeneric<T>[] {
	if (pass) {
		return term;
	}
	const numUsages = countVarsInCalls(term);
	return mapPredCallsRemovable(
		term,
		(pc) => {
			if (pc.source.value !== 'unify') {
				return pc;
			} else {
				const args = [...pc.args];
				const newArgs = args.map((a) => {
					if (a.type === "identifier") {
						if (ignore.has(a.value)) {
							return a;
						}
						if (!numUsages.has(a.value)) {
							throw new Error(`Variable ${a.value} not found in numUsages`);
						}
						const numUsagesA = numUsages.get(a.value, 0);
						if (numUsagesA <= 1) {
							return undefined;
						}
						if (numUsagesA > 2) {
							throw new Error(`Variable ${a.value} has ${numUsagesA} usages`);
						}
						return make.identifier(a.info, a.value);
					}
					return a;
				}).filter(x => !!x);
				if (newArgs.length <= 1) {
					return undefined;
				}
				return {
					type: "predicate_call",
					source: pc.source,
					args: newArgs,
				};
			}
		},
		(ct, zz) => [...zz]
	);
}
