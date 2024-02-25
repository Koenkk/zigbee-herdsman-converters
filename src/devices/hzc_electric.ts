import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import {deviceEndpoints, light} from '../lib/modernExtend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['DimmerSwitch-2Gang-ZB3.0'],
        model: 'D086-ZG',
        vendor: 'HZC Electric',
        description: 'Zigbee dual dimmer',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            light({endpointNames: ['l1', 'l2'], configureReporting: true}),
        ],
    },
    {
        zigbeeModel: ['TempAndHumSensor-ZB3.0'],
        model: 'S093TH-ZG',
        vendor: 'HZC Electric',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity()], // Unfortunately, battery percentage is not reported by this device
    },
];

export default definitions;
module.exports = definitions;
