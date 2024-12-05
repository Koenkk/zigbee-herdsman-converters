import {Zcl} from 'zigbee-herdsman';

import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import {binary, deviceAddCustomCluster, electricityMeter, numeric, onOff} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, KeyValue, Tz} from '../lib/types';
import * as utils from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

const manufacturerOptions = {manufacturerCode: 0x143b};

const aminaControlAttributes = {
    cluster: 0xfee7,
    alarms: 0x02,
    ev_status: 0x03,
    connect_status: 0x04,
    single_phase: 0x05,
    offline_current: 0x06,
    offline_single_phase: 0x07,
    time_to_offline: 0x08,
    enable_offline: 0x09,
    total_active_energy: 0x10,
    last_session_energy: 0x11,
};

const aminaAlarms = [
    'welded_relay',
    'wrong_voltage_balance',
    'rdc_dd_dc_leakage',
    'rdc_dd_ac_leakage',
    'high_temperature',
    'overvoltage',
    'undervoltage',
    'overcurrent',
    'car_communication_error',
    'charger_processing_error',
    'critical_overcurrent',
    'critical_powerloss',
    'unknown_alarm_bit_12',
    'unknown_alarm_bit_13',
    'unknown_alarm_bit_14',
    'unknown_alarm_bit_15',
];

const aminaAlarmsEnum = e.enum('alarm', ea.STATE_GET, aminaAlarms);

