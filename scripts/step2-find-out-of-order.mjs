import {existsSync, readdirSync, readFileSync} from 'fs';
import path from 'path';

const SOURCE_DIR = path.join('src', 'devices');
const DIST_DIR = 'devices';

if (!existsSync(SOURCE_DIR) || !existsSync(DIST_DIR)) {
    console.log('Source or dist dir do not exist');
    process.exit(1);
}

function arrayStrictEquals(as, bs) {
    if (as.length !== bs.length) {
        return false;
    }

    for (let i = 0; i < as.length; i++) {
        if (as[i] !== bs[i]) {
            return false;
        }
    }

    return true;
}

/**
 * If present, `whiteLabel` is expected to come right after in each case.
 */
const PROPER_ORDERS = [
    ['zigbeeModel', 'fingerprint', 'model', 'vendor', 'description'],
    ['fingerprint', 'zigbeeModel', 'model', 'vendor', 'description'],
    ['zigbeeModel', 'model', 'vendor', 'description'],
    ['fingerprint', 'model', 'vendor', 'description'],
];

let total = 0;
let invalid = 0;
let invalidWhiteLabel = 0;
let invalidDefinitions = [];

for (const module of readdirSync(SOURCE_DIR)) {
    if (module === 'index.ts' || !module.endsWith('.ts')) {
        continue;
    }

    const filePath = path.join(SOURCE_DIR, module);
    const fileCode = readFileSync(filePath, 'utf8');
    const descriptions = fileCode.match(/^[ ]{8}description:(.*)$/gm);

    if (descriptions) {
        // `description` not on single line
        for (const description of descriptions) {
            if (!description.endsWith(`,`)) {
                console.log(`[${module}] multi-line description ${filePath}`);
            }
        }
    }

    const {definitions} = await import(`../${DIST_DIR}/${module.replace('.ts', '.js')}`);

    for (let i = 0; i < definitions.length; i++) {
        const definition = definitions[i];
        const keys = Object.keys(definition);
        let proper = -1;
        let j = 0;

        for (const order of PROPER_ORDERS) {
            const keysSub = keys.slice(0, order.length);

            if (arrayStrictEquals(order, keysSub)) {
                proper = j;

                break;
            }

            j++;
        }

        if (proper > -1) {
            if (keys.includes('whiteLabel')) {
                // ending with `whiteLabel` (no config/features)
                if (keys.length === PROPER_ORDERS[proper].length + 1) {
                    invalidDefinitions.push(definition.model);
                }

                if (keys[PROPER_ORDERS[proper].length] !== 'whiteLabel') {
                    proper = -1;
                    invalidWhiteLabel++;
                }
            } else {
                // ending with `description` (no config/features)
                if (keys.length === PROPER_ORDERS[proper].length) {
                    invalidDefinitions.push(definition.model);
                }
            }
        }

        if (proper === -1) {
            invalid++;

            const newFileIndex = fileCode.indexOf(`        model: '${definition.model}'`);
            const newlineCount = (fileCode.slice(0, newFileIndex).match(/\n/g) || []).length;

            console.log(`[${module}] ${definition.model} (index: ${i}) ${filePath}:${newlineCount + 1}`);
        }

        total++;
    }
}

console.log(`\nInvalid: ${invalid} (from White Label: ${invalidWhiteLabel})`);
console.log(`Invalid definitions: ${invalidDefinitions.join(', ') || 'none'}`);
console.log(`Total: ${total}`);
console.log(
    `/!\\ DO NOT prettier AFTER FIXING THESE until refactor-definition-lambda.mjs executed (avoid creating new description multi-line issues)`,
);
