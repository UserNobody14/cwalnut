import * as fs from "node:fs";
import { codeToAst } from "src/redo/desugar-with-linenums";
import { interp } from "./newinterp/interp";

// List example folder
const exampleFiles = fs.readdirSync("./src/examples");
for (const file of exampleFiles) {
	console.log(file);
}

// Get code from the example folder
const code = fs.readFileSync(
	"./src/examples/index.cwal",
	"utf8",
);
// codeToSouffle(code);
const res = codeToAst(code);
const results = interp(200, res, { vars: ["x"] });
console.log(results);
