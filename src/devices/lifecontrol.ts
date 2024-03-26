import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as globalStore from '../lib/store';
import * as reporting from '../lib/reporting';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Leak_Sensor'],
        model: 'MCLH-07',
        vendor: 'LifeControl',
        description: 'Water leak switch',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['Door_Sensor'],
        model: 'MCLH-04',
        vendor: 'LifeControl',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['vivi ZLight'],
        model: 'MCLH-02',
        vendor: 'LifeControl',
        description: 'RGB LED lamp',
        extend: [light({colorTemp: {range: [167, 333]}, color: true})],
    },
    {
        zigbeeModel: ['RICI01'],
        model: 'MCLH-03',
        vendor: 'LifeControl',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting correctly.
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                        await endpoint.read('seMetering', ['currentSummDelivered', 'multiplier', 'divisor']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 10*1000); // Every 10 seconds
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
    },
    {
        zigbeeModel: ['Motion_Sensor'],
        model: 'MCLH-05',
        vendor: 'LifeControl',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['VOC_Sensor'],
        model: 'MCLH-08',
        vendor: 'LifeControl',
        description: 'Air sensor',
        fromZigbee: [fz.lifecontrolVoc, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.temperature(), e.humidity(), e.voc().withUnit('ppb'), e.eco2(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
