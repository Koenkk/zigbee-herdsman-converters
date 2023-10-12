import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;
import * as tuya from '../lib/tuya';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3210_ttkgurpb'}],
        model: 'FUT038Z',
        description: 'RGBW LED controller',
        vendor: 'MiBoxer',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
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

            // Get unique identifier for the remote and convert it from hex-string to integer
            const devId = parseInt(device.ieeeAddr, 16);

            // Generate 8 globally unique (but reproducable) Zigbee group IDs
            const groupIds = [devId+1, devId+2, devId+3, devId+4, devId+5, devId+6, devId+7, devId+8];

            // Generate the zone mapping, which tells the remote to use the 8 unique group IDs for its 8 zones
            const zoneToGroupMappings = groupIds.map((groupId, i) => ({zoneNum: i+1, groupId: groupId}));

            // Send the zone mapping to the remote
            await endpoint.command('genGroups', 'miboxerSetZones', {zones: zoneToGroupMappings});
            await endpoint.command('genBasic', 'tuyaSetup', {}, {disableDefaultResponse: true});
        },
    },
];

module.exports = definitions;
