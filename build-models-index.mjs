/**
 * This module's only purpose is to build the models index for zigbee-herdsman-converters.
 */

import {cpSync, existsSync, readdirSync, writeFileSync} from 'fs';
import path from 'path';

import equal from 'fast-deep-equal';

const SOURCE_DIR = 'devices';

if (!existsSync(SOURCE_DIR)) {
    process.exit(1);
}

const OUT_FILENAME = 'models-index.json';
// output in `src` by default (next to `index.ts`), provides access for uncompiled executions
const OUT_FILEPATH = path.join('src', OUT_FILENAME);

/**
 * Format:
 * Record<(zigbeeModel | fingerprint.modelID), [JS file name, index in `definitions` export][]>
 *
 * Note: `null` is a valid key (assigned for any `undefined` model).
 *
 * Example:
 * ```json
 * {
 *     "vzm31-sn": [["inovelli.js", 1]],
 *     "null": [["yale.js", 25], ["tuya.js", 172]]
 * }
 * ```
 */
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

const addedFingerprints = [];
const addedZigbeeModels = [];
const addedModels = [];

for (const module of readdirSync(SOURCE_DIR)) {
    if (module === 'index.js' || !module.endsWith('.js')) {
        continue;
    }

    const filePath = path.join(SOURCE_DIR, module);

    const {definitions} = await import(`./${SOURCE_DIR}/${module}`);
    console.log(`Processing ${filePath}, ${definitions.length} converters`);

    for (let i = 0; i < definitions.length; i++) {
        const definition = definitions[i];

        if (addedModels.includes(definition.model.toLowerCase())) {
            throw new Error(`Duplicate model ${definition.model}`);
        }

        addedModels.push(definition.model.toLowerCase());

        if (definition.whiteLabel) {
            for (const whiteLabel of definition.whiteLabel) {
                if (whiteLabel.fingerprint) {
                    if (addedModels.includes(whiteLabel.model.toLowerCase())) {
                        if (whiteLabel.vendor === definition.vendor) {
                            throw new Error(`Duplicate whitelabel model ${whiteLabel.model}`);
                        }
                    } else {
                        addedModels.push(whiteLabel.model.toLowerCase());
                    }
                }
            }
        }

        if (definition.fingerprint) {
            for (const fingerprint of definition.fingerprint) {
                for (const addedFingerprint of addedFingerprints) {
                    if (equal(addedFingerprint, fingerprint)) {
                        throw new Error(`Duplicate fingerprint for ${definition.model}: ${JSON.stringify(fingerprint)}`);
                    }
                }

                // type `modelID?: string;` means modelID can be undefined, ends up under index "null"
                addToLookup(fingerprint.modelID, [module, i]);
                addedFingerprints.push(fingerprint);
            }
        }

        if (definition.zigbeeModel) {
            for (const zigbeeModel of definition.zigbeeModel) {
                if (addedZigbeeModels.includes(zigbeeModel.toLowerCase())) {
                    throw new Error(`Duplicate zigbee model ${zigbeeModel}`);
                }

                addToLookup(zigbeeModel, [module, i]);
                addedZigbeeModels.push(zigbeeModel.toLowerCase());
            }
        }
    }

    totalDefinitions += definitions.length;
}

writeFileSync(OUT_FILEPATH, JSON.stringify(lookup), 'utf8');
// also copy in main dir to follow `index.ts` > `index.js` build (since this is run post-build)
cpSync(OUT_FILEPATH, path.join('models-index.json'));

console.log(`\nProcessed ${totalDefinitions} definitions`);
