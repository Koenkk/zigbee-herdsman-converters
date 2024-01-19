import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['DimmerSwitch-2Gang-ZB3.0'],
        model: 'D086-ZG',
        vendor: 'HZC Electric',
        description: 'Zigbee dual dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint1);
            await reporting.brightness(endpoint1);

            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint2);
            await reporting.brightness(endpoint2);
        },
        endpoint: () => {
            return {l1: 1, l2: 2};
        },
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
