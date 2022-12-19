const herdsman = require('zigbee-herdsman');
const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const constants = require('../lib/constants');
const e = exposes.presets;
const ea = exposes.access;

// Radiator Thermostat II
const boschManufacturer = {manufacturerCode: 0x1209};

// 	Twinguard
const smokeSensitivity = {
    'LOW': 3,
    'MEDIUM': 2,
	'HIGH': 1,
};
// Radiator Thermostat II
const operatingModes = {
    'automatic': 0,
    'manual': 1,
    'pause': 5,
};

// Radiator Thermostat II
const stateOffOn = {
    'OFF': 0,
    'ON': 1,
};

// Radiator Thermostat II
const displayOrientation = {
    'normal': 0,
    'flipped': 1,
};

// Radiator Thermostat II
const tzLocal = {
    bosch_thermostat: {
        key: ['window_open', 'boost', 'system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'window_open') {
                value = value.toUpperCase();
                utils.validateValue(value, Object.keys(stateOffOn));
                const index = stateOffOn[value];
                await entity.write('hvacThermostat', {0x4042: {value: index, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {window_open: value}};
            }
            if (key === 'boost') {
                value = value.toUpperCase();
                utils.validateValue(value, Object.keys(stateOffOn));
                const index = stateOffOn[value];
                await entity.write('hvacThermostat', {0x4043: {value: index, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {boost: value}};
            }
            if (key === 'system_mode') {
                // Map system_mode (Off/Auto/Heat) to Boschg operating mode
                value = value.toLowerCase();

                let opMode = operatingModes.manual; // OperatingMode 1 = Manual (Default)

                if (value=='off') {
                    opMode = operatingModes.pause; // OperatingMode 5 = Pause
                } else if (value == 'auto') {
                    opMode = operatingModes.automatic; // OperatingMode 0 = Automatic
                }
                await entity.write('hvacThermostat', {0x4007: {value: opMode, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {system_mode: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'window_open':
                await entity.read('hvacThermostat', [0x4042], boschManufacturer);
                break;
            case 'boost':
                await entity.read('hvacThermostat', [0x4043], boschManufacturer);
                break;
            case 'system_mode':
                await entity.read('hvacThermostat', [0x4007], boschManufacturer);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_thermostat.convertGet ${key}`);
            }
        },
    },
    bosch_userInterface: {
        key: ['display_orientation', 'display_ontime', 'display_brightness', 'child_lock'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'display_orientation') {
                const index = displayOrientation[value];
                await entity.write('hvacUserInterfaceCfg', {0x400b: {value: index, type: herdsman.Zcl.DataType.uint8}}, boschManufacturer);
                return {state: {display_orientation: value}};
            }
            if (key === 'display_ontime') {
                await entity.write('hvacUserInterfaceCfg', {0x403a: {value: value, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_onTime: value}};
            }
            if (key === 'display_brightness') {
                await entity.write('hvacUserInterfaceCfg', {0x403b: {value: value, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_brightness: value}};
            }
            if (key === 'child_lock') {
                const keypadLockout = Number(value === 'LOCK');
                await entity.write('hvacUserInterfaceCfg', {keypadLockout});
                return {state: {child_lock: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'display_orientation':
                await entity.read('hvacUserInterfaceCfg', [0x400b], boschManufacturer);
                break;
            case 'display_ontime':
                await entity.read('hvacUserInterfaceCfg', [0x403a], boschManufacturer);
                break;
            case 'display_brightness':
                await entity.read('hvacUserInterfaceCfg', [0x403b], boschManufacturer);
                break;
            case 'child_lock':
                await entity.read('hvacUserInterfaceCfg', ['keypadLockout']);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_userInterface.convertGet ${key}`);
            }
        },
    },
    bosch_twinguard: {
        key: ['sensitivity', 'pre_alarm', 'initiate_self_test', 'burglar_alarm', 'heartbeat'],
        convertSet: async (entity, key, value, meta) => {
			if (key === 'sensitivity') {
			    value = value.toUpperCase();
			    const index = smokeSensitivity[value]
                await entity.write('manuSpecificBosch', {0x4003: {value: index, type: 0x21}}, boschManufacturer);
                return {state: {sensitivity: value}};
			}
			if (key === 'pre_alarm') {
			    value = value.toUpperCase();
			    const index = stateOffOn[value]
                await entity.write('manuSpecificBosch5', {0x4001: {value: index, type: 0x18}}, boschManufacturer);
                return {state: {pre_alarm: value}};
			}
			if (key === 'heartbeat') {
				const endpoint = meta.device.getEndpoint(12);
			    value = value.toUpperCase();
			    const index = stateOffOn[value]
                await endpoint.write('manuSpecificBosch7', {0x5005: {value: index, type: 0x18}}, boschManufacturer);
                return {state: {heartbeat: value}};
			}
			if (key === 'initiate_self_test') {
			    if (value) {
					await entity.command('manuSpecificBosch', 'initiateTestMode', boschManufacturer);
				}
			}
			if (key === 'burglar_alarm') {
				const endpoint = meta.device.getEndpoint(12);
			    if (value) {
					await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 1}, boschManufacturer);
				} else {
					await endpoint.command('manuSpecificBosch8', 'burglarAlarm', {data: 0}, boschManufacturer);
				}
			}
        },
        convertGet: async (entity, key, meta) => {
			switch (key) {
            case 'sensitivity':
                await entity.read('manuSpecificBosch', [0x4003], boschManufacturer);
                break;
			case 'pre_alarm':
                await entity.read('manuSpecificBosch5', [0x4001], boschManufacturer);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.Twinguard_sensitivity.convertGet ${key}`);
            }
		},
    },
};


// Radiator Thermostat II
const fzLocal = {
    bosch_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x4042)) {
                result.window_open = (Object.keys(stateOffOn)[data[0x4042]]);
            }
            if (data.hasOwnProperty(0x4043)) {
                result.boost = (Object.keys(stateOffOn)[data[0x4043]]);
            }
            if (data.hasOwnProperty(0x4007)) {
                const opModes = {0: 'auto', 1: 'heat', 2: 'unknown_2', 3: 'unknown_3', 4: 'unknown_4', 5: 'off'};
                result.system_mode = opModes[data[0x4007]];
            }
            if (data.hasOwnProperty(0x4020)) {
                result.pi_heating_demand = data[0x4020];
            }

            return result;
        },
    },
    bosch_userInterface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x400b)) {
                result.display_orientation = (Object.keys(displayOrientation)[data[0x400b]]);
            }
            if (data.hasOwnProperty(0x403a)) {
                result.display_ontime = data[0x403a];
            }
            if (data.hasOwnProperty(0x403b)) {
                result.display_brightness = data[0x403b];
            }
            if (data.hasOwnProperty('keypadLockout')) {
                result.child_lock = (data['keypadLockout'] == 1 ? 'LOCK' : 'UNLOCK');
            }

            return result;
        },
    },
    bosch_twinguard_measurements: {
        cluster: 'manuSpecificTuya_2',
        type: ['attributeReport', 'readResponse'],
		options: [exposes.options.precision('temperature'), exposes.options.calibration('temperature'),
        exposes.options.precision('humidity'), exposes.options.calibration('humidity'),
		exposes.options.calibration('illuminance_lux', 'percentual')],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty('humidity')) {
                result.humidity = msg.data['humidity'] / 100.0 ;
            }
			if (msg.data.hasOwnProperty('airpurity')) {
                result.airpurity = msg.data['airpurity'] * 10.0 + 500.0 ;
            }
			if (msg.data.hasOwnProperty('temperature')) {
                result.temperature = msg.data['temperature'] / 100.0 ;
            }
			if (msg.data.hasOwnProperty('illuminance_lux')) {
                result.illuminance_lux = msg.data['illuminance_lux'] / 2.0 ;
            }
			if (msg.data.hasOwnProperty('battery')) {
                result.battery = msg.data['battery'] / 2.0 ;
            }
			if (msg.data.hasOwnProperty('unknown1')) {
                result.unknown7 = msg.data['unknown1'] ;
            }
			if (msg.data.hasOwnProperty('unknown2')) {
                result.unknown8 = msg.data['unknown2'] ;
            }
			if (msg.data.hasOwnProperty('unknown3')) {
                result.unknown1 = msg.data['unknown3'] ;
            }
			if (msg.data.hasOwnProperty('unknown4')) {
                result.unknown2 = msg.data['unknown4'] ;
            }
			if (msg.data.hasOwnProperty('unknown5')) {
                result.unknown3 = msg.data['unknown5'] ;
            }
			if (msg.data.hasOwnProperty('unknown6')) {
                result.unknown4 = msg.data['unknown6'] ;
            }
			if (msg.data.hasOwnProperty('unknown7')) {
                result.unknown5 = msg.data['unknown7'] ;
            }
			if (msg.data.hasOwnProperty('unknown8')) {
                result.unknown6 = msg.data['unknown8'] ;
            }
			return result;
        },
    },
	bosch_twinguard_sensitivity: {
        cluster: 'manuSpecificBosch',
        type: ['attributeReport', 'readResponse'],
		options: [],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty('sensitivity')) {
                result.sensitivity = (Object.keys(smokeSensitivity)[msg.data['sensitivity']]);
            }
			return result;
		},
	},
	bosch_twinguard_pre_alarm: {
        cluster: 'manuSpecificBosch5',
        type: ['attributeReport', 'readResponse'],
		options: [],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty('pre_alarm')) {
                result.pre_alarm = (Object.keys(stateOffOn)[msg.data['pre_alarm']]);
            }
			return result;
		},
	},
	bosch_twinguard_alarm_state: {
        cluster: 'manuSpecificBosch8',
        type: ['attributeReport', 'readResponse'],
		options: [],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty('alarm_status')) {
				result.siren = (msg.data['alarm_status'] & 1<<25) > 0 ;
				result.test = (msg.data['alarm_status'] & 1<<24) > 0;
			}
			return result;
		},
	},	
};

const definition = [
    {
        zigbeeModel: ['RFDL-ZB', 'RFDL-ZB-EU', 'RFDL-ZB-H', 'RFDL-ZB-K', 'RFDL-ZB-CHI', 'RFDL-ZB-MS', 'RFDL-ZB-ES', 'RFPR-ZB',
            'RFPR-ZB-EU', 'RFPR-ZB-CHI', 'RFPR-ZB-ES', 'RFPR-ZB-MS'],
        model: 'RADON TriTech ZB',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['ISW-ZPR1-WP13'],
        model: 'ISW-ZPR1-WP13',
        vendor: 'Bosch',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['RBSH-TRV0-ZB-EU'],
        model: 'BTH-RA',
        vendor: 'Bosch',
        description: 'Radiator thermostat II',
        fromZigbee: [fz.thermostat, fz.battery, fzLocal.bosch_thermostat, fzLocal.bosch_userInterface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_keypad_lockout,
            tzLocal.bosch_thermostat,
            tzLocal.bosch_userInterface,
        ],
        exposes: [
            exposes.climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-12, 12, 0.5)
                .withSystemMode(['off', 'heat', 'auto'])
                .withPiHeatingDemand(ea.STATE),
            exposes.binary('boost', ea.ALL, 'ON', 'OFF')
                .withDescription('Activate Boost heating'),
            exposes.binary('window_open', ea.ALL, 'ON', 'OFF')
                .withDescription('Window open'),
            exposes.enum('display_orientation', ea.ALL, Object.keys(displayOrientation))
                .withDescription('Display orientation'),
            exposes.numeric('display_ontime', ea.ALL)
                .withValueMin(5)
                .withValueMax(30)
                .withDescription('Specifies the diplay On-time'),
            exposes.numeric('display_brightness', ea.ALL)
                .withValueMin(0)
                .withValueMax(10)
                .withDescription('Specifies the brightness value of the display'),
            e.child_lock().setAccess('state', ea.ALL),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacUserInterfaceCfg']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);

            // report operating_mode (system_mode)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4007, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report pi_heating_demand (valve opening)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4020, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report window_open
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4042, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);

            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', [0x4007, 0x4020, 0x4042, 0x4043], boschManufacturer);

            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', [0x400b, 0x403a, 0x403b], boschManufacturer);
        },
    },
	{
		zigbeeModel: ['Champion'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
		model: 'Twinguard', // Vendor model number, look on the device for a model number
		vendor: 'Bosch ST', // Vendor of the device (only used for documentation and startup logging)
		description: 'Twinguard', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
		fromZigbee: [fzLocal.bosch_twinguard_measurements, fzLocal.bosch_twinguard_sensitivity, fzLocal.bosch_twinguard_pre_alarm, fzLocal.bosch_twinguard_alarm_state],
		toZigbee: [tzLocal.bosch_twinguard],
		configure: async (device, coordinatorEndpoint, logger) => {
			const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(1);
			await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0x0009]);
			await reporting.bind(device.getEndpoint(7), coordinatorEndpointB, [0x0019]);
			await reporting.bind(device.getEndpoint(7), coordinatorEndpointB, [0x0020]);
			await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0xe000]);
			await reporting.bind(device.getEndpoint(3), coordinatorEndpointB, [0xe002]);
			await reporting.bind(device.getEndpoint(1), coordinatorEndpointB, [0xe004]);
			await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, [0xe006]);
			await reporting.bind(device.getEndpoint(12), coordinatorEndpointB, [0xe007]);
			await device.getEndpoint(12).command('manuSpecificBosch7', 'pairingCompleted', boschManufacturer);
			await device.getEndpoint(1).write('manuSpecificBosch', {0x4003: {value: 0x0002, type: 0x21}}, boschManufacturer);
			await device.getEndpoint(1).write('manuSpecificBosch5', {0x4001: {value: 0x01, type: 0x18}}, boschManufacturer);
			await device.getEndpoint(1).read('manuSpecificBosch',['sensitivity'], boschManufacturer);
			await device.getEndpoint(1).read('manuSpecificBosch5',['pre_alarm'], boschManufacturer);
		},
		exposes: [
			e.humidity(),
			exposes.numeric('airpurity', ea.STATE).withUnit('ppm'),
			e.temperature(),
			e.illuminance_lux(),
			e.battery(),
			exposes.numeric('unknown1', ea.STATE).withUnit('a'),
			exposes.numeric('unknown2', ea.STATE).withUnit('b'),
			exposes.numeric('unknown3', ea.STATE).withUnit('c'),
			exposes.numeric('unknown4', ea.STATE).withUnit('d'),
			exposes.numeric('unknown5', ea.STATE).withUnit('e'),
			exposes.numeric('unknown6', ea.STATE).withUnit('f'),
			exposes.numeric('unknown7', ea.STATE).withUnit('g'),
			exposes.numeric('unknown8', ea.STATE).withUnit('h'),
			exposes.enum('sensitivity', ea.ALL, Object.keys(smokeSensitivity))
					.withDescription('Sets the sensitivity of the smoke alarm.'),
			exposes.enum('pre_alarm', ea.ALL, Object.keys(stateOffOn))
					.withDescription('Enable/disable pre-alarm'),
			exposes.enum('heartbeat', ea.STATE_SET, Object.keys(stateOffOn))
					.withDescription('Enable/disable heartbeat'),
			exposes.binary('initiate_self_test', ea.STATE_SET, true, false)
					.withDescription('Enable/disable pre-alarm'),
			exposes.binary('burglar_alarm', ea.STATE_SET, true, false)
					.withDescription('Enable/disable pre-alarm'),
			exposes.binary('siren', ea.STATE, true, false)
					.withDescription('Siren on/off'),
			e.test(),
			],
	},
];

module.exports = definition;
