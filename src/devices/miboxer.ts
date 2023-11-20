import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3210_ttkgurpb'}],
        model: 'FUT038Z',
        description: 'RGBW LED controller',
        vendor: 'MiBoxer',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZB210_lmqquxus'}],
        model: 'FUT035Z+',
        description: 'MiBoxer FUT035Z+ Dual white LED controller',
        vendor: 'MiBoxer',
        extend: tuya.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500], noConfigure: true, disableEffect: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await tuya.extend.light_onoff_brightness_colortemp().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.brightness(device.getEndpoint(1));
        },
    },
    {
        fingerprint: [{modelID: 'TS1002', manufacturerName: '_TZ3000_xwh1e22x'}],
        model: 'FUT089Z',
        vendor: 'MiBoxer',
        description: 'RGB+CCT Remote',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await endpoint.command('genGroups', 'miboxerSetZones', {zones: [
                {zoneNum: 1, groupId: 101},
                {zoneNum: 2, groupId: 102},
                {zoneNum: 3, groupId: 103},
                {zoneNum: 4, groupId: 104},
                {zoneNum: 5, groupId: 105},
                {zoneNum: 6, groupId: 106},
                {zoneNum: 7, groupId: 107},
                {zoneNum: 8, groupId: 108},
            ]});
            await endpoint.command('genBasic', 'tuyaSetup', {}, {disableDefaultResponse: true});
        },
    },
];

export default definitions;
module.exports = definitions;
