import * as fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as m from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import type { DefinitionWithExtend, Fz } from '../lib/types';

const e = exposes.presets;

const fzLocal = {
	MIRSO100: {
		cluster: 'ssIasZone',
		type: 'raw',
		convert: (model, msg, publish, options, meta) => {
			switch (msg.data[3]) {
				case 0:
					return { action: 'single' };
				case 1:
					return { action: 'double' };
				case 128:
					return { action: 'hold' };
			}
		}
	} satisfies Fz.Converter<'ssIasZone', undefined, 'raw'>
};

export const definitions: DefinitionWithExtend[] = [
	{
		zigbeeModel: ['MIR-MC100'],
		model: 'MultIR doors sensor',
		vendor: 'MultIR',
		description: 'MultIR doors sensor',
		extend: [
			m.battery(),
			m.iasZoneAlarm({
				zoneType: 'contact',
				zoneAttributes: ['alarm_1', 'tamper', 'battery_low']
			})
		]
	},
	{
		zigbeeModel: ['MIR-IL100'],
		model: 'MultIR pir leakage',
		vendor: 'MultIR',
		description: 'MultIR pir leakage',
		extend: [
			m.battery(),
			m.iasZoneAlarm({
				zoneType: 'occupancy',
				zoneAttributes: ['alarm_1', 'tamper', 'battery_low']
			})
		]
	},
	{
		zigbeeModel: ['MIR-SM200'],
		model: 'MultIR smoke sensor',
		vendor: 'MultIR',
		description: 'MultIR smoke sensor',
		extend: [
			m.battery(),
			m.iasZoneAlarm({
				zoneType: 'smoke',
				zoneAttributes: ['alarm_1', 'tamper', 'battery_low']
			})
		]
	},
	{
		zigbeeModel: ['MIR-SO100'],
		model: 'MultIR SOS Button',
		vendor: 'MultIR',
		description: 'MultIR SOS Button',
		fromZigbee: [fzLocal.MIRSO100, fz.battery],
		toZigbee: [],
		exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
		configure: async (device, coordinatorEndpoint) => {
			const endpoint = device.getEndpoint(1);
			await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
			await reporting.batteryPercentageRemaining(endpoint);
			await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
		}
	},
	{
		zigbeeModel: ['MIR-TE600'],
		model: 'MultIR temperature sensor',
		vendor: 'MultIR',
		description: 'MultIR temperature sensor',
		extend: [
			m.deviceEndpoints({
				endpoints: {
					'1': 1,
					'2': 2
				}
			}),
			m.battery(),
			m.temperature({
				endpointNames: ['1']
			}),
			m.humidity({
				endpointNames: ['1']
			})
		],
		meta: {
			multiEndpoint: true
		}
	},
	{
		zigbeeModel: ['MIR-WA100'],
		model: 'MultIR Water leakage',
		vendor: 'MultIR',
		description: 'MultIR Water leakage',
		extend: [
			m.battery(),
			m.iasZoneAlarm({
				zoneType: 'water_leak',
				zoneAttributes: ['alarm_1', 'battery_low']
			})
		]
	}
];
