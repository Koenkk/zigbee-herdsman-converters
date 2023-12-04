import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as constants from '../lib/constants';
import * as utils from '../lib/utils';

const e = exposes.presets;

const manufacturerOptions = {manufacturerCode: 0x1015};

const frient = {
    fz: {
        pulse_configuration: {
            cluster: 'seMetering',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result = {};
                if (msg.data.hasOwnProperty('develcoPulseConfiguration')) {
                    result[utils.postfixWithEndpointName('pulse_configuration', msg, model, meta)] =
                        msg.data['develcoPulseConfiguration'];
                }

                return result;
            },
        },
    tz: {
        pulse_configuration: {
            key: ['pulse_configuration'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('seMetering', {'develcoPulseConfiguration': value}, manufacturerOptions);
                return {readAfterWriteTime: 200, state: {'pulse_configuration': value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('seMetering', ['develcoPulseConfiguration'], manufacturerOptions);
            },
        },
    }
};



const definitions: Definition[] = [
    {
        zigbeeModel: ['EMIZB-141'],
        model: 'EMIZB-141',
        vendor: 'frient',
        description: 'Smart powermeter Zigbee bridge',
        fromZigbee: [fz.metering, fz.battery, frient.fz.pulse_configuration],
        toZigbee: [frient.tz.pulse_configuration],
        exposes: [
            e.battery(), 
            e.power(), 
            e.energy(),
            e.numeric('pulse_configuration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535')
			],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering', 'genPowerCfg']);
        },
    },
];

export default definitions;
module.exports = definitions;

