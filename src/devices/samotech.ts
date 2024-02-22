import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import {electricityMeter, light, onOff} from '../lib/modernExtend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SM308'],
        model: 'SM308',
        vendor: 'Samotech',
        description: 'Zigbee AC in wall switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SM308-S'],
        model: 'SM308-S',
        vendor: 'Samotech',
        description: 'Zigbee in wall smart switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SM308-2CH'],
        model: 'SM308-2CH',
        vendor: 'Samotech',
        description: 'Zigbee 2 channel in wall switch',
        extend: extend.switch({fromZigbee: [fz.electrical_measurement, fz.metering]}),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.power_on_behavior().withEndpoint('l1'),
            e.power_on_behavior().withEndpoint('l2'),
            e.power(), e.current(), e.voltage(), e.energy()],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint11 = device.getEndpoint(11);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
            await reporting.bind(endpoint11, coordinatorEndpoint, ['genOta', 'haElectricalMeasurement', 'seMetering']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint11);
            await reporting.readMeteringMultiplierDivisor(endpoint11);
            await reporting.rmsVoltage(endpoint11, {min: 10, change: 20});
            await reporting.rmsCurrent(endpoint11, {min: 10, change: 10});
            await reporting.activePower(endpoint11, {min: 10, change: 15});
            await reporting.currentSummDelivered(endpoint11, {min: 300});
        },
    },
    {
        zigbeeModel: ['SM309-S'],
        model: 'SM309-S',
        vendor: 'Samotech',
        description: 'Zigbee dimmer 400W with power and energy metering',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering]),
        toZigbee: extend.light_onoff_brightness().toZigbee,
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20});
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.activePower(endpoint, {min: 10, change: 15});
            await reporting.currentSummDelivered(endpoint, {min: 300});
            await reporting.onOff(endpoint);
        },
        exposes: extend.light_onoff_brightness().exposes.concat([e.power(), e.current(), e.voltage(), e.energy()]),
    },
    {
        zigbeeModel: ['SM309'],
        model: 'SM309',
        vendor: 'Samotech',
        description: 'Zigbee dimmer 400W',
        extend: [light({configureReporting: true})],
    },
    {
        // v1 doesn't support electricity measurements
        // https://github.com/Koenkk/zigbee2mqtt/issues/21449
        fingerprint: [{manufacturerName: 'Samotech', modelID: 'Dimmer-Switch-ZB3.0'}],
        model: 'SM323_v1',
        vendor: 'Samotech',
        description: 'Zigbee retrofit dimmer 250W',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        zigbeeModel: ['SM323'],
        fingerprint: [{modelID: 'HK_DIM_A', manufacturerName: 'Samotech'}],
        model: 'SM323_v2',
        vendor: 'Samotech',
        description: 'Zigbee retrofit dimmer 250W',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        zigbeeModel: ['SM324'],
        model: 'SM324',
        vendor: 'Samotech',
        description: '220V Zigbee CCT LED dimmer',
        extend: [light({colorTemp: {range: [150, 500]}, configureReporting: true})],
    },
    {
        zigbeeModel: ['SM325-ZG'],
        model: 'SM325-ZG',
        vendor: 'Samotech',
        description: 'Zigbee smart pull cord dimmer switch',
        extend: [light({configureReporting: true, effect: false, powerOnBehavior: false})],
    },
];

export default definitions;
module.exports = definitions;
