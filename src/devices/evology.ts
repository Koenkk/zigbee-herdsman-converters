import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['PSE03-V1.1.0'],
        model: 'PSE03-V1.1.0',
        vendor: 'EVOLOGY',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ignore_basic_report, fz.ias_wd, fz.ias_enroll, fz.ias_siren],
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic']);
            await endpoint.read('ssIasZone', ['zoneState', 'iasCieAddr', 'zoneId', 'zoneStatus']);
            await endpoint.read('ssIasWd', ['maxDuration']);
        },
        exposes: [e.warning().removeFeature('strobe_level').removeFeature('strobe').removeFeature('strobe_duty_cycle')],
    },
];

export default definitions;
module.exports = definitions;
