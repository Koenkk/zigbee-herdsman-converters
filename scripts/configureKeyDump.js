const index = require('../index');

const lookup = {};
for (const definition of index.definitions) {
    if (definition.configure) {
        const key = `${definition.model}_${index.getConfigureKey(definition)}`;
        const oldKey = definition.meta.configureKey;

        if (key in lookup && lookup[key] != oldKey) {
            throw new Error('Should never happen');
        }

        lookup[key] = oldKey;
    }
}

console.log(JSON.stringify(lookup));
