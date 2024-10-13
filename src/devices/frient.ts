import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {electricityMeter, onOff, ota} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['EMIZB-141'],
        model: 'EMIZB-141',
        vendor: 'Frient',
        description: 'Smart powermeter Zigbee bridge',
        fromZigbee: [fz.metering, fz.battery],
        toZigbee: [],
        extend: [ota()],
        exposes: [e.battery(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['SMRZB-153'],
        model: 'SMRZB-153',
        vendor: 'Frient',
        description: 'Smart Cable - Power switch with power measurement',
        extend: [onOff({configureReporting: false}), electricityMeter()],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-151'],
        model: 'EMIZB-151',
        vendor: 'Frient',
        description: 'HAN P1 power-meter sensor',
        extend: [electricityMeter(),],
        configure: async (device) => {
            const endpoint = device.getEndpoint(2);
            await endpoint.configureReporting('haElectricalMeasurement', [
                {attribute: 'acPowerDivisor', minimumReportInterval: 10, maximumReportInterval: 65000, reportableChange: 1},
            ]);
        },
    },
];

export default definitions;
module.exports = definitions;
