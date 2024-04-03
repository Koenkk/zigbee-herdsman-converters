import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['S24019'],
        model: 'S24019',
        vendor: 'The Light Group',
        description: 'SLC SmartOne led dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.metering, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_brightness, tz.level_config],
        exposes: [e.light_brightness().withLevelConfig()],
        configure: async (device, coordinatorEndpoint) => {
            // Endpoint 1
            const endpoint1 = device.getEndpoint(1);
            const binds1 = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds1);
            await reporting.onOff(endpoint1);
            await reporting.brightness(endpoint1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint1);
            await reporting.activePower(endpoint1, {min: 5, max: 3600, change: 1000});
            await reporting.rmsCurrent(endpoint1, {min: 5, max: 3600, change: 100});
            await reporting.rmsVoltage(endpoint1, {min: 5, max: 3600, change: 100});
            // read switch state
            await endpoint1.read('genOnOff', ['onOff']);
        },
    },
    {
        zigbeeModel: ['S57003'],
        model: 'S57003',
        vendor: 'The Light Group',
        description: 'SLC SmartOne Zigbee wall remote 4-channels',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action([
            'on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2',
            'on_l3', 'off_l3', 'brightness_move_up_l3', 'brightness_move_down_l3', 'brightness_stop_l3',
            'on_l4', 'off_l4', 'brightness_move_up_l4', 'brightness_move_down_l4', 'brightness_stop_l4',
        ])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['S24013'],
        model: 'S24013',
        vendor: 'The Light Group',
        description: 'SLC SmartOne AC dimmer mini 200W Zigbee LN',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['S32053'],
        model: 'S32053',
        vendor: 'The Light Group',
        description: 'SLC SmartOne CV led dimmable driver',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
