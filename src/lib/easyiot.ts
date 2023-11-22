import * as exposes from './exposes';
import {Fz, Tz} from './types';
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

            return {ir01_recv_command: hexString};
        },
    } as Fz.Converter,
};

export const tzEasyiot = {
    easyiot_ir_send_command: {
        key: ['ir01_send_command'],
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
    ir_info: () => e.text('ir_info', ea.STATE).withDescription('ZB-IR01 is an infrared remote control with a local code library.'+
        'If you need technical information, please send an email to support@easyiot.tech'),
    ir01_recv_command: () => e.text('ir01_recv_command', ea.STATE).withDescription('Received infrared control command'),
    ir01_send_command: () => e.text('ir01_send_command', ea.SET).withDescription('Send infrared control command'),
};

exports.fzEasyiot = fzEasyiot;
exports.tzEasyiot = tzEasyiot;
exports.presetsEasyiot = presetsEasyiot;
