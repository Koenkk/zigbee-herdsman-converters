const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_majwnphg'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_6axxqqi2'},
        ],
        model: 'JR-ZDS01',
        vendor: 'Girier',
        description: '1 gang mini switch',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: extend.switch().exposes.concat([exposes.presets.power_on_behavior(), exposes.presets.switch_type_2()]),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
