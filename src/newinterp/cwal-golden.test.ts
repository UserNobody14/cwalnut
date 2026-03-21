/**
 * Golden tests: test/cwal/<name>.cwal + test/parameters/<name>.params.json +
 * test/results/<name>.result.json (pure JSON array of solution objects).
 * Set CWAL_UPDATE_GOLDEN=1 to rewrite *.result.json from the current interpreter.
 */

import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { codeToAst } from "src/redo/desugar-with-linenums";
import { interp, type InterpResult } from "./interp";

const ROOT = process.cwd();
const CWAL_DIR = path.join(ROOT, "test/cwal");
const PARAMS_DIR = path.join(ROOT, "test/parameters");
const RESULTS_DIR = path.join(ROOT, "test/results");

const UPDATE_GOLDEN = ["1", "true", "yes"].includes(
	(process.env.CWAL_UPDATE_GOLDEN ?? "").toLowerCase(),
);

type ParamsFile = {
	limit: number;
	vars: string[];
	extraNum?: number;
};

function readParams(testname: string): ParamsFile {
	const file = path.join(PARAMS_DIR, `${testname}.params.json`);
	const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error(`${file}: expected a JSON object`);
	}
	const o = raw as Record<string, unknown>;
	if (typeof o.limit !== "number") {
		throw new Error(`${file}: missing or invalid "limit" (number)`);
	}
	if (!Array.isArray(o.vars) || !o.vars.every((v) => typeof v === "string")) {
		throw new Error(`${file}: missing or invalid "vars" (string[])`);
	}
	if (
		o.extraNum !== undefined &&
		(typeof o.extraNum !== "number" || !Number.isFinite(o.extraNum))
	) {
		throw new Error(`${file}: invalid "extraNum" (optional number)`);
	}
	return {
		limit: o.limit,
		vars: o.vars as string[],
		...(o.extraNum !== undefined ? { extraNum: o.extraNum as number } : {}),
	};
}

function readExpectedResult(testname: string): InterpResult {
	const file = path.join(RESULTS_DIR, `${testname}.result.json`);
	const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
	if (!Array.isArray(raw)) {
		throw new Error(`${file}: expected a top-level JSON array (InterpResult)`);
	}
	return raw as InterpResult;
}

function listCwalTestNames(): string[] {
	if (!fs.existsSync(CWAL_DIR)) {
		return [];
	}
	return fs
		.readdirSync(CWAL_DIR)
		.filter((f) => f.endsWith(".cwal"))
		.map((f) => f.slice(0, -".cwal".length))
		.sort();
}

function assertTripleExists(testname: string): void {
	const cwal = path.join(CWAL_DIR, `${testname}.cwal`);
	const params = path.join(PARAMS_DIR, `${testname}.params.json`);
	const result = path.join(RESULTS_DIR, `${testname}.result.json`);
	const missing: string[] = [];
	if (!fs.existsSync(cwal)) missing.push(cwal);
	if (!fs.existsSync(params)) missing.push(params);
	if (!fs.existsSync(result)) missing.push(result);
	if (missing.length > 0) {
		throw new Error(
			`Golden test "${testname}" is missing files:\n${missing.join("\n")}`,
		);
	}
}

function collectOrphans(): { params: string[]; results: string[] } {
	const names = new Set(listCwalTestNames());
	const paramsOrphans: string[] = [];
	const resultsOrphans: string[] = [];

	if (fs.existsSync(PARAMS_DIR)) {
		for (const f of fs.readdirSync(PARAMS_DIR)) {
			if (!f.endsWith(".params.json")) continue;
			const base = f.slice(0, -".params.json".length);
			if (!names.has(base)) paramsOrphans.push(path.join(PARAMS_DIR, f));
		}
	}
	if (fs.existsSync(RESULTS_DIR)) {
		for (const f of fs.readdirSync(RESULTS_DIR)) {
			if (!f.endsWith(".result.json")) continue;
			const base = f.slice(0, -".result.json".length);
			if (!names.has(base)) resultsOrphans.push(path.join(RESULTS_DIR, f));
		}
	}
	return { params: paramsOrphans.sort(), results: resultsOrphans.sort() };
}

describe("cwal golden (file-based)", () => {
	it("no orphaned params/results without a matching .cwal", () => {
		const { params, results } = collectOrphans();
		const lines = [...params, ...results];
		expect(lines).toEqual([]);
	});

	const testnames = listCwalTestNames();
	if (testnames.length === 0) {
		it.skip("no test/cwal/*.cwal fixtures", () => {});
	}

	for (const testname of testnames) {
		it(`golden: ${testname}`, () => {
			assertTripleExists(testname);
			const code = fs.readFileSync(
				path.join(CWAL_DIR, `${testname}.cwal`),
				"utf8",
			);
			const params = readParams(testname);
			const expected = readExpectedResult(testname);
			const ast = codeToAst(code);
			const actual = interp(params.limit, ast, {
				vars: params.vars,
				...(params.extraNum !== undefined
					? { extraNum: params.extraNum }
					: {}),
			});

			const resultPath = path.join(RESULTS_DIR, `${testname}.result.json`);
			if (UPDATE_GOLDEN) {
				fs.writeFileSync(
					resultPath,
					`${JSON.stringify(actual, null, "\t")}\n`,
					"utf8",
				);
			}
			expect(actual).toEqual(expected);
		});
	}
});
