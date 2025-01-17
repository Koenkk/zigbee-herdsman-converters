import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as m from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['DimmerSwitch-2Gang-ZB3.0'],
        model: 'D086-ZG',
        vendor: 'HZC Electric',
        description: 'Zigbee dual dimmer',
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.light({endpointNames: ['l1', 'l2'], configureReporting: true})],
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
    {
        zigbeeModel: ['WaterLeakageSensor-ZB3.0'],
        model: 'S900W-ZG',
        vendor: 'HZC Electric',
        description: 'Water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['HZC Electric motion sensor'],
        model: 'S902M-ZG',
        vendor: 'HZC Electric',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.tamper()],
        extend: [m.illuminance()],
    },
    {
        fingerprint: [{type: 'Router', manufacturerName: 'Shyugj', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: 'D077-ZG',
        vendor: 'HZC Electric',
        description: 'Zigbee dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['Meter-Dimmer-Switch-ZB3.0'],
        model: 'D692-ZG',
        vendor: 'HZC Electric',
        description: 'Rotary dimmer with screen',
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
        meta: {},
    },
];

export default definitions;
module.exports = definitions;
