import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import {binary, enumLookup, light, numeric, text} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
import {assertString} from '../lib/utils';

const ea = exposes.access;
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ElkoDimmerZHA'],
        model: '316GLEDRF',
        vendor: 'ELKO',
        description: 'ZigBee in-wall smart dimmer',
        extend: [light({configureReporting: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['ElkoDimmerRemoteZHA'],
        model: 'EKO05806',
        vendor: 'ELKO',
        description: 'Elko ESH 316 Endevender RF',
        fromZigbee: [fz.command_toggle, fz.command_step],
        toZigbee: [],
        exposes: [e.action(['toggle', 'brightness_step_up', 'brightness_step_down'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Super TR'],
        model: '4523430',
        vendor: 'ELKO',
        description: 'ESH Plus Super TR RF PH',
        fromZigbee: [fz.elko_thermostat],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.elko_power_status, tz.elko_relay_state, tz.elko_local_temperature_calibration],
        extend: [
            text({
                name: 'display_text',
                cluster: 'hvacThermostat',
                attribute: 'elkoDisplayText',
                description: 'Displayed text on thermostat display (zone). Max 14 characters',
                access: 'ALL',
                validate: (value) => {
                    assertString(value);
                    if (value.length > 14) throw new Error('Length of text is greater than 14');
                },
            }),
            numeric({
                name: 'load',
                cluster: 'hvacThermostat',
                attribute: 'elkoLoad',
                description: 'Load in W when heating is on (between 0-2300 W). The thermostat uses the value as input to the mean_power calculation.',
                access: 'ALL',
                unit: 'W',
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 1},
                valueMin: 0,
                valueMax: 2300,
            }),
            binary({
                name: 'regulator_mode',
                cluster: 'hvacThermostat',
                attribute: 'elkoRegulatorMode',
                description: 'Device in regulator or thermostat mode.',
                access: 'ALL',
                reporting: {attribute: 'elkoRegulatorMode', min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ['regulator', 1],
                valueOff: ['thermostat', 0],
            }),
            numeric({
                name: 'regulator_time',
                cluster: 'hvacThermostat',
                attribute: 'elkoRegulatorTime',
                description:
                    'When device is in regulator mode this controls the time between each ' +
                    'in/out connection. When device is in thermostat mode this controls the  time between each in/out switch when measured ' +
                    'temperature is within +-0.5 °C set temperature. Choose a long time for (slow) concrete floors and a short time for ' +
                    '(quick) wooden floors.',
                access: 'ALL',
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 1},
                unit: 'min',
                valueMin: 5,
                valueMax: 20,
            }),
            enumLookup({
                name: 'sensor',
                cluster: 'hvacThermostat',
                attribute: 'elkoSensor',
                description: 'Select temperature sensor to use',
                reporting: {min: 'MIN', max: 'MAX', change: null},
                lookup: {air: 0, floor: 1, supervisor_floor: 3},
            }),
            numeric({
                name: 'floor_temp',
                cluster: 'hvacThermostat',
                attribute: 'elkoExternalTemp',
                description: 'Current temperature measured on the external sensor (floor)',
                access: 'STATE_GET',
                unit: '°C',
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 10},
            }),
            numeric({
                name: 'max_floor_temp',
                cluster: 'hvacThermostat',
                attribute: 'elkoMaxFloorTemp',
                description: 'Set max floor temperature (between 20-35 °C) when "supervisor_floor" is set',
                access: 'ALL',
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 1},
                unit: '°C',
                valueMin: 20,
                valueMax: 35,
            }),
            numeric({
                name: 'mean_power',
                cluster: 'hvacThermostat',
                attribute: 'elkoMeanPower',
                description: 'Reports average power usage last 10 minutes',
                access: 'STATE_GET',
                unit: 'W',
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 5},
            }),
            binary({
                name: 'child_lock',
                cluster: 'hvacThermostat',
                attribute: 'elkoChildLock',
                description: 'Enables/disables physical input on the device',
                access: 'ALL',
                reporting: {attribute: 'elkoChildLock', min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ['lock', 1],
                valueOff: ['unlock', 0],
            }),
            binary({
                name: 'frost_guard',
                cluster: 'hvacThermostat',
                attribute: 'elkoFrostGuard',
                description:
                    'When frost guard is ON, it is activated when the thermostat is switched OFF with the ON/OFF button.' +
                    'At the same time, the display will fade and the text "Frostsikring x °C" appears in the display and remains until the ' +
                    'thermostat is switched on again.',
                access: 'ALL',
                reporting: {attribute: 'elkoFrostGuard', min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ['on', 1],
                valueOff: ['off', 0],
            }),
            binary({
                name: 'night_switching',
                cluster: 'hvacThermostat',
                attribute: 'elkoNightSwitching',
                description: 'Turn on or off night setting.',
                access: 'ALL',
                reporting: {attribute: 'elkoNightSwitching', min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ['on', 1],
                valueOff: ['off', 0],
            }),
        ],
        exposes: [
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 5, 50, 1)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration()
                .withSystemMode(['off', 'heat'])
                .withRunningState(['idle', 'heat']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'genIdentify']);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            // ELKO attributes
            // Power status
            await endpoint.configureReporting('hvacThermostat', [
                {
                    attribute: 'elkoPowerStatus',
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                },
            ]);
            // Heating active/inactive
            await endpoint.configureReporting('hvacThermostat', [
                {
                    attribute: 'elkoRelayState',
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                },
            ]);
            // Trigger read
            await endpoint.read('hvacThermostat', ['elkoDisplayText', 'elkoSensor']);

            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];

export default definitions;
module.exports = definitions;
