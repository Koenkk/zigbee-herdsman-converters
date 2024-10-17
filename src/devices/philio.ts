import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['PAT04A-v1.1.5'],
        model: 'PAT04-A',
        vendor: 'Philio',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fz.ignore_basic_report],
        whiteLabel: [{vendor: 'Evology', model: 'PAT04-A'}],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.linkquality()],
    },
];

export default definitions;
module.exports = definitions;
