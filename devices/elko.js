const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const ea = exposes.access;
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ElkoDimmerZHA'],
        model: '316GLEDRF',
        vendor: 'ELKO',
        description: 'ZigBee in-wall smart dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ElkoDimmerRemoteZHA'],
        model: 'EKO05806',
        vendor: 'ELKO',
        description: 'Elko ESH 316 Endevender RF',
        fromZigbee: [fz.command_toggle, fz.command_step],
        toZigbee: [],
        exposes: [e.action(['toggle', 'brightness_step_up', 'brightness_step_down'])],
        configure: async (device, coordinatorEndpoint, logger) => {
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
        fromZigbee: [fz.elko_thermostat, fz.thermostat],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_heating_setpoint, tz.elko_load,
            tz.elko_display_text, tz.elko_power_status, tz.elko_external_temp, tz.elko_mean_power, tz.elko_child_lock, tz.elko_frost_guard,
            tz.elko_relay_state, tz.elko_sensor_mode, tz.elko_local_temperature_calibration, tz.elko_max_floor_temp,
            tz.elko_regulator_mode, tz.elko_regulator_time, tz.elko_night_switching],
        exposes: [exposes.text('display_text', ea.ALL).withDescription('Displayed text on thermostat display (zone). Max 14 characters'),
            exposes.numeric('load', ea.ALL).withUnit('W')
                .withDescription('Load in W when heating is on (between 0-2000 W). The thermostat uses the value as input to the ' +
                'mean_power calculation.')
                .withValueMin(0).withValueMax(2000),
            exposes.binary('regulator_mode', ea.ALL, 'regulator', 'thermostat')
                .withDescription('Device in regulator or thermostat mode.'),
            exposes.numeric('regulator_time', ea.ALL).withUnit('min')
                .withValueMin(5).withValueMax(20).withDescription('When device is in regulator mode this controls the time between each ' +
                'in/out connection. When device is in thermostat mode this controls the  time between each in/out switch when measured ' +
                'temperature is within +-0.5 °C set temperature. Choose a long time for (slow) concrete floors and a short time for ' +
                '(quick) wooden floors.'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 50, 1)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-30, 30, 0.1)
                .withSystemMode(['off', 'heat']).withRunningState(['idle', 'heat']),
            e.temperature_sensor_select(['air', 'floor', 'supervisor_floor']),
            exposes.numeric('floor_temp', ea.STATE_GET).withUnit('°C')
                .withDescription('Current temperature measured from the floor sensor'),
            exposes.numeric('max_floor_temp', ea.ALL).withUnit('°C')
                .withDescription('Set max floor temperature (between 20-35 °C) when "supervisor_floor" is set')
                .withValueMin(20).withValueMax(35),
            exposes.numeric('mean_power', ea.STATE_GET).withUnit('W')
                .withDescription('Reports average power usage last 10 minutes'),
            exposes.binary('child_lock', ea.ALL, 'lock', 'unlock')
                .withDescription('Enables/disables physical input on the device'),
            exposes.binary('frost_guard', ea.ALL, 'on', 'off')
                .withDescription('When frost guard is ON, it is activated when the thermostat is switched OFF with the ON/OFF button.' +
                'At the same time, the display will fade and the text "Frostsikring x °C" appears in the display and remains until the ' +
                'thermostat is switched on again.'),
            exposes.binary('night_switching', ea.ALL, 'on', 'off')
                .withDescription('Turn on or off night setting.'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'genBasic', 'genIdentify']);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            // ELKO attributes
            // Load value
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoLoad',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Power status
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoPowerStatus',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Power consumption
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoMeanPower',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 5,
            }]);
            // External temp sensor (floor)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoExternalTemp',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 10,
            }]);
            // Child lock active/inactive
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoChildLock',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Night switching
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoNightSwitching',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Frost guard
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoFrostGuard',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Heating active/inactive
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoRelayState',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Max floor temp
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoMaxFloorTemp',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }]);

            // Regulator mode
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoRegulatorMode',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null,
            }]);
            // Regulator time
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'elkoRegulatorTime',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }]);
            // Trigger read
            await endpoint.read('hvacThermostat', ['elkoDisplayText', 'elkoSensor']);

            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
