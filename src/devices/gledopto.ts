import {Configure, Definition, KeyValue, OnEventType, Zh, Tz, ModernExtend} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as globalStore from '../lib/store';
import * as utils from '../lib/utils';
import * as ota from '../lib/ota';
import tz from '../converters/toZigbee';
import * as libColor from '../lib/color';
import {light, LightArgs, OnOffArgs, onOff} from '../lib/modernExtend';
import {logger} from '../lib/logger';

const NS = 'zhc:gledopto';
const e = exposes.presets;

const tzLocal1 = {
    gledopto_light_onoff_brightness: {
        key: ['state', 'brightness', 'brightness_percent'],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (!Array.isArray(meta.mapped) && (meta.mapped.model === 'GL-S-007ZS' || meta.mapped.model === 'GL-C-009')) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/2757
                // Device doesn't support ON with moveToLevelWithOnOff command
                if (typeof meta.message.state === 'string' && meta.message.state.toLowerCase() === 'on') {
                    await tz.on_off.convertSet(entity, key, 'ON', meta);
                    await utils.sleep(1000);
                }
            }

            return await tz.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_onoff_brightness.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
    gledopto_light_colortemp: {
        key: ['color_temp', 'color_temp_percent'],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: 'ON'};

            const result = await tz.light_colortemp.convertSet(entity, key, value, meta);
            if (result) {
                result.state = {...result.state, ...state};
            }
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_colortemp.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
    gledopto_light_color: {
        key: ['color'],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (key === 'color' && !meta.message.transition) {
                // Always provide a transition when setting color, otherwise CCT to RGB
                // doesn't work properly (CCT leds stay on).
                meta.message.transition = 0.4;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: 'ON'};
            const result = await tz.light_color.convertSet(entity, key, value, meta);
            if (result) {
                result.state = {...result.state, ...state};
            }
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_color.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
};

const tzLocal = {
    ...tzLocal1,
    gledopto_light_color_colortemp: {
        key: ['color', 'color_temp', 'color_temp_percent'],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (key == 'color') {
                const result = await tzLocal1.gledopto_light_color.convertSet(entity, key, value, meta);
                utils.assertObject(result);
                if (result.state && result.state.color.hasOwnProperty('x') && result.state.color.hasOwnProperty('y')) {
                    result.state.color_temp = Math.round(libColor.ColorXY.fromObject(result.state.color).toMireds());
                }

                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const result = await tzLocal1.gledopto_light_colortemp.convertSet(entity, key, value, meta);
                utils.assertObject(result);
                result.state.color = libColor.ColorXY.fromMireds(result.state.color_temp).rounded(4).toObject();
                return result;
            }
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_color_colortemp.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
};

function gledoptoLight(args?: LightArgs) {
    args = {powerOnBehavior: false, ...args};
    if (args.color) args.color = {modes: ['xy', 'hs'], ...(utils.isObject(args.color) ? args.color : {})};
    const result = light(args);
    result.toZigbee = utils.replaceInArray(result.toZigbee,
        [tz.light_onoff_brightness, tz.light_colortemp, tz.light_color, tz.light_color_colortemp],
        [tzLocal.gledopto_light_onoff_brightness, tzLocal.gledopto_light_colortemp, tzLocal.gledopto_light_color,
            tzLocal.gledopto_light_color_colortemp],
        false,
    );
    return result;
}

function gledoptoOnOff(args?: OnOffArgs) {
    const result = onOff({powerOnBehavior: false, ...args});
    result.onEvent = async (type: OnEventType, data: KeyValue, device: Zh.Device) => {
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
    };
    return result;
}

function gledoptoConfigureReadModelID(): ModernExtend {
    const configure: Configure = async (device, coordinatorEndpoint) => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3016#issuecomment-1027726604
        const endpoint = device.endpoints[0];
        const oldModel = device.modelID;
        const newModel = (await endpoint.read('genBasic', ['modelId'])).modelId;
        if (oldModel != newModel) {
            logger.info(`Detected Gledopto device mode change, from '${oldModel}' to '${newModel}'`, NS);
        }
    };
    return {configure, isModernExtend: true};
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['GL-SD-003P'],
        model: 'GL-SD-003P',
        vendor: 'Gledopto',
        description: 'Zigbee DIN Rail triac AC dimmer',
        extend: [light()],
        meta: {disableDefaultResponse: true},
    },
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
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['HOMA2023'],
        model: 'GD-CZ-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW',
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ['GL-SD-001'],
        model: 'GL-SD-001',
        vendor: 'Gledopto',
        description: 'Zigbee triac AC dimmer',
        extend: [gledoptoLight({})],
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
        extend: [gledoptoLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['GL-C-006S'],
        model: 'GL-C-006S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['GL-C-006P'],
        model: 'GL-C-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller WW/CW (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}}), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ['GL-G-003P'],
        model: 'GL-G-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: '7W garden light pro',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
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
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [25]},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
            ]},
        ],
        model: 'GL-C-007-1ID', // 1 ID controls white and color together
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee2mqtt/issues/3813#issuecomment-694922037
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (1 ID)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
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
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
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
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-C-007P'],
        model: 'GL-C-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGBW (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true}), gledoptoConfigureReadModelID()],
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
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        exposes: [e.light_brightness_colorxy().withEndpoint('rgb'), e.light_brightness_colortemp([158, 495]).withEndpoint('cct')],
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
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-008S'],
        model: 'GL-C-008S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-003P'],
        model: 'GL-C-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGB (pro)',
        extend: [gledoptoLight({color: true, powerOnBehavior: true}), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ['GL-C-008P'],
        model: 'GL-C-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGB+CCT (pro)',
        whiteLabel: [{vendor: 'Gledopto', model: 'GL-C-001P'}, {vendor: 'Gledopto', model: 'GL-C-002P'}],
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true}), gledoptoConfigureReadModelID()],
        meta: {disableDefaultResponse: true},
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
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ['GL-C-009P'],
        model: 'GL-C-009P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller W (pro)',
        extend: [gledoptoLight({powerOnBehavior: true}), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ['GL-C-009S'],
        model: 'GL-C-009S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller W (plus)',
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ['GL-MC-001'],
        model: 'GL-MC-001',
        vendor: 'Gledopto',
        description: 'Zigbee USB Mini LED Controller RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-LB-001P'],
        model: 'GL-LB-001P',
        vendor: 'Gledopto',
        description: 'Zigbee USB LED bar RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ['GL-B-002P'],
        model: 'GL-B-002P',
        vendor: 'Gledopto',
        description: 'Zigbee smart filament LED bulb',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
    {
        zigbeeModel: ['GL-S-006P'],
        model: 'GL-S-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee GU10 LED lamp',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['GL-S-014P'],
        model: 'GL-S-014P',
        vendor: 'Gledopto',
        description: 'Zigbee 5W MR16 bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 500]}, color: true})],
    },
    {
        zigbeeModel: ['GL-MC-001P'],
        model: 'GL-MC-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee USB Mini LED Controller RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-003Z'],
        model: 'GL-S-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGBW',
        extend: [gledoptoLight({color: true})],
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
        extend: [gledoptoLight({colorTemp: {range: [155, 495], startup: true}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-005Z'],
        model: 'GL-S-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb 120deg RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-004ZS'],
        model: 'GL-S-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-004P', 'GL-S-005P'],
        model: 'GL-S-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['GL-S-007Z', 'GL-S-007Z(lk)'],
        model: 'GL-S-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-007ZS'],
        model: 'GL-S-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-007P'],
        model: 'GL-S-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-S-008Z'],
        model: 'GL-S-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W PAR16 Bulb RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-001Z'],
        model: 'GL-B-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-001ZS'],
        model: 'GL-B-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-001P'],
        model: 'GL-B-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-007Z'],
        model: 'GL-B-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-C-103P'],
        model: 'GL-C-103P',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller (pro)',
        extend: [light({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-004P'],
        model: 'GL-G-004P',
        vendor: 'Gledopto',
        description: 'Zigbee 7W garden light Pro RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-007ZS'],
        model: 'GL-B-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-007P'],
        model: 'GL-B-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ['GL-B-008Z'],
        model: 'GL-B-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-008ZS'],
        model: 'GL-B-008ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-008P'],
        model: 'GL-B-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-002P'],
        model: 'GL-D-002P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro CRI>90)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-003Z'],
        model: 'GL-D-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-003ZS'],
        model: 'GL-D-003ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-003P'],
        model: 'GL-D-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-004Z'],
        model: 'GL-D-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-004ZS'],
        model: 'GL-D-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-004P'],
        model: 'GL-D-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 9W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-005Z'],
        model: 'GL-D-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-005ZS'],
        model: 'GL-D-005ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-005P'],
        model: 'GL-D-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-009P'],
        model: 'GL-D-009P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-015P'],
        model: 'GL-D-015P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-010P'],
        model: 'GL-D-010P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-013P'],
        model: 'GL-D-013P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-006P'],
        model: 'GL-D-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W anti-glare downlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-D-007P'],
        model: 'GL-D-007P',
        vendor: 'Gledopto',
        description: 'Zigbee 12W anti-glare downlight RGB+CCT (pro)',
        ota: ota.zigbeeOTA,
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-004TZ'],
        model: 'GL-FL-004TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-B-003P'],
        model: 'GL-B-003P',
        vendor: 'Gledopto',
        description: 'Zigbee 7W E26/E27 Bulb RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [155, 495]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['GL-FL-004TZS'],
        model: 'GL-FL-004TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: [155, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-004P', 'GL-FL-004TZP'],
        model: 'GL-FL-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 10W Floodlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-C-004P'],
        model: 'GL-C-004P',
        vendor: 'Gledopto',
        description: 'Zigbee LED Strip Light Kit',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, configureReporting: true})],
    },
    {
        zigbeeModel: ['GL-FL-001P'],
        model: 'GL-FL-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 10W Floodlight RGB+CCT 12V Low Voltage (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-005TZ'],
        model: 'GL-FL-005TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-005TZS'],
        model: 'GL-FL-005TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-005P', 'GL-FL-005TZP'],
        model: 'GL-FL-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 30W Floodlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-006TZ'],
        model: 'GL-FL-006TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-006TZS'],
        model: 'GL-FL-006TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-FL-006P', 'GL-FL-006TZP'],
        model: 'GL-FL-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 60W Floodlight RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-001Z'],
        model: 'GL-G-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-001ZS'],
        model: 'GL-G-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT (plus)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-001P'],
        model: 'GL-G-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Garden Lamp RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-101P'],
        model: 'GL-G-101P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W garden lamp RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-002P'],
        model: 'GL-G-002P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 7W garden lamp RGB+CCT (pro)',
        extend: [gledoptoLight({colorTemp: {range: [150, 500]}, color: true})],
    },
    {
        zigbeeModel: ['GL-G-007Z'],
        model: 'GL-G-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W garden lamp RGB+CCT',
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['GL-P-101P'],
        model: 'GL-P-101P',
        vendor: 'Gledopto',
        description: 'Zigbee pro constant current CCT LED driver',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
    {
        zigbeeModel: ['GL-W-001Z'],
        model: 'GL-W-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee on/off wall switch',
        extend: [gledoptoOnOff()],
    },
    {
        zigbeeModel: ['GL-SD-002'],
        model: 'GL-SD-002',
        vendor: 'Gledopto',
        description: 'Zigbee 3.0 smart home switch',
        extend: [gledoptoOnOff()],
    },
    {
        zigbeeModel: ['GL-B-004P'],
        model: 'GL-B-004P',
        vendor: 'Gledopto',
        description: 'Filament LED light bulb E27 G95 7W pro',
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
];

export default definitions;
module.exports = definitions;
