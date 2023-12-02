import {Definition} from '../lib/types';
import extend from '../lib/extend';

const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy dim switchable wall module',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ML-ST-D200-NF'],
        model: 'ML-ST-D200-NF',
        vendor: 'M-ELEC',
        description: 'Stitchy dim neutral free switchable wall module',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ML-ST-BP-DIM'],
        model: 'ML-ST-BP-DIM',
        vendor: 'M-ELEC',
        description: 'Stitchy dim mechanism',
        extend: extend.light_onoff_brightness({disableEffect: true}),
    },
    {
        zigbeeModel: ['ML-ST-R200'],
        model: 'ML-ST-R200',
        vendor: 'M-ELEC',
        description: 'Stitchy switchable wall module',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.light()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
