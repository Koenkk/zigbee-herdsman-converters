const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');
const utils = require('../lib/utils');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    // MG-AUZG01 requires multiEndpoint only for on_off
    // https://github.com/Koenkk/zigbee2mqtt/issues/13190
    MGAUZG01_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const endpointName = utils.getKey(model.endpoint(meta.device), msg.endpoint.ID);
                return {[`state_${endpointName}`]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_dd8wwzcy'}],
        model: 'MG-AUZG01',
        vendor: 'Makegood',
        description: 'Double Zigbee power point',
        fromZigbee: [fzLocal.MGAUZG01_on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy()],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
];
