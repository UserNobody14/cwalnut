import Parser from "tree-sitter";
import CrystalWalnut from "tree-sitter-crystal-walnut";
import { type LVar, type Package, SLogic, type Stream } from "./logic";
import { setKeyValue } from "./Guard";

/**
 * TODO:
 * - setup type system
 * - ensure recursion works
 * - figure out async?
 * - setup file system connection (& grammar connection?)
 */

const parser = new Parser();
parser.setLanguage(CrystalWalnut);

const sourceCode = `

val.father = (a, b) =>
    either:
        all:
            a = "mcbob"
            b = "bob"
        all:
            b = "bill"
            a = "bob"
val.father("bob", qq)
`;

const tree = parser.parse(sourceCode);

console.log(tree.rootNode.toString());

function interpret(
	node: Parser.SyntaxNode,
	lm: Map<string, LVar>,
): (p: Package) => Stream {
	console.log(`Interpreting node: ${node.type}`);
	switch (node.type) {
		case "module":
			// return SLogic.and(...node.children.map((nc) => interpret(nc, lm)));
			return buildCompoundLogic(node, lm, "conjunction");
		case "either_statement":
			// disjunction
			return buildCompoundLogic(
				node.children[2],
				lm,
				"disjunction",
			);
		case "all_statement":
			// conjunction
			return buildCompoundLogic(
				node.children[2],
				lm,
				"conjunction",
			);
		case "unification":
			const aaa = directAccess(node.children[0], lm);
			const bbb = directAccess(node.children[2], lm);
			if (
				aaa instanceof Unifiable &&
				bbb instanceof Unifiable
			) {
				return aaa.unify((aCorrected) =>
					bbb.unify((bCorrected) =>
						SLogic.eq(aCorrected, bCorrected),
					),
				);
			} else if (aaa instanceof Unifiable) {
				return aaa.unify((aCorrected) =>
					SLogic.eq(aCorrected, bbb),
				);
			} else if (bbb instanceof Unifiable) {
				return bbb.unify((bCorrected) =>
					SLogic.eq(aaa, bCorrected),
				);
			}
			return SLogic.eq(aaa, bbb);
		case "predicate":
			// get the predicate name
			const predicateName = node.children[0].text;
			// walk the current frame to find the predicate
			return (p: Package) => {
				const predName = lm.has(predicateName)
					? lm.get(predicateName)
					: directAccess(node.children[0], lm);
				console.log("predName", predName);
				const predicate =
					predName instanceof Unifiable
						? predName.retrieve(p)
						: p.walk(predName);
				// let predicate = predicate1;
				// console.debug(`Predicate searching...: ${predicate}`, predName instanceof Unifiable, predName);
				// if (SLogic.is_lvar(predicate1)) {
				//     console.warn(`Predicate not found: ${predicate1}`);
				//     predicate = p.walk(predicate1);
				// }
				if (predicate === undefined) {
					throw new Error(
						`Predicate not found: ${predicateName} undefined`,
					);
				}
				if (typeof predicate !== "function") {
					console.log("Frame", p.frame);
					console.log(
						"predicate",
						predicate,
						typeof predicate,
					);
					throw new Error(
						`Predicate not found: ${predicateName} not a function`,
					);
				}

				const argActual = node.children[1];
				console.log(
					"argActual",
					argActual.children.map((nnc) => nnc.grammarType),
				);
				if (argActual.children.length === 0) {
					return (predicate as any)()(p);
				}
				const arglist = argActual.children.slice(1, -1);
				console.log(
					"arglist",
					arglist.map((nnc) => nnc.grammarType),
				);
				// console.log('arglist', arglist.children.map(nnc => nnc.grammarType));
				return (predicate as any)(
					...arglist
						.filter((nnc) => nnc.grammarType !== ",")
						.map((nc) => directAccess(nc, lm)),
				)(p);
			};
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

type PredicateFn = (
	...args: any[]
) => (p: Package) => Stream;

function buildCompoundLogic(
	node: Parser.SyntaxNode,
	lm: Map<string, LVar>,
	variety: "conjunction" | "disjunction",
): (p: Package) => Stream {
	return (p: Package) => {
		if (node.children.length === 0) {
			return SLogic.fail(p);
		} else if (node.children.length === 1) {
			return interpret(node.children[0], lm)(p);
		} else {
			const comparator =
				variety === "conjunction"
					? SLogic.conj
					: SLogic.disj;
			const ppv: (q: Package) => Stream = node.children
				.slice(1)
				.reduceRight(
					(acc, nc) => comparator(acc, interpret(nc, lm)),
					interpret(node.children[0], lm),
				);
			return ppv(p);
		}
	};
}

class Unifiable {
	type = "unifiable";
	constructor(
		public val: any,
		public goal: (p: Package) => Stream,
	) {}

	retrieve(p: Package): any {
		const retrievedVal = p.walk(this.val);
		p.write();
		console.log("retrievedVal", retrievedVal);
		return retrievedVal;
	}

	unify(
		other: (q: any) => (p: Package) => Stream,
	): (p: Package) => Stream {
		// if (this.val instanceof Unifiable) {
		//     return SLogic.conj(this.goal, this.val.unify(other));
		// }
		return SLogic.conj(
			(p: Package) => this.goal(p),
			other(this.val),
		);
	}

	toString(): string {
		return `Unifiable(${this.val})`;
	}
}

function directAccess(
	node: Parser.SyntaxNode,
	lm: Map<string, LVar>,
): LVar | string | number | PredicateFn | Unifiable {
	console.log(`Direct access node: ${node.type}`);
	switch (node.type) {
		case "predicate_definition":
			const predDef = (...args: any[]) => {
				console.log("predicate", args);
				const argsList = node.children
					.slice(1, -3)
					.filter((nnc) => nnc.grammarType !== ",");
				if (argsList.length !== args.length) {
					throw new Error(
						`Arity mismatch: ${argsList.length} != ${args.length}`,
					);
				}
				console.log(
					"argsList",
					argsList.map((nnc) => nnc.grammarType),
				);
				const argsWalked = argsList.map((arg) =>
					directAccess(arg, lm),
				);
				const map = new Map();
				argsList.forEach((arg, i) => {
					map.set(arg.text, argsWalked[i]);
				});
				// Set the given inputs to the predicate
				const argsListApplication =
					node.children[6].children;
				console.log(
					"argsListApplication",
					argsListApplication.map((nnc) => nnc.grammarType),
				);
				const freshTerm = argsWalked.reduce(
					(acc, arg, i) =>
						SLogic.conj(acc, SLogic.eq(args[i], arg)),
					buildCompoundLogic(
						node.children[6],
						map,
						"conjunction",
					),
				);
				return freshTerm;
			};
			return predDef;
		case "identifier":
			if (lm.has(node.text)) {
				return lm.get(node.text) as LVar;
			}
			const nlvar = SLogic.lvar(node.text);
			lm.set(node.text, nlvar);
			return nlvar;
		case "expression":
			return directAccess(node.children[0], lm);
		case "primary_expression":
			return directAccess(node.children[0], lm);
		case "attribute":
			const obj = directAccess(node.children[0], lm);
			const attr = node.children[2].text;
			const nlvarTempAttribute = lm.has(attr + "_temp")
				? (lm.get(attr + "_temp") as LVar)
				: SLogic.lvar(attr + "_temp");
			const lmapn = SLogic.lmap(new Map(), "infinite");
			lm.set(attr + "_temp", nlvarTempAttribute);
			lmapn.set(attr, nlvarTempAttribute);
			return new Unifiable(
				nlvarTempAttribute,
				SLogic.conj(
					SLogic.eq(obj, lmapn),
					setKeyValue(obj, attr, nlvarTempAttribute),
				),
			);
		case "binary_operator":
			throw new Error("Not implemented");
		case "unary_operator":
			throw new Error("Not implemented");
		case "list":
			return SLogic.list(
				node.children
					.slice(1, -1)
					.map((nc) => directAccess(nc, lm)),
			);
		case "dictionary":
			const map = new Map();
			node.children.slice(1, -1).forEach((nc) => {
				map.set(
					nc.children[0].text,
					directAccess(nc.children[2], lm),
				);
			});
			return SLogic.lmap(map, "finite");
		case "string":
			return node.text.slice(1, -1);
		case "number":
			return Number.parseInt(node.text, 10);
		default:
			throw new Error(
				`Unrecognized node type: ${node.type}`,
			);
	}
}

// console.log(interpret(tree.rootNode)(SLogic.nil));
const qq = SLogic.lvar("b");
const lmMap = new Map();
lmMap.set("b", qq);
console.log(
	SLogic.run(interpret(tree.rootNode, lmMap), qq),
);
