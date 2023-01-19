const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Bankamp Dimm-Leuchte'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
        model: 'Grazia', // Vendor model number, look on the device for a model number
        vendor: 'Bankamp Leuchten', // Vendor of the device (only used for documentation and startup logging)
        description: 'Bankamp Grazia Ceiling Light', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
        // Note that fromZigbee, toZigbee and exposes are missing here since we use extend here.
        // Extend contains a default set of fromZigbee/toZigbee converters and expose for common device types.
        // The following extends are available:
        // - extend.switch
        // - extend.light_onoff_brightness
        // - extend.light_onoff_brightness_colortemp
        // - extend.light_onoff_brightness_color
        // - extend.light_onoff_brightness_colortemp_color
        extend: extend.light_onoff_brightness(),
    },
];