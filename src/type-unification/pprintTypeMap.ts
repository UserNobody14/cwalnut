import type { Type } from 'src/types/EzType';
import { Map as ImmMap } from 'immutable';
import { pprintType } from 'src/redo/pprintgeneric';

// import { ComplexType } from 'src/types/Type';
export function pprintTypeMap(world: ImmMap<string, Type>): string {
    if (world.size === 0) {
        return '<<Empty world>>';
    }
    return `Type Map: {
${[...world.entries()].map(([k, v]) => `     ${k} = ${pprintType(v)}`).join('\n')}
    }`;
}
