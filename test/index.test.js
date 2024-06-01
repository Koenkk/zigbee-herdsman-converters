const index = require('../src/index');
const exposes = require('../src/lib/exposes');
const utils = require('../src/lib/utils');
const tuya = require('../src/lib/tuya');
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const equals = require('fast-deep-equal/es6');
const fs = require('fs');
const path = require('path');

function containsOnly(array1, array2){
    for (const elem of array2) {
        if (!array1.includes(elem)) {
            throw new Error(`Contains '${elem}' while it should only contains: '${array1}'`)
        }
    }

    return true;
}

describe('index.js', () => {
    it('Test utils.toNumber', () => {
        expect(utils.toNumber('1')).toBe(1);
        expect(utils.toNumber(5)).toBe(5);
        expect(() => utils.toNumber('notanumber')).toThrowError('Value is not a number, got string (notanumber)');
        expect(utils.toNumber('0')).toBe(0);
        expect(utils.toNumber(0)).toBe(0);
        expect(() => utils.toNumber('')).toThrowError('Value is not a number, got string ()');
    });

    it('Find by device where modelID is null', async () => {
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

        const definition = await index.findByDevice(device);
        expect(definition.model).toBe('XBee');
    });

    it('Find by device shouldn\'t match when modelID is null and there is no fingerprint match', async () => {
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

        const definition = await index.findByDevice(device);
        expect(definition).toBeNull();
    });

    it('Find by device should generate for unknown', async () => {
        const endpoints = [
            {
                ID: 1, profileID: undefined, deviceID: undefined,
                getInputClusters() {
                    return [];
                },
                getOutputClusters() {
                    return [{name: 'genIdentify'}]
                },
            },
        ];
        const device = {
            type: 'EndDevice',
            manufacturerID: undefined,
            modelID: 'test_generate',
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = await index.findByDevice(device, true);
        expect(definition.model).toBe('test_generate');
        expect(definition.vendor).toBe('');
        expect(definition.description).toBe('Automatically generated definition');
        expect(definition.extend).toBeUndefined();
        expect(definition.fromZigbee).toHaveLength(0);
        expect(definition.toZigbee).toHaveLength(11);
        expect(definition.exposes).toHaveLength(1);
        expect(definition.options).toHaveLength(0);
    });

    it('Find by device when device has modelID should match', async () => {
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

        const definition = await index.findByDevice(device);
        expect(definition.model).toBe("RTCGQ01LM");
    });

    it('Find by fingerprint with priority', async () => {
        const HG06338 = {
            type: 'Router',
            manufacturerName: '_TZ3000_vzopcetz',
            modelID: 'TS011F',
            applicationVersion: 69,
        };
        const TS011F_plug_3 = {
            type: 'Router',
            manufacturerName: '_TZ3000_vzopcetz_random',
            modelID: 'TS011F',
            applicationVersion: 69,
        };
        const TS011F_plug_1 = {
            type: 'Router',
            manufacturerName: '_TZ3000_vzopcetz_random',
            modelID: 'TS011F',
            applicationVersion: 1,
        };
        expect((await index.findByDevice(HG06338)).model).toBe('HG06338');
        expect((await index.findByDevice(TS011F_plug_3)).model).toBe('TS011F_plug_3');
        expect((await index.findByDevice(TS011F_plug_1)).model).toBe('TS011F_plug_1');
    });

    it('Find by device should prefer fingerprint match over zigbeeModel', async () => {
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

        expect((await index.findByDevice(sunricher)).model).toBe('ZG192910-4');
        expect((await index.findByDevice(muller)).model).toBe('404031');
    });

    it('Find by device when fingerprint has zigbeeModel of other definition', async () => {
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

        const definition = await index.findByDevice(device);
        expect(definition.model).toBe("SNZB-04");
    });

    it('Find by device when fingerprint has zigbeeModel of other definition shouldn\'t match when fingerprint doesn\t match', async () => {
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

        const definition = await index.findByDevice(device);
        expect(definition.model).toBe("SNZB-02");
    });

    it('Verify definitions', () => {
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

        index.definitions.forEach((device) => {
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
            if (foundModels.includes(device.model.toLowerCase())) {
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

            if (device.whiteLabel) {
                for (const whiteLabel of device.whiteLabel) {
                    verifyKeys(['vendor', 'model'], Object.keys(whiteLabel), `whitelabel-of-${device.model}`);
                    containsOnly(['vendor', 'model', 'description', 'fingerprint'], Object.keys(whiteLabel));
                    if (whiteLabel.fingerprint && foundModels.includes(whiteLabel.model.toLowerCase())) {
                        throw new Error(`Duplicate whitelabel zigbee model ${whiteLabel.model}`)
                    }
                }
            }

            // Add to found models after duplicate checks, within the same device, same models are allowed
            // We do not allow whitelabels with a fingerprint to carry a duplicate model
            foundModels.push(device.model.toLowerCase());
            if (device.whiteLabel) {
                foundModels.push(...device.whiteLabel.filter((w) => w.fingerprint).map((w) => w.model.toLowerCase()));
            }


            if (device.meta) {
                containsOnly(['disableActionGroup', 'multiEndpoint', 'multiEndpointSkip', 'multiEndpointEnforce', 'applyRedFix', 'disableDefaultResponse', 'supportsEnhancedHue', 'timeout', 'supportsHueAndSaturation', 'battery', 'coverInverted', 'turnsOffAtBrightness1', 'coverStateFromTilt', 'pinCodeCount', 'tuyaThermostatSystemMode', 'tuyaThermostatPreset', 'tuyaDatapoints', 'tuyaThermostatPresetToSystemMode', 'thermostat', 'separateWhite', 'publishDuplicateTransaction', 'tuyaSendCommand', 'coverPositionTiltDisableReport'], Object.keys(device.meta));
            }

            if (device.zigbeeModel) {
                foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
            }
        });
    });

    it('Verify addDefinition', () => {
        const mockZigbeeModel = 'my-mock-device';
        let mockDevice = {toZigbee: []};
        const undefinedDevice = index.findByModel('mock-model');
        expect(undefinedDevice).toBeUndefined();
        const beforeAdditionDeviceCount = index.definitions.length;
        expect(()=> index.addDefinition(mockDevice)).toThrow("Converter field model is undefined");
        mockDevice.model = 'mock-model';
        expect(()=> index.addDefinition(mockDevice)).toThrow("Converter field vendor is undefined");
        mockDevice = {
            model: 'mock-model',
            vendor: 'dummy',
            zigbeeModel: [mockZigbeeModel],
            description: 'dummy',
            fromZigbee: [],
            toZigbee: [],
            exposes: []
        };
        index.addDefinition(mockDevice);
        expect(beforeAdditionDeviceCount + 1).toBe(index.definitions.length);
        const device = index.findByModel('mock-model');
        expect(device.model).toBe(mockDevice.model);
    });

    it('Verify addDefinition overwrite existing', async () => {
        const device = {type: 'Router', modelID: 'lumi.light.aqcn02'};
        expect((await index.findByDevice(device)).vendor).toBe('Aqara');

        const overwriteDefinition = {
            model: 'mock-model',
            vendor: 'other-vendor',
            zigbeeModel: ['lumi.light.aqcn02'],
            description: '',
            fromZigbee: [],
            toZigbee: [],
            exposes: []
        };
        index.addDefinition(overwriteDefinition);
        expect((await index.findByDevice(device)).vendor).toBe('other-vendor');
    });

    it('Exposes light with endpoint', () => {
        const expected = {
            "type":"light",
            "features":[
              {
                "type":"binary",
                "name":"state",
                "label": "State",
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
                "label": "Brightness",
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
                "label": "Color (X/Y)",
                "description": "Color of this light in the CIE 1931 color space (x/y)",
                "access":7,
                "features":[
                  {
                    "type":"numeric",
                    "name":"x",
                    "label": "X",
                    "property":"x",
                    "access":7
                  },
                  {
                    "type":"numeric",
                    "name":"y",
                    "label": "Y",
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
        index.definitions.forEach((device) => {
            if (device.exposes) {
                // tuya.tz.datapoints is generic, keys cannot be used to determine expose access
                if (device.toZigbee.includes(tuya.tz.datapoints)) return;

                const toCheck = [];
                const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
                for (const expose of expss) {
                    if (expose.access !== undefined) {
                        toCheck.push(expose)
                    } else if (expose.features) {
                        toCheck.push(...expose.features.filter(e => e.access !== undefined));
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
                        throw new Error(`${device.model} - ${property} (${expose.name}), supports get: ${!!(toZigbee && toZigbee.convertGet)}`);
                    }
                }
            }
        });
    });

    it('Find by fingerprint - whitelabel', async () => {
        const HG06492B = {
            type: 'Router',
            manufacturerName: '_TZ3000_oborybow',
            modelID: 'TS0502A',
            endpoints: [],
        };
        const TS0502A = {
            type: 'Router',
            manufacturerName: 'JUST_A_RANDOM_MANUFACTURER_NAME  ',
            modelID: 'TS0502A',
            endpoints: [],
        };

        const HG06492B_match = await index.findByDevice(HG06492B)
        expect(HG06492B_match.model).toBe('HG06492B');
        expect(HG06492B_match.description).toBe('Livarno Lux E14 candle CCT');
        expect(HG06492B_match.vendor).toBe('Lidl');

        const TS0502A_match = await index.findByDevice(TS0502A)
        expect(TS0502A_match.model).toBe('TS0502A');
        expect(TS0502A_match.description).toBe('Light controller');
        expect(TS0502A_match.vendor).toBe('Tuya');
    });

    it('Check if all exposes have a color temp range', () => {
        const allowed = fs.readFileSync(path.join(__dirname, 'colortemp_range_missing_allowed.txt'), 'utf8').split('\n');
        for (const definition of index.definitions) {
            const exposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes();
            for (const expose of exposes.filter(e => e.type === 'light')) {
                const colorTemp = expose.features.find(f => f.name === 'color_temp');
                if (colorTemp && !colorTemp._colorTempRangeProvided && !allowed.includes(definition.model)) {
                    throw new Error(`'${definition.model}' is missing color temp range, see https://github.com/Koenkk/zigbee2mqtt.io/blob/develop/docs/how_tos/how_to_support_new_devices.md#31-retrieving-color-temperature-range-only-required-for-lights-which-support-color-temperature`);
                }
            }
        }
    });

    it('Calculate configure key', () => {
        const definition = {configure: () => {
            console.log('hello world');
            console.log('bye world');
        }}
        expect(index.getConfigureKey(definition)).toBe(-1738355762);
    });

    it('Calculate configure key whitespace shouldnt matter', () => {
        const definition1 = {configure: () => {
            console.log('hello world');
            console.log('bye world');
        }}

        const definition2 = {configure: () => {
            console.log('hello world');console.log('bye world');
        }}
        expect(index.getConfigureKey(definition1)).toBe(index.getConfigureKey(definition2));
    });

    it('Calculate configure diff', () => {
        const definition1 = {configure: () => {
            console.log('hello world');
            console.log('bye world');
        }}

        const definition2 = {configure: () => {
            console.log('hello world');
            console.log('bye mars');
        }}
        expect(index.getConfigureKey(definition1)).not.toBe(index.getConfigureKey(definition2));
    });

    it('Number exposes with set access should have a range', () => {
        index.definitions.forEach((device) => {
            if (device.exposes) {
                const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
                for (const expose of expss) {
                    if (expose.type == 'numeric' && expose.access & exposes.access.SET) {
                        if (expose.value_min == null || expose.value_max == null) {
                            throw new Error(`Value min or max unknown for ${expose.property}`);
                        }
                    }
                }
            }
        });
    });

    it('Function exposes should have linkquality sensor', () => {
        index.definitions.forEach((definition) => {
            if (typeof definition.exposes == 'function') {
                expect(definition.exposes().find((e) => e.property === 'linkquality')).not.toBeUndefined();
            }
        });
    });

    it('Verify options filter', () => {
        const ZNCLDJ12LM = index.definitions.find((d) => d.model == 'ZNCLDJ12LM');
        expect(ZNCLDJ12LM.options.length).toBe(1);
        const ZNCZ04LM = index.definitions.find((d) => d.model == 'ZNCZ04LM');
        expect(ZNCZ04LM.options.length).toBe(10);
    });

    it('Verify imports', () => {
        const files = fs.readdirSync('src/devices');
        for (const file of files) {
            const content = fs.readFileSync(`src/devices/${file}`, {encoding: 'utf-8'});
            expect(content).not.toContain(`require('zigbee-herdsman-converters`);
        }
    });

    it('Calibration/precision', () => {
        const TS0601_soil = index.definitions.find((d) => d.model == 'TS0601_soil');
        expect(TS0601_soil.options.map((t) => t.name)).toStrictEqual(['temperature_calibration','temperature_precision', 'soil_moisture_calibration', 'soil_moisture_precision']);
        let payload = {temperature: 1.193};
        let options = {temperature_calibration: 2.5, temperature_precision: 1};
        index.postProcessConvertedFromZigbeeMessage(TS0601_soil, payload, options);
        expect(payload).toStrictEqual({temperature: 3.7});

        // For multi endpoint property
        const AUA1ZBDSS = index.findByModel('AU-A1ZBDSS');
        expect(AUA1ZBDSS.options.map((t) => t.name)).toStrictEqual(['power_calibration', 'power_precision', 'transition', 'state_action']);
        payload = {power_left: 5.31};
        options = {power_calibration: 100, power_precision: 0}; // calibration for power is percentual
        index.postProcessConvertedFromZigbeeMessage(AUA1ZBDSS, payload, options);
        expect(payload).toStrictEqual({power_left: 11});

        const TS011F_plug_1 = index.definitions.find((d) => d.model == 'TS011F_plug_1');
        expect(TS011F_plug_1.options.map((t) => t.name)).toStrictEqual([
            'power_calibration','power_precision', 'current_calibration', 'current_precision', 'voltage_calibration',
            'voltage_precision', 'energy_calibration', 'energy_precision', 'state_action'
        ]);
        payload = {current: 0.0585};
        options = {current_calibration: -50};
        index.postProcessConvertedFromZigbeeMessage(TS011F_plug_1, payload, options);
        expect(payload).toStrictEqual({current: 0.03});
    });

    it('Should allow definition with both modern extend and exposes as function', () => {
        const MOSZB140 = index.findByModel('MOSZB-140');
        const exposes = MOSZB140.exposes();
        expect(exposes.map((e) => e.name)).toStrictEqual(['occupancy', 'temperature', 'tamper', 'battery_low', 'battery', 'linkquality', 'illuminance_lux', 'illuminance']);
    });

    it('Check getFromLookup', () => {
        expect(utils.getFromLookup('OFF', {'off': 0, 'on': 1, 'previous': 2})).toStrictEqual(0);
        expect(utils.getFromLookup('On', {'off': 0, 'on': 1, 'previous': 2})).toStrictEqual(1);
        expect(utils.getFromLookup('previous', {'OFF': 0, 'ON': 1, 'PREVIOUS': 2})).toStrictEqual(2);
        expect(utils.getFromLookup(1, {0: 'OFF', 1: 'on'})).toStrictEqual('on');
    });

    it('List expose number', () => {
        // Example payload:
        // {"temperatures": [19,21,30]}
        const itemType = exposes.numeric('temperature', exposes.access.STATE_SET);
        const list = exposes.list('temperatures', exposes.access.STATE_SET, itemType);
        expect(JSON.parse(JSON.stringify(list))).toStrictEqual({
            "access": 3, 
            "item_type": {"access": 3, "name": "temperature", "label": "Temperature", "type": "numeric"}, 
            "name": "temperatures", 
            "label": "Temperatures",
            "property": "temperatures", 
            "type": "list"
        });
    });

    it('List expose composite', () => {
        // Example payload:
        // {"schedule": [{"day":"monday","hour":13,"minute":37}, {"day":"tuesday","hour":14,"minute":59}]}

        const itemType = exposes.composite('dayTime', exposes.access.STATE_SET)
            .withFeature(exposes.enum('day', exposes.access.STATE_SET, ['monday', 'tuesday', 'wednesday']))
            .withFeature(exposes.numeric('hour', exposes.access.STATE_SET))
            .withFeature(exposes.numeric('minute', exposes.access.STATE_SET))

        const list = exposes.list('schedule', exposes.access.STATE_SET, itemType);
        expect(JSON.parse(JSON.stringify(list))).toStrictEqual({
            type: 'list',
            name: 'schedule',
            label: 'Schedule',
            property: 'schedule',
            access: 3,
            item_type: {
                type: 'composite',
                name: 'dayTime',
                label: 'DayTime',
                features: [
                    {
                        access: 3, 
                        name: "day", 
                        label: "Day",
                        property: "day", 
                        type: "enum",
                        values: ['monday', 'tuesday', 'wednesday'],
                    },
                    {
                        access: 3, 
                        name: "hour", 
                        label: "Hour",
                        property: "hour", 
                        type: "numeric",
                    },
                    {
                        access: 3, 
                        name: "minute", 
                        label: "Minute",
                        property: "minute", 
                        type: "numeric",
                    },
                ]
            }
        });
    });
});
