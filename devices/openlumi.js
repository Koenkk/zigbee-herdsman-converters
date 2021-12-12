const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['openlumi.gw_router.jn5169'],
        model: 'GWRJN5169',
        vendor: 'OpenLumi',
        description: '[Lumi Router (JN5169)](https://github.com/igo-r/Lumi-Router-JN5169)',
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genDeviceTempCfg']);
            await reporting.deviceTemperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_5});
        },
        exposes: [e.device_temperature()],
    },
];
