const index = require('../index');
const devices = require('../devices');

function containsOnly(array1, array2){
    for (const elem of array2) {
        if (!array1.includes(elem)) {
            throw new Error(`Contains '${elem}' while it should only contains: '${array1}'`)
        }
    }

    return true;
}

describe('index.js', () => {
    it('Find device by model ID', () => {
        const device = index.findByZigbeeModel('WaterSensor-N');
        expect(device.model).toBe('HS1WL/HS3WL')
    });

    it('Find device by model ID with strange characters 1', () => {
        const device = index.findByZigbeeModel('lumi.remote.b1acn01\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Find device by model ID with strange characters 2', () => {
        const device = index.findByZigbeeModel('lumi.sensor_86sw1\u0000lu');
        expect(device.model).toBe('WXKG03LM')
    });

    it('Find device by model ID with strange characters 3', () => {
        const device = index.findByZigbeeModel('lumi.sensor_86sw1');
        expect(device.model).toBe('WXKG03LM')
    });

    it('Find device by model ID without strange characters', () => {
        const device = index.findByZigbeeModel('lumi.sensor_switch.aq2\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Find device by model ID null', () => {
        const device = index.findByZigbeeModel(null);
        expect(device).toBe(null)
    });

    it('Find device by fingerprint', () => {
        const endpoints = [
            {ID: 230, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
            {ID: 232, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
        ];
        const device = {
            type: 'Router',
            manufacturerID: 4126,
            modelID: undefined,
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = index.findByDevice(device);
        expect(definition.model).toBe('XBee');
    });


    it('Find device by using findDevice shoudlnt match when modelID is null and there is no fingerprint match', () => {
        const endpoints = [
            {ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []},
        ];
        const device = {
            type: undefined,
            manufacturerID: undefined,
            modelID: undefined,
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = index.findByDevice(device);
        expect(definition).toBeNull();
    });

    it('Find device by using findDevice when device has modelID should match', () => {
        const endpoints = [
            {ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []},
        ];
        const device = {
            type: undefined,
            manufacturerID: undefined,
            modelID: "lumi.sensor_motion",
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = index.findByDevice(device);
        expect(definition.model).toBe("RTCGQ01LM");
    });

    it('Find device by fingerprint prefer over zigbeeModel', () => {
        const mullerEndpoints = [
            {ID: 1, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusters: [25]},
            {ID: 242, profileID: 41440, deviceID: 102, inputClusters: [33], outputClusters: [33]},
        ];
        const muller = {
            type: 'Router',
            manufacturerID: 4635,
            manufacturerName: 'MLI',
            modelID: 'CCT Lighting',
            powerSource: 'Mains (single phase)',
            endpoints: mullerEndpoints,
            getEndpoint: (ID) => mullerEndpoints.find((e) => e.ID === ID),
        };

        const sunricher = {
            // Mock, not the actual fingerprint.
            type: 'Router',
            manufacturerID: 9999,
            manufacturerName: 'SunRicher',
            modelID: 'CCT Lighting',
            powerSource: 'Mains (single phase)',
            endpoints: [],
            getEndpoint: (ID) => null,
        };

        expect(index.findByDevice(sunricher).model).toBe('ZG192910-4');
        expect(index.findByDevice(muller).model).toBe('404031');
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
                ['model', 'vendor', 'description', 'supports', 'fromZigbee', 'toZigbee'],
                Object.keys(device),
                device.model,
            );

            if (!device.hasOwnProperty('zigbeeModel') && !device.hasOwnProperty('fingerprint')) {
                throw new Error(`'${device.model}' has no zigbeeModel or fingerprint`);
            }

            expect(device.fromZigbee.length).toBe(new Set(device.fromZigbee).size)

            // Verify fromConverters
            Object.keys(device.fromZigbee).forEach((converterKey) => {
                const converter = device.fromZigbee[converterKey];

                if(!converter) {
                    throw new Error(`fromZigbee[${converterKey}] not defined on device ${device.model}.`);
                }

                const keys = Object.keys(converter);
                verifyKeys(['cluster', 'type', 'convert'], keys, converterKey);

                if (5 != converter.convert.length) {
                    throw new Error(`${converterKey}: convert() invalid arguments length`)
                }
            });

            // Verify toConverters
            Object.keys(device.toZigbee).forEach((converterKey) => {
                const converter = device.toZigbee[converterKey];

                if(!converter) {
                    throw new Error(`toZigbee[${converterKey}] not defined on device ${device.model}.`);
                }

                verifyKeys(
                    ['key'],
                    Object.keys(converter),
                    converterKey,
                );

                expect(Array.isArray(converter.key)).toBe(true);

                if (converter.convertSet && 4 != converter.convertSet.length) {
                    throw new Error(`${converterKey}: convert() invalid arguments length`)
                }
            });

            // Check for duplicate zigbee model ids
            if (device.hasOwnProperty('zigbeeModel')) {
                device.zigbeeModel.forEach((m) => {
                    if (foundZigbeeModels.includes(m.toLowerCase())) {
                        throw new Error(`Duplicate zigbee model ${m}`)
                    }
                });
            }

            // Check for duplicate model ids
            if (foundModels.includes(device.model)) {
                throw new Error(`Duplicate model ${device.model}`)
            }

            // Verify meta
            if (device.configure && (!device.meta || !device.meta.configureKey)) {
                throw new Error(`${device.model} requires configureKey because it has configure`)
            }

            if (device.whiteLabel) {
                for (const definition of device.whiteLabel) {
                    containsOnly(['vendor', 'model', 'description'], Object.keys(definition));
                }
            }

            if (device.meta) {
                containsOnly(['configureKey', 'multiEndpoint', 'applyRedFix', 'disableDefaultResponse', 'enhancedHue', 'timeout', 'supportsHueAndSaturation', 'battery'], Object.keys(device.meta));
            }

            if (device.zigbeeModel) {
                foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
            }

            foundModels.push(device.model);
        });
    });

    it('Verify addDeviceDefinition', () => {
        const mockZigbeeModel = 'my-mock-device';
        const mockDevice = {
            zigbeeModel: [mockZigbeeModel],
            model: 'mock-model'
        };
        const undefinedDevice = index.findByZigbeeModel(mockDevice.model);
        expect(undefinedDevice).toBeNull();
        const beforeAdditionDeviceCount = index.devices.length;
        index.addDeviceDefinition(mockDevice);
        expect(beforeAdditionDeviceCount + 1).toBe(index.devices.length);
        const device = index.findByZigbeeModel(mockZigbeeModel);
        expect(device.model).toBe(mockDevice.model);
    });
});
