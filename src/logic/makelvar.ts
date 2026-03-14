import type { Map as ImmMap } from "immutable";
import {
	LLVar,
	LLiteral,
	LEmpty,
	LNom,
	type LTerm,
	LPair,
	LTie,
} from "./terms";

export const makelvar = (
	name: string,
	mp?: ImmMap<string, LLVar>,
): LLVar =>
	mp?.has?.(name)
		? mp.get(name, new LLVar(name))
		: new LLVar(name);
export const makeLvar = makelvar;
export const qlvar: Record<string, LLVar> = new Proxy(
	{},
	{
		get: (_, prop) => makeLvar(prop.toString()),
	},
);

export const makeLiteral = (
	value: string | boolean | number,
): LLiteral => new LLiteral(value);
export const makeEmpty = (): LEmpty => new LEmpty();
export const makeLNom = (name: string): LNom =>
	new LNom(name);
export const qnom: Record<string, LNom> = new Proxy(
	{},
	{
		get: (_, prop) => makeLNom(prop.toString()),
	},
);

export const makePair = (
	first: LTerm,
	second: LTerm,
): LPair => {
	if (!first) throw new Error("No first");
	if (!second) throw new Error("No second");
	return new LPair(first, second);
};
export const makeList = (list: LTerm[]): LPair | LTerm => {
	if (list.length === 0) return makeEmpty();
	if (list.length === 1)
		return makePair(list[0], makeEmpty());
	const [first, ...rest] = list;
	return makePair(first, makeList(rest));
	// return list.reduceRight((acc, el) => makePair(el, acc), makeEmpty());
};

export const makeList2 = (list: LTerm[]): LTerm => {
	if (list.length === 0) throw new Error("Empty list");
	if (list.length === 1) return list[0];
	const [first, ...rest] = list;
	return makePair(first, makeList2(rest));
	// return list.reduceRight((acc, el) => makePair(el, acc), makeEmpty());
};

export const makeTie = (name: LNom, term: LTerm): LTie =>
	new LTie(name, term);
