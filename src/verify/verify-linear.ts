import { gatherVarInstanceInfo, mapPredCalls } from "src/lens/into-vars";
import type { TermT } from "src/types/DsAstTyped";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { builtinList } from "src/utils/make_desugared_ast";


export function verifyLinear(tt: TermT[]): boolean {
    type Uses = 'called' | 'allocated' | 'arg';
    const remappedTerms = mapPredCalls<Type, Uses>(tt,
        (predCall) => make.predicate_call(
            make.identifier('called', predCall.source.value),
            predCall.args.map(
                (arg) => arg.type === 'identifier' ? make.identifier('called', arg.value) : arg
            )
        ),
        (ctx, idv) => {
            return idv.map(
                (id) => {
                    switch (ctx) {
                        case 'definition-args':
                            return make.identifier('arg', id.value);
                        case 'fresh-args':
                            return make.identifier('allocated', id.value);
                        case 'name':
                            return make.identifier('called', id.value);
                    }
                }
            )
        }
    );

    const gatherMap = gatherVarInstanceInfo(remappedTerms);
    for (const [k, uses] of gatherMap) {
        if (builtinList.includes(k as any)) continue;
        if (uses.length > 3)  {
            // throw `Variable ${k} is used more than once (${uses.length}) in a single term:
            // [${uses.join(', \n')}]`;
            console.warn(
                `Variable ${k} is used more than once (${uses.length}) in a single term:
                [${uses.join(', \n')}]`
            )
        }
        /**
         * options:
         * [ 'allocated', 'called', 'called']
         */
        if (!uses.includes('allocated') && !uses.includes('arg'))
            throw `Variable ${k} is not allocated`;
    }
    return true;
}