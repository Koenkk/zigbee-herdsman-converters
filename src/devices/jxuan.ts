import {Definition} from '../lib/types';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
const e = exposes.presets;
const ea = exposes.access;
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        zigbeeModel: ['wall pir'],
        model: 'PRZ01',
        vendor: 'J.XUAN',
        description: 'Human body movement sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['door sensor'],
        model: 'DSZ01',
        vendor: 'J.XUAN',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
    },
    {
        zigbeeModel: ['JD-SWITCH\u000002'],
        model: 'WSZ01',
        vendor: 'J.XUAN',
        description: 'Wireless switch',
        fromZigbee: [fz.WSZ01_on_off_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['release', 'single', 'double', 'hold']), e.battery()],
    },
    {
        zigbeeModel: ['00090bdc'],
        model: 'SPZ01',
        vendor: 'J.XUAN',
        description: 'plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        exposes: [e.switch(), e.power(), e.power_outage_memory().withAccess(ea.STATE_SET)],
        toZigbee: [tz.on_off, tz.SPZ01_power_outage_memory],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
        },
    },
];

export default definitions;
module.exports = definitions;
