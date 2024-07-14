import { mapVarsGeneric } from "src/lens/into-vars";
import type { TermGeneric } from "src/types/DsAstTyped";
import type { Type } from "src/types/EzType";
import { make } from "src/utils/make_better_typed";
import { mapModeRearrange } from "./rearrange";
import { defaultModes } from "./defaultModes";
import { builtinList } from "src/utils/builtinList";

const polymorphBack = (v: string): string => {
    for (const bt of builtinList) {
        if (v.startsWith(bt) && v.length > bt.length) {
            const vtN = v.slice(bt.length);
            if (vtN.match(/^\/\d+$/)) {
                return bt;
            } else {
                return v;
            }
        } else return v;
    }
    return v;
}


export const mapToTypedQuick = (
    tt: TermGeneric<string>[],
): TermGeneric<Type>[] => {
    return mapVarsGeneric(
        tt,
        (v) => make.identifier(
            make.simple_type('never'),
            polymorphBack(v.value)
        ),
    );
}


export const modeExec = (
    tt: TermGeneric<Type>[],
): TermGeneric<Type>[] => {
    const mmv = mapModeRearrange(tt, defaultModes);
    return mapToTypedQuick(
        mmv[0]
    ) 
}