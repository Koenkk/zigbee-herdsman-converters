import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from './constants';
import * as exposes from './exposes';
import {logger} from './logger';
import * as modernExtend from './modernExtend';
import * as globalStore from './store';
import {
    Tuya,
    OnEventType,
    OnEventData,
    Zh,
    KeyValue,
    KeyValueAny,
    Tz,
    Fz,
    Expose,
    OnEvent,
    ModernExtend,
    Range,
    KeyValueNumberString,
    DefinitionExposesFunction,
    Publish,
} from './types';
import * as utils from './utils';
// import {Color} from './color';

const NS = 'zhc:tuya';
const e = exposes.presets;
const ea = exposes.access;

interface KeyValueStringEnum {
    [s: string]: Enum;
}

export const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    number: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

export function convertBufferToNumber(chunks: Buffer | number[]) {
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
}

function convertStringToHexArray(value: string) {
    const asciiKeys = [];
    for (let i = 0; i < value.length; i++) {
        asciiKeys.push(value[i].charCodeAt(0));
    }
    return asciiKeys;
}

export function onEvent(args?: {
    queryOnDeviceAnnounce?: boolean;
    timeStart?: '1970' | '2000';
    respondToMcuVersionResponse?: boolean;
    queryIntervalSeconds?: number;
}): OnEvent {
    return async (type, data, device, settings, state) => {
        args = {queryOnDeviceAnnounce: false, timeStart: '1970', respondToMcuVersionResponse: true, ...args};

        const endpoint = device.endpoints[0];

        if (type === 'message' && data.cluster === 'manuSpecificTuya') {
            if (args.respondToMcuVersionResponse && data.type === 'commandMcuVersionResponse') {
                await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
            } else if (data.type === 'commandMcuGatewayConnectionStatus') {
                // "payload" can have the following values:
                // 0x00: The gateway is not connected to the internet.
                // 0x01: The gateway is connected to the internet.
                // 0x02: The request timed out after three seconds.
                const payload = {payloadSize: 1, payload: 1};
                await endpoint.command('manuSpecificTuya', 'mcuGatewayConnectionStatus', payload, {});
            }
        }

        if (data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') {
            try {
                const offset = args.timeStart === '2000' ? constants.OneJanuary2000 : 0;
                const utcTime = Math.round((new Date().getTime() - offset) / 1000);
                const localTime = utcTime - new Date().getTimezoneOffset() * 60;
                const payload = {
                    payloadSize: 8,
                    payload: [...convertDecimalValueTo4ByteHexArray(utcTime), ...convertDecimalValueTo4ByteHexArray(localTime)],
                };
                await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
            } catch (error) {
                /* handle error to prevent crash */
            }
        }

        // Some devices require a dataQuery on deviceAnnounce, otherwise they don't report any data
        if (args.queryOnDeviceAnnounce && type === 'deviceAnnounce') {
            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
        }

        if (args.queryIntervalSeconds) {
            if (type === 'stop') {
                clearTimeout(globalStore.getValue(device, 'query_interval'));
                globalStore.clearValue(device, 'query_interval');
            } else if (!globalStore.hasValue(device, 'query_interval')) {
                const setTimer = () => {
                    const timer = setTimeout(async () => {
                        try {
                            await endpoint.command('manuSpecificTuya', 'dataQuery', {});
                        } catch (error) {
                            /* Do nothing*/
                        }
                        setTimer();
                    }, args.queryIntervalSeconds * 1000);
                    globalStore.putValue(device, 'query_interval', timer);
                };
                setTimer();
            }
        }
    };
}

function getDataValue(dpValue: Tuya.DpValue) {
    let dataString = '';
    switch (dpValue.datatype) {
        case dataTypes.raw:
            return dpValue.data;
        case dataTypes.bool:
            return dpValue.data[0] === 1;
        case dataTypes.number:
            return convertBufferToNumber(dpValue.data);
        case dataTypes.string:
            // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
            for (let i = 0; i < dpValue.data.length; ++i) {
                dataString += String.fromCharCode(dpValue.data[i]);
            }
            return dataString;
        case dataTypes.enum:
            return dpValue.data[0];
        case dataTypes.bitmap:
            return convertBufferToNumber(dpValue.data);
    }
}

export function convertDecimalValueTo4ByteHexArray(value: number) {
    const hexValue = Number(value).toString(16).padStart(8, '0');
    const chunk1 = hexValue.substring(0, 2);
    const chunk2 = hexValue.substring(2, 4);
    const chunk3 = hexValue.substring(4, 6);
    const chunk4 = hexValue.substring(6);
    return [chunk1, chunk2, chunk3, chunk4].map((hexVal) => parseInt(hexVal, 16));
}

function convertDecimalValueTo2ByteHexArray(value: number) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substring(0, 2);
    const chunk2 = hexValue.substring(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}

export async function onEventMeasurementPoll(
    type: OnEventType,
    data: OnEventData,
    device: Zh.Device,
    options: KeyValue,
    electricalMeasurement = true,
    metering = false,
) {
    const endpoint = device.getEndpoint(1);
    const poll = async () => {
        if (electricalMeasurement) {
            await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
        }
        if (metering) {
            await endpoint.read('seMetering', ['currentSummDelivered']);
        }
    };

    utils.onEventPoll(type, data, device, options, 'measurement', 60, poll);
}

export async function onEventSetTime(type: OnEventType, data: KeyValue, device: Zh.Device) {
    // FIXME: Need to join onEventSetTime/onEventSetLocalTime to one command

    if (data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') {
        try {
            const utcTime = Math.round((new Date().getTime() - constants.OneJanuary2000) / 1000);
            const localTime = utcTime - new Date().getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [...convertDecimalValueTo4ByteHexArray(utcTime), ...convertDecimalValueTo4ByteHexArray(localTime)],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

// set UTC and Local Time as total number of seconds from 00: 00: 00 on January 01, 1970
// force to update every device time every hour due to very poor clock
export async function onEventSetLocalTime(type: OnEventType, data: KeyValue, device: Zh.Device) {
    // FIXME: What actually nextLocalTimeUpdate/forceTimeUpdate do?
    //  I did not find any timers or something else where it was used.
    //  Actually, there are two ways to set time on Tuya MCU devices:
    //  1. Respond to the `commandMcuSyncTime` event
    //  2. Just send `mcuSyncTime` anytime (by 1-hour timer or something else)

    const nextLocalTimeUpdate = globalStore.getValue(device, 'nextLocalTimeUpdate');
    const forceTimeUpdate = nextLocalTimeUpdate == null || nextLocalTimeUpdate < new Date().getTime();

    if ((data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') || forceTimeUpdate) {
        globalStore.putValue(device, 'nextLocalTimeUpdate', new Date().getTime() + 3600 * 1000);

        try {
            const utcTime = Math.round(new Date().getTime() / 1000);
            const localTime = utcTime - new Date().getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [...convertDecimalValueTo4ByteHexArray(utcTime), ...convertDecimalValueTo4ByteHexArray(localTime)],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

// Return `seq` - transaction ID for handling concrete response
async function sendDataPoints(entity: Zh.Endpoint | Zh.Group, dpValues: Tuya.DpValue[], cmd = 'dataRequest', seq?: number) {
    if (seq === undefined) {
        seq = globalStore.getValue(entity, 'sequence', 0);
        globalStore.putValue(entity, 'sequence', (seq + 1) % 0xffff);
    }

    await entity.command('manuSpecificTuya', cmd, {seq, dpValues}, {disableDefaultResponse: true});
    return seq;
}

function dpValueFromNumberValue(dp: number, value: number) {
    return {dp, datatype: dataTypes.number, data: convertDecimalValueTo4ByteHexArray(value)};
}

function dpValueFromBool(dp: number, value: boolean) {
    return {dp, datatype: dataTypes.bool, data: [value ? 1 : 0]};
}

function dpValueFromEnum(dp: number, value: number) {
    return {dp, datatype: dataTypes.enum, data: [value]};
}

function dpValueFromString(dp: number, string: string) {
    return {dp, datatype: dataTypes.string, data: convertStringToHexArray(string)};
}

function dpValueFromRaw(dp: number, rawBuffer: number[]) {
    return {dp, datatype: dataTypes.raw, data: rawBuffer};
}

function dpValueFromBitmap(dp: number, bitmapBuffer: number) {
    return {dp, datatype: dataTypes.bitmap, data: [bitmapBuffer]};
}

export async function sendDataPointValue(entity: Zh.Group | Zh.Endpoint, dp: number, value: number, cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromNumberValue(dp, value)], cmd, seq);
}

export async function sendDataPointBool(entity: Zh.Group | Zh.Endpoint, dp: number, value: boolean, cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromBool(dp, value)], cmd, seq);
}

export async function sendDataPointEnum(entity: Zh.Group | Zh.Endpoint, dp: number, value: number, cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromEnum(dp, value)], cmd, seq);
}

export async function sendDataPointRaw(entity: Zh.Group | Zh.Endpoint, dp: number, value: number[], cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromRaw(dp, value)], cmd, seq);
}

export async function sendDataPointBitmap(entity: Zh.Group | Zh.Endpoint, dp: number, value: number, cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromBitmap(dp, value)], cmd, seq);
}

export async function sendDataPointStringBuffer(entity: Zh.Group | Zh.Endpoint, dp: number, value: string, cmd?: string, seq?: number) {
    return await sendDataPoints(entity, [dpValueFromString(dp, value)], cmd, seq);
}

