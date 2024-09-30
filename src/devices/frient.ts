import {develcoModernExtend} from '../lib/develco';
import {battery, electricityMeter, onOff, ota} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

// NOTE! Develco and Frient is the same company, therefore we use develco specific things in here.

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['EMIZB-141'],
        model: 'EMIZB-141',
        vendor: 'Frient A/S',
        description: 'frient Electricity Meter Interface 2 LED',
        extend: [
            ota(),
            electricityMeter({cluster: 'metering', power: {divisor: 1000, multiplier: 1}, energy: {divisor: 1000, multiplier: 1}}),
            battery(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.pulse_configuration(),
            develcoModernExtend.current_summation(),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering', 'genPowerCfg']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
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
];

export default definitions;
module.exports = definitions;
