import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ABL-LIGHT-Z-001'],
        model: 'WF4C_WF6C',
        vendor: 'Acuity Brands Lighting (ABL)',
        description: 'Juno 4" and 6" LED smart wafer downlight',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 370], disableColorTempStartup: true}),
    },
    {
        zigbeeModel: ['ABL-LIGHT-Z-201'],
        model: 'RB56SC',
        vendor: 'Acuity Brands Lighting (ABL)',
        description: 'Juno Retrobasics 4" and 6" LED smart downlight',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 370], disableColorTempStartup: true}),
    },
];

module.exports = definitions;
