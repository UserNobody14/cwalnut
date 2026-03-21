import { Map as ImmMap } from "immutable";
import type { State } from "./State";
import type { LTerm } from "./terms";
import { LLVar } from "./terms";

/**
 * Unify the key-value binding: under `key`, object `obj` should have value `value`.
 * Either extends the per-key store (if obj has no binding yet) or unifies the
 * existing stored value with `value`.
 */
export function unifyKeyOf(
	state: State,
	obj2: LTerm,
	key: string,
	value2: LTerm,
): State | null {
	const kvStore = state.i.kvStore;
	const kstore = kvStore.get(key, ImmMap<string, LTerm>());
	const value = state.find(value2);
	const obj = state.find(obj2);
	if (!(obj instanceof LLVar)) return null;
	const retrievedValue = kstore.get(obj.name);
	if (!retrievedValue) {
		const ext = kstore.set(obj.name, value);
		return state.set(
			"i",
			state.i.set("kvStore", kvStore.set(key, ext)),
		);
	}
	return state.unify(retrievedValue, value);
}

/**
 * After unifying two terms (extend), merge key-store entries: for each key,
 * objects that are now in the same equivalence class must have their values
 * unified. If any of those unifications fail, returns null.
 */
export function mergeKvStore(state: State): State | null {
	let stateCur = state;
	let newKvStore = state.i.kvStore;

	for (const key of state.i.kvStore.keys()) {
		const kstore = stateCur.i.kvStore.get(
			key,
			ImmMap<string, LTerm>(),
		);
		// Group (objName, value) by canonical object
		const groups = new Map<
			string,
			{ canonicalName: string; values: LTerm[] }
		>();
		for (const [objName, value] of kstore.entries()) {
			const canonical = stateCur.find(new LLVar(objName));
			const canonicalName =
				canonical instanceof LLVar
					? canonical.name
					: objName;
			const existing = groups.get(canonicalName);
			const valCanon = stateCur.find(value);
			if (existing) {
				existing.values.push(valCanon);
			} else {
				groups.set(canonicalName, {
					canonicalName,
					values: [valCanon],
				});
			}
		}
		let newKstore = ImmMap<string, LTerm>();
		for (const {
			canonicalName,
			values,
		} of groups.values()) {
			if (values.length > 1) {
				// Unify all values in this group
				let repr = values[0];
				for (let i = 1; i < values.length; i++) {
					const next = stateCur.unify(repr, values[i]);
					if (next === null) return null;
					stateCur = next;
					repr = stateCur.find(repr);
				}
				newKstore = newKstore.set(canonicalName, repr);
			} else {
				newKstore = newKstore.set(canonicalName, values[0]);
			}
		}
		newKvStore = newKvStore.set(key, newKstore);
	}

	return stateCur.set(
		"i",
		stateCur.i.set("kvStore", newKvStore),
	);
}
