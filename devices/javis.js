const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['JAVISLOCK'],
        fingerprint: [{modelID: 'doorlock_5001', manufacturerName: 'Lmiot'},
        { modelID: 'E321V000A03', manufacturerName: 'Vensi'}],
        model: 'JS-SLK2-ZB',
        vendor: 'JAVIS',
        description: 'Intelligent biometric digital lock',
        fromZigbee: [fz.javis_lock_report, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['unlock'])],
    },
    {
        zigbeeModel: ['JAVISSENSOR'],
        fingerprint: [{ modelID: 'TS0601', manufacturerName: '_TZE200_lgstepha' },
        { modelID: 'TS0601', manufacturerName: '_TZE200_kagkgk0i' },
        { modelID: 'TS0601', manufacturerName: '_TZE200_i0b1dbqu' },],
        model: 'JS-MC-SENSOR-ZB',
        vendor: 'JAVIS',
        description: 'Javis microwave sensor',
        supports: 'action',
        fromZigbee: [fz.javis_microwave_sensor, fz.battery],
        toZigbee: [ tz.javis_microwave_sensor],
        exposes: [e.occupancy(),e.illuminance_lux()],
    },
];
