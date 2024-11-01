import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_lqmvrwa2'}],
        model: 'eTH730',
        vendor: 'SEDEA',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.humidity(), e.battery(), e.battery_voltage()],
    },
];

export default definitions;
module.exports = definitions;
