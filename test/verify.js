const devices = require('../devices');
const assert = require('assert');

function verifyKeys(expected, actual, id) {
    expected.forEach((key) => {
        assert.strictEqual(actual.includes(key), true, `${id}: missing key '${key}'`);
    });
}

Object.keys(devices).forEach((deviceKey) => {
    const device = devices[deviceKey];

    // Verify device attributes.
    verifyKeys(
        ['model', 'vendor', 'description', 'supports', 'fromZigbee', 'toZigbee'],
        Object.keys(device),
        device.model,
    );

    // Verify fromConverters
    Object.keys(device.fromZigbee).forEach((converterKey) => {
        const converter = device.fromZigbee[converterKey];

        verifyKeys(
            ['cid', 'type', 'convert'],
            Object.keys(converter),
            converterKey,
        );

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

        assert.strictEqual(1, converter.convert.length, `${converterKey}: convert() invalid arguments length`);
    });
});
