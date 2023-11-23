import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import {Fz, Tz} from '../lib/types';

const ea = exposes.access;
const e = exposes.presets;

const fzLocal = {
    easyiot_ir_recv_command: {
        cluster: 'tunneling',
        type: ['transferDataResp'],
        convert: (model, msg, publish, options, meta) => {
            meta.logger.debug(`"easyiot_ir_recv_command" received (msg:${JSON.stringify(msg.data)})`);
            const hexString = msg.data.data.toString('hex');
            meta.logger.debug(`"easyiot_ir_recv_command" received command ${hexString}`);
            return {last_received_command: hexString};
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    easyiot_ir_send_command: {
        key: ['send_command'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error(`There is no IR code to send`);
            }

            meta.logger.debug(`Sending IR code: ${value}`);
            await entity.command('tunneling', 'transferData',
                {
                    'tunnelID': 0x0000,
                    'data': Buffer.from(value as string, 'hex'),
                },
                {disableDefaultResponse: true});
            meta.logger.debug(`Sending IR command success.`);
        },
    } as Tz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'ZB-IR01', manufacturerName: 'easyiot'}],
        model: 'ZB-IR01',
        vendor: 'easyiot',
        description: 'This is an infrared remote control equipped with a local code library,' +
            'supporting devices such as air conditioners, televisions, projectors, and more.',
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [tzLocal.easyiot_ir_send_command],
        exposes: [
            e.text('last_received_command', ea.STATE).withDescription('Received infrared control command'),
            e.text('send_command', ea.SET).withDescription('Send infrared control command'),
        ],
    },
];

export default definitions;
module.exports = definitions;
