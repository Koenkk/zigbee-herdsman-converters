const filename = process.argv[2];
const file = require(filename);

const models = {};

for (const def of file) {
    if (def.fingerprint && new Set(def.fingerprint.filter((f) => f.modelID).map((f) => f.modelID)).size === 1) {
        const fingerprint = def.fingerprint[0];
        if (!models[fingerprint.modelID]) {
            models[fingerprint.modelID] = [];
        }
        const manfus = def.fingerprint.map((f) => `'${f.manufacturerName}'`);
        models[fingerprint.modelID].push(`tuya.whitelabel('${def.vendor}', '${def.model}', '${def.description}', [${manfus.join(", ")}]),`);
    }
}

for (const [key, values] of Object.entries(models)) {
    console.log(`\n\n// ${key}`);
    values.forEach((v) => {
        console.log(v);
    });
}
