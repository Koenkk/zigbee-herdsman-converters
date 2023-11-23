import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import {Fz, Tz} from '../lib/types';

const ea = exposes.access;
const e = exposes.presets;

export const fzEasyiot = {
    easyiot_ir_recv_command: {
        cluster: 'tunneling',
        type: ['transferDataResp'],
        convert: (model, msg, publish, options, meta) => {
            meta.logger.debug(`"easyiot_ir_recv_command" received (msg:${JSON.stringify(msg.data)})`);
            const hexString = msg.data.data.toString('hex');
            meta.logger.debug(`"easyiot_ir_recv_command" received command ${hexString}`);

            return {recv_command: hexString};
        },
    } as Fz.Converter,
};

export const tzEasyiot = {
    easyiot_ir_send_command: {
        key: ['send_command'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                meta.logger.error(`There is no IR code to send`);
                return;
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


export const presetsEasyiot = {
    ir01_recv_command: () => e.text('recv_command', ea.STATE).withDescription('Received infrared control command'),
    ir01_send_command: () => e.text('send_command', ea.SET).withDescription('Send infrared control command'),
};

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'ZB-IR01', manufacturerName: 'easyiot'}],
        model: 'ZB-IR01',
        vendor: 'easyiot',
        description: 'This is an infrared remote control equipped with a local code library,' +
            'supporting devices such as air conditioners, televisions, projectors, and more.',
        fromZigbee: [
            fzEasyiot.easyiot_ir_recv_command,
        ],
        toZigbee: [tzEasyiot.easyiot_ir_send_command],
        exposes: [presetsEasyiot.ir01_send_command(), presetsEasyiot.ir01_recv_command()],
    },
];

export default definitions;
module.exports = definitions;
