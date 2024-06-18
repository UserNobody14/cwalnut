import { WorldGoal, LogicValue, PredicateLogic, World, LogicPredicate, LogicList, LogicMap, eq, LogicLiteral, LogicLvar } from "./WorldGoal";

const emptyList = new LogicList([]);
const builtins2 = {
    'unify': (itema: any, itemb: any) => {
        console.log('unify', itema.toString(), itemb.toString());
        return eq(itema, itemb);
    },
    'set_key_of': (obj: LogicValue, key: LogicValue, value: LogicValue) => {
        if (!key.isLiteral())
            throw new Error('Key must be a literal');
        const keyStr = key.value as string;
        const vve = new Map();
        vve.set(keyStr, value);
        console.log('set_key_of', obj.toString(), key.toString(), value.toString());
        return eq(
            obj,
            new LogicMap(
                vve,
                'infinite'
            )
        );
    },
    'first': (firstElem: LogicValue, fullList: LogicValue) => {
        console.log('11111: first', firstElem.toString(), fullList.toString());
        if (fullList instanceof LogicList) {
            if ((fullList.value as any).length === 0) {
                console.warn('first: b is empty');
                return WorldGoal.fail;
            }
            return eq(firstElem, (fullList as any).value[0]);
        } else if (fullList instanceof LogicLvar) {
            // set b's lvar to a nonfinite list with a as the first element
            // return eq(b, new LogicValue([a]));
            return new WorldGoal((world) => {
                const fullList2 = world.walk(fullList);
                if (fullList2 && fullList2.isList()) {
                    console.log('2222: first', fullList2.toString(), firstElem.toString());
                    const fullList2List = fullList2.value as LogicValue[];
                    if (fullList2List.length === 0) {
                        console.warn('first: b is empty');
                        return WorldGoal.fail.run(world);
                    }
                    return eq(firstElem, fullList2List[0]).run(world);
                } else {
                    console.warn('first: b is not a list');
                    return WorldGoal.fail.run(world);
                }
            });
        } else {
            console.warn('first: b is not a list or lvar: ', fullList.toString());
            return WorldGoal.fail;
        }
    },
    'rest': (remainder1: LogicValue, fullList1: LogicValue) => {
        console.log('rest: remainder', remainder1.toString(), fullList1.toString());
        if (fullList1 instanceof LogicList) {
            if (fullList1.value.length == 0) {
                console.warn('rest: b is empty');
                return WorldGoal.fail;
            } if (fullList1.value.length == 1) {
                return eq(emptyList, remainder1);
            }
            const slicedValue = [...fullList1.value].slice(1);
            console.log('slicedValue', slicedValue);
            return eq(new LogicList(slicedValue), remainder1);
        } else if (remainder1 instanceof LogicList) {
            // return eq(fullList1, new LogicList([]));
            return new WorldGoal((world) => {
                return eq(fullList1, new LogicList([world.getFreshLvar(), ...remainder1.value])).run(world);
            });
        } else {
            console.warn('rest: b is not a list or lvar: ', remainder1.toString(), fullList1.toString());
            return WorldGoal.fail;
        }
        // return WorldGoal.preWalked(
        //     (remainder, fullList) => {
        //         if (fullList.isList()) {
        //             if ((fullList.value as any).length <= 1) {
        //                 console.warn('rest: b is empty');
        //                 return WorldGoal.fail;
        //             }
        //             console.log('fullList', fullList.toString());
        //             const slicedValue = [...(fullList as any).value].slice(1);
        //             console.log('slicedValue', slicedValue);
        //             return eq(new LogicList(slicedValue), remainder);
        //         } else if (fullList.isLvar()) {
        //             if (remainder.isList()) {
        //                 return new WorldGoal((world) => {
        //                     const alist = remainder.value as LogicValue[];
        //                     const llv = [world.getFreshLvar(), ...alist];
        //                     return eq(fullList, new LogicList(llv)).run(world);
        //                 });
        //             } else if (remainder.isLvar()) {
        //                 return new WorldGoal((world): World[] => {
        //                     const remainder1 = world.walk(remainder);
        //                     const fullList1 = world.walk(fullList);
        //                     console.log('rrrrr: rest', remainder1?.toString(), fullList1?.toString());
        //                     if (remainder1 && remainder1.isList()) {
        //                         const alist = remainder1.value as LogicValue[];
        //                         const llv = [world.getFreshLvar(), ...alist];
        //                         return eq(fullList1, new LogicList(llv)).run(world);
        //                     } else if (fullList1 && fullList1.isList()) {
        //                         const fullList1List = fullList1.value as LogicValue[];
        //                         const copiedList1 = [...fullList1List].slice(1);
        //                         console.log('rrrr2', copiedList1.toString(), remainder1?.toString());
        //                         return eq(remainder1,
        //                             new LogicList(copiedList1)).run(world);
        //                     } else {
        //                         console.warn('rest: a and b are not lists');
        //                         return WorldGoal.fail.run(world);
        //                     }
        //                     // const llv = [world.getFreshLvar()];
        //                     // return eq(b, new LogicValue(llv)).run(world);
        //                 });
        //             }
        //             // set b's lvar to a list with
        //             console.warn('rest: a is not a list');
        //             return WorldGoal.fail;
        //             // return eq(fullList, new LogicValue([remainder]));
        //             // return new WorldGoal((world) => {
        //             //     const alist = a.value as LogicValue[];
        //             //
        //         } else {
        //             console.warn('rest: b is not a list or lvar');
        //             return WorldGoal.fail;
        //         }
        //     }
        // )(remainder1, fullList1);
    },
    // 'rest': (remainder: LogicValue, fullList: LogicValue) => {
    //     if (fullList.isList()) {
    //         if ((fullList.value as any).length <= 1) {
    //             console.warn('rest: b is empty');
    //             return WorldGoal.fail;
    //         }
    //         const slicedValue = [...(fullList as any).value].slice(1);
    //         console.log('slicedValue', slicedValue);
    //         return eq(new LogicValue(slicedValue), remainder);
    //     } else if (fullList.isLvar()) {
    //         if (remainder.isList()) {
    //             return new WorldGoal((world) => {
    //                 const alist = remainder.value as LogicValue[];
    //                 const llv = [world.getFreshLvar(), ...alist];
    //                 return eq(fullList, new LogicValue(llv)).run(world);
    //             });
    //         } else if (remainder.isLvar()) {
    //             return new WorldGoal((world): World[] => {
    //                 const remainder1 = world.walk(remainder);
    //                 const fullList1 = world.walk(fullList);
    //                 console.log('rrrrr: rest', remainder1?.toString(), fullList1?.toString());
    //                 if (remainder1 && remainder1.isList()) {
    //                     const alist = remainder1.value as LogicValue[];
    //                     const llv = [world.getFreshLvar(), ...alist];
    //                     return eq(fullList1, new LogicValue(llv)).run(world);
    //                 } else if (fullList1 && fullList1.isList()) {
    //                     const fullList1List = fullList1.value as LogicValue[];
    //                     const copiedList1 = [...fullList1List].slice(1);
    //                     console.log('rrrr2', copiedList1.toString(), remainder1?.toString());
    //                     return eq(remainder1, 
    //                         new LogicValue(copiedList1)).run(world);
    //                 } else {
    //                     console.warn('rest: a and b are not lists');
    //                     return WorldGoal.fail.run(world);
    //                 }
    //                 // const llv = [world.getFreshLvar()];
    //                 // return eq(b, new LogicValue(llv)).run(world);
    //             });
    //         }
    //         // set b's lvar to a list with
    //         console.warn('rest: a is not a list');
    //         return WorldGoal.fail;
    //         // return eq(fullList, new LogicValue([remainder]));
    //         // return new WorldGoal((world) => {
    //         //     const alist = a.value as LogicValue[];
    //         //     const llv = [world.getFreshLvar(), ...alist];
    //         //     return eq(b, new LogicValue(llv)).run(world);
    //         // });
    //     } else {
    //         console.warn('rest: b is not a list or lvar');
    //         return WorldGoal.fail;
    //     }
    // },
    'empty': (a: LogicValue) => {
        return eq(a, emptyList);
    },

    'list': (outarg: LogicValue, ...args: LogicValue[]) => {
        console.log('list:::::::::', outarg.toString(), args);
        return eq(outarg, new LogicList(args));
    },
    'length': (item1: LogicValue, len1: LogicValue) => {
        return new WorldGoal((world) => {
            const item = world.walk(item1);
            const len = world.walk(len1);
            if (item instanceof LogicList) {
                console.log('length: item', item.toString());
                return eq(len, new LogicLiteral(item.value.length)).run(world);
            } else if (item instanceof LogicMap) {
                console.log('length: item (map)', item.toString(), item.value.size, len?.toString());
                if (len && len instanceof LogicLiteral && item1 instanceof LogicLvar) {
                    console.log('Binding map', len, item.value.size, item1.getName(), item1.toString());
                    return eq(len, new LogicLiteral(item.value.size)).run(
                        world.bind(item1.getName(), 
                            new LogicMap(item.value, 'finite', Number(len.value))
                        )
                    );
                } else {
                    // Set the map to finite (as constraint??)
                    return eq(len, new LogicLiteral(item.value.size)).run(world);
                }
            } else {
                console.warn('length: a is not a list or map');
                return [World.fail];
            }
        });
    }
};
export const builtinWorld = new World(new Map(), false);
for (const [key, value] of Object.entries(builtins2)) {
    // truev key === 'unify'
    const ignoreVals = ['unify', 'set_key_of', 'length'];
    builtinWorld.addLvar(key, new LogicPredicate(
        new PredicateLogic(value as any, ignoreVals.includes(key))
    ));
}
