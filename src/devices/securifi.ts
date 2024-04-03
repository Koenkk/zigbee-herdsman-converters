import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['PP-WHT-US'],
        model: 'PP-WHT-US',
        vendor: 'Securifi',
        description: 'Peanut Smart Plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        ota: ota.securifi,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 180, acVoltageDivisor: 39321, acCurrentMultiplier: 72,
                acCurrentDivisor: 39321, acPowerMultiplier: 10255, acPowerDivisor: 39321});
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 110}); // Voltage reports in 0.00458V
            await reporting.rmsCurrent(endpoint, {change: 55}); // Current reports in 0.00183A
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.261W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['ZB2-BU01'],
        model: 'B01M7Y8BP9',
        vendor: 'Securifi',
        description: 'Almond Click multi-function button',
        fromZigbee: [fz.almond_click],
        exposes: [e.action(['single', 'double', 'long'])],
        toZigbee: [],
    },
];

export default definitions;
module.exports = definitions;
