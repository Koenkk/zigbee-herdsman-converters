/**
 * This module's only purpose is to build the models index for zigbee-herdsman-converters.
 */

import {cpSync, existsSync, readdirSync, writeFileSync} from 'fs';
import path from 'path';

const SOURCE_DIR = 'devices';

if (!existsSync(SOURCE_DIR)) {
    process.exit(1);
}

const OUT_FILENAME = 'models-index.json';
// output in `src` by default (next to `index.ts`), provides access for uncompiled executions
const OUT_FILEPATH = path.join('src', OUT_FILENAME);

const lookup = {};
let totalDefinitions = 0;

function addToLookup(zigbeeModel, index) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;

    if (!lookup[zigbeeModel]) {
        lookup[zigbeeModel] = [];
    }

    if (!lookup[zigbeeModel].some((z) => z[0] === index[0] && z[1] === index[1])) {
        lookup[zigbeeModel].splice(0, 0, index);
    }
}

for (const module of readdirSync(SOURCE_DIR)) {
    if (module === 'index.js' || !module.endsWith('.js')) {
        continue;
    }

    const filePath = path.join(SOURCE_DIR, module);

    const {definitions} = await import(`./${SOURCE_DIR}/${module}`);
    console.log(`Processing ${filePath}, ${definitions.length} converters`);

    for (let i = 0; i < definitions.length; i++) {
        const definition = definitions[i];

        if (definition.fingerprint) {
            for (const fingerprint of definition.fingerprint) {
                // type `modelID?: string;` means modelID can be undefined, ends up under index "null"
                addToLookup(fingerprint.modelID, [module, i]);
            }
        }

        if (definition.zigbeeModel) {
            for (const zigbeeModel of definition.zigbeeModel) {
                addToLookup(zigbeeModel, [module, i]);
            }
        }
    }

    totalDefinitions += definitions.length;
}

writeFileSync(OUT_FILEPATH, JSON.stringify(lookup), 'utf8');
// also copy in main dir to follow `index.ts` > `index.js` build (since this is run post-build)
cpSync(OUT_FILEPATH, path.join('models-index.json'));

console.log(`\nProcessed ${totalDefinitions} definitions`);
