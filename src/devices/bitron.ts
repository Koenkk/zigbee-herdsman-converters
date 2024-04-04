import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;
import {Zcl} from 'zigbee-herdsman';
import {onOff, light} from '../lib/modernExtend';
import {KeyValueAny, Fz, Tz, Definition} from '../lib/types';

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.ASTREL_GROUP_SRL};

const bitron = {
    fz: {
        thermostat_hysteresis: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};

                if (msg.data.hasOwnProperty('fourNoksHysteresisHigh')) {
                    if (!result.hasOwnProperty('hysteresis')) result.hysteresis = {};
                    result.hysteresis.high = msg.data.fourNoksHysteresisHigh;
                }

                if (msg.data.hasOwnProperty('fourNoksHysteresisLow')) {
                    if (!result.hasOwnProperty('hysteresis')) result.hysteresis = {};
                    result.hysteresis.low = msg.data.fourNoksHysteresisLow;
                }

                return result;
            },
        } satisfies Fz.Converter,
    },
    tz: {
        thermostat_hysteresis: {
            key: ['hysteresis', 'hysteresis'],
            convertSet: async (entity, key, value: KeyValueAny, meta) => {
                const result: KeyValueAny = {state: {hysteresis: {}}};
                if (value.hasOwnProperty('high')) {
                    await entity.write('hvacThermostat', {'fourNoksHysteresisHigh': value.high}, manufacturerOptions);
                    result.state.hysteresis.high = value.high;
                }

                if (value.hasOwnProperty('low')) {
                    await entity.write('hvacThermostat', {'fourNoksHysteresisLow': value.low}, manufacturerOptions);
                    result.state.hysteresis.low = value.low;
                }

                return result;
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('hvacThermostat', ['fourNoksHysteresisHigh', 'fourNoksHysteresisLow'], manufacturerOptions);
            },
        } satisfies Tz.Converter,
    },
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['AV2010/14', '902010/14'],
        model: 'AV2010/14',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Curtain motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        zigbeeModel: ['AV2010/16', '902010/16'],
        model: 'AV2010/16',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wall-mount relay with dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['AV2010/18', '902010/18'],
        model: 'AV2010/18',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wall-mount relay',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['AV2010/21A', '902010/21A'],
        model: 'AV2010/21A',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Compact magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['AV2010/21B', '902010/21B'],
        model: 'AV2010/21B',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Magnetic contact sensor with additional input for wired sensors',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['AV2010/21C', '902010/21C'],
        model: 'AV2010/21C',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Ultra-flat magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
    },
    {
        zigbeeModel: ['AV2010/22', '902010/22', 'IR_00.00.03.12TC'],
        model: 'AV2010/22',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Professional motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
        whiteLabel: [{vendor: 'ClimaxTechnology', model: 'IR-9ZBS-SL'}],
    },
    {
        zigbeeModel: ['AV2010/22A', '902010/22A'],
        model: 'AV2010/22A',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Design motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        zigbeeModel: ['AV2010/22B', '902010/22B'],
        model: 'AV2010/22B',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Outdoor motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['AV2010/23', '902010/23'],
        model: 'AV2010/23',
        vendor: 'SMaBiT (Bitron Video)',
        description: '4 button Zigbee remote control',
        fromZigbee: [fz.ias_no_alarm, fz.command_on, fz.command_off, fz.command_step, fz.command_recall],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'recall_*']), e.battery_low()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['AV2010/24', '902010/24'],
        model: 'AV2010/24',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Optical smoke detector (hardware version v1)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['AV2010/24A', '902010/24A'],
        model: 'AV2010/24A',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Optical smoke detector (hardware version v2)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['AV2010/25', '902010/25'],
        model: 'AV2010/25',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wireless socket with metering',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            try {
                await reporting.currentSummReceived(endpoint);
            } catch (error) {
                /* fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/13258 */
            }
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['AV2010/26', '902010/26'],
        model: 'AV2010/26',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wireless socket with dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['AV2010/28', '902010/28'],
        model: 'AV2010/28',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wireless socket',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['AV2010/29', '902010/29'],
        model: 'AV2010/29',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Outdoor siren',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['AV2010/29A', '902010/29A'],
        model: 'AV2010/29A',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Outdoor siren',
        fromZigbee: [fz.ias_siren],
        toZigbee: [tz.warning, tz.squawk],
        exposes: [e.warning(), e.squawk(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['AV2010/32', '902010/32'],
        model: 'AV2010/32',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wireless wall thermostat with relay',
        fromZigbee: [legacy.fz.thermostat_att_report, fz.battery, fz.hvac_user_interface, bitron.fz.thermostat_hysteresis],
        toZigbee: [
            tz.thermostat_control_sequence_of_operation, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature, tz.thermostat_running_state, tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.battery_voltage, bitron.tz.thermostat_hysteresis,
        ],
        exposes: (device, options) => {
            const dynExposes = [];
            let ctrlSeqeOfOper = (device?.getEndpoint(1).getClusterAttributeValue('hvacThermostat', 'ctrlSeqeOfOper') ?? null);
            const modes = [];

            if (typeof ctrlSeqeOfOper === 'string') ctrlSeqeOfOper = parseInt(ctrlSeqeOfOper) ?? null;

            // NOTE: ctrlSeqeOfOper defaults to 2 for this device (according to the manual)
            if (ctrlSeqeOfOper === null || isNaN(ctrlSeqeOfOper)) ctrlSeqeOfOper = 2;

            // NOTE: set cool and/or heat support based on ctrlSeqeOfOper (see lib/constants -> thermostatControlSequenceOfOperations)
            // WARN: a restart of zigbee2mqtt is required after changing ctrlSeqeOfOper for expose data to be re-calculated
            if (ctrlSeqeOfOper >= 2) {
                modes.push('heat');
            }
            if (ctrlSeqeOfOper < 2 || ctrlSeqeOfOper > 3) {
                modes.push('cool');
            }

            const hysteresisExposes = e.composite('hysteresis', 'hysteresis', ea.ALL)
                .withFeature(e.numeric('low', ea.SET))
                .withFeature(e.numeric('high', ea.SET))
                .withDescription('Set thermostat hysteresis low and high trigger values. (1 = 0.01ºC)');

            dynExposes.push(e.climate()
                .withSetpoint('occupied_heating_setpoint', 7, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off'].concat(modes))
                .withRunningState(['idle'].concat(modes))
                .withLocalTemperatureCalibration()
                .withControlSequenceOfOperation(['heating_only', 'cooling_only'], ea.ALL));
            dynExposes.push(e.keypad_lockout());
            dynExposes.push(hysteresisExposes);
            dynExposes.push(e.battery().withAccess(ea.STATE_GET));
            dynExposes.push(e.battery_low());
            dynExposes.push(e.linkquality());

            return dynExposes;
        },
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.batteryAlarmState(endpoint);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('hvacThermostat', ['ctrlSeqeOfOper', 'localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', ['fourNoksHysteresisHigh', 'fourNoksHysteresisLow'], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ['AV2010/33', '902010/33'],
        model: 'AV2010/33',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Vibration sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        zigbeeModel: ['AV2010/34', '902010/34'],
        model: 'AV2010/34',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Wall switch with 4 buttons',
        fromZigbee: [fz.command_recall],
        toZigbee: [],
        exposes: [e.action(['recall_*'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['AV2010/37', '902010/37'],
        model: 'AV2010/37',
        vendor: 'SMaBiT (Bitron Video)',
        description: 'Water detector with siren',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low()],
    },
];

export default definitions;
module.exports = definitions;
