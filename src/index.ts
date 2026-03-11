import {codeToSouffle} from './souffle/tosouffle';
import * as fs from 'node:fs';



// List example folder
const exampleFiles = fs.readdirSync('./src/examples');
for (const file of exampleFiles) {
    console.log(file);
}

// Get code from the example folder
const code = fs.readFileSync('./src/examples/index.cwal', 'utf8');
codeToSouffle(code);