/**
 * Expression desugaring: return value is always an identifier or literal; goals and
 * synthetic `__fresh_*` names are appended via {@link ExpressionAcc}.
 */
import type Parser from "tree-sitter";
import { Effect } from "effect";
import type { ExpressionGeneric, IdentifierGeneric } from "src/types/AstGeneric";
import {
  make,
  operate,
  set_key_of,
  to_slice,
  unary_operate,
} from "src/utils/make_better_typed";
import {
  type CodeLocation,
  defaultCodeLocation,
  mergecloc,
  tocloc,
} from "./codeloc";
import {
  genFresh,
  appendTermsEffect,
  type ExpressionDesugarServices,
} from "./desugar-fr";

type Expr = ExpressionGeneric<CodeLocation>;

const make_identifier = make.identifier;
const make_literal_ast = make.literal_ast;
const make_predicate = make.predicate;

function builtin(
  name: string,
  src: CodeLocation,
  args: Expr[],
) {
  return make_predicate(make_identifier(src, name), args);
}

/**
 * Builtins: `list(h, e1,…)`, `empty(l)`, `cons(h,t,l)`, `internal_append(l,s,o)` (see {@link builtinsMap}).
 */
function listValsToList(
  listVals: Parser.SyntaxNode[],
  unifyVar: IdentifierGeneric<CodeLocation> | undefined,
): Effect.Effect<
  Expr,
  never,
  ExpressionDesugarServices
> {
  const src =
    listVals.length > 0 ? tocloc(listVals[0]) : defaultCodeLocation;

  return Effect.gen(function* () {
    const hasSplats = listVals.some((n) => n.grammarType === "splat");
    if (!hasSplats) {
      const head = unifyVar ?? (yield* genFresh());
      const elems: Expr[] = [];
      for (const v of listVals) {
        elems.push(yield* parseExpr(v, undefined));
      }
      yield* appendTermsEffect([builtin("list", src, [head, ...elems])]);
      return head;
    }

    const splatIsLast =
      listVals[listVals.length - 1].grammarType === "splat";
    const onlyPrefixBeforeSplat = listVals
      .slice(0, -1)
      .every((z) => z.grammarType !== "splat");

    if (splatIsLast && onlyPrefixBeforeSplat) {
      const heads: Expr[] = [];
      for (const v of listVals.slice(0, -1)) {
        heads.push(yield* parseExpr(v, undefined));
      }
      const tail = yield* parseExpr(
        listVals[listVals.length - 1].children[1],
        undefined,
      );
      let cur = tail;
      for (const h of [...heads].reverse()) {
        const out = yield* genFresh();
        yield* appendTermsEffect([builtin("cons", src, [h, cur, out])]);
        cur = out;
      }
      return cur;
    }

    let cur = yield* genFresh();
    yield* appendTermsEffect([builtin("empty", src, [cur])]);
    for (const nnc of listVals) {
      if (nnc.grammarType === "splat") {
        const splatExpr = yield* parseExpr(
          nnc.children[1],
          undefined,
        );
        const out = unifyVar ?? (yield* genFresh());
        yield* appendTermsEffect([
          builtin("internal_append", src, [splatExpr, cur, out]),
        ]);
        cur = out;
      } else {
        const elem = yield* parseExpr(nnc, undefined);
        const out = yield* genFresh();
        yield* appendTermsEffect([builtin("cons", src, [elem, cur, out])]);
        cur = out;
      }
    }
    return cur;
  });
}

export function parseExpr(
  node1: Parser.SyntaxNode | null | undefined,
  unifyVar?: IdentifierGeneric<CodeLocation>,
): Effect.Effect<
  Expr,
  never,
  ExpressionDesugarServices