const tuyaExposes = {
    lightType: () => e.enum('light_type', ea.STATE_SET, ['led', 'incandescent', 'halogen']).withDescription('Type of light attached to the device'),
    lightBrightnessWithMinMax: () =>
        e
            .light_brightness()
            .withMinBrightness()
            .withMaxBrightness()
            .setAccess('state', ea.STATE_SET)
            .setAccess('brightness', ea.STATE_SET)
            .setAccess('min_brightness', ea.STATE_SET)
            .setAccess('max_brightness', ea.STATE_SET),
    lightBrightness: () => e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET),
    countdown: () =>
        e
            .numeric('countdown', ea.STATE_SET)
            .withValueMin(0)
            .withValueMax(43200)
            .withValueStep(1)
            .withUnit('s')
            .withDescription('Countdown to turn device off after a certain time'),
    switch: () => e.switch().setAccess('state', ea.STATE_SET),
    selfTest: () => e.binary('self_test', ea.STATE_SET, true, false).withDescription('Indicates whether the device is being self-tested'),
    selfTestResult: () =>
        e.enum('self_test_result', ea.STATE, ['checking', 'success', 'failure', 'others']).withDescription('Result of the self-test'),
    faultAlarm: () => e.binary('fault_alarm', ea.STATE, true, false).withDescription('Indicates whether a fault was detected'),
    silence: () => e.binary('silence', ea.STATE_SET, true, false).withDescription('Silence the alarm'),
    frostProtection: (extraNote = '') =>
        e
            .binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
            .withDescription(`When Anti-Freezing function is activated, the temperature in the house is kept at 8 °C.${extraNote}`),
    errorStatus: () => e.numeric('error_status', ea.STATE).withDescription('Error status'),
    scheduleAllDays: (access: number, format: string) =>
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) =>
            e.text(`schedule_${day}`, access).withDescription(`Schedule for ${day}, format: "${format}"`),
        ),
    temperatureUnit: () => e.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Temperature unit'),
    temperatureCalibration: () =>
        e
            .numeric('temperature_calibration', ea.STATE_SET)
            .withValueMin(-2.0)
            .withValueMax(2.0)
            .withValueStep(0.1)
            .withUnit('°C')
            .withDescription('Temperature calibration'),
    humidityCalibration: () =>
        e
            .numeric('humidity_calibration', ea.STATE_SET)
            .withValueMin(-30)
            .withValueMax(30)
            .withValueStep(1)
            .withUnit('%')
            .withDescription('Humidity calibration'),
    gasValue: () => e.numeric('gas_value', ea.STATE).withDescription('Measured gas concentration'),
    energyWithPhase: (phase: string) =>
        e.numeric(`energy_${phase}`, ea.STATE).withUnit('kWh').withDescription(`Sum of consumed energy (phase ${phase.toUpperCase()})`),
    energyProducedWithPhase: (phase: string) =>
        e.numeric(`energy_produced_${phase}`, ea.STATE).withUnit('kWh').withDescription(`Sum of produced energy (phase ${phase.toUpperCase()})`),
    energyFlowWithPhase: (phase: string, more: [string]) =>
        e
            .enum(`energy_flow_${phase}`, ea.STATE, ['consuming', 'producing', ...more])
            .withDescription(`Direction of energy (phase ${phase.toUpperCase()})`),
    voltageWithPhase: (phase: string) =>
        e.numeric(`voltage_${phase}`, ea.STATE).withUnit('V').withDescription(`Measured electrical potential value (phase ${phase.toUpperCase()})`),
    powerWithPhase: (phase: string) =>
        e.numeric(`power_${phase}`, ea.STATE).withUnit('W').withDescription(`Instantaneous measured power (phase ${phase.toUpperCase()})`),
    currentWithPhase: (phase: string) =>
        e
            .numeric(`current_${phase}`, ea.STATE)
            .withUnit('A')
            .withDescription(`Instantaneous measured electrical current (phase ${phase.toUpperCase()})`),
    powerFactorWithPhase: (phase: string) =>
        e
            .numeric(`power_factor_${phase}`, ea.STATE)
            .withUnit('%')
            .withDescription(`Instantaneous measured power factor (phase ${phase.toUpperCase()})`),
    switchType: () => e.enum('switch_type', ea.ALL, ['toggle', 'state', 'momentary']).withDescription('Type of the switch'),
    backlightModeLowMediumHigh: () => e.enum('backlight_mode', ea.ALL, ['low', 'medium', 'high']).withDescription('Intensity of the backlight'),
    backlightModeOffNormalInverted: () => e.enum('backlight_mode', ea.ALL, ['off', 'normal', 'inverted']).withDescription('Mode of the backlight'),
    backlightModeOffOn: () => e.binary('backlight_mode', ea.ALL, 'ON', 'OFF').withDescription(`Mode of the backlight`),
    indicatorMode: () => e.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on']).withDescription('LED indicator mode'),
    indicatorModeNoneRelayPos: () => e.enum('indicator_mode', ea.ALL, ['none', 'relay', 'pos']).withDescription('Mode of the indicator light'),
    powerOutageMemory: () => e.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore']).withDescription('Recover state after power outage'),
    batteryState: () => e.enum('battery_state', ea.STATE, ['low', 'medium', 'high']).withDescription('State of the battery'),
    doNotDisturb: () =>
        e
            .binary('do_not_disturb', ea.STATE_SET, true, false)
            .withDescription('Do not disturb mode, when enabled this function will keep the light OFF after a power outage'),
    colorPowerOnBehavior: () =>
        e.enum('color_power_on_behavior', ea.STATE_SET, ['initial', 'previous', 'customized']).withDescription('Power on behavior state'),
    switchMode: () =>
        e.enum('switch_mode', ea.STATE_SET, ['switch', 'scene']).withDescription('Sets the mode of the switch to act as a switch or as a scene'),
    switchMode2: () =>
        e
            .enum('switch_mode', ea.STATE_SET, ['switch', 'curtain'])
            .withDescription('Sets the mode of the switch to act as a switch or as a curtain controller'),
    lightMode: () =>
        e.enum('light_mode', ea.STATE_SET, ['normal', 'on', 'off', 'flash']).withDescription(`'Sets the indicator mode of l1.
        Normal: Orange while off and white while on.
        On: Always white. Off: Always orange.
        Flash: Flashes white when triggered.
        Note: Orange light will turn off after light off delay, white light always stays on. Light mode updates on next state change.'`),
    // Inching can be enabled for multiple endpoints (1 to 6) but it is always controlled on endpoint 1
    // So instead of pinning the values to each endpoint, it is easier to keep the structure stand alone.
    inchingSwitch: (quantity: number) => {
        const x = e
            .composite('inching_control_set', 'inching_control_set', ea.SET)
            .withDescription(
                'Device Inching function Settings. The device will automatically turn off ' + 'after each turn on for a specified period of time.',
            );
        for (let i = 1; i <= quantity; i++) {
            x.withFeature(
                e
                    .binary('inching_control', ea.SET, 'ENABLE', 'DISABLE')
                    .withDescription('Enable/disable inching function for endpoint ' + i + '.')
                    .withLabel('Inching for Endpoint ' + i)
                    .withProperty('inching_control_' + i),
            ).withFeature(
                e
                    .numeric('inching_time', ea.SET)
                    .withDescription('Delay time for executing a inching action for endpoint ' + i + '.')
                    .withLabel('Inching time for endpoint ' + i)
                    .withProperty('inching_time_' + i)
                    .withUnit('seconds')
                    .withValueMin(1)
                    .withValueMax(65535)
                    .withValueStep(1),
            );
        }
        return x;
    },
};
export {tuyaExposes as exposes};

export const skip = {
    // Prevent state from being published when already ON and brightness is also published.
    // This prevents 100% -> X% brightness jumps when the switch is already on
    // https://github.com/Koenkk/zigbee2mqtt/issues/13800#issuecomment-1263592783
    stateOnAndBrightnessPresent: (meta: Tz.Meta) => {
        if (Array.isArray(meta.mapped)) throw new Error('Not supported');
        const convertedKey = meta.mapped.meta.multiEndpoint && meta.endpoint_name ? `state_${meta.endpoint_name}` : 'state';
        return meta.message.hasOwnProperty('brightness') && meta.state[convertedKey] === meta.message.state;
    },
};

export const configureMagicPacket = async (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint) => {
    try {
        const endpoint = device.endpoints[0];
        await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
    } catch (e) {
        // Fails for some Tuya devices with UNSUPPORTED_ATTRIBUTE, ignore that.
        // e.g. https://github.com/Koenkk/zigbee2mqtt/issues/14857
        if (e.message.includes('UNSUPPORTED_ATTRIBUTE')) {
            logger.debug('configureMagicPacket failed, ignoring...', NS);
        } else {
            throw e;
        }
    }
};

export const fingerprint = (modelID: string, manufacturerNames: string[]) => {
    return manufacturerNames.map((manufacturerName) => {
        return {modelID, manufacturerName};
    });
};

export const whitelabel = (vendor: string, model: string, description: string, manufacturerNames: string[]) => {
    const fingerprint = manufacturerNames.map((manufacturerName) => {
        return {manufacturerName};
    });
    return {vendor, model, description, fingerprint};
};

class Base {
    value: number;

    constructor(value: number) {
        this.value = value;
    }

    valueOf() {
        return this.value;
    }
}

export class Enum extends Base {
    constructor(value: number) {
        super(value);
    }
}
const enumConstructor = (value: number) => new Enum(value);
export {enumConstructor as enum};

export class Bitmap extends Base {
    constructor(value: number) {
        super(value);
    }
}

type LookupMap = {[s: string]: number | boolean | Enum | string};
export const valueConverterBasic = {
    lookup: (map: LookupMap | ((options: KeyValue, device: Zh.Device) => LookupMap), fallbackValue?: number | boolean | KeyValue | string | null) => {
        return {
            to: (v: string, meta: Tz.Meta) => utils.getFromLookup(v, typeof map === 'function' ? map(meta.options, meta.device) : map),
            from: (v: number, _meta: Fz.Meta, options: KeyValue) => {
                const m = typeof map === 'function' ? map(options, _meta.device) : map;
                const value = Object.entries(m).find((i) => i[1].valueOf() === v);
                if (!value) {
                    if (fallbackValue !== undefined) return fallbackValue;
                    throw new Error(`Value '${v}' is not allowed, expected one of ${Object.values(m)}`);
                }
                return value[0];
            },
        };
    },
    scale: (min1: number, max1: number, min2: number, max2: number) => {
        return {
            to: (v: number) => utils.mapNumberRange(v, min1, max1, min2, max2),
            from: (v: number) => utils.mapNumberRange(v, min2, max2, min1, max1),
        };
    },
    raw: () => {
        return {to: (v: string | number | boolean) => v, from: (v: string | number | boolean) => v};
    },
    divideBy: (value: number) => {
        return {to: (v: number) => v * value, from: (v: number) => v / value};
    },
    divideByFromOnly: (value: number) => {
        return {to: (v: number) => v, from: (v: number) => v / value};
    },
    trueFalse: (valueTrue: number | Enum) => {
        return {from: (v: number) => v === valueTrue.valueOf()};
    },
};

