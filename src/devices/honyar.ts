import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import {getFromLookup} from '../lib/utils';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';
import {deviceEndpoints, onOff} from '../lib/modernExtend';
import * as globalStore from '../lib/store';
import {KeyValue} from 'zigbee-herdsman/dist/controller/tstype';
import {battery, lock} from '../lib/modernExtend';
import {logger} from '../lib/logger';

const NS = 'zhc:yale';
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    honyer_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (meta.device.dateCode === '20170621') {
                const result = {};
                if (msg.data.hasOwnProperty('currentSummDelivered')) {
                    const data = msg.data['currentSummDelivered'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    result.energy = value / 1000.0;
                }
                return result;
            } else {
                return converters.metering.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    honyer_electrical_measurement: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        options: [
            exposes.options.calibration('power', 'percentual'), exposes.options.precision('power'),
            exposes.options.calibration('current', 'percentual'), exposes.options.precision('current'),
            exposes.options.calibration('voltage', 'percentual'), exposes.options.precision('voltage'),
        ],
        convert: (model, msg, publish, options, meta) => {
            if (meta.device.dateCode === '20170621') {
                const payload = {};
                if (msg.data.hasOwnProperty('rmsCurrent')) {
                    const current = msg.data['rmsCurrent'];
                    payload.current = current / 1000.0;
                }
			    if (msg.data.hasOwnProperty('rmsVoltage')) {
                    const voltage = msg.data['rmsVoltage'];
					if (voltage > 1) {
					    payload.voltage = voltage;
				    }
				}
			    if (msg.data.hasOwnProperty('activePower')) {
                    const power = msg.data['activePower'];
                    payload.power = power;
				}
				return payload;
            } 
			else {
                return converters.metering.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['00500c35'],
        model: 'U86K31ND6',
        vendor: 'Honyar',
        description: '3 gang switch ',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'center': 2, 'right': 3}}),
            onOff({endpointNames: ['left', 'center', 'right']}),
        ],
    },
    {
        zigbeeModel: ['HY0043'],
        model: 'U86Z13A16-ZJH(HA)',
        vendor: 'Honyar',
        description: 'Smart Power Socket 16A (with power monitoring)',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['HY0157'],
        model: 'U86Z223A10-ZJU01(GD)',
        vendor: 'Honyar',
        description: 'Smart power socket 10A with USB (with power monitoring)',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.current(), e.voltage(),
            e.energy()],
        meta: {multiEndpoint: true, multiEndpointSkip: ['energy', 'current', 'voltage', 'power']},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.activePower(endpoint, {min: 10, change: 10});
            await reporting.rmsCurrent(endpoint, {min: 10, change: 50});
            await reporting.rmsVoltage(endpoint, {min: 10, change: 10});
            await reporting.currentSummDelivered(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acVoltageMultiplier: 1,
                acVoltageDivisor: 10, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1, acPowerDivisor: 10});
            device.save();
        },
    },
    {
        zigbeeModel: ['HY0095'],
        model: 'U2-86K11ND10-ZD',
        vendor: 'Honyar',
        description: '1 gang switch',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch()],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['HY0096'],
        model: 'U2-86K21ND10-ZD',
        vendor: 'Honyar',
        description: '2 gang switch',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['HY0097'],
        model: 'U2-86K31ND10-ZD',
        vendor: 'Honyar',
        description: '3 gang switch',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint3);
        },
    },
	{
		zigbeeModel: ['000a0abb\u0000', 'RH5000_SmartOutlet'],
		model: 'IHC8223AL',
		vendor: 'Honyar',
		description: 'Smart Power Socket 10A (with power monitoring)',
		fromZigbee: [fz.on_off, fzLocal.honyer_electrical_measurement, fzLocal.honyer_metering],
		toZigbee: [tz.on_off],
		onEvent: async (type, data, device) => {
			device.skipDefaultResponse = true;
			const Endpoint = device.getEndpoint(1);
			if (Endpoint == null) {
				return;
			}
			if (type === 'stop') {
				clearInterval(globalStore.getValue(device, 'interval'));
				globalStore.clearValue(device, 'interval');
			} else if (!globalStore.hasValue(device, 'interval')) {
				const interval = setInterval(async () => {
					try {
						await Endpoint.read('haElectricalMeasurement', ['activePower', 'rmsCurrent', 'rmsVoltage']);
						await Endpoint.read('seMetering', ['currentSummDelivered']);
						await Endpoint.read('genOnOff', ['onOff']);
					} catch (error) {
					}
				}, 5*1000); //5秒读一次。
				globalStore.putValue(device, 'interval', interval);
			}
		},
		exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
	},	
];

export default definitions;
module.exports = definitions;
