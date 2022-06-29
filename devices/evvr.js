const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['SRB01', 'SRB01A'], // The model ID from: Device with modelID 'SRB01A' is not supported.
        model: 'SRB01', // Vendor model number, look on the device for a model number
        vendor: 'Evvr', // Vendor of the device (only used for documentation and startup logging)
        description: 'Evvr In-Wall Relay Switch', // Description of the device, copy from vendor site.
        fromZigbee: [fz.on_off], // We will add this later
        toZigbee: [tz.on_off], // Should be empty, unless device can be controlled (e.g. lights, switches).
        extend: extend.switch(),
        exposes: [e.switch()], // Defines what this device exposes, used for e.g. Home Assistant discovery and in the frontend

        // The configure method below is needed to make the device reports on/off state changes
        // when the device is controlled manually through the button on it.
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