export const valueConverter = {
    trueFalse0: valueConverterBasic.trueFalse(0),
    trueFalse1: valueConverterBasic.trueFalse(1),
    trueFalseInvert: {
        to: (v: boolean) => !v,
        from: (v: boolean) => !v,
    },
    trueFalseEnum0: valueConverterBasic.trueFalse(new Enum(0)),
    trueFalseEnum1: valueConverterBasic.trueFalse(new Enum(1)),
    onOff: valueConverterBasic.lookup({ON: true, OFF: false}),
    powerOnBehavior: valueConverterBasic.lookup({off: 0, on: 1, previous: 2}),
    powerOnBehaviorEnum: valueConverterBasic.lookup({off: new Enum(0), on: new Enum(1), previous: new Enum(2)}),
    switchType: valueConverterBasic.lookup({momentary: new Enum(0), toggle: new Enum(1), state: new Enum(2)}),
    switchType2: valueConverterBasic.lookup({toggle: new Enum(0), state: new Enum(1), momentary: new Enum(2)}),
    backlightModeOffNormalInverted: valueConverterBasic.lookup({off: new Enum(0), normal: new Enum(1), inverted: new Enum(2)}),
    backlightModeOffLowMediumHigh: valueConverterBasic.lookup({off: new Enum(0), low: new Enum(1), medium: new Enum(2), high: new Enum(3)}),
    lightType: valueConverterBasic.lookup({led: 0, incandescent: 1, halogen: 2}),
    countdown: valueConverterBasic.raw(),
    scale0_254to0_1000: valueConverterBasic.scale(0, 254, 0, 1000),
    scale0_1to0_1000: valueConverterBasic.scale(0, 1, 0, 1000),
    divideBy100: valueConverterBasic.divideBy(100),
    temperatureUnit: valueConverterBasic.lookup({celsius: 0, fahrenheit: 1}),
    temperatureUnitEnum: valueConverterBasic.lookup({celsius: new Enum(0), fahrenheit: new Enum(1)}),
    batteryState: valueConverterBasic.lookup({low: 0, medium: 1, high: 2}),
    divideBy10: valueConverterBasic.divideBy(10),
    divideBy1000: valueConverterBasic.divideBy(1000),
    divideBy10FromOnly: valueConverterBasic.divideByFromOnly(10),
    switchMode: valueConverterBasic.lookup({switch: new Enum(0), scene: new Enum(1)}),
    switchMode2: valueConverterBasic.lookup({switch: new Enum(0), curtain: new Enum(1)}),
    lightMode: valueConverterBasic.lookup({normal: new Enum(0), on: new Enum(1), off: new Enum(2), flash: new Enum(3)}),
    raw: valueConverterBasic.raw(),
    workingDay: valueConverterBasic.lookup({disabled: new Enum(0), '6-1': new Enum(1), '5-2': new Enum(2), '7': new Enum(3)}),
    localTemperatureCalibration: {
        from: (value: number) => (value > 4000 ? value - 4096 : value),
        to: (value: number) => (value < 0 ? 4096 + value : value),
    },
    setLimit: {
        to: (v: number) => {
            if (!v) throw new Error('Limit cannot be unset, use factory_reset');
            return v;
        },
        from: (v: number) => v,
    },
    coverPosition: {
        to: async (v: number, meta: Tz.Meta) => {
            return meta.options.invert_cover ? 100 - v : v;
        },
        from: (v: number, meta: Fz.Meta, options: KeyValue, publish: Publish) => {
            const position = options.invert_cover ? 100 - v : v;
            const closed = options.invert_cover ? position === 100 : position === 0;
            publish({state: closed ? 'CLOSE' : 'OPEN'});
            return position;
        },
    },
    coverPositionInverted: {
        to: async (v: number, meta: Tz.Meta) => {
            return meta.options.invert_cover ? v : 100 - v;
        },
        from: (v: number, meta: Fz.Meta, options: KeyValue, publish: Publish) => {
            const position = options.invert_cover ? v : 100 - v;
            const closed = options.invert_cover ? position === 100 : position === 0;
            publish({state: closed ? 'CLOSE' : 'OPEN'});
            return position;
        },
    },
    tubularMotorDirection: valueConverterBasic.lookup({normal: new Enum(0), reversed: new Enum(1)}),
    plus1: {
        from: (v: number) => v + 1,
        to: (v: number) => v - 1,
    },
    static: (value: string | number) => {
        return {
            from: (v: string | number) => {
                return value;
            },
        };
    },
    phaseVariant1: {
        from: (v: string) => {
            const buffer = Buffer.from(v, 'base64');
            return {voltage: (buffer[14] | (buffer[13] << 8)) / 10, current: (buffer[12] | (buffer[11] << 8)) / 1000};
        },
    },
    phaseVariant2: {
        from: (v: string) => {
            const buf = Buffer.from(v, 'base64');
            return {voltage: (buf[1] | (buf[0] << 8)) / 10, current: (buf[4] | (buf[3] << 8)) / 1000, power: buf[7] | (buf[6] << 8)};
        },
    },
    phaseVariant2WithPhase: (phase: string) => {
        return {
            from: (v: string) => {
                // Support negative power readings
                // https://github.com/Koenkk/zigbee2mqtt/issues/18603#issuecomment-2277697295
                const buf = Buffer.from(v, 'base64');
                let power = buf[7] | (buf[6] << 8);
                if (power > 0x7fff) {
                    power = (0x999a - power) * -1;
                }

                return {
                    [`voltage_${phase}`]: (buf[1] | (buf[0] << 8)) / 10,
                    [`current_${phase}`]: (buf[4] | (buf[3] << 8)) / 1000,
                    [`power_${phase}`]: power,
                };
            },
        };
    },
    phaseVariant3: {
        from: (v: string) => {
            const buf = Buffer.from(v, 'base64');
            return {
                voltage: ((buf[0] << 8) | buf[1]) / 10,
                current: ((buf[2] << 16) | (buf[3] << 8) | buf[4]) / 1000,
                power: (buf[5] << 16) | (buf[6] << 8) | buf[7],
            };
        },
    },
    power: {
        from: (v: number) => {
            // Support negative readings
            // https://github.com/Koenkk/zigbee2mqtt/issues/18603
            return v > 0x0fffffff ? (0x1999999c - v) * -1 : v;
        },
    },
    threshold: {
        from: (v: string) => {
            const buffer = Buffer.from(v, 'base64');
            const stateLookup: KeyValue = {0: 'not_set', 1: 'over_current_threshold', 3: 'over_voltage_threshold'};
            const protectionLookup: KeyValue = {0: 'OFF', 1: 'ON'};
            return {
                threshold_1_protection: protectionLookup[buffer[1]],
                threshold_1: stateLookup[buffer[0]],
                threshold_1_value: buffer[3] | (buffer[2] << 8),
                threshold_2_protection: protectionLookup[buffer[5]],
                threshold_2: stateLookup[buffer[4]],
                threshold_2_value: buffer[7] | (buffer[6] << 8),
            };
        },
    },
    selfTestResult: valueConverterBasic.lookup({checking: 0, success: 1, failure: 2, others: 3}),
    lockUnlock: valueConverterBasic.lookup({LOCK: true, UNLOCK: false}),
    localTempCalibration1: {
        from: (v: number) => {
            if (v > 55) v -= 0x100000000;
            return v / 10;
        },
        to: (v: number) => {
            if (v > 0) return v * 10;
            if (v < 0) return v * 10 + 0x100000000;
            return v;
        },
    },
    localTempCalibration2: {
        from: (v: number) => v,
        to: (v: number) => {
            if (v < 0) return v + 0x100000000;
            return v;
        },
    },
    localTempCalibration3: {
        from: (v: number) => {
            if (v > 0x7fffffff) v -= 0x100000000;
            return v / 10;
        },
        to: (v: number) => {
            if (v > 0) return v * 10;
            if (v < 0) return v * 10 + 0x100000000;
            return v;
        },
    },
    thermostatHolidayStartStop: {
        from: (v: string) => {
            const start = {
                year: v.slice(0, 4),
                month: v.slice(4, 6),
                day: v.slice(6, 8),
                hours: v.slice(8, 10),
                minutes: v.slice(10, 12),
            };
            const end = {
                year: v.slice(12, 16),
                month: v.slice(16, 18),
                day: v.slice(18, 20),
                hours: v.slice(20, 22),
                minutes: v.slice(22, 24),
            };
            const startStr = `${start.year}/${start.month}/${start.day} ${start.hours}:${start.minutes}`;
            const endStr = `${end.year}/${end.month}/${end.day} ${end.hours}:${end.minutes}`;
            return `${startStr} | ${endStr}`;
        },
        to: (v: string) => {
            const numberPattern = /\d+/g;
            // @ts-ignore
            return v.match(numberPattern).join([]).toString();
        },
    },
    thermostatScheduleDaySingleDP: {
        from: (v: number[]) => {
            // day split to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            const periodSize = 3;
            const schedule = [];

            for (let i = 0; i < maxPeriodsInDay; i++) {
                const time = v[i * periodSize];
                const totalMinutes = time * 10;
                const hours = totalMinutes / 60;
                const rHours = Math.floor(hours);
                const minutes = (hours - rHours) * 60;
                const rMinutes = Math.round(minutes);
                const strHours = rHours.toString().padStart(2, '0');
                const strMinutes = rMinutes.toString().padStart(2, '0');
                const tempHexArray = [v[i * periodSize + 1], v[i * periodSize + 2]];
                const tempRaw = Buffer.from(tempHexArray).readUIntBE(0, tempHexArray.length);
                const temp = tempRaw / 10;
                schedule.push(`${strHours}:${strMinutes}/${temp}`);
                if (rHours === 24) break;
            }

            return schedule.join(' ');
        },
        to: (v: KeyValue, meta: Tz.Meta) => {
            const dayByte: KeyValue = {
                monday: 1,
                tuesday: 2,
                wednesday: 4,
                thursday: 8,
                friday: 16,
                saturday: 32,
                sunday: 64,
            };
            const weekDay = v.week_day;
            utils.assertString(weekDay, 'week_day');
            if (Object.keys(dayByte).indexOf(weekDay) === -1) {
                throw new Error('Invalid "week_day" property value: ' + weekDay);
            }
            let weekScheduleType;
            if (meta.state && meta.state.working_day) weekScheduleType = meta.state.working_day;
            const payload = [];

            switch (weekScheduleType) {
                case 'mon_sun':
                    payload.push(127);
                    break;
                case 'mon_fri+sat+sun':
                    if (['saturday', 'sunday'].indexOf(weekDay) === -1) {
                        payload.push(31);
                        break;
                    }
                    payload.push(dayByte[weekDay]);
                    break;
                case 'separate':
                    payload.push(dayByte[weekDay]);
                    break;
                default:
                    throw new Error('Invalid "working_day" property, need to set it before');
            }

            // day split to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            utils.assertString(v.schedule, 'schedule');
            const schedule = v.schedule.split(' ');
            const schedulePeriods = schedule.length;
            if (schedulePeriods > 10) throw new Error('There cannot be more than 10 periods in the schedule: ' + v);
            if (schedulePeriods < 2) throw new Error('There cannot be less than 2 periods in the schedule: ' + v);
            let prevHour;

            for (const period of schedule) {
                const timeTemp = period.split('/');
                const hm = timeTemp[0].split(':', 2);
                const h = parseInt(hm[0]);
                const m = parseInt(hm[1]);
                const temp = parseFloat(timeTemp[1]);
                if (h < 0 || h > 24 || m < 0 || m >= 60 || m % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
                    throw new Error('Invalid hour, minute or temperature of: ' + period);
                } else if (prevHour > h) {
                    throw new Error(`The hour of the next segment can't be less than the previous one: ${prevHour} > ${h}`);
                }
                prevHour = h;
                const segment = (h * 60 + m) / 10;
                const tempHexArray = convertDecimalValueTo2ByteHexArray(temp * 10);
                payload.push(segment, ...tempHexArray);
            }

            // Add "technical" periods to be valid payload
            for (let i = 0; i < maxPeriodsInDay - schedulePeriods; i++) {
                // by default it sends 9000b2, it's 24 hours and 18 degrees
                payload.push(144, 0, 180);
            }

            return payload;
        },
    },
    thermostatScheduleDayMultiDP: {
        from: (v: string) => {
            const schedule = [];
            for (let index = 1; index < 17; index = index + 4) {
                schedule.push(
                    String(parseInt(v[index + 0])).padStart(2, '0') +
                        ':' +
                        String(parseInt(v[index + 1])).padStart(2, '0') +
                        '/' +
                        // @ts-ignore
                        (parseFloat((v[index + 2] << 8) + v[index + 3]) / 10.0).toFixed(1),
                );
            }
            return schedule.join(' ');
        },
        to: (v: string) => {
            const payload = [0];
            const transitions = v.split(' ');
            if (transitions.length != 4) {
                throw new Error('Invalid schedule: there should be 4 transitions');
            }
            for (const transition of transitions) {
                const timeTemp = transition.split('/');
                if (timeTemp.length != 2) {
                    throw new Error('Invalid schedule: wrong transition format: ' + transition);
                }
                const hourMin = timeTemp[0].split(':');
                const hour = parseInt(hourMin[0]);
                const min = parseInt(hourMin[1]);
                const temperature = Math.floor(parseFloat(timeTemp[1]) * 10);
                if (hour < 0 || hour > 24 || min < 0 || min > 60 || temperature < 50 || temperature > 300) {
                    throw new Error('Invalid hour, minute or temperature of: ' + transition);
                }
                payload.push(hour, min, (temperature & 0xff00) >> 8, temperature & 0xff);
            }
            return payload;
        },
    },
    thermostatScheduleDayMultiDPWithDayNumber: (dayNum: number) => {
        return {
            from: (v: string) => valueConverter.thermostatScheduleDayMultiDP.from(v),
            to: (v: string) => {
                const data = valueConverter.thermostatScheduleDayMultiDP.to(v);
                data[0] = dayNum;
                return data;
            },
        };
    },
    tv02Preset: () => {
        return {
            from: (v: number) => {
                if (v === 0) return 'auto';
                else if (v === 1) return 'manual';
                else return 'holiday'; // 2 and 3 are holiday
            },
            to: (v: string, meta: Tz.Meta) => {
                if (v === 'auto') return new Enum(0);
                else if (v === 'manual') return new Enum(1);
                else if (v === 'holiday') {
                    // https://github.com/Koenkk/zigbee2mqtt/issues/20486
                    if (meta.device.manufacturerName === '_TZE200_mudxchsu') return new Enum(2);
                    else return new Enum(3);
                } else throw new Error(`Unsupported preset '${v}'`);
            },
        };
    },
    thermostatSystemModeAndPreset: (toKey: string) => {
        return {
            from: (v: string) => {
                utils.assertNumber(v, 'system_mode');
                const presetLookup: KeyValueNumberString = {0: 'auto', 1: 'manual', 2: 'off', 3: 'on'};
                const systemModeLookup: KeyValueNumberString = {0: 'auto', 1: 'auto', 2: 'off', 3: 'heat'};
                return {preset: presetLookup[v], system_mode: systemModeLookup[v]};
            },
            to: (v: string) => {
                const presetLookup: KeyValueStringEnum = {auto: new Enum(0), manual: new Enum(1), off: new Enum(2), on: new Enum(3)};
                const systemModeLookup: KeyValueStringEnum = {auto: new Enum(1), off: new Enum(2), heat: new Enum(3)};
                const lookup: KeyValueStringEnum = toKey === 'preset' ? presetLookup : systemModeLookup;
                return utils.getFromLookup(v, lookup);
            },
        };
    },
    ZWT198_schedule: {
        from: (value: number[], meta: Fz.Meta, options: KeyValue) => {
            const programmingMode = [];

            for (let i = 0; i < 8; i++) {
                const start = i * 4;

                const time = value[start].toString().padStart(2, '0') + ':' + value[start + 1].toString().padStart(2, '0');
                const temp = (value[start + 2] * 256 + value[start + 3]) / 10;
                const tempStr = temp.toFixed(1) + '°C';
                programmingMode.push(time + '/' + tempStr);
            }
            return {
                schedule_weekday: programmingMode.slice(0, 6).join(' '),
                schedule_holiday: programmingMode.slice(6, 8).join(' '),
            };
        },
        to: async (v: string, meta: Tz.Meta) => {
            const dpId = 109;
            const payload: number[] = [];
            let weekdayFormat: string;
            let holidayFormat: string;

            if (meta.message.hasOwnProperty('schedule_weekday')) {
                weekdayFormat = v;
                holidayFormat = meta.state['schedule_holiday'] as string;
            } else {
                weekdayFormat = meta.state['schedule_weekday'] as string;
                holidayFormat = v;
            }

            function scheduleToRaw(key: string, input: string, number: number, payload: number[], meta: Tz.Meta) {
                const items = input.trim().split(/\s+/);

                if (items.length != number) {
                    throw new Error('Wrong number of items for ' + key + ' :' + items.length);
                } else {
                    for (let i = 0; i < number; i++) {
                        const timeTemperature = items[i].split('/');
                        if (timeTemperature.length != 2) {
                            throw new Error('Invalid schedule: wrong transition format: ' + items[i]);
                        }
                        const hourMinute = timeTemperature[0].split(':', 2);
                        const hour = parseInt(hourMinute[0]);
                        const minute = parseInt(hourMinute[1]);
                        const temperature = parseFloat(timeTemperature[1]);

                        if (
                            !utils.isNumber(hour) ||
                            !utils.isNumber(temperature) ||
                            !utils.isNumber(minute) ||
                            hour < 0 ||
                            hour >= 24 ||
                            minute < 0 ||
                            minute >= 60 ||
                            temperature < 5 ||
                            temperature >= 35
                        ) {
                            throw new Error(
                                'Invalid hour, minute or temperature (5<t<35) in ' +
                                    key +
                                    ' of: `' +
                                    items[i] +
                                    '`; Format is `hh:m/cc.c` or `hh:mm/cc.c°C`',
                            );
                        }
                        const temperature10 = Math.round(temperature * 10);

                        payload.push(hour, minute, (temperature10 >> 8) & 0xff, temperature10 & 0xff);
                    }
                }
                return;
            }

            scheduleToRaw('schedule_weekday', weekdayFormat, 6, payload, meta);
            scheduleToRaw('schedule_holiday', holidayFormat, 2, payload, meta);

            const entity = meta.device.endpoints[0];
            const sendCommand = utils.getMetaValue(entity, meta.mapped, 'tuyaSendCommand', undefined, 'dataRequest');
            await sendDataPointRaw(entity, dpId, payload, sendCommand, 1);
        },
    },
    TV02SystemMode: {
        to: async (v: number, meta: Tz.Meta) => {
            const entity = meta.device.endpoints[0];
            if (meta.message.system_mode) {
                if (meta.message.system_mode === 'off') {
                    await sendDataPointBool(entity, 107, true, 'dataRequest', 1);
                } else {
                    await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
                }
            } else if (meta.message.heating_stop) {
                if (meta.message.heating_stop === 'ON') {
                    await sendDataPointBool(entity, 107, true, 'dataRequest', 1);
                } else {
                    await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
                }
            }
        },
        from: (v: boolean) => {
            return {system_mode: v === false ? 'heat' : 'off', heating_stop: v === false ? 'OFF' : 'ON'};
        },
    },
    TV02FrostProtection: {
        to: async (v: unknown, meta: Tz.Meta) => {
            const entity = meta.device.endpoints[0];
            if (v === 'ON') {
                await sendDataPointBool(entity, 10, true, 'dataRequest', 1);
            } else {
                await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
            }
        },
        from: (v: unknown) => {
            return {frost_protection: v === false ? 'OFF' : 'ON'};
        },
    },
    inverse: {to: (v: boolean) => !v, from: (v: boolean) => !v},
    onOffNotStrict: {from: (v: string) => (v ? 'ON' : 'OFF'), to: (v: string) => v === 'ON'},
    errorOrBatteryLow: {
        from: (v: number) => {
            if (v === 0) return {battery_low: false};
            if (v === 1) return {battery_low: true};
            return {error: v};
        },
    },
    // https://developer.tuya.com/en/docs/connect-subdevices-to-gateways/tuya-zigbee-multiple-switch-access-standard?id=K9ik6zvnqr09m
    inchingSwitch: {
        to: (value: KeyValueAny) => {
            let result = '';
            for (let i = 1; i <= 6; i++) {
                if (value['inching_control_' + i] == undefined || value['inching_time_' + i] == undefined) continue;

                let state = value['inching_control_' + i] == 'ENABLE' ? 1 : 0;
                if (i != 1) {
                    // Second endpoint onwards base number is determined by 2 powered by endpoint number less 1
                    state += 2 ** (i - 1);
                }
                const secs: number = parseInt(value['inching_time_' + i]);
                const byte1 = secs >> 8; // Equivalent to Math.truc(secs / 256)
                const byte2 = secs % 256;
                const ascii = String.fromCharCode(state, byte1, byte2);
                result += Buffer.from(ascii).toString('base64');
            }
            return result;
        },

        from: (value: string) => {
            // break the value into 4 char encoded char which will give 3 char when decoded
            const data: KeyValue = {};
            for (let i = 0; i < value.length; i += 4) {
                const b64asc = value.substring(i, i + 4);
                const str = Buffer.from(b64asc, 'base64').toString('utf8');
                const cca0 = str.charCodeAt(0);
                const cca1 = str.charCodeAt(1);
                const cca2 = str.charCodeAt(2);
                let tmp = 0;
                let status = '';
                // first value indicates the endpoint and if it is on or off
                // 0-1 - 1st endpoint, 2-3 - 2nd endpoint, ...
                switch (cca0) {
                    case 0:
                        data['inching_control_1'] = 'DISABLE';
                        data['inching_time_1'] = (cca1 << 8) + cca2;
                        break;
                    case 1:
                        data['inching_control_1'] = 'ENABLE';
                        data['inching_time_1'] = (cca1 << 8) + cca2;
                        break;
                    default:
                        // endpoint #
                        tmp = Math.trunc(Math.log2(cca0)) + 1;
                        status = cca0 % 2 ? 'ENABLE' : 'DISABLE';
                        data['inching_control_' + tmp] = status;
                        data['inching_time_' + tmp] = (cca1 << 8) + cca2;
                }
            }
            return data;
        },
    },
};

