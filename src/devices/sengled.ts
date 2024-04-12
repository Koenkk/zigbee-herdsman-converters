import {Definition, Expose, ModernExtend, Fz, KeyValueAny} from '../lib/types';
import {presets} from '../lib/exposes';
import {
    onOff, LightArgs, light as lightDontUse, electricityMeter, forcePowerSource, ota,
    iasZoneAlarm,
    battery,
} from '../lib/modernExtend';

export function sengledLight(args?: LightArgs) {
    return lightDontUse({effect: false, powerOnBehavior: false, ...args});
}

export function sengledSwitchAction(): ModernExtend {
    const exposes: Expose[] = [presets.action(['on', 'up', 'down', 'off', 'on_double', 'on_long', 'off_double', 'off_long'])];

    const fromZigbee: Fz.Converter[] = [{
        cluster: 64528,
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            // A list of commands the sixth digit in the raw data can map to
            const lookup: KeyValueAny = {
                1: 'on',
                2: 'up',
                // Two outputs for long press. The eighth digit outputs 1 for initial press then 2 for each
                // LED blink (approx 1 second, repeating until release)
                3: 'down', // Same as above
                4: 'off',
                5: 'on_double',
                6: 'on_long',
                7: 'off_double',
                8: 'off_long',
            };

            if (msg.data[7] === 2) { // If the 8th digit is 2 (implying long press)
                // Append '_long' to the end of the action so the user knows it was a long press.
                // This only applies to the up and down action
                return {action: `${lookup[msg.data[5]]}_long`};
            } else {
                return {action: lookup[msg.data[5]]}; // Just output the data from the above lookup list
            }
        },
    }];

    return {exposes, fromZigbee, isModernExtend: true};
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
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
            electricityMeter({cluster: 'metering'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E12-N1E'],
        model: 'E12-N1E',
        vendor: 'Sengled',
        description: 'Smart LED multicolor (BR30)',
        extend: [
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
            electricityMeter({cluster: 'metering'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1G-G8E'],
        model: 'E1G-G8E',
        vendor: 'Sengled',
        description: 'Multicolor light strip (2M)',
        extend: [
            sengledLight({colorTemp: {range: undefined}, color: {modes: ['xy']}}),
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
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            sengledLight(),
            electricityMeter({cluster: 'metering'}),
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
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
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
            sengledLight({colorTemp: {range: undefined}}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element plus color (A19)',
        extend: [
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
            electricityMeter({cluster: 'metering'}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-U2E'],
        model: 'E11-U2E',
        vendor: 'Sengled',
        description: 'Element color plus E27',
        extend: [
            sengledLight({colorTemp: {range: undefined}, color: {modes: ['xy']}}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E11-U3E'],
        model: 'E11-U3E',
        vendor: 'Sengled',
        description: 'Element color plus B22',
        extend: [
            sengledLight({colorTemp: {range: undefined}, color: {modes: ['xy']}}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['E1F-N5E'],
        model: 'E1F-N5E',
        vendor: 'Sengled',
        description: 'Element color plus E12',
        extend: [
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            sengledLight({colorTemp: {range: [154, 500]}, color: {modes: ['xy']}}),
            electricityMeter({cluster: 'metering'}),
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
        extend: [
            sengledSwitchAction(),
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
    {
        zigbeeModel: ['E21-N14A'],
        model: 'E21-N14A',
        vendor: 'Sengled',
        description: 'Smart light bulb, dimmable 5000K, E26/A19',
        extend: [
            sengledLight(),
            electricityMeter({cluster: 'metering'}),
            ota(),
        ],
    },
];

export default definitions;
module.exports = definitions;
