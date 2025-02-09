import {exec} from 'child_process';
import {createReadStream, readdirSync, rmSync, writeFileSync} from 'fs';
import path from 'path';
import {createInterface} from 'readline';

const DIR = path.join('src', 'devices');
const START = /^const definitions.* = \[$/;
const EXPORT_DEFAULT = /^export default/;
const MODULE_EXPORTS = /^module.exports =/;
const EXPORT = 'export ';

async function execute(command) {
    return await new Promise((resolve, reject) => {
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function processLineByLine(filePath) {
    let output = '';
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        let remove = false;

        // skip lines before definitions start
        if (line.match(START)) {
            output += EXPORT + line;
        } else if (line.match(EXPORT_DEFAULT)) {
            remove = true;
        } else if (line.match(MODULE_EXPORTS)) {
            remove = true;
        } else {
            output += line;
        }

        if (!remove) {
            output += '\n';
        }
    }

    rl.close();
    fileStream.close();
    writeFileSync(filePath, output, 'utf8');

    if (process.env.TEST) {
        await execute(`prettier --write ${filePath}`);
    }
}

for (const module of process.env.TEST ? ['awox', 'datek.ts', 'weten.ts'] : readdirSync(DIR)) {
    if (module === 'index.ts' || !module.endsWith('.ts')) {
        continue;
    }

    const filePath = path.join(DIR, module);
    console.log(`Processing ${filePath}`);

    await processLineByLine(filePath);
}

rmSync(path.join(DIR, 'index.ts'));

if (!process.env.TEST) {
    await execute(`prettier --write ${DIR.replaceAll('\\', '/')}`);
}