const tuyaTz = {
    power_on_behavior_1: {
        key: ['power_on_behavior', 'power_outage_memory'],
        convertSet: async (entity, key, value, meta) => {
            // Deprecated: remove power_outage_memory
            const moesStartUpOnOff = utils.getFromLookup(
                value,
                key === 'power_on_behavior' ? {off: 0, on: 1, previous: 2} : {off: 0, on: 1, restore: 2},
            );
            await entity.write('genOnOff', {moesStartUpOnOff});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['moesStartUpOnOff']);
        },
    } satisfies Tz.Converter,
    power_on_behavior_2: {
        key: ['power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            const powerOnBehavior = utils.getFromLookup(value, {off: 0, on: 1, previous: 2});
            await entity.write('manuSpecificTuya_3', {powerOnBehavior});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificTuya_3', ['powerOnBehavior']);
        },
    } satisfies Tz.Converter,
    switch_type: {
        key: ['switch_type'],
        convertSet: async (entity, key, value, meta) => {
            const switchType = utils.getFromLookup(value, {toggle: 0, state: 1, momentary: 2});
            await entity.write('manuSpecificTuya_3', {switchType}, {disableDefaultResponse: true});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificTuya_3', ['switchType']);
        },
    } satisfies Tz.Converter,
    backlight_indicator_mode_1: {
        key: ['backlight_mode', 'indicator_mode'],
        convertSet: async (entity, key, value, meta) => {
            const tuyaBacklightMode = utils.getFromLookup(
                value,
                key === 'backlight_mode' ? {low: 0, medium: 1, high: 2, off: 0, normal: 1, inverted: 2} : {off: 0, 'off/on': 1, 'on/off': 2, on: 3},
            );
            await entity.write('genOnOff', {tuyaBacklightMode});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['tuyaBacklightMode']);
        },
    } satisfies Tz.Converter,
    backlight_indicator_mode_2: {
        key: ['backlight_mode'],
        convertSet: async (entity, key, value, meta) => {
            const tuyaBacklightSwitch = utils.getFromLookup(value, {off: 0, on: 1});
            await entity.write('genOnOff', {tuyaBacklightSwitch});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['tuyaBacklightSwitch']);
        },
    } satisfies Tz.Converter,
    child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            const v = utils.getFromLookup(value, {lock: true, unlock: false});
            await entity.write('genOnOff', {0x8000: {value: v, type: 0x10}});
        },
    } satisfies Tz.Converter,
    min_brightness_attribute: {
        key: ['min_brightness'],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value, `min_brightness`);
            const minValueHex = number.toString(16);
            const maxValueHex = 'ff';
            const minMaxValue = parseInt(`${minValueHex}${maxValueHex}`, 16);
            const payload = {0xfc00: {value: minMaxValue, type: 0x21}};
            await entity.write('genLevelCtrl', payload, {disableDefaultResponse: true});
            return {state: {min_brightness: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', [0xfc00]);
        },
    } satisfies Tz.Converter,
    min_brightness_command: {
        key: ['min_brightness'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            const payload = {minimum: value};
            await entity.command('lightingColorCtrl', 'tuyaSetMinimumBrightness', payload);
            return {state: {min_brightness: value}};
        },
        // The response contains the value but as the data type, randomly
        // causing malformed messages
        // convertGet: async (entity, key, meta) => {
        //    await entity.read('lightingColorCtrl', [0xf102]);
        // },
    } satisfies Tz.Converter,
    color_power_on_behavior: {
        key: ['color_power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            const v = utils.getFromLookup(value, {initial: 0, previous: 1, customized: 2});
            await entity.command('lightingColorCtrl', 'tuyaOnStartUp', {mode: v * 256, data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]});
            return {state: {color_power_on_behavior: value}};
        },
    } satisfies Tz.Converter,
    datapoints: {
        convertSet: async (entity, key, value, meta) => {
            // A set converter is only called once; therefore we need to loop
            const state: KeyValue = {};
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            const datapoints = meta.mapped.meta?.tuyaDatapoints;
            if (!datapoints) throw new Error('No datapoints map defined');
            for (const [attr, value] of Object.entries(meta.message)) {
                const convertedKey: string =
                    meta.mapped.meta.multiEndpoint && meta.endpoint_name && !attr.startsWith(`${key}_`) ? `${attr}_${meta.endpoint_name}` : attr;
                const dpEntry = datapoints.find((d) => d[1] === convertedKey);
                if (!dpEntry?.[1] || !dpEntry?.[2].to) {
                    throw new Error(`No datapoint defined for '${attr}'`);
                }
                if (dpEntry[3] && dpEntry[3].skip && dpEntry[3].skip(meta)) continue;
                const dpId = dpEntry[0];
                const convertedValue = await dpEntry[2].to(value, meta);
                const sendCommand = utils.getMetaValue(entity, meta.mapped, 'tuyaSendCommand', undefined, 'dataRequest');
                if (convertedValue === undefined) {
                    // conversion done inside converter, ignore.
                } else if (typeof convertedValue === 'boolean') {
                    await sendDataPointBool(entity, dpId, convertedValue, sendCommand, 1);
                } else if (typeof convertedValue === 'number') {
                    await sendDataPointValue(entity, dpId, convertedValue, sendCommand, 1);
                } else if (typeof convertedValue === 'string') {
                    await sendDataPointStringBuffer(entity, dpId, convertedValue, sendCommand, 1);
                } else if (Array.isArray(convertedValue)) {
                    await sendDataPointRaw(entity, dpId, convertedValue, sendCommand, 1);
                } else if (convertedValue instanceof Enum) {
                    await sendDataPointEnum(entity, dpId, convertedValue.valueOf(), sendCommand, 1);
                } else if (convertedValue instanceof Bitmap) {
                    await sendDataPointBitmap(entity, dpId, convertedValue.valueOf(), sendCommand, 1);
                } else {
                    throw new Error(`Don't know how to send type '${typeof convertedValue}'`);
                }

                if (dpEntry[3] && dpEntry[3].optimistic === false) continue;

                state[key] = value;
            }
            return {state};
        },
    } satisfies Tz.Converter,
    do_not_disturb: {
        key: ['do_not_disturb'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('lightingColorCtrl', 'tuyaDoNotDisturb', {enable: value ? 1 : 0});
            return {state: {do_not_disturb: value}};
        },
    } satisfies Tz.Converter,
    on_off_countdown: {
        // Note: This is the Tuya on-off countdown feature documented for switches and smart plugs
        //       using the Zigbee 'onWithTimedOff' command in a non-standard way.
        //       There is also an alternative on-off countdown implementation mostly for for Tuya Lighting
        //       products that uses private commands and attributes. However, those devices should also
        //       provide datapoints so there is little reason to provide support.
        key: ['state', 'countdown'],
        convertSet: async (entity, key, value, meta) => {
            const state = meta.message.hasOwnProperty('state')
                ? utils.isString(meta.message.state)
                    ? meta.message.state.toLowerCase()
                    : undefined
                : undefined;
            const countdown = meta.message.hasOwnProperty('countdown') ? meta.message.countdown : undefined;
            const result: KeyValue = {};
            if (countdown !== undefined) {
                // OnTime is a 16bit register and so might very well work up to 0xFFFF seconds but
                // the Tuya documentation says that the maximum is 43200 (so 12 hours).
                // @ts-expect-error
                if (!Number.isInteger(countdown) || countdown < 0 || countdown > 12 * 3600) {
                    throw new Error('countdown must be an integer between 1 and 43200 (12 hours) or 0 to cancel');
                }
            }
            // The order of the commands matters because 'on/off/toggle' cancels 'onWithTimedOff'.
            if (state !== undefined) {
                utils.validateValue(state, ['toggle', 'off', 'on']);
                await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
                if (state === 'toggle') {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                    if (currentState) {
                        result.state = currentState === 'OFF' ? 'ON' : 'OFF';
                    }
                } else {
                    result.state = state.toUpperCase();
                }
                // A side effect of setting the state is to cancel any running coundown.
                result.countdown = 0;
            }
            if (countdown !== undefined) {
                // offwaittime is probably not used but according to the Tuya documentation, it should
                // be set to the same value than ontime.
                const payload = {ctrlbits: 0, ontime: countdown, offwaittime: countdown};
                await entity.command('genOnOff', 'onWithTimedOff', payload, utils.getOptions(meta.mapped, entity));
                if (result.hasOwnProperty('state')) {
                    result.countdown = countdown;
                }
            }
            return {state: result};
        },
        convertGet: async (entity, key, meta) => {
            if (key == 'state') {
                await entity.read('genOnOff', ['onOff']);
            } else if (key == 'countdown') {
                await entity.read('genOnOff', ['onTime']);
            }
        },
    } satisfies Tz.Converter,
    inchingSwitch: {
        key: ['inching_control_set'],
        convertSet: async (entity, key, value: KeyValue, meta) => {
            const inchingControl = 'inching_control';
            const inchingTime = 'inching_time';
            const result = {};
            const inching = valueConverter.inchingSwitch.to(value);
            const payload = {payload: inching};
            const endpoint = meta.device.getEndpoint(1);
            await endpoint.command('manuSpecificTuya_4', 'setInchingSwitch', payload, utils.getOptions(meta.mapped, endpoint));

            return {state: {inching_control_set: value}};
        },
    } satisfies Tz.Converter,
};
export {tuyaTz as tz};

