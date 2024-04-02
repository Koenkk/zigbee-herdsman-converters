import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import {
    onOff, LightArgs, light as lightDontUse, electricityMeter, forcePowerSource, light, ota,
    iasZoneAlarm,
    battery,
} from '../lib/modernExtend';

const e = exposes.presets;

export function sengledLight(args?: LightArgs) {
    return lightDontUse({effect: false, powerOnBehavior: false, ...args});
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['E13-N11'],
        model: 'E13-N11',
        vendor: 'Sengled',
        description: 'Flood light with motion sensor light outdoor',
        extend: [
            sengledLight(),
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1']}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E21-N13A'],
        model: 'E21-N13A',
        vendor: 'Sengled',
        description: 'Smart LED (A19)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E21-N1EA'],
        model: 'E21-N1EA',
        vendor: 'Sengled',
        description: 'Smart LED multicolor A19 bulb',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
            electricityMeter({cluster: 'metering'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E12-N1E'],
        model: 'E12-N1E',
        vendor: 'Sengled',
        description: 'Smart LED multicolor (BR30)',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}}),
            electricityMeter({cluster: 'metering'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1G-G8E'],
        model: 'E1G-G8E',
        vendor: 'Sengled',
        description: 'Multicolor light strip (2M)',
        extend: [
            light({colorTemp: {range: undefined}, color: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-U21U31'],
        model: 'E11-U21U31',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element classic (A19)',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}}),
            electricityMeter({cluster: 'metering'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-G23', 'E11-G33'],
        model: 'E11-G23/E11-G33',
        vendor: 'Sengled',
        description: 'Element classic (A60)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-N13', 'E11-N13A', 'E11-N14', 'E11-N14A'],
        model: 'E11-N13/E11-N13A/E11-N14/E11-N14A',
        vendor: 'Sengled',
        description: 'Element extra bright (A19)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['Z01-A19NAE26'],
        model: 'Z01-A19NAE26',
        vendor: 'Sengled',
        description: 'Element plus (A19)',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}}),
            electricityMeter({cluster: 'metering'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['Z01-A60EAE27'],
        model: 'Z01-A60EAE27',
        vendor: 'Sengled',
        description: 'Element Plus (A60)',
        extend: [
            light({colorTemp: {range: undefined}}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element plus color (A19)',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}}),
            electricityMeter({cluster: 'metering'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-U2E'],
        model: 'E11-U2E',
        vendor: 'Sengled',
        description: 'Element color plus E27',
        extend: [
            light({colorTemp: {range: undefined}, color: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-U3E'],
        model: 'E11-U3E',
        vendor: 'Sengled',
        description: 'Element color plus B22',
        extend: [
            light({colorTemp: {range: undefined}, color: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1F-N5E'],
        model: 'E1F-N5E',
        vendor: 'Sengled',
        description: 'Element color plus E12',
        extend: [
            sengledLight({colorTemp: {range: [154, 500]}}),
            electricityMeter({cluster: 'metering'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E12-N14'],
        model: 'E12-N14',
        vendor: 'Sengled',
        description: 'Element Classic (BR30)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1A-AC2'],
        model: 'E1ACA4ABE38A',
        vendor: 'Sengled',
        description: 'Element downlight smart LED bulb',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1D-G73'],
        model: 'E1D-G73WNA',
        vendor: 'Sengled',
        description: 'Smart window and door sensor',
        extend: [
            iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltage: true, voltageReporting: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E2D-G73'],
        model: 'E2D-G73',
        vendor: 'Sengled',
        description: 'Smart window and door sensor G2',
        extend: [
            iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltage: true, voltageReporting: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1C-NB6'],
        model: 'E1C-NB6',
        vendor: 'Sengled',
        description: 'Smart plug',
        extend: [
            onOff(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1C-NB7'],
        model: 'E1C-NB7',
        vendor: 'Sengled',
        description: 'Smart plug with energy tracker',
        extend: [
            onOff({powerOnBehavior: false}),
            electricityMeter({cluster: 'metering'}),
        ],
    },
    {
        zigbeeModel: ['E1E-G7F'],
        model: 'E1E-G7F',
        vendor: 'Sengled',
        description: 'Smart switch',
        fromZigbee: [fz.E1E_G7F_action],
        exposes: [e.action(['on', 'up', 'down', 'off', 'on_double', 'on_long', 'off_double', 'off_long'])],
        extend: [
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-N1G'],
        model: 'E11-N1G',
        vendor: 'Sengled',
        description: 'Vintage LED edison bulb (ST19)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1F-N9G'],
        model: 'E1F-N9G',
        vendor: 'Sengled',
        description: 'Smart LED filament candle (E12)',
        extend: [
            sengledLight(),
            ota(),
        ],
    },
];

export default definitions;
module.exports = definitions;
