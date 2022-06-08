const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
	{
		zigbeeModel: ['TS0501B'], 
		model: 'S9B15LED12-ZB', 
		vendor: 'Mercator', 
		description: 'B15 LED Globe 3000k 380lm 4w', 
		extend: extend.light_onoff_brightness(),
	},
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3210_7jnk7l3k'}],
        model: 'SPP02GIP',
        vendor: 'Mercator',
        description: 'Ikuü double outdoors power point',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.current().withEndpoint('left'),
            e.voltage().withEndpoint('left').withAccess(ea.STATE), e.energy()],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genBasic', 'genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint1);
            await reporting.rmsVoltage(endpoint1, {change: 5});
            await reporting.rmsCurrent(endpoint1, {change: 50});
            await reporting.activePower(endpoint1, {change: 1});
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            endpoint1.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint1.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
];
