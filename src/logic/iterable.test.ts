import {
	describe,
	expect,
	it as test,
} from "@jest/globals";
import { makeLiteral, qlvar } from "./makelvar";
import { either, eq, run1 } from "./index";

describe("iterable", () => {
	test("Logic plus emptytest 2", () => {
		const ooo16 = run1(
			15,
			["q"],
			either(
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(1), qlvar.q),
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(2), qlvar.q),
				eq(makeLiteral(false), makeLiteral(true)),
				eq(makeLiteral(3), qlvar.q),
			),
		);
		expect(ooo16).toEqual([
			{
				q: 1,
			},
			{
				q: 2,
			},
			{
				q: 3,
			},
		]);
	});
});