> {
  if (node1 === undefined || node1 === null) {
    return Effect.die(new Error("Node is undefined"));
  }
  const node = node1;
  switch (node.type) {
    case "keyword_identifier":
    case "identifier":
      return Effect.succeed(make_identifier(tocloc(node), node.text));
    case "destructuring_expression":
      console.debug(`Destructuring expression: ${node.text}`);
      return parseExpr(node.children[0], unifyVar);

    case "predicate_expression":
    case "predicate":
      return Effect.gen(function* () {
        const headSlot = unifyVar ?? (yield* genFresh());
        const argActual = node.children[1];
        const arglist = argActual.children
          .slice(1, -1)
          .filter((nnc) => nnc.grammarType !== ",");
        const argExprs: Expr[] = [];
        for (const nc of arglist) {
          argExprs.push(yield* parseExpr(nc, unifyVar));
        }
        const src = yield* parseExpr(node.children[0], unifyVar);
        if (src.type !== "identifier") {
          throw new Error("Source of predicate must be an identifier");
        }
        const predicateTerm = make_predicate(src, [headSlot, ...argExprs]);
        yield* appendTermsEffect([predicateTerm]);
        return headSlot;
      });

    case "expression":
    case "primary_expression":
      return parseExpr(node.children[0], unifyVar);

    case "attribute":
      return Effect.gen(function* () {
        const obj = yield* parseExpr(node.children[0]);
        const attr = node.children[2].text;
        const val = unifyVar ?? (yield* genFresh());
        const attrAst = make_literal_ast("string", attr);
        yield* appendTermsEffect([set_key_of(tocloc(node), obj, attrAst, val)]);
        return val;
      });

    case "binary_operator":
      return Effect.gen(function* () {
        const left = yield* parseExpr(node.children[0], unifyVar);
        const op = node.children[1].text;
        const right = yield* parseExpr(node.children[2], unifyVar);
        const val = unifyVar ?? (yield* genFresh());
        yield* appendTermsEffect([operate(op, left, right, val, tocloc(node))]);
        return val;
      });

    case "list": {
      const listVals = node.children
        .slice(1, -1)
        .filter((nnc) => nnc.grammarType !== ",");
      return listValsToList(listVals, unifyVar);
    }

    case "unary_operator":
      return Effect.gen(function* () {
        const inner = yield* parseExpr(node.children[1], unifyVar);
        const op = node.children[0].text;
        const val = unifyVar ?? (yield* genFresh());
        yield* appendTermsEffect([unary_operate(op, inner, val, tocloc(node))]);
        return val;
      });

    case "dictionary":
      return Effect.gen(function* () {
        const listValsDict = node.children
          .slice(1, -1)
          .filter((nnc) => nnc.grammarType !== ",");
        const objv = unifyVar ?? (yield* genFresh());
        type Kv = [
          Expr,
          Expr,
          CodeLocation,
        ];
        const lvd: Kv[] = [];
        for (const nc of listValsDict) {
          const key = yield* parseExpr(nc.children[0]);
          const val = yield* parseExpr(nc.children[2]);
          lvd.push([
            key,
            val,
            mergecloc(tocloc(nc.children[0]), tocloc(nc.children[2])),
          ]);
        }
        yield* appendTermsEffect(
          lvd.map(([key, val, cl]) => set_key_of(cl, objv, key, val)),
        );
        return objv;
      });

    case "string":
      return Effect.succeed(make_literal_ast("string", node.text.slice(1, -1)));

    case "number":
      return Effect.succeed(
        make_literal_ast("number", Number.parseInt(node.text, 10).toString()),
      );

    case "slice":
      return Effect.gen(function* () {
        const obj = yield* parseExpr(node.children[0]);
        const attr = node.children[2].text;
        const val = unifyVar ?? (yield* genFresh());
        yield* appendTermsEffect([
          to_slice(tocloc(node), obj, make_literal_ast("string", attr), val),
        ]);
        return val;
      });

    default:
      return Effect.die(
        new Error(`parseExpr: unsupported node type ${node.type}`),
      );
  }
}
