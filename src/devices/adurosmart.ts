import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as legacy from '../lib/legacy';
import * as reporting from '../lib/reporting';
import {light, onOff} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ADUROLIGHT_CSC'],
        model: '15090054',
        vendor: 'AduroSmart',
        description: 'Remote scene controller',
        fromZigbee: [fz.battery, fz.command_toggle, fz.command_recall],
        toZigbee: [],
        exposes: [e.battery(), e.action(['toggle', 'recall_253', 'recall_254', 'recall_255'])],
    },
    {
        zigbeeModel: ['AD-SmartPlug3001'],
        model: '81848',
        vendor: 'AduroSmart',
        description: 'ERIA smart plug (with power measurements)',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['ZLL-ExtendedColo', 'ZLL-ExtendedColor'],
        model: '81809/81813',
        vendor: 'AduroSmart',
        description: 'ERIA colors and white shades smart light bulb A19/BR30',
        extend: [light({colorTemp: {range: undefined}, color: {applyRedFix: true}})],
        endpoint: (device) => {
            return {'default': 2};
        },
    },
    {
        zigbeeModel: ['AD-RGBW3001'],
        model: '81809FBA',
        vendor: 'AduroSmart',
        description: 'ERIA colors and white shades smart light bulb A19/BR30',
        extend: [light({colorTemp: {range: [153, 500]}, color: {modes: ['xy', 'hs'], applyRedFix: true}})],
    },
    {
        zigbeeModel: ['AD-E14RGBW3001'],
        model: '81895',
        vendor: 'AduroSmart',
        description: 'ERIA E14 Candle Color',
        extend: [light({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        zigbeeModel: ['AD-DimmableLight3001'],
        model: '81810',
        vendor: 'AduroSmart',
        description: 'Zigbee Aduro Eria B22 bulb - warm white',
        extend: [light()],
    },
    {
        zigbeeModel: ['Adurolight_NCC'],
        model: '81825',
        vendor: 'AduroSmart',
        description: 'ERIA smart wireless dimming switch',
        fromZigbee: [fz.command_on, fz.command_off, legacy.fz.eria_81825_updown],
        exposes: [e.action(['on', 'off', 'up', 'down'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['AD-Dimmer'],
        model: '81849',
        vendor: 'AduroSmart',
        description: 'ERIA built-in multi dimmer module 300W',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['BDP3001'],
        model: '81855',
        vendor: 'AduroSmart',
        description: 'ERIA smart plug (dimmer)',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['BPU3'],
        model: 'BPU3',
        vendor: 'AduroSmart',
        description: 'ERIA smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['Extended Color LED Strip V1.0'],
        model: '81863',
        vendor: 'AduroSmart',
        description: 'Eria color LED strip',
        extend: [light({colorTemp: {range: [153, 500]}, color: {modes: ['xy', 'hs'], applyRedFix: true}})],
    },
    {
        zigbeeModel: ['AD-81812', 'AD-ColorTemperature3001'],
        model: '81812/81814',
        vendor: 'AduroSmart',
        description: 'Eria tunable white A19/BR30 smart bulb',
        extend: [light({colorTemp: {range: [153, 500]}, color: {modes: ['xy', 'hs']}})],
    },
    {
        zigbeeModel: ['ONOFFRELAY'],
        model: '81898',
        vendor: 'AduroSmart',
        description: 'AduroSmart on/off relay',
        extend: [onOff({powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
