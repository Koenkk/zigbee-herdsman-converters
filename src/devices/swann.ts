import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SWO-KEF1PA'],
        model: 'SWO-KEF1PA',
        vendor: 'Swann',
        description: 'Key fob remote',
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['home', 'sleep', 'away', 'panic'])],
    },
    {
        zigbeeModel: ['SWO-WDS1PA'],
        model: 'SWO-WDS1PA',
        vendor: 'Swann',
        description: 'Window/door sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SWO-MOS1PA'],
        model: 'SWO-MOS1PA',
        vendor: 'Swann',
        description: 'Motion and temperature sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
];

export default definitions;
module.exports = definitions;
