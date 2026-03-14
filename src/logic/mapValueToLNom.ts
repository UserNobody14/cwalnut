import type { Set as ImmSet } from "immutable";
import { LNom } from "./terms";

export function mapValueToLNom(): ((
	value: string | LNom,
	key: string | LNom,
	iter: ImmSet<string | LNom>,
) => LNom) &
	((
		value: string | LNom,
		index: number,
		array: (string | LNom)[],
	) => LNom) {
	return (v) => (typeof v === "string" ? new LNom(v) : v);
}
