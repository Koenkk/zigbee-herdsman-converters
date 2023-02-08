const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_4hbx5cvx'}],
        model: '4500994',
        vendor: 'Connecte',
        description: 'Smart thermostat',
        fromZigbee: [fz.connecte_thermostat],
        toZigbee: [tz.connecte_thermostat],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('On/off state of the switch'),
            e.child_lock(),
            e.window_detection(),
            e.away_mode(),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withSystemMode(['heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            exposes.numeric('external_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)'),
            exposes.numeric('hysteresis', ea.STATE_SET)
                .withDescription('The difference between the temperature at which the thermostat switches off, ' +
                'and the temperature at which it switches on again.')
                .withValueMin(1)
                .withValueMax(9),
            exposes.numeric('max_temperature_protection', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Max guarding temperature')
                .withValueMin(20)
                .withValueMax(95),
        ],
    },
	{
        fingerprint: [{modelID: 'TS0121', manufacturerName: '_TZ3000_fqoynhku'}],
    	model: '4500990',
    	vendor: 'Connecte',
    	description: '16A Smart Wall Socket',
    	fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, tuya.fz.power_outage_memory, tuya.fz.indicator_mode],
    	toZigbee: [tz.on_off, tuya.tz.power_on_behavior, tuya.tz.backlight_indicator_mode],
    	configure: async (device, coordinatorEndpoint, logger) => {
    		const endpoint = device.getEndpoint(1);
    		await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
    		endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
    		endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
    			acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
    			acPowerDivisor: 1,
    		});
    		await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff', 'tuyaBacklightMode']);
    		await reporting.rmsVoltage(endpoint, {min: 10, max: 3600, change: 2});
            await reporting.rmsCurrent(endpoint, {min: 10, max: 3600, change: 0});
            await reporting.activePower(endpoint, {min: 10, max: 3600, change: 0});
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 0});
    	},
    	exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
    			e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
    				.withDescription('Recover state after power outage'),
    			exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off']).withDescription('LED indicator mode')],
    	onEvent: tuya.onEventSetTime,
	},
];