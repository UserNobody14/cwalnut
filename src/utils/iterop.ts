function* mergeStreams<VALUE>(state: VALUE, functions: Array<(state: VALUE) => Iterable<VALUE>>): Iterable<VALUE> {
    // Initialize an array of iterators from the functions
    const iterators = functions.map(func => func(state)[Symbol.iterator]());
    const queue: Array<Iterator<VALUE>> = [...iterators];
    yield* mergeGeneral(queue);
}

export function* mergeGeneralIterable<VALUE>(iterators: Array<Iterable<VALUE>>): Iterable<VALUE> {
    const queue: Array<Iterator<VALUE>> = [...iterators.map(iterable => iterable[Symbol.iterator]())];
    while (queue.length > 0) {
        const iterator = queue.shift();
        if (iterator) {
            const result = iterator.next();
            if (!result.done) {
                if (!result.value) throw new Error("No value????");
                yield result.value;
                queue.push(iterator); // Put the iterator back in the queue for further processing
            }
        }
    }
}

export function* mergeGeneral<VALUE>(queue: Array<Iterator<VALUE>>): Iterable<VALUE> {
    while (queue.length > 0) {
        const iterator = queue.shift();
        if (iterator) {
            const result = iterator.next();
            if (!result.done) {
                if (!result.value) throw new Error("No value????");
                yield result.value;
                queue.push(iterator); // Put the iterator back in the queue for further processing
            }
        }
    }
}

export function* mapStreams<VALUE, RES>(goal: (s: VALUE) => Iterable<RES>, stream: Iterable<VALUE>): Iterable<RES> {
    // Breadth first merger & mapping of the streams
    const queue: Array<Iterator<RES>> = [];
    const streamIter = stream[Symbol.iterator]();
    let streamDone = false;
    while (queue.length > 0 || !streamDone) {
        if (streamIter && !streamDone) {
            if (queue.length > 0) {
                const iterator = queue.shift();
                if (iterator) {
                    const result = iterator.next();
                    if (!result.done) {
                        if (!result.value) throw new Error("No value????");
                        yield result.value;
                        queue.push(iterator); // Put the iterator back in the queue for further processing
                    }
                }
            }
            const result = streamIter.next();
            if (result.done) {
                streamDone = true;
                continue;
            }
            const val = result.value;
            queue.push(goal(val)[Symbol.iterator]());
        } else {
            yield* mergeGeneral(queue);
        }
    }
}

export function* reduceStreams1<VALUE, ACC>(goal: (s: VALUE) => Iterable<VALUE>, stream: Iterable<VALUE>, reducer: (acc: ACC, val: VALUE) => ACC, initial: ACC): Iterable<ACC> {
    let acc = initial;
    for (const val of mapStreams(goal, stream)) {
        acc = reducer(acc, val);
        yield acc;
    }
}

export function* reduceStreamArray<VALUE>(worlds: VALUE[], reducer: (acc: VALUE, val: VALUE) => Iterable<VALUE>): Iterable<VALUE> {
    // let acc = arr[0];
    // for (const val of arr.slice(1)) {
    //     for (const val2 of reducer(acc, val)) {
    //         acc = val2;
    //         yield val2;
    //     }
    // }
    if (worlds.length === 0) {
        return;
    }
    if (worlds.length === 1) {
        yield worlds[0];
        return;
    }
    if (worlds.length === 2) {
        yield* reducer(worlds[0], worlds[1]);
    }
    const mid = Math.floor(worlds.length / 2);
    const left = worlds.slice(0, mid);
    const right = worlds.slice(mid);
    const leftStream = reduceStreamArray(left, reducer);
    const rightStream = reduceStreamArray(right, reducer);
    const pairs = mergePossibilities([leftStream, rightStream]);
    yield* mapStreams(pair => reducer(pair[0], pair[1]), pairs);
    // for (const pair of pairs) {
    //     yield* reducer(pair[0], pair[1]);
    // }
    // yield* mapStreams(world => right, 
    //     mapStreams()
    // );
    // yield* reduceStreamArray(

    // )
    // return mergeModeWorldList([mergeModeWorldList(left), mergeModeWorldList(right)]);
    // yield* mergeStreams(worlds[0], [worlds[1]]);
}


export function* mergePossibilities<VALUE>(queue: Array<Iterable<VALUE>>): Iterable<Array<VALUE>> {
    // Initialize an array of iterators from the functions
    const iterators = queue.map(iterable => iterable[Symbol.iterator]());
    const queue2: Array<Iterator<VALUE>> = [...iterators];
    yield* mergePossibilitiesGeneral(queue2);
}

function* mergePossibilitiesGeneral<VALUE>(possibilityGen: Array<Iterator<VALUE>>): Iterable<Array<VALUE>> {
    // Take a list of all these generators and merge them together
    // Recursively merge the generators
    const depth = possibilityGen.length;
    if (depth === 1) {
        const iterator = possibilityGen[0];
        while (true) {
            const result = iterator.next();
            if (result.done) {
                break;
            }
            yield [result.value];
        }
    }
    if (depth === 0) {
        return;
    }
    const iterator = possibilityGen[0];
    while (true) {
        const result = iterator.next();
        if (result.done) {
            break;
        }
        const value = result.value;
        const rest = possibilityGen.slice(1);
        yield* mapPossibilitiesGeneral(value, rest);
    }
}

function* mapPossibilitiesGeneral<VALUE>(value: VALUE, rest: Array<Iterator<VALUE>>): Iterable<Array<VALUE>> {
    // Breadth first merger & mapping of the streams
    const queue: Array<Iterator<VALUE>> = [];
    let streamDone = false;
    while (queue.length > 0 || !streamDone) {
        if (rest.length > 0) {
            const iterator = rest[0];
            if (iterator) {
                const result = iterator.next();
                if (result.done) {
                    streamDone = true;
                    continue;
                }
                const val = result.value;
                queue.push(iterator);
                yield [value, val];
            }
        } else {
            yield [value];
        }
        yield* mergePossibilitiesGeneral(queue);
    }
}

export function* takeToIterable<VALUE>(iterable: Iterable<VALUE>, length1: number) {
    let length = length1;
    const iterator = iterable[Symbol.iterator]();
    while (length-- > 0) {
        const vll = iterator.next();
        if (!vll) throw new Error("No iterator");
        if (vll.done) break;
        if (!vll.value) throw new Error("No value");
        yield vll.value;
    }
}

export function take<VALUE>(iterable: Iterable<VALUE>, n: number | null): VALUE[] {
    if (n === null) {
        return [...iterable];
    } else {
        return [...takeToIterable(iterable, n)];
    }
}