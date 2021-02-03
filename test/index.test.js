const index = require('../index');
const devices = require('../devices');
const exposes = require('../lib/exposes');
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const equals = require('fast-deep-equal/es6');

function containsOnly(array1, array2){
    for (const elem of array2) {
        if (!array1.includes(elem)) {
            throw new Error(`Contains '${elem}' while it should only contains: '${array1}'`)
        }
    }

    return true;
}

describe('index.js', () => {
    it('Legacy: Find by zigbeeModel', () => {
        const device = index.findByZigbeeModel('WaterSensor-N');
        expect(device.model).toBe('HS1WL/HS3WL')
    });

    it('Legacy: Find by zigbeeModel with strange characters 1', () => {
        const device = index.findByZigbeeModel('lumi.remote.b1acn01\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Legacy: Find by zigbeeModel with strange characters 2', () => {
        const device = index.findByZigbeeModel('lumi.sensor_86sw1\u0000lu');
        expect(device.model).toBe('WXKG03LM_rev1')
    });

    it('Legacy: Find by zigbeeModel with strange characters 3', () => {
        const device = index.findByZigbeeModel('lumi.sensor_86sw1');
        expect(device.model).toBe('WXKG03LM_rev1')
    });

    it('Legacy: Find by zigbeeModel without strange characters', () => {
        const device = index.findByZigbeeModel('lumi.sensor_switch.aq2\u0000\u0000\u0000\u0000\u0000\u0000');
        expect(device.model).toBe('WXKG11LM')
    });

    it('Legacy: Find by zigbeeModel with model ID null', () => {
        const device = index.findByZigbeeModel(null);
        expect(device).toBe(null)
    });

    it('Find by device where modelID is null', () => {
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

    it('Find by device shouldn\'t match when modelID is null and there is no fingerprint match', () => {
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

    it('Find by device when device has modelID should match', () => {
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

    it('Find by device should prefer fingerprint match over zigbeeModel', () => {
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

    it('Find by device when fingerprint has zigbeeModel of other definition', () => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
        const endpoints = [
            {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0,3,1280,1], outputClusters: [3]},
        ];
        const device = {
            type: 'EndDevice',
            manufacturerID: 0,
            manufacturerName: 'eWeLink',
            modelID: 'TH01',
            powerSource: 'Battery',
            endpoints: endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = index.findByDevice(device);
        expect(definition.model).toBe("SNZB-04");
    });

    it('Find by device when fingerprint has zigbeeModel of other definition shouldn\'t match when fingerprint doesn\t match', () => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
        const endpoints = [
            {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0,3,1026,1029,1], outputClusters: [3]},
        ];
        const device = {
            type: 'EndDevice',
            manufacturerID: 0,
            manufacturerName: 'eWeLink',
            modelID: 'TH01',
            powerSource: 'Battery',
            endpoints: endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = index.findByDevice(device);
        expect(definition.model).toBe("SNZB-02");
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
        let foundFingerprints = [];

        devices.forEach((device) => {
            // Verify device attributes.
            verifyKeys(
                ['model', 'vendor', 'description', 'fromZigbee', 'toZigbee', 'exposes'],
                Object.keys(device),
                device.model,
            );

            if (!device.hasOwnProperty('zigbeeModel') && !device.hasOwnProperty('fingerprint')) {
                throw new Error(`'${device.model}' has no zigbeeModel or fingerprint`);
            }

            if (device.fromZigbee.includes(undefined)) {
                console.log(device.model);
            }

            expect(device.fromZigbee).not.toContain(undefined);
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

            // Check for duplicate foundFingerprints
            if (device.fingerprint) {
                for (const fingerprint of device.fingerprint) {
                    for (const foundFingerprint of foundFingerprints) {
                        if (equals(foundFingerprint, fingerprint)) {
                            throw new Error(`Duplicate fingerprint for ${device.model}: ${JSON.stringify(fingerprint)}`);
                        }
                    }

                    foundFingerprints.push(fingerprint);
                }
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
                containsOnly(['disableActionGroup', 'configureKey', 'multiEndpoint', 'applyRedFix', 'disableDefaultResponse', 'enhancedHue', 'timeout', 'supportsHueAndSaturation', 'battery', 'coverInverted', 'turnsOffAtBrightness1', 'pinCodeCount', 'tuyaThermostatSystemMode', 'tuyaThermostatPreset', 'tuyaThermostatPresetToSystemMode', 'thermostat'], Object.keys(device.meta));
            }

            if (device.zigbeeModel) {
                foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
            }

            foundModels.push(device.model);
        });
    });

    it('Verify addDeviceDefinition', () => {
        const mockZigbeeModel = 'my-mock-device';
        let mockDevice = {};
        const undefinedDevice = index.findByZigbeeModel(mockDevice.model);
        expect(undefinedDevice).toBeNull();
        const beforeAdditionDeviceCount = index.devices.length;
        expect(()=> index.addDeviceDefinition(mockDevice)).toThrow("Converter field model is undefined");
        mockDevice.model = 'mock-model';
        expect(()=> index.addDeviceDefinition(mockDevice)).toThrow("Converter field vendor is undefined");
        mockDevice = {
            model: 'mock-model',
            vendor: 'dummy',
            zigbeeModel: [mockZigbeeModel],
            description: 'dummy',
            fromZigbee: [],
            toZigbee: [],
            exposes: []
        };
        index.addDeviceDefinition(mockDevice);
        expect(beforeAdditionDeviceCount + 1).toBe(index.devices.length);
        const device = index.findByZigbeeModel(mockZigbeeModel);
        expect(device.model).toBe(mockDevice.model);
    });

    it('Exposes light with endpoint', () => {
        const expected = {
            "type":"light",
            "features":[
              {
                "type":"binary",
                "name":"state",
                "description": "On/off state of this light",
                "property":"state_rgb",
                "access":7,
                "value_on":"ON",
                "value_off":"OFF",
                "value_toggle":"TOGGLE",
                "endpoint":"rgb"
              },
              {
                "type":"numeric",
                "name":"brightness",
                "description": "Brightness of this light",
                "property":"brightness_rgb",
                "access":7,
                "value_min":0,
                "value_max":254,
                "endpoint":"rgb"
              },
              {
                "type":"composite",
                "property":"color_rgb",
                "name":"color_xy",
                "description": "Color of this light in the CIE 1931 color space (x/y)",
                "features":[
                  {
                    "type":"numeric",
                    "name":"x",
                    "property":"x",
                    "access":7
                  },
                  {
                    "type":"numeric",
                    "name":"y",
                    "property":"y",
                    "access":7
                  }
                ],
                "endpoint":"rgb"
              }
            ],
            "endpoint":"rgb"
        };
        const actual = exposes.presets.light_brightness_colorxy().withEndpoint('rgb');
        expect(expected).toStrictEqual(deepClone(actual));
    });

    it('Exposes access matches toZigbee', () => {
        devices.forEach((device) => {
            if (device.exposes) {
                const toCheck = [];
                for (const expose of device.exposes) {
                    if (expose.hasOwnProperty('access')) {
                        toCheck.push(expose)
                    } else if (expose.features && expose.type !== 'composite') {
                        toCheck.push(...expose.features.filter(e => e.hasOwnProperty('access')));
                    }
                }

                for (const expose of toCheck) {
                    let property = expose.property;
                    if (expose.endpoint && expose.property.length > expose.endpoint.length) {
                        property = expose.property.slice(0, (expose.endpoint.length + 1) * -1);
                    }

                    const toZigbee = device.toZigbee.find(item => item.key.includes(property));

                    if ((expose.access & exposes.access.SET) != (toZigbee && toZigbee.convertSet ? exposes.access.SET : 0)) {
                        throw new Error(`${device.model} - ${property}, supports set: ${!!(toZigbee && toZigbee.convertSet)}`);
                    }

                    if ((expose.access & exposes.access.GET) != (toZigbee && toZigbee.convertGet ? exposes.access.GET : 0)) {
                        throw new Error(`${device.model} - ${property}, supports get: ${!!(toZigbee && toZigbee.convertGet)}`);
                    }
                }
            }
        });
    });
});
