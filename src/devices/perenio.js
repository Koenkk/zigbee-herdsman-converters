const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const e = exposes.presets;
const ea = exposes.access;
const ota = require('../lib/ota');

const switchTypeValues = [
    'maintained_state',
    'maintained_toggle',
    'momentary_state',
    'momentary_press',
    'momentary_release',
];

const defaultOnOffStateValues = [
    'on',
    'off',
    'previous',
];

const fzPerenio = {
    diagnostic: {
        cluster: 'haDiagnostic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('lastMessageLqi')) {
                result['last_message_lqi'] = msg.data['lastMessageLqi'];
            }
            if (msg.data.hasOwnProperty('lastMessageRssi')) {
                result['last_message_rssi'] = msg.data['lastMessageRssi'];
            }
            return result;
        },
    },
    switch_type: {
        cluster: 'genMultistateValue',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const switchTypeLookup = {
                0x0001: 'momentary_state',
                0x0010: 'maintained_state',
                0x00CC: 'maintained_toggle',
                0x00CD: 'momentary_release',
                0x00DC: 'momentary_press',
            };
            if (msg.data.hasOwnProperty('presentValue')) {
                const property = utils.postfixWithEndpointName('switch_type', msg, model, meta);
                result[property] = switchTypeLookup[msg.data['presentValue']];
            }
            return result;
        },
    },
    smart_plug: {
        cluster: '64635',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(2)) {
                result['rms_current'] = msg.data[2];
            }
            if (msg.data.hasOwnProperty(3)) {
                result['rms_voltage'] = msg.data[3];
            }
            if (msg.data.hasOwnProperty(4)) {
                result['voltage_min'] = msg.data[4];
            }
            if (msg.data.hasOwnProperty(5)) {
                result['voltage_max'] = msg.data[5];
            }
            if (msg.data.hasOwnProperty(10)) {
                result['active_power'] = msg.data[10];
            }
            if (msg.data.hasOwnProperty(11)) {
                result['power_max'] = msg.data[11];
            }
            if (msg.data.hasOwnProperty(14)) {
                result['consumed_energy'] = msg.data[14];
            }
            if (msg.data.hasOwnProperty(15)) {
                result['consumed_energy_limit'] = msg.data[15];
            }
            if (msg.data.hasOwnProperty(24)) {
                result['rssi'] = msg.data[24];
            }
            const powerOnStateLookup = {
                0: 'off',
                1: 'on',
                2: 'previous',
            };
            if (msg.data.hasOwnProperty(0)) {
                result['default_on_off_state'] = powerOnStateLookup[msg.data[0]];
            }
            if (msg.data.hasOwnProperty(1)) {
                if (msg.data[1] == 0) {
                    result['alarm_voltage_min'] = false;
                    result['alarm_voltage_max'] = false;
                    result['alarm_power_max'] = false;
                    result['alarm_consumed_energy'] = false;
                } else {
                    if (msg.data[1] & 1) {
                        result['alarm_voltage_min'] = true;
                    }
                    if (msg.data[1] & 2) {
                        result['alarm_voltage_max'] = true;
                    }
                    if (msg.data[1] & 4) {
                        result['alarm_power_max'] = true;
                    }
                    if (msg.data[1] & 8) {
                        result['alarm_consumed_energy'] = true;
                    }
                }
            }
            return result;
        },
    },
};