const tuyaFz = {
    brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('61440')) {
                const property = utils.postfixWithEndpointName('brightness', msg, model, meta);
                return {[property]: utils.mapNumberRange(msg.data['61440'], 0, 1000, 0, 255)};
            }
        },
    } satisfies Fz.Converter,
    gateway_connection_status: {
        cluster: 'manuSpecificTuya',
        type: ['commandMcuGatewayConnectionStatus'],
        convert: async (model, msg, publish, options, meta) => {
            // "payload" can have the following values:
            // 0x00: The gateway is not connected to the internet.
            // 0x01: The gateway is connected to the internet.
            // 0x02: The request timed out after three seconds.
            const payload = {payloadSize: 1, payload: 1};
            await msg.endpoint.command('manuSpecificTuya', 'mcuGatewayConnectionStatus', payload, {});
        },
    } satisfies Fz.Converter,
    power_on_behavior_1: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('moesStartUpOnOff')) {
                const lookup: KeyValue = {0: 'off', 1: 'on', 2: 'previous'};
                const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
                return {[property]: lookup[msg.data['moesStartUpOnOff']]};
            }
        },
    } satisfies Fz.Converter,
    power_on_behavior_2: {
        cluster: 'manuSpecificTuya_3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const attribute = 'powerOnBehavior';
            const lookup: KeyValue = {0: 'off', 1: 'on', 2: 'previous'};
            if (msg.data.hasOwnProperty(attribute)) {
                const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
                return {[property]: lookup[msg.data[attribute]]};
            }
        },
    } satisfies Fz.Converter,
    power_outage_memory: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('moesStartUpOnOff')) {
                const lookup: KeyValue = {0x00: 'off', 0x01: 'on', 0x02: 'restore'};
                const property = utils.postfixWithEndpointName('power_outage_memory', msg, model, meta);
                return {[property]: lookup[msg.data['moesStartUpOnOff']]};
            }
        },
    } satisfies Fz.Converter,
    switch_type: {
        cluster: 'manuSpecificTuya_3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('switchType')) {
                const lookup: KeyValue = {0: 'toggle', 1: 'state', 2: 'momentary'};
                return {switch_type: lookup[msg.data['switchType']]};
            }
        },
    } satisfies Fz.Converter,
    backlight_mode_low_medium_high: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                const value = msg.data['tuyaBacklightMode'];
                const backlightLookup: KeyValue = {0: 'low', 1: 'medium', 2: 'high'};
                return {backlight_mode: backlightLookup[value]};
            }
        },
    } satisfies Fz.Converter,
    backlight_mode_off_normal_inverted: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                return {backlight_mode: utils.getFromLookup(msg.data['tuyaBacklightMode'], {0: 'off', 1: 'normal', 2: 'inverted'})};
            }
        },
    } satisfies Fz.Converter,
    backlight_mode_off_on: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightSwitch')) {
                return {backlight_mode: utils.getFromLookup(msg.data['tuyaBacklightSwitch'], {0: 'OFF', 1: 'ON'})};
            }
        },
    } satisfies Fz.Converter,
    indicator_mode: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                return {indicator_mode: utils.getFromLookup(msg.data['tuyaBacklightMode'], {0: 'off', 1: 'off/on', 2: 'on/off', 3: 'on'})};
            }
        },
    } satisfies Fz.Converter,
    child_lock: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('32768')) {
                const value = msg.data['32768'];
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            }
        },
    } satisfies Fz.Converter,
    min_brightness_attribute: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty(0xfc00)) {
                const property = utils.postfixWithEndpointName('min_brightness', msg, model, meta);
                const value = parseInt(msg.data[0xfc00].toString(16).slice(0, 2), 16);
                return {[property]: value};
            }
        },
    } satisfies Fz.Converter,
    datapoints: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (!model.meta || !model.meta.tuyaDatapoints) throw new Error('No datapoints map defined');
            const datapoints = model.meta.tuyaDatapoints;
            for (const dpValue of msg.data.dpValues) {
                const dpId = dpValue.dp;
                const dpEntry = datapoints.find((d) => d[0] === dpId);
                const value = getDataValue(dpValue);
                if (dpEntry?.[2]?.from) {
                    if (dpEntry[1]) {
                        result[dpEntry[1]] = dpEntry[2].from(value, meta, options, publish, msg);
                    } else {
                        Object.assign(result, dpEntry[2].from(value, meta, options, publish, msg));
                    }
                } else {
                    logger.debug(`Datapoint ${dpId} not defined for '${meta.device.manufacturerName}' with value ${value}`, NS);
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    on_off_action: {
        cluster: 'genOnOff',
        type: 'commandTuyaAction',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data[0])) return;
            const clickMapping: KeyValueNumberString = {0: 'single', 1: 'double', 2: 'hold'};
            const buttonMapping: KeyValueNumberString = {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8'};
            // TS004F has single endpoint, TS0041A/TS0041 can have multiple but have just one button
            const button =
                msg.device.endpoints.length == 1 || ['TS0041A', 'TS0041'].includes(msg.device.modelID) ? '' : `${buttonMapping[msg.endpoint.ID]}_`;
            return {action: `${button}${clickMapping[msg.data.value]}`};
        },
    } satisfies Fz.Converter,
    on_off_countdown: {
        // While a countdown is in progress, the device will report onTime at all multiples of 60.
        // More reportings can be configured for 'onTime` but they will happen independently of
        // the builtin 60s reporting.
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onTime')) {
                const payload: KeyValue = {};
                const property = utils.postfixWithEndpointName('countdown', msg, model, meta);
                const countdown = msg.data['onTime'];
                payload[property] = countdown;
                return payload;
            }
        },
    } satisfies Fz.Converter,
    inchingSwitch: {
        cluster: 'manuSpecificTuya_4',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('inching')) {
                const payload: KeyValue = {};
                const value = valueConverter.inchingSwitch.from(msg.data['inching']);
                payload['inching_control_set'] = value;
                return payload;
            }
        },
    } satisfies Fz.Converter,
};
export {tuyaFz as fz};

