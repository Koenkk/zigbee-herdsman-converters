import {Fz, Tz, OnEvent, KeyValueString} from '../lib/types';
import * as exposes from './exposes';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;

const legrandOptions = {manufacturerCode: 4129, disableDefaultResponse: true};

const shutterCalibrationModes: {[k: number]: {description: string, onlyNLLV: boolean}} = {
    0: {description: 'Classic (NLLV)', onlyNLLV: true},
    1: {description: 'Specific (NLLV)', onlyNLLV: true},
    2: {description: 'Up/Down/Stop', onlyNLLV: false},
    3: {description: 'Temporal', onlyNLLV: false},
    4: {description: 'Venetian (BSO)', onlyNLLV: false},
};

const getApplicableCalibrationModes = (isNLLVSwitch: boolean): KeyValueString => {
    return Object.fromEntries(Object.entries(shutterCalibrationModes)
        .filter((e) => isNLLVSwitch ? true : e[1].onlyNLLV === false)
        .map((e) => [e[0], e[1].description]));
};

export const readInitialBatteryState: OnEvent = async (type, data, device, options) => {
    if (['deviceAnnounce'].includes(type)) {
        const endpoint = device.getEndpoint(1);
        const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
        await endpoint.read('genPowerCfg', ['batteryVoltage'], options);
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
    } as Tz.Converter,
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
        } as Tz.Converter;
    },
};

export const fzLegrand = {
    legrand_600087l: {
        cluster: 'greenPower',
        type: ['commandNotification'],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            const lookup: {[s: number]: string} = {0x34: 'stop', 0x35: 'up', 0x36: 'down'};
            if (commandID === 224) return;
            if (!lookup.hasOwnProperty(commandID)) {
                meta.logger.error(`GreenPower_3 error: missing command '${commandID}'`);
            } else {
                return {action: lookup[commandID]};
            }
        },
    } as Fz.Converter,
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
        } as Fz.Converter;
    },
};

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
