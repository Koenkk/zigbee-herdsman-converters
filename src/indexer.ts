/**
 * This module's only purpose is to build the models index for zigbee-herdsman-converters.
 */

import {readdirSync, writeFileSync} from "node:fs";
import path from "node:path";

import equal from "fast-deep-equal";

import type {DefinitionWithExtend} from "./lib/types";

type LookupEntry = [moduleName: string, index: number];

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
const lookup: Record<string | null, LookupEntry[]> = {};

function addToLookup(zigbeeModel: string | undefined, index: LookupEntry) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;

    if (!lookup[zigbeeModel]) {
        lookup[zigbeeModel] = [];
    }

    if (!lookup[zigbeeModel].some((z) => z[0] === index[0] && z[1] === index[1])) {
        lookup[zigbeeModel].splice(0, 0, index);
    }
}

export async function buildIndex(fromSrc = false): Promise<void> {
    let totalDefinitions = 0;
    // keep track of added stuff to check for dupes
    const addedFingerprints = [];
    const addedZigbeeModels: string[] = [];
    const addedModels: string[] = [];
    const devicesDir = fromSrc ? path.join("src", "devices") : path.join("dist", "devices");

    for (const moduleName of readdirSync(devicesDir)) {
        if (moduleName === (fromSrc ? "index.ts" : "index.js") || !moduleName.endsWith(fromSrc ? ".ts" : ".js")) {
            continue;
        }

        const filePath = path.join(devicesDir, moduleName);
        const {definitions} = (await import(`./devices/${moduleName.slice(0, -3)}`)) as {definitions: DefinitionWithExtend[]};
        console.log(`Processing ${filePath}, ${definitions.length} converters`);

        for (let i = 0; i < definitions.length; i++) {
            const definition = definitions[i];

            if (addedModels.includes(definition.model.toLowerCase())) {
                throw new Error(`Duplicate model ${definition.model}`);
            }

            addedModels.push(definition.model.toLowerCase());

            if (definition.whiteLabel) {
                for (const whiteLabel of definition.whiteLabel) {
                    if ("fingerprint" in whiteLabel) {
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
                    addToLookup(fingerprint.modelID, [moduleName, i]);
                    addedFingerprints.push(fingerprint);
                }
            }

            if (definition.zigbeeModel) {
                for (const zigbeeModel of definition.zigbeeModel) {
                    if (addedZigbeeModels.includes(zigbeeModel.toLowerCase())) {
                        throw new Error(`Duplicate zigbee model ${zigbeeModel}`);
                    }

                    addToLookup(zigbeeModel, [moduleName, i]);
                    addedZigbeeModels.push(zigbeeModel.toLowerCase());
                }
            }
        }

        totalDefinitions += definitions.length;
    }

    const target = fromSrc ? "models-index.json" : path.join("dist", "models-index.json");
    writeFileSync(target, JSON.stringify(lookup), "utf8");
    console.log(`\nProcessed ${totalDefinitions} definitions`);
}

if (require.main === module) {
    void buildIndex();
}
