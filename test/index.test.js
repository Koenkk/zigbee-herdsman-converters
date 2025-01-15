import {readdirSync, readFileSync} from 'fs';
import path from 'path';

import equals from 'fast-deep-equal/es6';

import {
    addDefinition,
    definitions,
    findByDevice,
    findByModel,
    getConfigureKey,
    postProcessConvertedFromZigbeeMessage,
    removeExternalDefinitions,
} from '../src/index';
import {access as _access, enum as _enum, list as _list, composite, numeric, presets} from '../src/lib/exposes';
import * as sunricher from '../src/lib/sunricher';
import {tz} from '../src/lib/tuya';
import {getFromLookup, toNumber} from '../src/lib/utils';
import {COLORTEMP_RANGE_MISSING_ALLOWED} from './colortemp_range_missing_allowed';

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

function containsOnly(array1, array2) {
    for (const elem of array2) {
        if (!array1.includes(elem)) {
            throw new Error(`Contains '${elem}' while it should only contains: '${array1}'`);
        }
    }

    return true;
}

describe('index.js', () => {
    it('Test utils.toNumber', () => {
        expect(toNumber('1')).toBe(1);
        expect(toNumber(5)).toBe(5);
        expect(() => toNumber('notanumber')).toThrowError('Value is not a number, got string (notanumber)');
        expect(toNumber('0')).toBe(0);
        expect(toNumber(0)).toBe(0);
        expect(() => toNumber('')).toThrowError('Value is not a number, got string ()');
    });

    it('Find by device where modelID is undefined', async () => {
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

        const definition = await findByDevice(device);
        expect(definition.model).toBe('XBee');
    });

    it("Find by device shouldn't match when modelID is undefined and there is no fingerprint match", async () => {
        const endpoints = [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}];
        const device = {
            type: undefined,
            manufacturerID: undefined,
            modelID: undefined,
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = await findByDevice(device);
        expect(definition).toBeUndefined();
    });

    it('Find by device should generate for unknown', async () => {
        const endpoints = [
            {
                ID: 1,
                profileID: undefined,
                deviceID: undefined,
                getInputClusters() {
                    return [];
                },
                getOutputClusters() {
                    return [{name: 'genIdentify'}];
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

        const definition = await findByDevice(device, true);
        expect(definition.model).toBe('test_generate');
        expect(definition.vendor).toBe('');
        expect(definition.description).toBe('Automatically generated definition');
        expect(definition.extend).toBeUndefined();
        expect(definition.fromZigbee).toHaveLength(0);
        expect(definition.toZigbee).toHaveLength(11);
        expect(definition.exposes).toHaveLength(0);
        expect(definition.options).toHaveLength(0);
    });

    it('Find by device when device has modelID should match', async () => {
        const endpoints = [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}];
        const device = {
            type: undefined,
            manufacturerID: undefined,
            modelID: 'lumi.sensor_motion',
            endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = await findByDevice(device);
        expect(definition.model).toBe('RTCGQ01LM');
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
        expect((await findByDevice(HG06338)).model).toBe('HG06338');
        expect((await findByDevice(TS011F_plug_3)).model).toBe('TS011F_plug_3');
        expect((await findByDevice(TS011F_plug_1)).model).toBe('TS011F_plug_1');
    });

    it('finds router builds with priority from manufacturer', async () => {
        const customSLZB06M = {
            type: 'Router',
            manufacturerName: 'SMLIGHT',
            modelID: 'SLZB-06M',
            applicationVersion: 200,
        };
        const fromManufSLZB06M = {
            type: 'Router',
            manufacturerName: 'SMLIGHT',
            modelID: 'SLZB-06M',
        };
        const customSLZB07 = {
            type: 'Router',
            manufacturerName: 'SMLIGHT',
            modelID: 'SLZB-07',
            applicationVersion: 200,
        };
        const fromManufSLZB07 = {
            type: 'Router',
            manufacturerName: 'SMLIGHT',
            modelID: 'SLZB-07',
        };

        expect((await findByDevice(customSLZB06M)).model).toBe('Silabs series 2 router');
        expect((await findByDevice(fromManufSLZB06M)).model).toBe('SLZB-06M');
        expect((await findByDevice(customSLZB07)).model).toBe('Silabs series 2 router');
        expect((await findByDevice(fromManufSLZB07)).model).toBe('SLZB-07');
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

        expect((await findByDevice(sunricher)).model).toBe('ZG192910-4');
        expect((await findByDevice(muller)).model).toBe('404031');
    });

    it('Find by device when fingerprint has zigbeeModel of other definition', async () => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
        const endpoints = [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]}];
        const device = {
            type: 'EndDevice',
            manufacturerID: 0,
            manufacturerName: 'eWeLink',
            modelID: 'TH01',
            powerSource: 'Battery',
            endpoints: endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = await findByDevice(device);
        expect(definition.model).toBe('SNZB-04');
    });

    it("Find by device when fingerprint has zigbeeModel of other definition shouldn't match when fingerprint doesn\t match", async () => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
        const endpoints = [{ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]}];
        const device = {
            type: 'EndDevice',
            manufacturerID: 0,
            manufacturerName: 'eWeLink',
            modelID: 'TH01',
            powerSource: 'Battery',
            endpoints: endpoints,
            getEndpoint: (ID) => endpoints.find((e) => e.ID === ID),
        };

        const definition = await findByDevice(device);
        expect(definition.model).toBe('SNZB-02');
    });

    it('Verify definitions', () => {
        let foundZigbeeModels = [];
        let foundModels = [];
        let foundFingerprints = [];

        definitions.forEach((device) => {
            // Check for duplicate zigbee model ids
            if (device.zigbeeModel !== undefined) {
                device.zigbeeModel.forEach((m) => {
                    if (foundZigbeeModels.includes(m.toLowerCase())) {
                        throw new Error(`Duplicate zigbee model ${m}`);
                    }
                });
            }

            // Check for duplicate model ids
            if (foundModels.includes(device.model.toLowerCase())) {
                throw new Error(`Duplicate model ${device.model}`);
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
                    if (whiteLabel.fingerprint && foundModels.includes(whiteLabel.model.toLowerCase())) {
                        throw new Error(`Duplicate whitelabel zigbee model ${whiteLabel.model}`);
                    }
                }
            }

            // Add to found models after duplicate checks, within the same device, same models are allowed
            // We do not allow whitelabels with a fingerprint to carry a duplicate model
            foundModels.push(device.model.toLowerCase());
            if (device.whiteLabel) {
                foundModels.push(...device.whiteLabel.filter((w) => w.fingerprint).map((w) => w.model.toLowerCase()));
            }

            if (device.zigbeeModel) {
                foundZigbeeModels = foundZigbeeModels.concat(device.zigbeeModel.map((z) => z.toLowerCase()));
            }
        });
    });

    it('Verify addDefinition for external converters', () => {
        const mockZigbeeModel = 'my-mock-device';
        let mockDevice = {toZigbee: [], externalConverterName: 'mock-model.js'};
        const undefinedDevice = findByModel('mock-model');
        expect(undefinedDevice).toBeUndefined();
        const beforeAdditionDeviceCount = definitions.length;
        expect(() => addDefinition(mockDevice)).toThrow('Converter field model is undefined');
        mockDevice.model = 'mock-model';
        expect(() => addDefinition(mockDevice)).toThrow('Converter field vendor is undefined');
        mockDevice = {
            model: 'mock-model',
            vendor: 'dummy',
            zigbeeModel: [mockZigbeeModel],
            description: 'dummy',
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
        };
        addDefinition(mockDevice);
        expect(beforeAdditionDeviceCount + 1).toBe(definitions.length);
        const device = findByModel('mock-model');
        expect(device.model).toBe(mockDevice.model);
    });

    it('Verify addDefinition overwrite existing', async () => {
        const device = {type: 'Router', modelID: 'lumi.light.aqcn02'};
        expect((await findByDevice(device)).vendor).toBe('Aqara');

        const overwriteDefinition = {
            model: 'mock-model',
            vendor: 'other-vendor',
            zigbeeModel: ['lumi.light.aqcn02'],
            description: '',
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
        };
        addDefinition(overwriteDefinition);
        expect((await findByDevice(device)).vendor).toBe('other-vendor');
    });

    it('Handles external converter definition addition/removal', async () => {
        const converterDef = {
            mock: true,
            zigbeeModel: ['external_converter_device'],
            vendor: 'external',
            model: 'external_converter_device',
            description: 'external',
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            externalConverterName: 'foo.js',
        };

        const count = definitions.length;

        addDefinition(converterDef);

        expect(definitions.length).toStrictEqual(count + 1);
        expect(definitions[0].zigbeeModel[0]).toStrictEqual(converterDef.zigbeeModel[0]);
        expect(findByModel('external_converter_device')).toBeDefined();

        removeExternalDefinitions(converterDef.externalConverterName);

        expect(definitions.length).toStrictEqual(count);
        expect(findByModel('external_converter_device')).toBeUndefined();
    });

    it('Exposes light with endpoint', () => {
        const expected = {
            type: 'light',
            features: [
                {
                    type: 'binary',
                    name: 'state',
                    label: 'State',
                    description: 'On/off state of this light',
                    property: 'state_rgb',
                    access: 7,
                    value_on: 'ON',
                    value_off: 'OFF',
                    value_toggle: 'TOGGLE',
                    endpoint: 'rgb',
                },
                {
                    type: 'numeric',
                    name: 'brightness',
                    label: 'Brightness',
                    description: 'Brightness of this light',
                    property: 'brightness_rgb',
                    access: 7,
                    value_min: 0,
                    value_max: 254,
                    endpoint: 'rgb',
                },
                {
                    type: 'composite',
                    property: 'color_rgb',
                    name: 'color_xy',
                    label: 'Color (X/Y)',
                    description: 'Color of this light in the CIE 1931 color space (x/y)',
                    access: 7,
                    features: [
                        {
                            type: 'numeric',
                            name: 'x',
                            label: 'X',
                            property: 'x',
                            access: 7,
                        },
                        {
                            type: 'numeric',
                            name: 'y',
                            label: 'Y',
                            property: 'y',
                            access: 7,
                        },
                    ],
                    endpoint: 'rgb',
                },
            ],
            endpoint: 'rgb',
        };
        const actual = presets.light_brightness_colorxy().withEndpoint('rgb');
        expect(expected).toStrictEqual(deepClone(actual));
    });

    it('Exposes access matches toZigbee', () => {
        definitions.forEach((device) => {
            // tuya.tz.datapoints is generic, keys cannot be used to determine expose access
            if (device.toZigbee.includes(tz.datapoints)) return;

            // sunricher.tz.setModel is used to switch modelId for devices with conflicting modelId, skip expose access check
            if (device.toZigbee.includes(sunricher.tz.setModel)) return;

            const toCheck = [];
            const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
            for (const expose of expss) {
                if (expose.access !== undefined) {
                    toCheck.push(expose);
                } else if (expose.features) {
                    toCheck.push(...expose.features.filter((e) => e.access !== undefined));
                }
            }

            for (const expose of toCheck) {
                let property = expose.property;
                if (expose.endpoint && expose.property.length > expose.endpoint.length) {
                    property = expose.property.slice(0, (expose.endpoint.length + 1) * -1);
                }

                const toZigbee = device.toZigbee.find(
                    (item) => item.key.includes(property) && (!item.endpoints || (expose.endpoint && item.endpoints.includes(expose.endpoint))),
                );

                if ((expose.access & _access.SET) != (toZigbee && toZigbee.convertSet ? _access.SET : 0)) {
                    throw new Error(`${device.model} - ${property}, supports set: ${!!(toZigbee && toZigbee.convertSet)}`);
                }

                if ((expose.access & _access.GET) != (toZigbee && toZigbee.convertGet ? _access.GET : 0)) {
                    throw new Error(`${device.model} - ${property} (${expose.name}), supports get: ${!!(toZigbee && toZigbee.convertGet)}`);
                }
            }
        });
    });

    it('Exposes properties are unique', () => {
        definitions.forEach((device) => {
            const exposes = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
            const found = [];
            for (const expose of exposes) {
                if (expose.property && found.includes(expose.property)) {
                    throw new Error(`Duplicate expose property found: '${expose.property}' for '${device.model}'`);
                }
                found.push(expose.property);
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

        const HG06492B_match = await findByDevice(HG06492B);
        expect(HG06492B_match.model).toBe('HG06492B/HG08130B');
        expect(HG06492B_match.description).toBe('Livarno Home E14 candle CCT');
        expect(HG06492B_match.vendor).toBe('Lidl');

        const TS0502A_match = await findByDevice(TS0502A);
        expect(TS0502A_match.model).toBe('TS0502A');
        expect(TS0502A_match.description).toBe('Light controller');
        expect(TS0502A_match.vendor).toBe('Tuya');
    });

    it('Check if all exposes have a color temp range', () => {
        for (const definition of definitions) {
            const exposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes();
            for (const expose of exposes.filter((e) => e.type === 'light')) {
                const colorTemp = expose.features.find((f) => f.name === 'color_temp');
                if (colorTemp && !colorTemp._colorTempRangeProvided && !COLORTEMP_RANGE_MISSING_ALLOWED.includes(definition.model)) {
                    throw new Error(
                        `'${definition.model}' is missing color temp range, see https://github.com/Koenkk/zigbee2mqtt.io/blob/develop/docs/how_tos/how_to_support_new_devices.md#31-retrieving-color-temperature-range-only-required-for-lights-which-support-color-temperature`,
                    );
                }
            }
        }
    });

    it('Calculate configure key', () => {
        const definition = {
            configure: () => {
                console.log('hello world');
                console.log('bye world');
            },
        };
        expect(getConfigureKey(definition)).toBe(-1738355762);
    });

    it('Calculate configure key whitespace shouldnt matter', () => {
        const definition1 = {
            configure: () => {
                console.log('hello world');
                console.log('bye world');
            },
        };

        const definition2 = {
            configure: () => {
                console.log('hello world');
                console.log('bye world');
            },
        };
        expect(getConfigureKey(definition1)).toBe(getConfigureKey(definition2));
    });

    it('Calculate configure diff', () => {
        const definition1 = {
            configure: () => {
                console.log('hello world');
                console.log('bye world');
            },
        };

        const definition2 = {
            configure: () => {
                console.log('hello world');
                console.log('bye mars');
            },
        };
        expect(getConfigureKey(definition1)).not.toBe(getConfigureKey(definition2));
    });

    it('Number exposes with set access should have a range', () => {
        definitions.forEach((device) => {
            if (device.exposes) {
                const expss = typeof device.exposes == 'function' ? device.exposes() : device.exposes;
                for (const expose of expss) {
                    if (expose.type == 'numeric' && expose.access & _access.SET) {
                        if (expose.value_min == null || expose.value_max == null) {
                            throw new Error(`Value min or max unknown for ${expose.property}`);
                        }
                    }
                }
            }
        });
    });

    it('Verify options filter', () => {
        const ZNCLDJ12LM = definitions.find((d) => d.model == 'ZNCLDJ12LM');
        expect(ZNCLDJ12LM.options.length).toBe(1);
        const ZNCZ04LM = definitions.find((d) => d.model == 'ZNCZ04LM');
        expect(ZNCZ04LM.options.length).toBe(10);
    });

    it('Verify imports', () => {
        const files = readdirSync('src/devices');
        for (const file of files) {
            const content = readFileSync(`src/devices/${file}`, {encoding: 'utf-8'});
            expect(content).not.toContain(`require('zigbee-herdsman-converters`);
        }
    });

    it('Calibration/precision', () => {
        const TS0601_soil = definitions.find((d) => d.model == 'TS0601_soil');
        expect(TS0601_soil.options.map((t) => t.name)).toStrictEqual([
            'temperature_calibration',
            'temperature_precision',
            'soil_moisture_calibration',
            'soil_moisture_precision',
        ]);
        let payload = {temperature: 1.193};
        let options = {temperature_calibration: 2.5, temperature_precision: 1};
        postProcessConvertedFromZigbeeMessage(TS0601_soil, payload, options);
        expect(payload).toStrictEqual({temperature: 3.7});

        // For multi endpoint property
        const AUA1ZBDSS = findByModel('AU-A1ZBDSS');
        expect(AUA1ZBDSS.options.map((t) => t.name)).toStrictEqual(['power_calibration', 'power_precision', 'transition', 'state_action']);
        payload = {power_left: 5.31};
        options = {power_calibration: 100, power_precision: 0}; // calibration for power is percentual
        postProcessConvertedFromZigbeeMessage(AUA1ZBDSS, payload, options);
        expect(payload).toStrictEqual({power_left: 11});

        const TS011F_plug_1 = definitions.find((d) => d.model == 'TS011F_plug_1');
        expect(TS011F_plug_1.options.map((t) => t.name)).toStrictEqual([
            'power_calibration',
            'power_precision',
            'current_calibration',
            'current_precision',
            'voltage_calibration',
            'voltage_precision',
            'energy_calibration',
            'energy_precision',
            'state_action',
        ]);
        payload = {current: 0.0585};
        options = {current_calibration: -50};
        postProcessConvertedFromZigbeeMessage(TS011F_plug_1, payload, options);
        expect(payload).toStrictEqual({current: 0.03});
    });

    it('Should allow definition with both modern extend and exposes as function', () => {
        const MOSZB140 = findByModel('MOSZB-140');
        const exposes = MOSZB140.exposes();
        expect(exposes.map((e) => e.name)).toStrictEqual(['occupancy', 'tamper', 'battery_low', 'temperature', 'illuminance', 'battery', 'voltage']);
    });

    it('Check getFromLookup', () => {
        expect(getFromLookup('OFF', {off: 0, on: 1, previous: 2})).toStrictEqual(0);
        expect(getFromLookup('On', {off: 0, on: 1, previous: 2})).toStrictEqual(1);
        expect(getFromLookup('previous', {OFF: 0, ON: 1, PREVIOUS: 2})).toStrictEqual(2);
        expect(getFromLookup(1, {0: 'OFF', 1: 'on'})).toStrictEqual('on');
    });

    it('List expose number', () => {
        // Example payload:
        // {"temperatures": [19,21,30]}
        const itemType = numeric('temperature', _access.STATE_SET);
        const list = _list('temperatures', _access.STATE_SET, itemType);
        expect(JSON.parse(JSON.stringify(list))).toStrictEqual({
            access: 3,
            item_type: {access: 3, name: 'temperature', label: 'Temperature', type: 'numeric'},
            name: 'temperatures',
            label: 'Temperatures',
            property: 'temperatures',
            type: 'list',
        });
    });

    it('List expose composite', () => {
        // Example payload:
        // {"schedule": [{"day":"monday","hour":13,"minute":37}, {"day":"tuesday","hour":14,"minute":59}]}

        const itemType = composite('dayTime', _access.STATE_SET)
            .withFeature(_enum('day', _access.STATE_SET, ['monday', 'tuesday', 'wednesday']))
            .withFeature(numeric('hour', _access.STATE_SET))
            .withFeature(numeric('minute', _access.STATE_SET));

        const list = _list('schedule', _access.STATE_SET, itemType);
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
                        name: 'day',
                        label: 'Day',
                        property: 'day',
                        type: 'enum',
                        values: ['monday', 'tuesday', 'wednesday'],
                    },
                    {
                        access: 3,
                        name: 'hour',
                        label: 'Hour',
                        property: 'hour',
                        type: 'numeric',
                    },
                    {
                        access: 3,
                        name: 'minute',
                        label: 'Minute',
                        property: 'minute',
                        type: 'numeric',
                    },
                ],
            },
        });
    });
});
