import * as logicS from "./logic";

const logic = logicS.SLogic;

const write = console.log;

write(logic);

const or = logic.or;
const and = logic.and;
const eq = logic.eq;
const lvar = logic.lvar;
const nil = logic.nil;
const between = logic.between;
const run = logic.run;
const list = logic.list;
const implies = logic.implies;

const x = lvar("x");
const y = lvar("y");
const z = lvar("z");
const w = lvar();

//console.log(a.lvar())

let g = null;
let s = null;
let g1 = null;
let s1 = null;
let g2: any = null;
let g3 = null;
let r = null;
let s2 = null;
let s3 = null;

const range = (
	low: any,
	high: any,
): logicS.Stream => {
	if (low > high) return logic.EMPTY_STREAM;
	
		return logic.make_stream(low, () => range(low + 1, high));
};

const ones = () => logic.make_stream(1, ones);

const twos = () => logic.make_stream(2, twos);

function father(a: any, b: any) {
	//mcbob is father of bob
	//bob is father of bill
	return or(
		and(eq(a, "mcbob"), eq(b, "bob")),
		and(eq(a, "bob"), eq(b, "bill")),
	);
}

function grandfather(x1: any, y1: any) {
	const z = lvar();
	return and(father(x1, z), father(z, y1));
}

write("---tests");
write("win:", logic.win);
write("fail:", logic.fail);

write("X=a:", eq(x, "a")(nil));
write("X=Y:", eq(x, y)(nil));

g1 = or(eq(x, "mcbob"), eq(y, "bob"));
s1 = g1(nil);
g2 = and(eq(z, 2), eq(w, 3));
s2 = g2(nil);
write("--streams");
write("s1");
s1.write();
write("s2");
s2.write();
write("s3");
s3 = s1.map((f: any) => g2(f));
s3.write();
s3 = s3.flatten();
s3.write();

write("--relations");
s = father(x, y)(nil);
s.write();
grandfather(x, y)(nil).write();

write("--ranges");
between(1, 5, x)(nil).write();
and(between(1, 5, x), between(1, 2, x))(nil).write();
and(between(1, 5, x), between(3, 7, x))(nil).write();
or(between(1, 4, x), between(3, 7, x))(nil).write();

write("--");
and(eq(x, "a"), eq(x, "a"))(nil).write(); //do not extend frame
and(eq(x, "a"), eq(x, "b"))(nil).write();

write("--array match");
s = eq([1, 2, y], [1, x, 3])(nil);
s.write();

write("--object match");
g1 = eq({ x: x }, { x: 3 });
g2 = eq(
	{ name: "bob", city: "dinamarca", gifts: ["cake", z] },
	{ name: x, gifts: [y, "bread"] },
);
g3 = eq(
	{ name: "bob", city: "dinamarca", gifts: ["cake", z] },
	{ name: x, gifts: [z, "bread"] },
);
write(run(g1, x));
write(run(g2, [x, y, z]));
write(run(g3, [x, y, z]));

write("--eq?");
write(logic.run(eq(x, [1, 2, 3]), x)[0]);

g = and(eq(x, [1, y, 3]), eq(y, 2));
write(run(g, x)); //should we make this return x = [1,2,3] ? (probably not)

write(run(eq([x, 2, z], [y, y, 3]), [x, y, z])); //[2, 2, 3]

write("--run");
g = between(1, 5, x);
r = logic.run(g, x, 0);
write(r);
r = logic.run(g, x, 3);
write(r);
r = logic.run(g, x);
write(r);
r = logic.run(or(between(2, 5, x), between(3, 7, x)), x);
write(r);
r = logic.run(and(between(2, 5, x), between(3, 7, x)), x);
write(r);
r = logic.run(or(between(2, 5, x), between(3, 7, y)), [
	x,
	y,
]);
write(r);
r = logic.run(and(between(2, 5, x), between(3, 7, y)), [
	x,
	y,
]);
write(r);
r = logic.run(and(between(2, 5, x), between(6, 7, x)), [
	x,
	y,
]);
write(r);
r = logic.run(father(x, y), [x, y]);
write(r);

const dom = logic.dom;
const add = logic.add;
const sub = logic.sub;
const mul = logic.mul;
const div = logic.div;
const make_domain = logic.clpr.make_domain;
const less_equal = logic.clpr.less_equal;

