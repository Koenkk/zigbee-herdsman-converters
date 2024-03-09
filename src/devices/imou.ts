import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as extend from '../lib/extend';
import * as legacy from '../lib/legacy';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
		zigbeeModel: ['ZP1-EN'],
		model: 'ZP1-EN',
		vendor: 'IMOU',
		description: 'IMOU ZigBee ZP1 PIR Motion Sensor',
		fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
		toZigbee: [],
		exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
		configure: async (device, coordinatorEndpoint, logger) => {
		   const endpoint = device.getEndpoint(1);
		   await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
		   await reporting.batteryPercentageRemaining(endpoint);
		},
    },
    {
		zigbeeModel: ['ZR1-EN'],
		model: 'ZR1-EN',
		vendor: 'IMOU',
		description: 'IMOU ZigBee ZR1 Siren',
		fromZigbee: [fz.ignore_basic_report, fz.ias_siren],
		toZigbee: [tz.warning],
		exposes: [e.tamper(), e.warning()],
		meta: {disableDefaultResponse: true},
		configure: async (device, coordinatorEndpoint, logger) => {
			const endpoint = device.getEndpoint(1);
			await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
			await reporting.batteryPercentageRemaining(endpoint);
			// Device advertises itself as Router but is an EndDevice
			device.type = 'EndDevice';
			device.save();
		},
	},
];

export default definitions;
module.exports = definitions;
