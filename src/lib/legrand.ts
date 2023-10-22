import {Fz, Tz, OnEvent} from '../lib/types';
import * as exposes from './exposes';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;

const shutterCalibrationModes = {
    'Classic (NLLV)': {ID: 0, onlyNLLV: true},
    'Specific (NLLV)': {ID: 1, onlyNLLV: true},
    'Up/Down/Stop': {ID: 2, onlyNLLV: false},
    'Temporal': {ID: 3, onlyNLLV: false},
    'Venetian (BSO)': {ID: 4, onlyNLLV: false},
};

const getApplicableCalibrationModes = (isNLLVSwitch: boolean) => {
    return Object.fromEntries(Object.entries(shutterCalibrationModes)
        .filter((e) => isNLLVSwitch ? true : e[1].onlyNLLV === false)
        .map((e) => [e[0], e[1].ID]));
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
                utils.validateValue(value, Object.keys(applicableModes));
                const idx = applicableModes[value as string];
                await entity.write('closuresWindowCovering', {'tuyaMotorReversal': idx});
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('closuresWindowCovering', [0xf002]);
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
                const attr = 'tuyaMotorReversal';
                if (msg.data.hasOwnProperty(attr)) {
                    const idx = msg.data[attr];
                    const applicableModes = getApplicableCalibrationModes(isNLLVSwitch);
                    utils.validateValue(idx, Object.values(applicableModes));
                    const calMode = utils.getKey(applicableModes, idx);
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
        return e.enum('calibration_mode', ea.ALL, Object.keys(modes))
            .withDescription('Defines the calibration mode of the switch. (Caution: Changing modes requires a recalibration of the shutter switch!)');
    },
};
