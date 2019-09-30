const index = require('../index');
const devices = require('../devices');

describe('index.js', () => {
    it('Find device by model ID', () => {
        const device = index.findByZigbeeModel('WaterSensor-N');
        expect(device.model).toBe('HS1WL/HS3WL')
    });

    it('Find device by model ID with strange characters', () => {
        const device = index.findByZigbeeModel('lumi.remote.b1acn01\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Find device by model ID without strange characters', () => {
        const device = index.findByZigbeeModel('lumi.sensor_switch.aq2\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Find device by model ID null', () => {
        const device = index.findByZigbeeModel(null);
        expect(device).toBe(null)
    });

    it('Verify devices.js definitions', () => {
        function verifyKeys(expected, actual, id) {
            expected.forEach((key) => {
                if (!actual.includes(key)) {
                    throw new Error(`${id}: missing key '${key}'`)
                }
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

            if (device.configure && (!device.meta || !device.meta.configureKey)) {
                throw new Error(`${device.model} requires configureKey because it has configure`)
            }

            expect(device.fromZigbee.length).toBe(new Set(device.fromZigbee).size)

            // Verify fromConverters
            Object.keys(device.fromZigbee).forEach((converterKey) => {
                const converter = device.fromZigbee[converterKey];

                const keys = Object.keys(converter);
                verifyKeys(['cluster', 'type', 'convert'], keys, converterKey);

                if (4 != converter.convert.length) {
                    throw new Error(`${converterKey}: convert() invalid arguments length`)
                }
            });

            // Verify toConverters
            Object.keys(device.toZigbee).forEach((converterKey) => {
                const converter = device.toZigbee[converterKey];

                verifyKeys(
                    ['key'],
                    Object.keys(converter),
                    converterKey,
                );

                if (converter.converSet && 4 != converter.convertSet.length) {
                    throw new Error(`${converterKey}: convert() invalid arguments length`)
                }
            });

            // Check for duplicate zigbee model ids
            device.zigbeeModel.forEach((m) => {
                if (foundZigbeeModels.includes(m.toLowerCase())) {
                    throw new Error(`Duplicate zigbee model ${m}`)
                }
            });

            // Check for duplicate model ids
            if (foundModels.includes(device.model)) {
                throw new Error(`Duplicate model ${device.model}`)
            }

            foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
            foundModels.push(device.model);
        });
    });
});
