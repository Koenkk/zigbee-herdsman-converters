import {Zcl} from 'zigbee-herdsman';
import dataType from 'zigbee-herdsman/dist/zcl/definition/dataType';
import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
import {battery, deviceEndpoints, humidity, numeric, onOff, temperature} from '../lib/modernExtend';
const e = exposes.presets;
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SDO-4-1-00'],
        model: 'SDO-4-1-20',
        vendor: 'NodOn',
        description: 'Door & window opening sensor',
        fromZigbee: [fz.battery, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.battery()],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['SIN-4-RS-20'],
        model: 'SIN-4-RS-20',
        vendor: 'NodOn',
        description: 'Roller shutter relay switch',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position_tilt()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-RS-20_PRO'],
        model: 'SIN-4-RS-20_PRO',
        vendor: 'NodOn',
        description: 'Roller shutter relay switch',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position_tilt()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-1-20'],
        model: 'SIN-4-1-20',
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        extend: [
            onOff({ota: ota.zigbeeOTA}),
            numeric({
                name: 'impulse_mode_configuration',
                unit: 'ms',
                cluster: 'genOnOff',
                attribute: {ID: 0x0001, type: dataType.uint16},
                valueMin: 0,
                valueMax: 10000,
                scale: 1,
                description: 'Set the impulse duration in milliseconds (set value to 0 to deactivate the impulse mode).',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            }),
        ],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['SIN-4-1-20_PRO'],
        model: 'SIN-4-1-20_PRO',
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        extend: [
            onOff({ota: ota.zigbeeOTA}),
            numeric({
                name: 'impulse_mode_configuration',
                unit: 'ms',
                cluster: 'genOnOff',
                attribute: {ID: 0x0001, type: dataType.uint16},
                valueMin: 0,
                valueMax: 10000,
                scale: 1,
                description: 'Set the impulse duration in milliseconds (set value to 0 to deactivate the impulse mode).',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            }),
        ],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['SIN-4-2-20'],
        model: 'SIN-4-2-20',
        vendor: 'NodOn',
        description: 'Lighting relay switch',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            onOff({endpointNames: ['l1', 'l2']}),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-2-20_PRO'],
        model: 'SIN-4-2-20_PRO',
        vendor: 'NodOn',
        description: 'Lighting relay switch',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            onOff({endpointNames: ['l1', 'l2']}),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-FP-20'],
        model: 'SIN-4-FP-20',
        vendor: 'NodOn',
        description: 'Pilot wire heating module',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.metering, fz.nodon_pilot_wire_mode],
        toZigbee: [tz.on_off, tz.nodon_pilot_wire_mode],
        exposes: [e.power(), e.energy(), e.pilot_wire_mode()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering', 'manuSpecificNodOnPilotWire']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await ep.read('manuSpecificNodOnPilotWire', ['mode']);
        },
    },
    {
        zigbeeModel: ['SIN-4-FP-21'],
        model: 'SIN-4-FP-21',
        vendor: 'NodOn',
        description: 'Pilot wire heating module',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.metering, fz.nodon_pilot_wire_mode],
        toZigbee: [tz.on_off, tz.nodon_pilot_wire_mode],
        exposes: [e.power(), e.energy(), e.pilot_wire_mode()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering', 'manuSpecificNodOnPilotWire']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await ep.read('manuSpecificNodOnPilotWire', ['mode']);
        },
    },
    {
        zigbeeModel: ['SIN-4-1-21'],
        model: 'SIN-4-1-21',
        vendor: 'NodOn',
        description: 'Multifunction relay switch with metering',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), e.power_on_behavior()],
        extend: [
            numeric({
                name: 'impulse_mode_configuration',
                unit: 'ms',
                cluster: 'genOnOff',
                attribute: {ID: 0x0001, type: dataType.uint16},
                valueMin: 0,
                valueMax: 10000,
                scale: 1,
                description: 'Set the impulse duration in milliseconds (set value to 0 to deactivate the impulse mode).',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
    },
    {
        zigbeeModel: ['STPH-4-1-00'],
        model: 'STPH-4-1-00',
        vendor: 'NodOn',
        description: 'Temperature & humidity sensor',
        extend: [battery(), temperature(), humidity()],
        ota: ota.zigbeeOTA,
    },
];

export default definitions;
module.exports = definitions;
