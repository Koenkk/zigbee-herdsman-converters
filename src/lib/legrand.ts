import {Zcl} from 'zigbee-herdsman';
import {Fz, Tz, OnEvent, KeyValueString, KeyValueAny} from '../lib/types';
import * as exposes from './exposes';
import * as utils from '../lib/utils';
import {logger} from './logger';

const NS = 'zhc:legrand';
const e = exposes.presets;
const ea = exposes.access;

const shutterCalibrationModes: {[k: number]: {description: string, onlyNLLV: boolean}} = {
    0: {description: 'classic_nllv', onlyNLLV: true},
    1: {description: 'specific_nllv', onlyNLLV: true},
    2: {description: 'up_down_stop', onlyNLLV: false},
    3: {description: 'temporal', onlyNLLV: false},
    4: {description: 'venetian_bso', onlyNLLV: false},
};

const ledModes:{[k: number]: string} = {
    1: 'led_in_dark',
    2: 'led_if_on',
};

const getApplicableCalibrationModes = (isNLLVSwitch: boolean): KeyValueString => {
    return Object.fromEntries(Object.entries(shutterCalibrationModes)
        .filter((e) => isNLLVSwitch ? true : e[1].onlyNLLV === false)
        .map((e) => [e[0], e[1].description]));
};

export const legrandOptions = {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true};

export const _067776 = {
    getCover: () => {
        const c = e.cover_position();
        if (c.hasOwnProperty('features')) {
            c.features.push(new exposes.Numeric('tilt', ea.ALL)
                .withValueMin(0).withValueMax(100)
                .withValueStep(25)
                .withPreset('Closed', 0, 'Vertical')
                .withPreset('25 %', 25, '25%')
                .withPreset('50 %', 50, '50%')
                .withPreset('75 %', 75, '75%')
                .withPreset('Open', 100, 'Horizontal')
                .withUnit('%')
                .withDescription('Tilt percentage of that cover'));
        }
        return c;
    },
    getCalibrationModes: (isNLLVSwitch: boolean) => {
        const modes = getApplicableCalibrationModes(isNLLVSwitch);
        return e.enum('calibration_mode', ea.ALL, Object.values(modes))
            .withDescription('Defines the calibration mode of the switch. (Caution: Changing modes requires a recalibration of the shutter switch!)');
    },
};

export const readInitialBatteryState: OnEvent = async (type, data, device, options) => {
    if (['deviceAnnounce'].includes(type)) {
        const endpoint = device.getEndpoint(1);
        await endpoint.read('genPowerCfg', ['batteryVoltage'], legrandOptions);
    }
};

export const tzLegrand = {
    auto_mode: {
        key: ['auto_mode'],
        convertSet: async (entity, key, value, meta) => {
            const mode = utils.getFromLookup(value, {'off': 0x00, 'auto': 0x02, 'on_override': 0x03});
            const payload = {data: Buffer.from([mode])};
            await entity.command('manuSpecificLegrandDevices3', 'command0', payload);
            return {state: {'auto_mode': value}};
        },
    } satisfies Tz.Converter,
    calibration_mode: (isNLLVSwitch: boolean) => {
        return {
            key: ['calibration_mode'],
            convertSet: async (entity, key, value, meta) => {
                const applicableModes = getApplicableCalibrationModes(isNLLVSwitch);
                utils.validateValue(value, Object.values(applicableModes));
                const idx = utils.getKey(applicableModes, value);
                await entity.write('closuresWindowCovering', {'calibrationMode': idx}, legrandOptions);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('closuresWindowCovering', ['calibrationMode'], legrandOptions);
            },
        } satisfies Tz.Converter;
    },
    led_mode: {
        key: ['led_in_dark', 'led_if_on'],
        convertSet: async (entity, key, value, meta) => {
            utils.validateValue(key, Object.values(ledModes));
            const idx = utils.getKey(ledModes, key);
            const state = value === 'ON' || (value === 'OFF' ? false : !!value);
            const payload = {[idx]: {value: state, type: 16}};
            await entity.write('manuSpecificLegrandDevices', payload, legrandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            utils.validateValue(key, Object.values(ledModes));
            const idx = utils.getKey(ledModes, key);
            await entity.read('manuSpecificLegrandDevices', [Number(idx)], legrandOptions);
        },
    } satisfies Tz.Converter,
};

export const fzLegrand = {
    calibration_mode: (isNLLVSwitch: boolean) => {
        return {
            cluster: 'closuresWindowCovering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const attr = 'calibrationMode';
                if (msg.data.hasOwnProperty(attr)) {
                    const applicableModes = getApplicableCalibrationModes(isNLLVSwitch);
                    const idx = msg.data[attr];
                    utils.validateValue(String(idx), Object.keys(applicableModes));
                    const calMode = applicableModes[idx];
                    return {calibration_mode: calMode};
                }
            },
        } satisfies Fz.Converter;
    },
    cluster_fc01: {
        cluster: 'manuSpecificLegrandDevices',
        type: ['readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};

            if (msg.data.hasOwnProperty('0')) {
                const option0 = msg.data['0'];

                if (option0 === 0x0001) payload.device_mode = 'pilot_off';
                else if (option0 === 0x0002) payload.device_mode = 'pilot_on';
                else if (option0 === 0x0003) payload.device_mode = 'switch';
                else if (option0 === 0x0004) payload.device_mode = 'auto';
                else if (option0 === 0x0100) payload.device_mode = 'dimmer_off';
                else if (option0 === 0x0101) payload.device_mode = 'dimmer_on';
                else {
                    logger.warning(`Device_mode ${option0} not recognized, please fix me!`, NS);
                    payload.device_mode = 'unknown';
                }
            }
            if (msg.data.hasOwnProperty('1')) payload.led_in_dark = msg.data['1'] === 0x00 ? 'OFF' : 'ON';
            if (msg.data.hasOwnProperty('2')) payload.led_if_on = msg.data['2'] === 0x00 ? 'OFF' : 'ON';
            return payload;
        },
    } satisfies Fz.Converter,
};
