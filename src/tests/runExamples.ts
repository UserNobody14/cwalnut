import { interpretFromCode } from "src/interpretPlus";

// basic example
const source1 = `
a = 1
b = 2
`

const source2 = `
a.foo = 1
a.bar = 2
b.foo = 1
a = b
qq = a
`;

// should fail
const source3 = `
a = {foo: 1, bar: 2}
b = {foo: 1}
a = b
`;

// work on?
const source4 = `
membero = (a, bb) =>
    either:
        first(a, bb)
        all:
            rest(bbrest, bb)
            membero(a, bbrest)

einput = [1, 2, 3, 4, 5]

membero(qq, einput)
`;

const source5 = `
appendo = (a, b, ab) =>
    either:
        all:
            empty(a)
            b = ab
        all:
            rest(d, a)
            appendo(d, b, r)
            rest(r, ab)

einput = [1, 2, 3]
input2 = [4, 5, 6]
appendo(einput, input2, qq)
`


function displayVars(source: string = source2, varsv: string[] = ['qq']) {
    const vfr = interpretFromCode(source, varsv);
    console.log('-----------------------');
    vfr.forEach(
        (f) => {
            for (const k in f) {
                console.log(k, f[k].toString());
            }
        }
    )
}
// displayVars(source2, ['qq', 'a', 'b']);
// displayVars(source4, ['qq']);
// displayVars(source3, ['a']);
displayVars(source5, ['qq']);