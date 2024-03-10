import * as exposes from './exposes';
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import {Extend} from './types';
const e = exposes.presets;

const extend = {
    switch: (options: Extend.options_switch={}): Extend => {
        options = {disablePowerOnBehavior: false, toZigbee: [], fromZigbee: [], exposes: [], ...options};
        const exposes = [e.switch(), ...options.exposes];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.on_off, ...options.toZigbee];
        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }
        return {exposes, fromZigbee, toZigbee};
    },
};

export default extend;
module.exports = extend;
