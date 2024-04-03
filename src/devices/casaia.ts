import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
import tz from '../converters/toZigbee';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['CSLC601-D-E'],
        model: 'CSLC601-D-E',
        vendor: 'CASAIA',
        description: 'Dry contact relay switch module in 220v AC for gas boiler',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['CTHS317ET'],
        model: 'CTHS-317-ET',
        vendor: 'CASAIA',
        description: 'Remote temperature probe on cable',
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['CCB432'],
        model: 'CCB432',
        vendor: 'CASAIA',
        description: 'Rail-Din relay and energy meter',
        fromZigbee: [fz.electrical_measurement, fz.metering, fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        meta: {publishDuplicateTransaction: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
