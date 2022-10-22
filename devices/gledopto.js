const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');
const ota = require('../lib/ota');
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const tz = require('../converters/toZigbee');
const e = exposes.presets;

const gledoptoExtend = {
    light_onoff_brightness: (options={}) => ({
        ...extend.light_onoff_brightness(options),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness(options).toZigbee,
            [tz.light_onoff_brightness],
            [tz.gledopto_light_onoff_brightness],
        ),
    }),
    light_onoff_brightness_colortemp: (options={}) => ({
        ...extend.light_onoff_brightness_colortemp(options),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness_colortemp(options).toZigbee,
            [tz.light_onoff_brightness, tz.light_colortemp],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_colortemp],
        ),
    }),
    light_onoff_brightness_color: (options={}) => ({
        ...extend.light_onoff_brightness_color({...options, supportsHS: true}),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness_color(options).toZigbee,
            [tz.light_onoff_brightness, tz.light_color],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color],
        ),
    }),
    light_onoff_brightness_colortemp_color: (options={}) => ({
        ...extend.light_onoff_brightness_colortemp_color({...options, supportsHS: true}),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness_colortemp_color(options).toZigbee,
            [tz.light_onoff_brightness, tz.light_color_colortemp],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color_colortemp],
        ),
    }),
    switch: (options={}) => ({
        ...extend.switch(options),
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genOnOff', ['onOff']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    }),
};

const configureReadModelID = async (device, coordinatorEndpoint, logger) => {
    // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3016#issuecomment-1027726604
    const endpoint = device.endpoints[0];
    const oldModel = device.modelID;
    const newModel = (await endpoint.read('genBasic', ['modelId'])).modelId;
    if (oldModel != newModel) {
        logger.info(`Detected Gledopto device mode change, from '${oldModel}' to '${newModel}'`);
    }
};

module.exports = [
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-H-001', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-H-001',
        vendor: 'Gledopto',
        description: 'Zigbee RF Hub',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['HOMA2023'],
        model: 'GD-CZ-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW',
        extend: gledoptoExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-SD-001'],
        model: 'GL-SD-001',
        vendor: 'Gledopto',
        description: 'Zigbee triac AC dimmer',
        extend: gledoptoExtend.light_onoff_brightness(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-006'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW',
        extend: gledoptoExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['GL-C-006S'],
        model: 'GL-C-006S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['GL-C-006P'],
        model: 'GL-C-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller WW/CW (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_colortemp().configure(device, coordinatorEndpoint, logger);
            await configureReadModelID(device, coordinatorEndpoint, logger);
        },
    },
    {
        zigbeeModel: ['GL-G-003P'],
        model: 'GL-G-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: '7W garden light pro',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-1ID', // 1 ID controls white and color together
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee2mqtt/issues/3813#issuecomment-694922037
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (1 ID)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-2ID', // 2 ID controls white and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (2 ID)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
        exposes: [e.light_brightness_colortemp_colorxy().withEndpoint('rgb'), e.light_brightness().withEndpoint('white')],
        endpoint: (device) => {
            if (device.getEndpoint(10) && device.getEndpoint(11) && device.getEndpoint(13)) {
                return {rgb: 11, white: 10};
            } else if (device.getEndpoint(11) && device.getEndpoint(12) && device.getEndpoint(13)) {
                return {rgb: 11, white: 12};
            } else {
                return {rgb: 11, white: 15};
            }
        },
    },
    {
        zigbeeModel: ['GL-C-007S'],
        model: 'GL-C-007S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-C-007P'],
        model: 'GL-C-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGBW (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_colortemp_color().configure(device, coordinatorEndpoint, logger);
            await configureReadModelID(device, coordinatorEndpoint, logger);
        },
    },
    {
        fingerprint: [
            // Although the device announces modelID GL-C-007, this is clearly a GL-C-008
            // https://github.com/Koenkk/zigbee2mqtt/issues/3525
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
        ],
        model: 'GL-C-008-2ID', // 2 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (2 ID)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
        exposes: [e.light_brightness_colorxy().withEndpoint('rgb'), e.light_brightness_colortemp().withEndpoint('cct')],
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1315#issuecomment-645331185
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        endpoint: (device) => {
            return {rgb: 11, cct: 15};
        },
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        zigbeeModel: ['GL-C-008'],
        model: 'GL-C-008-1ID', // 1 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (1 ID)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-008S'],
        model: 'GL-C-008S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-003P'],
        model: 'GL-C-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGB (pro)',
        extend: gledoptoExtend.light_onoff_brightness_color({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_color().configure(device, coordinatorEndpoint, logger);
            await configureReadModelID(device, coordinatorEndpoint, logger);
        },
    },
    {
        zigbeeModel: ['GL-C-008P'],
        model: 'GL-C-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGB+CCT (pro)',
        whiteLabel: [{vendor: 'Gledopto', model: 'GL-C-001P'}, {vendor: 'Gledopto', model: 'GL-C-002P'}],
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495], noConfigure: true}),
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_colortemp_color().configure(device, coordinatorEndpoint, logger);
            await configureReadModelID(device, coordinatorEndpoint, logger);
        },
    },
    {
        zigbeeModel: ['GL-C-009'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-009',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller W',
        extend: gledoptoExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-C-009P'],
        model: 'GL-C-009P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller W (pro)',
        extend: gledoptoExtend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await configureReadModelID(device, coordinatorEndpoint, logger);
        },
    },
    {
        zigbeeModel: ['GL-C-009S'],
        model: 'GL-C-009S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller W (plus)',
        extend: gledoptoExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-MC-001'],
        model: 'GL-MC-001',
        vendor: 'Gledopto',
        description: 'Zigbee USB Mini LED Controller RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-B-002P'],
        model: 'GL-B-002P',
        vendor: 'Gledopto',
        description: 'Zigbee smart filament LED bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-S-006P'],
        model: 'GL-S-006P',
        vendor: 'Gledopto',
        description: 'Zigbee GU10 LED lamp',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-MC-001P'],
        model: 'GL-MC-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee USB Mini LED Controller RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-003Z'],
        model: 'GL-S-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGBW',
        extend: gledoptoExtend.light_onoff_brightness_color(),
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/5169
            if (device.getEndpoint(12)) return {default: 12};
            // https://github.com/Koenkk/zigbee2mqtt/issues/5681
            else return {default: 11};
        },
    },
    {
        zigbeeModel: ['GL-S-004Z'],
        model: 'GL-S-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb 30deg RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({disableColorTempStartup: false, colorTempRange: [155, 495]}),
    },
    {
        zigbeeModel: ['GL-S-005Z'],
        model: 'GL-S-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb 120deg RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-004ZS'],
        model: 'GL-S-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-004P', 'GL-S-005P'],
        model: 'GL-S-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007Z', 'GL-S-007Z(lk)'],
        model: 'GL-S-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007ZS'],
        model: 'GL-S-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007P'],
        model: 'GL-S-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-008Z'],
        model: 'GL-S-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W PAR16 Bulb RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001Z'],
        model: 'GL-B-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001ZS'],
        model: 'GL-B-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001P'],
        model: 'GL-B-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007Z'],
        model: 'GL-B-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007ZS'],
        model: 'GL-B-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007P'],
        model: 'GL-B-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008Z'],
        model: 'GL-B-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008ZS'],
        model: 'GL-B-008ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008P'],
        model: 'GL-B-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-002P'],
        model: 'GL-D-002P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro CRI>90)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-D-003Z'],
        model: 'GL-D-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-003ZS'],
        model: 'GL-D-003ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-003P'],
        model: 'GL-D-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004Z'],
        model: 'GL-D-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004ZS'],
        model: 'GL-D-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004P'],
        model: 'GL-D-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 9W Downlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005Z'],
        model: 'GL-D-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005ZS'],
        model: 'GL-D-005ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005P'],
        model: 'GL-D-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-D-006P'],
        model: 'GL-D-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W anti-glare downlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-D-007P'],
        model: 'GL-D-007P',
        vendor: 'Gledopto',
        description: 'Zigbee 12W anti-glare downlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-FL-004TZ'],
        model: 'GL-FL-004TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-003P'],
        model: 'GL-B-003P',
        vendor: 'Gledopto',
        description: 'Zigbee 7W E26/E27 Bulb RGB+CCT (pro)',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [155, 495]}),
    },
    {
        zigbeeModel: ['GL-FL-004TZS'],
        model: 'GL-FL-004TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [155, 495]}),
    },
    {
        zigbeeModel: ['GL-FL-004P', 'GL-FL-004TZP'],
        model: 'GL-FL-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 10W Floodlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-C-004P'],
        model: 'GL-C-004P',
        vendor: 'Gledopto',
        description: 'Zigbee LED Strip Light Kit',
        extend: gledoptoExtend.light_onoff_brightness_colortemp({noConfigure: true, colorTempRange: [158, 495]}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_colortemp().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.colorTemperature(endpoint);
        },
    },
    {
        zigbeeModel: ['GL-FL-001P'],
        model: 'GL-FL-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 10W Floodlight RGB+CCT 12V Low Voltage (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-FL-005TZ'],
        model: 'GL-FL-005TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-005TZS'],
        model: 'GL-FL-005TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-005P', 'GL-FL-005TZP'],
        model: 'GL-FL-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 30W Floodlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006TZ'],
        model: 'GL-FL-006TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006TZS'],
        model: 'GL-FL-006TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006P', 'GL-FL-006TZP'],
        model: 'GL-FL-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 60W Floodlight RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-G-001Z'],
        model: 'GL-G-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-001ZS'],
        model: 'GL-G-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT (plus)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-001P'],
        model: 'GL-G-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Garden Lamp RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-002P'],
        model: 'GL-G-002P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 7W garden lamp RGB+CCT (pro)',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color({colorTempRange: [150, 500]}),
    },
    {
        zigbeeModel: ['GL-G-007Z'],
        model: 'GL-G-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W garden lamp RGB+CCT',
        extend: gledoptoExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-W-001Z'],
        model: 'GL-W-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee on/off wall switch',
        extend: gledoptoExtend.switch(),
    },
    {
        zigbeeModel: ['GL-SD-002'],
        model: 'GL-SD-002',
        vendor: 'Gledopto',
        description: 'Zigbee 3.0 smart home switch',
        extend: gledoptoExtend.switch(),
    },
    {
        zigbeeModel: ['GL-B-004P'],
        model: 'GL-B-004P',
        vendor: 'Gledopto',
        description: 'Filament LED light bulb E27 G95 7W pro',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
];
