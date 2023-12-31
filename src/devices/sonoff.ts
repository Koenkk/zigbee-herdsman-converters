import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {binary, forcePowerSource, numeric, enumLookup, onOff} from '../lib/modernExtend';
import {Definition, Fz, KeyValue} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;
import * as ota from '../lib/ota';

const fzLocal = {
    router_config: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('currentLevel')) {
                result.light_indicator_level = msg.data['currentLevel'];
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['NSPanelP-Router'],
        model: 'NSPanelP-Router',
        vendor: 'SONOFF',
        description: 'Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        // configureReporting fails for this device
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
    },
    {
        zigbeeModel: ['ZBMINI-L'],
        model: 'ZBMINI-L',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch (no neutral)',
        ota: ota.zigbeeOTA,
        extend: [onOff()],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ZBMINIL2'],
        model: 'ZBMINIL2',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch (no neutral)',
        ota: ota.zigbeeOTA,
        extend: [onOff()],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['01MINIZB'],
        model: 'ZBMINI',
        vendor: 'SONOFF',
        description: 'Zigbee two way smart switch',
        extend: [onOff({powerOnBehavior: false}), forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true})],
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'TH01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['DS01', 'SNZB-04'],
        model: 'SNZB-04',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK06'}],
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['WB01', 'WB-01'],
        model: 'SNZB-01',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK07'}],
        description: 'Wireless button',
        exposes: [e.battery(), e.action(['single', 'double', 'long']), e.battery_voltage()],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        fingerprint: [
            // ModelID is from the button (SNZB-01) but this is SNZB-02, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee2mqtt/issues/4338
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'WB01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'DS01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['TH01'],
        model: 'SNZB-02',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK08'}],
        description: 'Temperature and humidity sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        fromZigbee: [fz.SNZB02_temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 5, max: constants.repInterval.MINUTES_30, change: 20});
                await reporting.humidity(endpoint);
                await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
                await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`);
            }
        },
    },
    {
        zigbeeModel: ['SNZB-02D'],
        model: 'SNZB-02D',
        vendor: 'SONOFF',
        description: 'Temperature and humidity sensor with screen',
        exposes: [e.battery(), e.temperature(), e.humidity()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint, {min: 5, max: constants.repInterval.MINUTES_30, change: 20});
            await reporting.humidity(endpoint);
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        fingerprint: [
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
            {
                // SNZB-O3 OUVOPO Wireless Motion Sensor (2023)
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'SNZB-03', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['MS01', 'MSO1'],
        model: 'SNZB-03',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK09'}],
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            // 3600/7200 prevents disconnect
            // https://github.com/Koenkk/zigbee2mqtt/issues/13600#issuecomment-1283827935
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['S26R2ZB'],
        model: 'S26R2ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['S40LITE'],
        model: 'S40ZBTPB',
        vendor: 'SONOFF',
        description: '15A Zigbee smart plug',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, ota: ota.zigbeeOTA})],
    },
    {
        zigbeeModel: ['DONGLE-E_R'],
        model: 'ZBDongle-E',
        vendor: 'SONOFF',
        description: 'Sonoff Zigbee 3.0 USB Dongle Plus (EFR32MG21) with router firmware',
        fromZigbee: [fz.linkquality_from_basic, fzLocal.router_config],
        toZigbee: [],
        exposes: [e.numeric('light_indicator_level', ea.STATE).withDescription('Brightness of the indicator light').withAccess(ea.STATE)],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ZBCurtain'],
        model: 'ZBCurtain',
        vendor: 'SONOFF',
        description: 'Zigbee smart curtain motor',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['Z111PL0H-1JX', 'SA-029-1'],
        model: 'SA-028/SA-029',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'Woolley', model: 'SA-029-1'}],
        description: 'Smart Plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SNZB-01P'],
        model: 'SNZB-01P',
        vendor: 'SONOFF',
        description: 'Wireless button',
        exposes: [e.battery(), e.action(['single', 'double', 'long']), e.battery_low(), e.battery_voltage()],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['SNZB-02P'],
        model: 'SNZB-02P',
        vendor: 'SONOFF',
        description: 'Temperature and humidity sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_low(), e.battery_voltage()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 5, max: constants.repInterval.MINUTES_30, change: 20});
                await reporting.humidity(endpoint);
                await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`);
            }
        },
    },
    {
        zigbeeModel: ['SNZB-04P'],
        model: 'SNZB-04P',
        vendor: 'SONOFF',
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        extend: [
            binary({
                name: 'tamper',
                cluster: 0xFC11,
                attribute: {ID: 0x2000, type: 0x20},
                description: 'Tamper-proof status',
                valueOn: [true, 0x01],
                valueOff: [false, 0x00],
                zigbeeCommandOptions: {manufacturerCode: 0x1286},
                readOnly: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['SNZB-03P'],
        model: 'SNZB-03P',
        vendor: 'SONOFF',
        description: 'Zigbee PIR sensor',
        fromZigbee: [fz.occupancy, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
        extend: [
            numeric({
                name: 'motion_timeout',
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: 'Unoccupied to occupied delay',
                valueMin: 5,
                valueMax: 60,
            }),
            enumLookup({
                name: 'illumination',
                lookup: {'dim': 0, 'bright': 1},
                cluster: 0xFC11,
                attribute: {ID: 0x2001, type: 0x20},
                zigbeeCommandOptions: {manufacturerCode: 0x1286},
                description: 'Only updated when occupancy is detected',
                readOnly: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['SNZB-06P'],
        model: 'SNZB-06P',
        vendor: 'SONOFF',
        description: 'Zigbee occupancy sensor',
        fromZigbee: [fz.occupancy],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.occupancy()],
        extend: [
            numeric({
                name: 'occupancy_timeout',
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: 'Unoccupied to occupied delay',
                valueMin: 15,
                valueMax: 65535,
            }),
            enumLookup({
                name: 'occupancy_sensitivity',
                lookup: {'low': 1, 'medium': 2, 'high': 3},
                cluster: 0x0406,
                attribute: {ID: 0x0022, type: 0x20},
                description: 'Sensitivity of human presence detection',
            }),
            enumLookup({
                name: 'illumination',
                lookup: {'dim': 0, 'bright': 1},
                cluster: 0xFC11,
                attribute: {ID: 0x2001, type: 0x20},
                description: 'Only updated when occupancy is detected',
                zigbeeCommandOptions: {manufacturerCode: 0x1286},
                readOnly: true,
            }),
        ],
    },
    {
        zigbeeModel: ['TRVZB'],
        model: 'TRVZB',
        vendor: 'SONOFF',
        description: 'Zigbee thermostatic radiator valve',
        exposes: [
            e.climate()
                .withSetpoint('occupied_heating_setpoint', 4, 35, 0.5)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-7.0, 7.0, 0.2)
                .withSystemMode(['off', 'auto', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withRunningState(['idle', 'heat'], ea.STATE_GET),
            e.battery(),
            e.battery_low(),
        ],
        fromZigbee: [
            fz.thermostat,
            fz.battery,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
        ],
        ota: ota.zigbeeOTA,
        extend: [
            binary({
                name: 'child_lock',
                cluster: 0xFC11,
                attribute: {ID: 0x0000, type: 0x10},
                description: 'Enables/disables physical input on the device',
                valueOn: ['LOCK', 0x01],
                valueOff: ['UNLOCK', 0x00],
            }),
            binary({
                name: 'open_window',
                cluster: 0xFC11,
                attribute: {ID: 0x6000, type: 0x10},
                description: 'Automatically turns off the radiator when local temperature drops by more than 1.5°C in 4.5 minutes.',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
            }),
            numeric({
                name: 'frost_protection_temperature',
                cluster: 0xFC11,
                attribute: {ID: 0x6002, type: 0x29},
                description: 'Minimum temperature at which to automatically turn on the radiator, ' +
                    'if system mode is off, to prevent pipes freezing.',
                valueMin: 4.0,
                valueMax: 35.0,
                valueStep: 0.5,
                unit: '°C',
                scale: 100,
            }),
            numeric({
                name: 'idle_steps',
                cluster: 0xFC11,
                attribute: {ID: 0x6003, type: 0x21},
                description: 'Number of steps used for calibration (no-load steps)',
                readOnly: true,
            }),
            numeric({
                name: 'closing_steps',
                cluster: 0xFC11,
                attribute: {ID: 0x6004, type: 0x21},
                description: 'Number of steps it takes to close the valve',
                readOnly: true,
            }),
            numeric({
                name: 'valve_opening_limit_voltage',
                cluster: 0xFC11,
                attribute: {ID: 0x6005, type: 0x21},
                description: 'Valve opening limit voltage',
                unit: 'mV',
                readOnly: true,
            }),
            numeric({
                name: 'valve_closing_limit_voltage',
                cluster: 0xFC11,
                attribute: {ID: 0x6006, type: 0x21},
                description: 'Valve closing limit voltage',
                unit: 'mV',
                readOnly: true,
            }),
            numeric({
                name: 'valve_motor_running_voltage',
                cluster: 0xFC11,
                attribute: {ID: 0x6007, type: 0x21},
                description: 'Valve motor running voltage',
                unit: 'mV',
                readOnly: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read(0xFC11, [0x0000, 0x6000, 0x6002, 0x6003, 0x6004, 0x6005, 0x6006, 0x6007]);
        },
    },
    {
        zigbeeModel: ['S60ZBTPF'],
        model: 'S60ZBTPF',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['S60ZBTPG'],
        model: 'S60ZBTPG',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
