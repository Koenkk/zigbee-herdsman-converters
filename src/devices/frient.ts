import {develcoModernExtend} from '../lib/develco';
import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

// NOTE! Develco and Frient is the same company, therefore we use develco specific things in here.

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['EMIZB-141'],
        model: 'EMIZB-141',
        vendor: 'Frient',
        description: 'Electricity meter interface 2 LED',
        extend: [
            m.electricityMeter({cluster: 'metering', power: {divisor: 1000, multiplier: 1}, energy: {divisor: 1000, multiplier: 1}}),
            m.battery(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.pulseConfiguration(),
            develcoModernExtend.currentSummation(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ['SMRZB-153'],
        model: 'SMRZB-153',
        vendor: 'Frient',
        description: 'Smart Cable - Power switch with power measurement',
        extend: [m.onOff({configureReporting: false}), m.electricityMeter()],
        endpoint: () => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-151'],
        model: 'EMIZB-151',
        vendor: 'Frient',
        description: 'HAN P1 power-meter sensor',
        extend: [m.electricityMeter({threePhase: true})],
    },
];

export default definitions;
module.exports = definitions;