export function getHandlersForDP(
    name: string,
    dp: number,
    type: number,
    converter: Tuya.ValueConverterSingle,
    readOnly?: boolean,
    skip?: (meta: Tz.Meta) => boolean,
    endpoint?: string,
    useGlobalSequence?: boolean,
): [Fz.Converter[], Tz.Converter[]] {
    const keyName = endpoint ? `${name}_${endpoint}` : name;
    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'manuSpecificTuya',
            type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
            convert: (model, msg, publish, options, meta) => {
                const dpValue = msg.data.dpValues.find((d: Tuya.DpValue) => d.dp === dp);
                if (dpValue) {
                    return {[keyName]: converter.from(getDataValue(dpValue))};
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = readOnly
        ? undefined
        : [
              {
                  key: [name],
                  endpoint: endpoint,
                  convertSet: async (entity, key, value, meta) => {
                      // A set converter is only called once; therefore we need to loop
                      const state: KeyValue = {};
                      if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
                      for (const [attr, value] of Object.entries(meta.message)) {
                          const convertedKey: string =
                              meta.mapped.meta && meta.mapped.meta.multiEndpoint && meta.endpoint_name && !attr.startsWith(`${key}_`)
                                  ? `${attr}_${meta.endpoint_name}`
                                  : attr;
                          // logger.debug(`key: ${key}, convertedKey: ${convertedKey}, keyName: ${keyName}`);
                          if (convertedKey !== keyName) continue;
                          if (skip && skip(meta)) continue;

                          const convertedValue = await converter.to(value, meta);
                          const sendCommand = utils.getMetaValue(entity, meta.mapped, 'tuyaSendCommand', undefined, 'dataRequest');
                          const seq = useGlobalSequence ? undefined : 1;
                          // logger.debug(`dp: ${dp}, value: ${value}, convertedValue: ${convertedValue}`);

                          if (convertedValue === undefined) {
                              // conversion done inside converter, ignore.
                          } else if (type == dataTypes.bool) {
                              await sendDataPointBool(entity, dp, convertedValue as boolean, sendCommand, seq);
                          } else if (type == dataTypes.number) {
                              await sendDataPointValue(entity, dp, convertedValue as number, sendCommand, seq);
                          } else if (type == dataTypes.string) {
                              await sendDataPointStringBuffer(entity, dp, convertedValue as string, sendCommand, seq);
                          } else if (type == dataTypes.raw) {
                              await sendDataPointRaw(entity, dp, convertedValue as number[], sendCommand, seq);
                          } else if (type == dataTypes.enum) {
                              await sendDataPointEnum(entity, dp, convertedValue as number, sendCommand, seq);
                          } else if (type == dataTypes.bitmap) {
                              await sendDataPointBitmap(entity, dp, convertedValue as number, sendCommand, seq);
                          } else {
                              throw new Error(`Don't know how to send type '${typeof convertedValue}'`);
                          }

                          state[convertedKey] = value;
                      }
                      return {state};
                  },
              },
          ];

    return [fromZigbee, toZigbee];
}

export interface TuyaDPEnumLookupArgs {
    name: string;
    dp: number;
    type?: number;
    lookup?: KeyValue;
    description?: string;
    readOnly?: boolean;
    endpoint?: string;
    skip?: (meta: Tz.Meta) => boolean;
    expose?: Expose;
}
export interface TuyaDPBinaryArgs {
    name: string;
    dp: number;
    type: number;
    valueOn: [string | boolean, unknown];
    valueOff: [string | boolean, unknown];
    description?: string;
    readOnly?: boolean;
    endpoint?: string;
    skip?: (meta: Tz.Meta) => boolean;
    expose?: Expose;
}

export interface TuyaDPNumericArgs {
    name: string;
    dp: number;
    type: number;
    description?: string;
    readOnly?: boolean;
    endpoint?: string;
    unit?: string;
    skip?: (meta: Tz.Meta) => boolean;
    valueMin?: number;
    valueMax?: number;
    valueStep?: number;
    scale?: number | [number, number, number, number];
    expose?: exposes.Numeric;
}

export interface TuyaDPLightArgs {
    state: {dp: number; type: number; valueOn: [string | boolean, unknown]; valueOff: [string | boolean, unknown]; skip?: (meta: Tz.Meta) => boolean};
    brightness: {dp: number; type: number; scale?: number | [number, number, number, number]};
    max?: {dp: number; type: number; scale?: number | [number, number, number, number]};
    min?: {dp: number; type: number; scale?: number | [number, number, number, number]};
    colorTemp?: {dp: number; type: number; range: Range; scale?: number | [number, number, number, number]};
    // color?: {dp: number, type: number, scale?: number | [number, number, number, number]},
    endpoint?: string;
}

const tuyaModernExtend = {
    dpEnumLookup(args: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        const {name, dp, type, lookup, description, readOnly, endpoint, expose, skip} = args;
        let exp: Expose;
        if (expose) {
            exp = expose;
        } else {
            exp = new exposes.Enum(name, readOnly ? ea.STATE : ea.STATE_SET, Object.keys(lookup)).withDescription(description);
        }
        if (endpoint) exp = exp.withEndpoint(endpoint);

        const handlers: [Fz.Converter[], Tz.Converter[]] = getHandlersForDP(
            name,
            dp,
            type,
            {
                from: (value) => utils.getFromLookupByValue(value, lookup),
                to: (value) => utils.getFromLookup(value, lookup),
            },
            readOnly,
            skip,
            endpoint,
        );

        return {exposes: [exp], fromZigbee: handlers[0], toZigbee: handlers[1], isModernExtend: true};
    },
    dpBinary(args: Partial<TuyaDPBinaryArgs>): ModernExtend {
        const {name, dp, type, valueOn, valueOff, description, readOnly, endpoint, expose, skip} = args;
        let exp: Expose;
        if (expose) {
            exp = expose;
        } else {
            exp = e.binary(name, readOnly ? ea.STATE : ea.STATE_SET, valueOn[0], valueOff[0]).withDescription(description);
        }
        if (endpoint) exp = exp.withEndpoint(endpoint);

        const handlers: [Fz.Converter[], Tz.Converter[]] = getHandlersForDP(
            name,
            dp,
            type,
            {
                from: (value) => (value === valueOn[1] ? valueOn[0] : valueOff[0]),
                to: (value) => (value === valueOn[0] ? valueOn[1] : valueOff[1]),
            },
            readOnly,
            skip,
            endpoint,
        );

        return {exposes: [exp], fromZigbee: handlers[0], toZigbee: handlers[1], isModernExtend: true};
    },
    dpNumeric(args: Partial<TuyaDPNumericArgs>): ModernExtend {
        const {name, dp, type, description, readOnly, endpoint, unit, valueMax, valueMin, valueStep, scale, expose, skip} = args;
        let exp: exposes.Numeric;
        if (expose) {
            exp = expose;
        } else {
            exp = e.numeric(name, readOnly ? ea.STATE : ea.STATE_SET).withDescription(description);
        }
        if (endpoint) exp = exp.withEndpoint(endpoint);
        if (unit) exp = exp.withUnit(unit);
        if (valueMin !== undefined) exp = exp.withValueMin(valueMin);
        if (valueMax !== undefined) exp = exp.withValueMax(valueMax);
        if (valueStep !== undefined) exp = exp.withValueStep(valueStep);

        let converter;
        if (scale === undefined) {
            converter = valueConverterBasic.raw();
        } else {
            if (Array.isArray(scale)) {
                converter = valueConverterBasic.scale(scale[0], scale[1], scale[2], scale[3]);
            } else {
                converter = valueConverterBasic.divideBy(scale);
            }
        }

        const handlers: [Fz.Converter[], Tz.Converter[]] = getHandlersForDP(name, dp, type, converter, readOnly, skip, endpoint);

        return {exposes: [exp], fromZigbee: handlers[0], toZigbee: handlers[1], isModernExtend: true};
    },
    dpLight(args: TuyaDPLightArgs): ModernExtend {
        const {state, brightness, min, max, colorTemp, endpoint} = args;
        let exp = e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET);
        let fromZigbee: Fz.Converter[] = [];
        let toZigbee: Tz.Converter[] = [];
        let ext: ModernExtend;
        if (min) {
            exp = exp.withMinBrightness().setAccess('min_brightness', ea.STATE_SET);
        }
        if (max) {
            exp = exp.withMaxBrightness().setAccess('max_brightness', ea.STATE_SET);
        }
        if (colorTemp) {
            exp = exp.withColorTemp(colorTemp.range).setAccess('color_temp', ea.STATE_SET);
        }
        // if (color) {
        //     exp = exp.withColor(['hs']).setAccess('color_hs', ea.STATE_SET);
        // }
        if (endpoint) exp = exp.withEndpoint(endpoint);
        ext = tuyaModernExtend.dpBinary({
            name: 'state',
            dp: state.dp,
            type: state.type,
            valueOn: state.valueOn,
            valueOff: state.valueOff,
            skip: state.skip,
            endpoint: endpoint,
        });
        fromZigbee = [...fromZigbee, ...ext.fromZigbee];
        toZigbee = [...toZigbee, ...ext.toZigbee];
        ext = tuyaModernExtend.dpNumeric({name: 'brightness', dp: brightness.dp, type: brightness.type, scale: brightness.scale, endpoint: endpoint});
        fromZigbee = [...fromZigbee, ...ext.fromZigbee];
        toZigbee = [...toZigbee, ...ext.toZigbee];
        if (min) {
            ext = tuyaModernExtend.dpNumeric({name: 'min_brightness', dp: min.dp, type: min.type, scale: min.scale, endpoint: endpoint});
            fromZigbee = [...fromZigbee, ...ext.fromZigbee];
            toZigbee = [...toZigbee, ...ext.toZigbee];
        }
        if (max) {
            ext = tuyaModernExtend.dpNumeric({name: 'max_brightness', dp: max.dp, type: max.type, scale: max.scale, endpoint: endpoint});
            fromZigbee = [...fromZigbee, ...ext.fromZigbee];
            toZigbee = [...toZigbee, ...ext.toZigbee];
        }
        if (colorTemp) {
            ext = tuyaModernExtend.dpNumeric({
                name: 'color_temp',
                dp: colorTemp.dp,
                type: colorTemp.type,
                scale: colorTemp.scale,
                endpoint: endpoint,
            });
            fromZigbee = [...fromZigbee, ...ext.fromZigbee];
            toZigbee = [...toZigbee, ...ext.toZigbee];
        }
        // if (color) {
        //     const handlers = getHandlersForDP('color', color.dp, color.type,
        //         valueConverterBasic.color1000(), undefined, undefined, endpoint);

        //     fromZigbee = [...fromZigbee, ...handlers[0]];
        //     toZigbee = [...toZigbee, ...handlers[1]];
        // }

        // combine extends for one expose
        return {exposes: [exp], fromZigbee, toZigbee, isModernExtend: true};
    },
    dpTemperature(args?: Partial<TuyaDPNumericArgs>): ModernExtend {
        return tuyaModernExtend.dpNumeric({name: 'temperature', type: dataTypes.number, readOnly: true, scale: 10, expose: e.temperature(), ...args});
    },
    dpHumidity(args?: Partial<TuyaDPNumericArgs>): ModernExtend {
        return tuyaModernExtend.dpNumeric({name: 'humidity', type: dataTypes.number, readOnly: true, expose: e.humidity(), ...args});
    },
    dpBattery(args?: Partial<TuyaDPNumericArgs>): ModernExtend {
        return tuyaModernExtend.dpNumeric({name: 'battery', type: dataTypes.number, readOnly: true, expose: e.battery(), ...args});
    },
    dpBatteryState(args?: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        return tuyaModernExtend.dpEnumLookup({
            name: 'battery_state',
            type: dataTypes.number,
            lookup: {low: 0, medium: 1, high: 2},
            readOnly: true,
            expose: tuyaExposes.batteryState(),
            ...args,
        });
    },
    dpTemperatureUnit(args?: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        return tuyaModernExtend.dpEnumLookup({
            name: 'temperature_unit',
            type: dataTypes.enum,
            lookup: {celsius: 0, fahrenheit: 1},
            readOnly: true,
            expose: tuyaExposes.temperatureUnit(),
            ...args,
        });
    },
    dpContact(args?: Partial<TuyaDPBinaryArgs>, invert?: boolean): ModernExtend {
        return tuyaModernExtend.dpBinary({
            name: 'contact',
            type: dataTypes.bool,
            valueOn: invert ? [true, true] : [true, false],
            valueOff: invert ? [false, false] : [false, true],
            readOnly: true,
            expose: e.contact(),
            ...args,
        });
    },
    dpAction(args?: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        const {lookup} = args;
        return tuyaModernExtend.dpEnumLookup({
            name: 'action',
            type: dataTypes.number,
            readOnly: true,
            expose: e.action(Object.keys(lookup)),
            ...args,
        });
    },
    dpIlluminance(args?: Partial<TuyaDPNumericArgs>): ModernExtend {
        return tuyaModernExtend.dpNumeric({name: 'illuminance', type: dataTypes.number, readOnly: true, expose: e.illuminance(), ...args});
    },
    dpGas(args?: Partial<TuyaDPBinaryArgs>, invert?: boolean): ModernExtend {
        return tuyaModernExtend.dpBinary({
            name: 'gas',
            type: dataTypes.enum,
            valueOn: invert ? [true, 1] : [true, 0],
            valueOff: invert ? [false, 0] : [false, 1],
            readOnly: true,
            expose: e.gas(),
            ...args,
        });
    },
    dpOnOff(args?: Partial<TuyaDPBinaryArgs>): ModernExtend {
        const {readOnly} = args;
        return tuyaModernExtend.dpBinary({
            name: 'state',
            type: dataTypes.bool,
            valueOn: ['ON', true],
            valueOff: ['OFF', false],
            expose: e.switch().setAccess('state', readOnly ? ea.STATE : ea.STATE_SET),
            ...args,
        });
    },
    dpPowerOnBehavior(args?: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        const {readOnly} = args;
        let {lookup} = args;
        lookup = lookup || {off: 0, on: 1, previous: 2};
        return tuyaModernExtend.dpEnumLookup({
            name: 'power_on_behavior',
            lookup: lookup,
            type: dataTypes.enum,
            expose: e.power_on_behavior(Object.keys(lookup)).withAccess(readOnly ? ea.STATE : ea.STATE_SET),
            ...args,
        });
    },
    tuyaLight(args?: modernExtend.LightArgs & {minBrightness?: 'none' | 'attribute' | 'command'; switchType?: boolean}) {
        args = {minBrightness: 'none', powerOnBehavior: false, switchType: false, ...args};
        if (args.colorTemp) {
            args.colorTemp = {startup: false, ...args.colorTemp};
        }
        if (args.color) {
            args.color = {applyRedFix: true, enhancedHue: false, ...(utils.isBoolean(args.color) ? {} : args.color)};
        }

        const result = modernExtend.light({...args, powerOnBehavior: false});

        result.fromZigbee.push(tuyaFz.brightness);
        result.toZigbee.push(tuyaTz.do_not_disturb);
        result.exposes.push(tuyaExposes.doNotDisturb());

        if (args.powerOnBehavior) {
            result.fromZigbee.push(tuyaFz.power_on_behavior_2);
            result.toZigbee.push(tuyaTz.power_on_behavior_2);
            if (args.endpointNames) {
                result.exposes.push(...args.endpointNames.map((ee) => e.power_on_behavior().withEndpoint(ee)));
            } else {
                result.exposes.push(e.power_on_behavior());
            }
        }

        if (args.switchType) {
            result.fromZigbee.push(tuyaFz.switch_type);
            result.toZigbee.push(tuyaTz.switch_type);
            result.exposes.push(tuyaExposes.switchType());
        }

        if (args.minBrightness === 'attribute') {
            result.fromZigbee.push(tuyaFz.min_brightness_attribute);
            result.toZigbee.push(tuyaTz.min_brightness_attribute);
            result.exposes = result.exposes.map((e) => (typeof e !== 'function' && utils.isLightExpose(e) ? e.withMinBrightness() : e));
        } else if (args.minBrightness === 'command') {
            result.toZigbee.push(tuyaTz.min_brightness_command);
            result.exposes = result.exposes.map((e) =>
                typeof e !== 'function' && utils.isLightExpose(e) ? e.withMinBrightness().setAccess('min_brightness', ea.STATE_SET) : e,
            );
        }

        if (args.color) {
            result.toZigbee.push(tuyaTz.color_power_on_behavior);
            result.exposes.push(tuyaExposes.colorPowerOnBehavior());
        }

        return result;
    },
    tuyaOnOff: (
        args: {
            endpoints?: string[];
            powerOutageMemory?: boolean;
            powerOnBehavior2?: boolean;
            switchType?: boolean;
            backlightModeLowMediumHigh?: boolean;
            indicatorMode?: boolean;
            backlightModeOffNormalInverted?: boolean;
            backlightModeOffOn?: boolean;
            electricalMeasurements?: boolean;
            electricalMeasurementsFzConverter?: Fz.Converter;
            childLock?: boolean;
            switchMode?: boolean;
            onOffCountdown?: boolean;
            inchingSwitch?: boolean;
        } = {},
    ): ModernExtend => {
        const exposes: (Expose | DefinitionExposesFunction)[] = args.endpoints
            ? args.endpoints.map((ee) => e.switch().withEndpoint(ee))
            : [e.switch()];
        const fromZigbee: Fz.Converter[] = [fz.on_off, fz.ignore_basic_report];
        const toZigbee: Tz.Converter[] = [];
        if (args.onOffCountdown) {
            fromZigbee.push(tuyaFz.on_off_countdown);
            toZigbee.push(tuyaTz.on_off_countdown);
            if (args.endpoints) {
                exposes.push(...args.endpoints.map((ee) => tuyaExposes.countdown().withAccess(ea.ALL).withEndpoint(ee)));
            } else {
                exposes.push(tuyaExposes.countdown().withAccess(ea.ALL));
            }
        } else {
            toZigbee.push(tz.on_off);
        }
        if (args.powerOutageMemory) {
            // Legacy, powerOnBehavior is preferred
            fromZigbee.push(tuyaFz.power_outage_memory);
            toZigbee.push(tuyaTz.power_on_behavior_1);
            exposes.push(tuyaExposes.powerOutageMemory());
        } else if (args.powerOnBehavior2) {
            fromZigbee.push(tuyaFz.power_on_behavior_2);
            toZigbee.push(tuyaTz.power_on_behavior_2);
            if (args.endpoints) {
                exposes.push(...args.endpoints.map((ee) => e.power_on_behavior().withEndpoint(ee)));
            } else {
                exposes.push(e.power_on_behavior());
            }
        } else {
            fromZigbee.push(tuyaFz.power_on_behavior_1);
            toZigbee.push(tuyaTz.power_on_behavior_1);
            exposes.push(e.power_on_behavior());
        }

        if (args.switchType) {
            fromZigbee.push(tuyaFz.switch_type);
            toZigbee.push(tuyaTz.switch_type);
            exposes.push(tuyaExposes.switchType());
        }

        if (args.backlightModeOffOn) {
            fromZigbee.push(tuyaFz.backlight_mode_off_on);
            exposes.push(tuyaExposes.backlightModeOffOn());
            toZigbee.push(tuyaTz.backlight_indicator_mode_2);
        }
        if (args.backlightModeLowMediumHigh) {
            fromZigbee.push(tuyaFz.backlight_mode_low_medium_high);
            exposes.push(tuyaExposes.backlightModeLowMediumHigh());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }
        if (args.backlightModeOffNormalInverted) {
            fromZigbee.push(tuyaFz.backlight_mode_off_normal_inverted);
            exposes.push(tuyaExposes.backlightModeOffNormalInverted());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }
        if (args.indicatorMode) {
            fromZigbee.push(tuyaFz.indicator_mode);
            exposes.push(tuyaExposes.indicatorMode());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }

        if (args.electricalMeasurements) {
            fromZigbee.push(args.electricalMeasurementsFzConverter || fz.electrical_measurement, fz.metering);
            exposes.push(e.power(), e.current(), e.voltage(), e.energy());
        }
        if (args.childLock) {
            fromZigbee.push(tuyaFz.child_lock);
            toZigbee.push(tuyaTz.child_lock);
            exposes.push(e.child_lock());
        }

        if (args.switchMode) {
            if (args.endpoints) {
                args.endpoints.forEach(function (ep) {
                    const epExtend = tuyaModernExtend.tuyaSwitchMode({
                        description: `Switch mode ${ep}`,
                        endpointName: ep,
                    });
                    fromZigbee.push(...epExtend.fromZigbee);
                    toZigbee.push(...epExtend.toZigbee);
                    exposes.push(...epExtend.exposes);
                });
            } else {
                const extend = tuyaModernExtend.tuyaSwitchMode({description: 'Switch mode'});
                fromZigbee.push(...extend.fromZigbee);
                toZigbee.push(...extend.toZigbee);
                exposes.push(...extend.exposes);
            }
        }

        if (args.inchingSwitch) {
            let quantity = 1;
            if (args.endpoints) {
                quantity = args.endpoints.length;
            }
            fromZigbee.push(tuyaFz.inchingSwitch);
            exposes.push(tuyaExposes.inchingSwitch(quantity));
            toZigbee.push(tuyaTz.inchingSwitch);
        }

        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    dpBacklightMode(args?: Partial<TuyaDPEnumLookupArgs>): ModernExtend {
        const {readOnly} = args;
        let {lookup} = args;
        lookup = lookup || {off: 0, normal: 1, inverted: 2};
        return tuyaModernExtend.dpEnumLookup({
            name: 'backlight_mode',
            lookup: lookup,
            type: dataTypes.enum,
            expose: tuyaExposes.backlightModeOffNormalInverted().withAccess(readOnly ? ea.STATE : ea.STATE_SET),
            ...args,
        });
    },
    combineActions(actions: ModernExtend[]): ModernExtend {
        let newValues: (string | number)[] = [];
        let newFromZigbee: Fz.Converter[] = [];
        let description: string;
        // collect action values and handlers
        for (const actionME of actions) {
            const {exposes, fromZigbee} = actionME;
            newValues = newValues.concat((exposes[0] as exposes.Enum).values);
            description = (exposes[0] as exposes.Enum).description;
            newFromZigbee = newFromZigbee.concat(fromZigbee);
        }

        // create single enum-expose
        const exp = new exposes.Enum('action', ea.STATE, newValues).withDescription(description);

        return {exposes: [exp], fromZigbee: newFromZigbee, isModernExtend: true};
    },
    tuyaSwitchMode: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'switch_mode',
            lookup: {switch: 0, scene: 1},
            cluster: 'manuSpecificTuya_3',
            attribute: 'switchMode',
            description: 'Work mode for switch',
            entityCategory: 'config',
            ...args,
        }),
    tuyaLedIndicator(): ModernExtend {
        const fromZigbee = [tuyaFz.backlight_mode_off_normal_inverted];
        const exp = tuyaExposes.backlightModeOffNormalInverted();
        const toZigbee = [tuyaTz.backlight_indicator_mode_1];

        return {exposes: [exp], toZigbee, fromZigbee, isModernExtend: true};
    },
    tuyaMagicPacket(): ModernExtend {
        return {configure: [configureMagicPacket], isModernExtend: true};
    },
    tuyaOnOffAction(args?: Partial<modernExtend.ActionEnumLookupArgs>): ModernExtend {
        return modernExtend.actionEnumLookup({
            actionLookup: {0: 'single', 1: 'double', 2: 'hold'},
            cluster: 'genOnOff',
            commands: ['commandTuyaAction'],
            attribute: 'value',
        });
    },
    tuyaOnOffActionLegacy(args: {actions: ('single' | 'double' | 'hold')[]; endpointNames?: string[]}): ModernExtend {
        // For new devices use tuyaOnOffAction instead
        const actions = args.actions.map((a) => (args.endpointNames ? args.endpointNames.map((e) => `${e}_${a}`) : [a])).flat();
        const exposes: Expose[] = [e.action(actions)];
        const fromZigbee: Fz.Converter[] = [tuyaFz.on_off_action];
        return {exposes, fromZigbee, isModernExtend: true};
    },
    dpChildLock(args?: Partial<TuyaDPBinaryArgs>): ModernExtend {
        return tuyaModernExtend.dpBinary({
            name: 'child_lock',
            type: dataTypes.bool,
            valueOn: ['LOCK', true],
            valueOff: ['UNLOCK', false],
            expose: e.child_lock(),
            ...args,
        });
    },
};
export {tuyaModernExtend as modernExtend};

