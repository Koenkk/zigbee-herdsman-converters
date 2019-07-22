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

    // Verify fromConverters
    Object.keys(device.fromZigbee).forEach((converterKey) => {
        const converter = device.fromZigbee[converterKey];

        const keys = Object.keys(converter);
        if (keys.includes('cid')) {
            verifyKeys(['cid', 'type', 'convert'], keys, converterKey);
        } else if (keys.includes('cmd')) {
            verifyKeys(['cmd', 'convert'], keys, converterKey);
        } else {
            assert.fail(`${converterKey}: missing ['cid', 'type'] or ['cmd']`)
        }

        assert.strictEqual(4, converter.convert.length, `${converterKey}: convert() invalid arguments length`);
    });

    // Verify toConverters
    Object.keys(device.toZigbee).forEach((converterKey) => {
        const converter = device.toZigbee[converterKey];

        verifyKeys(
            ['key', 'convert'],
            Object.keys(converter),
            converterKey,
        );

        assert.strictEqual(6, converter.convert.length, `${converterKey}: convert() invalid arguments length`);
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