const fzLocal = {
    ev_status: {
        cluster: 'aminaControlCluster',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};

            if (msg.data.evStatus !== undefined) {
                let statusText = 'Not Connected';
                const evStatus = msg.data['evStatus'];

                result.ev_connected = (evStatus & (1 << 0)) !== 0;
                result.charging = (evStatus & (1 << 2)) !== 0;
                result.derated = (evStatus & (1 << 15)) !== 0;

                if (result.ev_connected === true) statusText = 'EV Connected';
                if ((evStatus & (1 << 1)) !== 0) statusText = 'Ready to charge';
                if (result.charging === true) statusText = 'Charging';
                if ((evStatus & (1 << 3)) !== 0) statusText = 'Charging Paused';

                if (result.derated === true) statusText += ', Derated';

                result.ev_status = statusText;

                return result;
            }
        },
    } satisfies Fz.Converter,

    alarms: {
        cluster: 'aminaControlCluster',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};

            if (msg.data.alarms !== undefined) {
                result.alarm_active = false;

                if (msg.data['alarms'] !== 0) {
                    result.alarms = aminaAlarmsEnum.values.filter((_, i) => (msg.data['alarms'] & (1 << i)) !== 0);
                    result.alarm_active = true;
                }

                return result;
            }
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    charge_limit: {
        key: ['charge_limit'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {level: value, transtime: 0};
            await entity.command('genLevelCtrl', 'moveToLevel', payload, utils.getOptions(meta.mapped, entity));
        },

        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel'], manufacturerOptions);
        },
    } satisfies Tz.Converter,

    ev_status: {
        key: ['ev_status'],
        convertGet: async (entity, key, meta) => {
            await entity.read('aminaControlCluster', ['evStatus'], manufacturerOptions);
        },
    } satisfies Tz.Converter,

    alarms: {
        key: ['alarms'],
        convertGet: async (entity, key, meta) => {
            await entity.read('aminaControlCluster', ['alarms'], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['amina S'],
        model: 'amina S',
        vendor: 'Amina Distribution AS',
        description: 'Amina S EV Charger',
        ota: true,
        fromZigbee: [fzLocal.ev_status, fzLocal.alarms],
        toZigbee: [tzLocal.ev_status, tzLocal.alarms, tzLocal.charge_limit],
        exposes: [
            e.text('ev_status', ea.STATE_GET).withDescription('Current charging status'),
            e.list('alarms', ea.STATE_GET, aminaAlarmsEnum).withDescription('List of active alarms'),
        ],
        extend: [
            deviceAddCustomCluster('aminaControlCluster', {
                ID: aminaControlAttributes.cluster,
                manufacturerCode: manufacturerOptions.manufacturerCode,
                attributes: {
                    alarms: {ID: aminaControlAttributes.alarms, type: Zcl.DataType.BITMAP16},
                    evStatus: {ID: aminaControlAttributes.ev_status, type: Zcl.DataType.BITMAP16},
                    connectStatus: {ID: aminaControlAttributes.connect_status, type: Zcl.DataType.BITMAP16},
                    singlePhase: {ID: aminaControlAttributes.single_phase, type: Zcl.DataType.UINT8},
                    offlineCurrent: {ID: aminaControlAttributes.offline_current, type: Zcl.DataType.UINT8},
                    offlineSinglePhase: {ID: aminaControlAttributes.offline_single_phase, type: Zcl.DataType.UINT8},
                    timeToOffline: {ID: aminaControlAttributes.time_to_offline, type: Zcl.DataType.UINT16},
                    enableOffline: {ID: aminaControlAttributes.enable_offline, type: Zcl.DataType.UINT8},
                    totalActiveEnergy: {ID: aminaControlAttributes.total_active_energy, type: Zcl.DataType.UINT32},
                    lastSessionEnergy: {ID: aminaControlAttributes.last_session_energy, type: Zcl.DataType.UINT32},
                },
                commands: {},
                commandsResponse: {},
            }),

            onOff({
                powerOnBehavior: false,
            }),

            numeric({
                name: 'charge_limit',
                cluster: 'genLevelCtrl',
                attribute: 'currentLevel',
                description: 'Maximum allowed amperage draw',
                reporting: {min: 0, max: 'MAX', change: 1},
                unit: 'A',
                valueMin: 6,
                valueMax: 32,
                valueStep: 1,
                access: 'ALL',
            }),

            numeric({
                name: 'total_active_power',
                cluster: 'haElectricalMeasurement',
                attribute: 'totalActivePower',
                description: 'Instantaneous measured total active power',
                reporting: {min: '10_SECONDS', max: 'MAX', change: 10},
                unit: 'kW',
                scale: 1000,
                precision: 2,
                access: 'STATE_GET',
            }),

            numeric({
                name: 'total_active_energy',
                cluster: 'aminaControlCluster',
                attribute: 'totalActiveEnergy',
                description: 'Sum of consumed energy',
                //reporting: {min: '10_SECONDS', max: 'MAX', change: 5}, // Not Reportable atm, updated using onEvent
                unit: 'kWh',
                scale: 1000,
                precision: 2,
                access: 'STATE_GET',
            }),

            numeric({
                name: 'last_session_energy',
                cluster: 'aminaControlCluster',
                attribute: 'lastSessionEnergy',
                description: 'Sum of consumed energy last session',
                //reporting: {min: '10_SECONDS', max: 'MAX', change: 5}, // Not Reportable atm, updated using onEvent
                unit: 'kWh',
                scale: 1000,
                precision: 2,
                access: 'STATE_GET',
            }),

            binary({
                name: 'ev_connected',
                cluster: 'aminaControlCluster',
                attribute: 'evConnected',
                description: 'An EV is connected to the charger',
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: 'STATE',
            }),

            binary({
                name: 'charging',
                cluster: 'aminaControlCluster',
                attribute: 'charging',
                description: 'Power is being delivered to the EV',
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: 'STATE',
            }),

            binary({
                name: 'derated',
                cluster: 'aminaControlCluster',
                attribute: 'derated',
                description: 'Charging derated due to high temperature',
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: 'STATE',
            }),

            binary({
                name: 'alarm_active',
                cluster: 'aminaControlCluster',
                attribute: 'alarmActive',
                description: 'An active alarm is present',
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: 'STATE',
            }),

            electricityMeter({
                cluster: 'electrical',
                acFrequency: true,
                threePhase: true,
            }),

            binary({
                name: 'single_phase',
                cluster: 'aminaControlCluster',
                attribute: 'singlePhase',
                description: 'Enable single phase charging. A restart of charging is required for the change to take effect.',
                valueOn: ['enable', 1],
                valueOff: ['disable', 0],
                entityCategory: 'config',
            }),

            binary({
                name: 'enable_offline',
                cluster: 'aminaControlCluster',
                attribute: 'enableOffline',
                description: 'Enable offline mode when connection to the network is lost',
                valueOn: ['enable', 1],
                valueOff: ['disable', 0],
                entityCategory: 'config',
            }),

            numeric({
                name: 'time_to_offline',
                cluster: 'aminaControlCluster',
                attribute: 'timeToOffline',
                description: 'Time until charger will behave as offline after connection has been lost',
                valueMin: 0,
                valueMax: 60,
                valueStep: 1,
                unit: 's',
                entityCategory: 'config',
            }),

            numeric({
                name: 'offline_current',
                cluster: 'aminaControlCluster',
                attribute: 'offlineCurrent',
                description: 'Maximum allowed amperage draw when device is offline',
                valueMin: 6,
                valueMax: 32,
                valueStep: 1,
                unit: 'A',
                entityCategory: 'config',
            }),

            binary({
                name: 'offline_single_phase',
                cluster: 'aminaControlCluster',
                attribute: 'offlineSinglePhase',
                description: 'Use single phase charging when device is offline',
                valueOn: ['enable', 1],
                valueOff: ['disable', 0],
                entityCategory: 'config',
            }),
        ],

        endpoint: (device) => {
            return {default: 10};
        },

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);

            const binds = ['genBasic', 'genLevelCtrl', 'aminaControlCluster'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await endpoint.configureReporting('aminaControlCluster', [
                {
                    attribute: 'evStatus',
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.MAX,
                    reportableChange: 1,
                },
            ]);

            await endpoint.configureReporting('aminaControlCluster', [
                {
                    attribute: 'alarms',
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.MAX,
                    reportableChange: 1,
                },
            ]);

            await endpoint.read('aminaControlCluster', [
                'alarms',
                'evStatus',
                'connectStatus',
                'singlePhase',
                'offlineCurrent',
                'offlineSinglePhase',
                'timeToOffline',
                'enableOffline',
                'totalActiveEnergy',
                'lastSessionEnergy',
            ]);
        },

        onEvent: async (type, data, device) => {
            if (
                type === 'message' &&
                data.type === 'attributeReport' &&
                data.cluster === 'haElectricalMeasurement' &&
                data.data['totalActivePower']
            ) {
                // Device does not support reporting of energy attributes, so we poll them manually when power is updated
                await data.endpoint.read('aminaControlCluster', ['totalActiveEnergy']);
            }

            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'aminaControlCluster' && data.data['evStatus']) {
                // Device does not support reporting of energy attributes, so we poll them manually when charging is stopped
                if ((data.data['evStatus'] & (1 << 2)) === 0) {
                    await data.endpoint.read('aminaControlCluster', ['totalActiveEnergy', 'lastSessionEnergy']);
                }
            }
        },
    },
];

export default definitions;
module.exports = definitions;