const tuyaClusters = {
    addTuyaCommonPrivateCluster: (): ModernExtend =>
        modernExtend.deviceAddCustomCluster('manuSpecificTuya_4', {
            ID: 0xe000,
            attributes: {
                random_timing: {ID: 0xd001, type: Zcl.DataType.CHAR_STR},
                cycle_timing: {ID: 0xd002, type: Zcl.DataType.CHAR_STR},
                inching: {ID: 0xd003, type: Zcl.DataType.CHAR_STR},
            },
            commands: {
                setRandomTiming: {
                    ID: 0xf7,
                    parameters: [{name: 'payload', type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                setCycleTiming: {
                    ID: 0xf8,
                    parameters: [{name: 'payload', type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                setInchingSwitch: {
                    ID: 0xfb,
                    parameters: [{name: 'payload', type: Zcl.BuffaloZclDataType.BUFFER}],
                },
            },
            commandsResponse: {},
        }),
};

export {tuyaClusters as clusters};

exports.exposes = tuyaExposes;
exports.modernExtend = tuyaModernExtend;
exports.tz = tuyaTz;
exports.fz = tuyaFz;
exports.clusters = tuyaClusters;
exports.enum = (value: number) => new Enum(value);
exports.bitmap = (value: number) => new Bitmap(value);
exports.valueConverter = valueConverter;
exports.valueConverterBasic = valueConverterBasic;
exports.sendDataPointBool = sendDataPointBool;
exports.sendDataPointEnum = sendDataPointEnum;
exports.onEventSetTime = onEventSetTime;
exports.onEventSetLocalTime = onEventSetLocalTime;
exports.onEventMeasurementPoll = onEventMeasurementPoll;
exports.skip = skip;
exports.configureMagicPacket = configureMagicPacket;
exports.fingerprint = fingerprint;
exports.whitelabel = whitelabel;
exports.dataTypes = dataTypes;