write("--");
g = and(dom(x, 0, 5), dom(x, 0, 3));
write(run(g, x));

write("--");
g = and(dom(x, 0, 3), dom(x, 0, 5));
write(run(g, x));

write("--");
g = or(dom(x, 0, 3), dom(x, 1, 2));
write(run(g, x));
g = and(dom(x, 0, 4.2), dom(x, 1, 5));
write(run(g, x));
g = and(dom(x, 0, 3.4), dom(x, 4, 5));
write(run(g, x));

write("--constraints");
g = less_equal(x, 3);
write(run(g, x));
g(nil).write();

g = and(dom(x, 2, 5), less_equal(x, 3));
write(run(g, x));

g = and(less_equal(x, 3), eq(x, 2));
write(run(g, x));

g = and(less_equal(x, 3), eq(x, 5));
write(run(g, x));

g = and(eq(x, 5), less_equal(x, 3));
write(run(g, x));

write("--add");
g = add(2, 1, x);
write(run(g, x));

g = and(add(x, 1, z), eq(z, 2));
write(run(g, [x, y, z]));

g = or(
	and(add(x, 1, z), eq(x, 2)),
	or(
		and(sub(x, 1, z), eq(x, 2)),
		and(sub(x, y, z), and(eq(x, 2), eq(y, 3))),
	),
);
write(run(g, [x, y, z]));

write("--mul");
g = and(mul(x, y, 2), logic.win); //and(eq(x,2), eq(y,3)))
write(run(g, [x, y, z]));

g = and(mul(x, y, z), and(eq(x, 2), eq(y, 3)));
write(run(g, [x, y, z]));

write("--");
g = or(
	and(mul(x, 2.5, z), eq(x, 2)),
	or(
		and(div(x, 3, z), eq(x, 1)),
		and(div(x, y, z), and(eq(x, 2), eq(z, 3))),
	),
);
write(run(g, [x, y, z]));

g = or(
	and(div(2, 3, z), eq(z, 1)),
	and(div(x, y, z), logic.win),
);
write(run(g, [x, y, z]));

g = or(
	and(div(2, 3, z), less_equal(z, 2)),
	and(
		div(x, y, z),
		and(less_equal(x, 2), less_equal(y, 2)),
	),
);
write(run(g, [x, y, z]));

write(run(less_equal(x, 2), [x, y, z]));

write(make_domain(2, 5).div(make_domain(1, 1 / 0)));
write(make_domain(2, 5).div(make_domain(-1 / 0, 1 / 0)));

function writeg(x: any) {
	return (p: any) => {
		write(p.get_value(x));
		return logic.win(p);
	};
}

g = and(eq(x, 2), writeg(x), eq(y, 3));
run(g, x);

write(run(eq(x, 2), [x, 3, "blah"]));

write("--and/or");
write(run(and(), [x]));
write(run(and(eq(x, 2)), [x]));
write(run(and(eq(x, 2), eq(y, 3)), [x, y]));
write(run(and(eq(x, 2), eq(y, 3), eq(z, 4)), [x, y, z]));
write(
	run(and(eq(x, 2), eq(y, 3), eq(z, 4), eq(w, 5)), [
		x,
		y,
		z,
		w,
	]),
);

write(run(or(), x));
write(run(or(eq(x, 2)), x));
write(run(or(eq(x, 2), eq(x, 3)), x));
write(run(or(eq(x, 2), eq(x, 3), eq(x, 4)), x));
write(run(or(eq(x, 2), eq(x, 3), eq(x, 4), eq(x, 5)), x));

write("--list matching");
const l1 = list(1, y, 3);
const l2 = list(1, 2, x);
const l3 = list(z, y, w, 3, y);
const l4 = list(2, x, x, w, w);
write(run(eq(l1, x), x));
write(run(eq(l1, l2), [x, y]));
write(run(eq(l3, l4), [x, y, z, w]));
write(run(eq(l1, l3), [x, y, z, w]));
write(run(and(eq(z, l1), eq(z, l2)), [x, y, z, w]));

write("--ifs");
g1 = logic.eq(x, 0);
g2 = logic.eq(y, 1);
g3 = logic.eq(y, 2);
write(run(implies(g1, g2, g3), [x, y]));
write(run(implies(logic.fail, g2, g3), [x, y]));
write(run(implies(g1, g2), [x, y]));
write(run(implies(logic.fail, g2), [x, y]));
