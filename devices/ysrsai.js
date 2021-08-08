const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'ZB-CL01', manufacturerName: 'YSRSAI'}],
        zigbeeModel: ['ZB-CL03', 'FB56-ZCW20FB1.2'],
        model: 'YSR-MINI-01_rgbcct',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (RGB+CCT)',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
    },
    {
        zigbeeModel: ['ZB-CT01'],
        model: 'YSR-MINI-01_wwcw',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (WW/CW)',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
    },
    {
        zigbeeModel: ['ZB-DL01'],
        model: 'YSR-MINI-01_dimmer',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (Dimmer)',
        extend: extend.light_onoff_brightness(),
    },
];
