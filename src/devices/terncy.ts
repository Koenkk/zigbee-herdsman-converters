import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
import {deviceEndpoints, light, onOff} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['TERNCY-WS01-S4'],
        model: 'TERNCY-WS01',
        vendor: 'TERNCY',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4']}),
        ],
    },
    {
        zigbeeModel: ['DL001'],
        model: 'DL001',
        vendor: 'TERNCY',
        description: 'Two color temperature intelligent downlight',
        extend: [light({colorTemp: {range: [156, 476]}})],
    },
    {
        zigbeeModel: ['TERNCY-DC01'],
        model: 'TERNCY-DC01',
        vendor: 'TERNCY',
        description: 'Temperature & contact sensor ',
        fromZigbee: [fz.terncy_temperature, fz.terncy_contact, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery()],
        meta: {battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ['TERNCY-PP01'],
        model: 'TERNCY-PP01',
        vendor: 'TERNCY',
        description: 'Awareness switch',
        fromZigbee: [fz.terncy_temperature, fz.occupancy_with_timeout, fz.illuminance, fz.terncy_raw, legacy.fz.terncy_raw, fz.battery],
        exposes: [e.temperature(), e.occupancy(), e.illuminance_lux(), e.illuminance(),
            e.action(['single', 'double', 'triple', 'quadruple'])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ['TERNCY-SD01'],
        model: 'TERNCY-SD01',
        vendor: 'TERNCY',
        description: 'Knob smart dimmer',
        fromZigbee: [fz.terncy_raw, legacy.fz.terncy_raw, legacy.fz.terncy_knob, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.battery(), e.action(['single', 'double', 'triple', 'quadruple', 'rotate']),
            e.text('direction', ea.STATE)],
    },
    {
        zigbeeModel: ['TERNCY-LS01'],
        model: 'TERNCY-LS01',
        vendor: 'TERNCY',
        description: 'Smart light socket',
        exposes: [e.switch(), e.action(['single'])],
        fromZigbee: [fz.on_off, fz.terncy_raw, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['CL001'],
        model: 'CL001',
        vendor: 'TERNCY',
        description: 'Beevon ceiling light',
        ota: ota.zigbeeOTA,
        extend: [light({colorTemp: {range: [50, 500]}, powerOnBehavior: false, effect: false})],
    },
];

export default definitions;
module.exports = definitions;