const tzPerenio = {
    switch_type: {
        key: ['switch_type'],
        convertSet: async (entity, key, value, meta) => {
            const switchTypeLookup = {
                'momentary_state': 0x0001,
                'maintained_state': 0x0010,
                'maintained_toggle': 0x00CC,
                'momentary_release': 0x00CD,
                'momentary_press': 0x00DC,
            };
            await entity.write('genMultistateValue', {presentValue: switchTypeLookup[value]}, utils.getOptions(meta.mapped, entity));
            return {state: {switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genMultistateValue', ['presentValue']);
        },
    },
    default_state: {
        key: ['default_on_off_state'],
        convertSet: async (entity, key, val, meta) => {
            const powerOnStateLookup = {
                'off': 0,
                'on': 1,
                'previous': 2,
            };
            await entity.write(64635, {0: {value: powerOnStateLookup[val], type: 0x20}}, {manufacturerCode: 0x007B});
            return {state: {default_on_off_state: val}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(64635, [0]);
        },
    },
    alarms_reset: {
        key: ['alarm_voltage_min', 'alarm_voltage_max', 'alarm_power_max', 'alarm_consumed_energy'],
        convertSet: async (entity, key, val, meta) => {
            await entity.write(64635, {1: {value: 0, type: 0x20}}, {manufacturerCode: 0x007B});
            return {state: {alarm_voltage_min: false, alarm_voltage_max: false, alarm_power_max: false, alarm_consumed_energy: false}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(64635, [1]);
        },
    },
    alarms_limits: {
        key: ['voltage_min', 'voltage_max', 'power_max', 'consumed_energy_limit'],
        convertSet: async (entity, key, val, meta) => {
            switch (key) {
            case 'voltage_min':
                await entity.write(64635, {4: {value: val, type: 0x21}}, {manufacturerCode: 0x007B});
                break;
            case 'voltage_max':
                await entity.write(64635, {5: {value: val, type: 0x21}}, {manufacturerCode: 0x007B});
                break;
            case 'power_max':
                await entity.write(64635, {11: {value: val, type: 0x21}}, {manufacturerCode: 0x007B});
                break;
            case 'consumed_energy_limit':
                await entity.write(64635, {15: {value: val, type: 0x21}}, {manufacturerCode: 0x007B});
                break;
            }
            return {state: {[key]: val}};
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'voltage_min':
                await entity.read(64635, [4]);
                break;
            case 'voltage_max':
                await entity.read(64635, [5]);
                break;
            case 'power_max':
                await entity.read(64635, [11]);
                break;
            case 'consumed_energy_limit':
                await entity.read(64635, [15]);
                break;
            }
        },
    },
    on_off_mod: {
        key: ['state', 'on_time', 'off_wait_time'],
        convertSet: async (entity, key, value, meta) => {
            const state = meta.message.hasOwnProperty('state') ? meta.message.state.toLowerCase() : null;
            utils.validateValue(state, ['toggle', 'off', 'on']);
            const alarmVoltageMin = meta.state[`alarm_voltage_min${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
            const alarmVoltageMax = meta.state[`alarm_voltage_max${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
            const alarmPowerMax = meta.state[`alarm_power_max${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
            if (alarmVoltageMin || alarmVoltageMax || alarmPowerMax) {
                return {state: {state: 'OFF'}};
            }
            if (state === 'on' && (meta.message.hasOwnProperty('on_time') || meta.message.hasOwnProperty('off_wait_time'))) {
                const onTime = meta.message.hasOwnProperty('on_time') ? meta.message.on_time : 0;
                const offWaitTime = meta.message.hasOwnProperty('off_wait_time') ? meta.message.off_wait_time : 0;

                if (typeof onTime !== 'number') {
                    throw Error('The on_time value must be a number!');
                }
                if (typeof offWaitTime !== 'number') {
                    throw Error('The off_wait_time value must be a number!');
                }

                const payload = {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
                await entity.command('genOnOff', 'onWithTimedOff', payload, utils.getOptions(meta.mapped, entity));
            } else {
                await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
                if (state === 'toggle') {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                    return currentState ? {state: {state: currentState === 'OFF' ? 'ON' : 'OFF'}} : {};
                } else {
                    return {state: {state: state.toUpperCase()}};
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['onOff']);
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['PECLS01'],
        model: 'PECLS01',
        vendor: 'Perenio',
        description: 'Flood alarm device',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.ignore_basic_report, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['ZHA-DoorLockSensor'],
        model: 'PECWS01',
        vendor: 'Perenio',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'ZHA-PirSensor', manufacturerName: 'LDS'}],
        model: 'PECMS01',
        vendor: 'Perenio',
        description: 'Motion sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['PEHWE20', 'PEHWE2X'],
        model: 'PEHWE20',
        vendor: 'Perenio',
        description: 'Two channel single wire mini-relay',
        fromZigbee: [fz.on_off, fz.power_on_behavior, fzPerenio.diagnostic, fzPerenio.switch_type],
        toZigbee: [tz.on_off, tz.power_on_behavior, tzPerenio.switch_type],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint10 = device.getEndpoint(10);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint10, coordinatorEndpoint, ['haDiagnostic']);
            const payload = [{
                attribute: 'onOff',
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 0,
            }];
            const payloadDiagnostic = [{
                attribute: 'lastMessageLqi',
                minimumReportInterval: 5,
                maximumReportInterval: 60,
                reportableChange: 0,
            }, {
                attribute: 'lastMessageRssi',
                minimumReportInterval: 5,
                maximumReportInterval: 60,
                reportableChange: 0,
            }];
            await endpoint1.configureReporting('genOnOff', payload);
            await endpoint2.configureReporting('genOnOff', payload);
            await endpoint10.configureReporting('haDiagnostic', payloadDiagnostic);
            await endpoint1.read('genOnOff', ['onOff', 'startUpOnOff']);
            await endpoint2.read('genOnOff', ['onOff', 'startUpOnOff']);
            await endpoint1.read('genMultistateValue', ['presentValue']);
            await endpoint2.read('genMultistateValue', ['presentValue']);
            await endpoint10.read('haDiagnostic', ['lastMessageLqi', 'lastMessageRssi']);
        },
        exposes: [
            e.switch().withEndpoint('l1'),
            e.power_on_behavior().withEndpoint('l1'),
            exposes.enum('switch_type', ea.ALL, switchTypeValues).withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.power_on_behavior().withEndpoint('l2'),
            exposes.enum('switch_type', ea.ALL, switchTypeValues).withEndpoint('l2'),
            exposes.numeric('last_message_lqi', ea.STATE).withUnit('lqi')
                .withDescription('LQI seen by the device').withValueMin(0).withValueMax(255),
            exposes.numeric('last_message_rssi', ea.STATE).withUnit('dB')
                .withDescription('RSSI seen by the device').withValueMin(-128).withValueMax(127),
        ],
    },
    {
        zigbeeModel: ['PEHPL0X'],
        model: 'PEHPL0X',
        vendor: 'Perenio',
        description: 'Power link',
        fromZigbee: [fz.on_off, fzPerenio.smart_plug, fz.metering],
        toZigbee: [tzPerenio.on_off_mod, tzPerenio.default_state, tzPerenio.alarms_reset, tzPerenio.alarms_limits],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 64635]);
            const payload = [{
                attribute: 'onOff',
                minimumReportInterval: 1,
                maximumReportInterval: 3600,
                reportableChange: 0,
            }];
            await endpoint.configureReporting('genOnOff', payload);
            await endpoint.configureReporting(64635, [{
                attribute: {ID: 0x000a, type: 0x21},
                minimumReportInterval: 5,
                maximumReportInterval: 60,
                reportableChange: 0,
            }]);
            await endpoint.configureReporting(64635, [{
                attribute: {ID: 0x000e, type: 0x23},
                minimumReportInterval: 5,
                maximumReportInterval: 60,
                reportableChange: 0,
            }]);
            await endpoint.configureReporting(64635, [{
                attribute: {ID: 0x0003, type: 0x21},
                minimumReportInterval: 5,
                maximumReportInterval: 5,
                reportableChange: 0,
            }]);
            await endpoint.read(64635, [0, 1, 2, 3]);
            await endpoint.read(64635, [4, 5, 11, 15]);
        },
        exposes: [
            e.switch(),
            exposes.enum('default_on_off_state', ea.ALL, defaultOnOffStateValues),
            exposes.numeric('rms_voltage', ea.STATE).withUnit('V').withDescription('RMS voltage'),
            exposes.numeric('active_power', ea.STATE).withUnit('W').withDescription('Active power'),
            exposes.numeric('consumed_energy', ea.STATE).withUnit('W*h').withDescription('Consumed energy'),
            exposes.binary('alarm_voltage_min', ea.ALL, true, false)
                .withDescription('Indicates if the alarm is triggered on the voltage drop below the limit, allows to reset alarms'),
            exposes.binary('alarm_voltage_max', ea.ALL, true, false)
                .withDescription('Indicates if the alarm is triggered on the voltage rise above the limit, allows to reset alarms'),
            exposes.binary('alarm_power_max', ea.ALL, true, false)
                .withDescription('Indicates if the alarm is triggered on the active power rise above the limit, allows to reset alarms'),
            exposes.binary('alarm_consumed_energy', ea.ALL, true, false)
                .withDescription(
                    'Indicates if the alarm is triggered when the consumption energy limit is reached, allows to reset alarms'),
            exposes.numeric('voltage_min', ea.ALL).withValueMin(0).withValueMax(253)
                .withDescription('Minimum allowable voltage limit for alarms.'),
            exposes.numeric('voltage_max', ea.ALL).withValueMin(0).withValueMax(253)
                .withDescription('Maximum allowable voltage limit for alarms.'),
            exposes.numeric('power_max', ea.ALL).withValueMin(0).withValueMax(65534)
                .withDescription('Maximum allowable power limit for alarms.'),
            exposes.numeric('consumed_energy_limit', ea.ALL).withValueMin(0).withValueMax(65534)
                .withDescription('Limit of electric energy consumption in kW*h. 0 value represents no limit'),
            exposes.numeric('rssi', ea.STATE).withUnit('dB')
                .withDescription('RSSI seen by the device').withValueMin(-128).withValueMax(127),
        ],
        ota: ota.zigbeeOTA,
    },
];

