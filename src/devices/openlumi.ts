import fz from '../converters/fromZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['openlumi.gw_router.jn5169'],
        model: 'GWRJN5169',
        vendor: 'OpenLumi',
        description: 'Lumi Router (JN5169)',
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genDeviceTempCfg']);
            await reporting.deviceTemperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_5});
        },
        exposes: [e.device_temperature()],
    },
];

export default definitions;
module.exports = definitions;
