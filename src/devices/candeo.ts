import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import {light} from '../lib/modernExtend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Candeo'}],
        model: 'C202',
        vendor: 'Candeo',
        description: 'Zigbee LED smart dimmer switch',
        extend: [light({configureReporting: true})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerID: 4098}],
        model: 'C210',
        vendor: 'Candeo',
        description: 'Zigbee dimming smart plug',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['HK-DIM-A', 'Candeo Zigbee Dimmer', 'HK_DIM_A'],
        fingerprint: [{modelID: 'HK_DIM_A', manufacturerName: 'Shyugj'}],
        model: 'HK-DIM-A',
        vendor: 'Candeo',
        description: 'Zigbee LED dimmer smart switch',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['C204'],
        model: 'C204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: extend.light_onoff_brightness().toZigbee,
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
