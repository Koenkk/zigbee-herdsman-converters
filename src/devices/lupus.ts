import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {deviceEndpoints, onOff} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SCM_00.00.03.11TC'],
        model: '12031',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['SCM-3-OTA_00.00.03.16TC', 'SCM-6-OTA_00.00.03.17TC', 'SCM-6-OTA_00.00.03.18TC', 'SCM-6-OTA_00.00.03.20TC'],
        model: 'LS12128',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
        ota: true,
    },
    {
        zigbeeModel: ['PSMP5_00.00.03.11TC', 'PSMP5_00.00.05.12TC', 'PSMP5_00.00.03.05TC'],
        model: '12050',
        vendor: 'Lupus',
        description: 'LUPUSEC mains socket with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['PRS3CH1_00.00.05.10TC', 'PRS3CH1_00.00.05.11TC'],
        model: '12126',
        vendor: 'Lupus',
        description: '1 channel relay',
        extend: [onOff({powerOnBehavior: false, ota: true})],
    },
    {
        zigbeeModel: ['PRS3CH2_00.00.05.10TC', 'PRS3CH2_00.00.05.11TC', 'PRS3CH2_00.00.05.12TC'],
        model: '12127',
        vendor: 'Lupus',
        description: '2 channel relay',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2}}), onOff({endpointNames: ['l1', 'l2'], powerOnBehavior: false, ota: true})],
    },
];

export default definitions;
module.exports = definitions;
