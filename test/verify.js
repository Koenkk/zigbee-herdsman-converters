'use strict';

const devices = require('../devices');
const assert = require('assert');

function verifyKeys(expected, actual, id) {
    expected.forEach((key) => {
        assert.strictEqual(actual.includes(key), true, `${id}: missing key '${key}'`);
    });
}

let foundZigbeeModels = [];
let foundModels = [];

devices.forEach((device) => {
    // Verify device attributes.
    verifyKeys(
        ['model', 'vendor', 'description', 'supports', 'fromZigbee', 'toZigbee', 'zigbeeModel'],
        Object.keys(device),
        device.model,
    );

    assert.strictEqual(device.fromZigbee.length, new Set(device.fromZigbee).size)

    // Verify fromConverters
    Object.keys(device.fromZigbee).forEach((converterKey) => {
        const converter = device.fromZigbee[converterKey];

        const keys = Object.keys(converter);
        verifyKeys(['cluster', 'type', 'convert'], keys, converterKey);

        assert.strictEqual(4, converter.convert.length, `${converterKey}: convert() invalid arguments length`);
    });

    // Verify toConverters
    Object.keys(device.toZigbee).forEach((converterKey) => {
        const converter = device.toZigbee[converterKey];

        verifyKeys(
            ['key'],
            Object.keys(converter),
            converterKey,
        );

        if (converter.converSet) {
            assert.strictEqual(4, converter.convertSet.length, `${converterKey}: convert() invalid arguments length`);
        }
    });

    // Check for duplicate zigbee model ids
    device.zigbeeModel.forEach((m) => {
        if (foundZigbeeModels.includes(m.toLowerCase())) {
            assert.fail(`Duplicate zigbee model ${m}`);
        }
    });

    // Check for duplicate model ids
    assert(!foundModels.includes(device.model), `Duplicate model ${device.model}`);

    foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
    foundModels.push(device.model);
});
