import * as iconv from 'iconv-lite';

import * as exposes from '../lib/exposes';
import {logger} from '../lib/logger';
import {DefinitionWithExtend} from '../lib/types';
import {Fz, Tz} from '../lib/types';

const NS = 'zhc:easyiot';
const ea = exposes.access;
const e = exposes.presets;

const fzLocal = {
    easyiot_ir_recv_command: {
        cluster: 'tunneling',
        type: ['commandTransferDataResp'],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_ir_recv_command" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString('hex');
            logger.debug(`"easyiot_ir_recv_command" received command ${hexString}`, NS);
            return {last_received_command: hexString};
        },
    } satisfies Fz.Converter,

    easyiot_tts_recv_status: {
        cluster: 'tunneling',
        type: ['commandTransferDataResp'],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString('hex');
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);
            return {last_received_status: hexString};
        },
    } satisfies Fz.Converter,

    easyiot_sp1000_recv_status: {
        cluster: 'tunneling',
        type: ['commandTransferDataResp'],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString('hex');
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);

            if (msg.data.data[0] == 0x80 && msg.data.data[1] == 0) {
                const result = msg.data.data[4];
                return {last_received_status: result};
            }
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

            logger.debug(`Sending IR code: ${value}`, NS);
            await entity.command(
                'tunneling',
                'transferData',
                {
                    tunnelID: 0x0000,
                    data: Buffer.from(value as string, 'hex'),
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`Sending IR command success.`, NS);
        },
    } as Tz.Converter,

    easyiot_tts_send_command: {
        key: ['send_tts'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error(`There is no text to send`);
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameHeader = Buffer.from([0xfd]);

            const gb2312Buffer = iconv.encode(value as string, 'GB2312');
            const dataLength = gb2312Buffer.length + 2;
            const dataLengthBuffer = Buffer.alloc(2);
            dataLengthBuffer.writeUInt16BE(dataLength, 0);
            const commandByte = Buffer.from([0x01, 0x01]);
            const protocolFrame = Buffer.concat([frameHeader, dataLengthBuffer, commandByte, gb2312Buffer]);

            await entity.command(
                'tunneling',
                'transferData',
                {
                    tunnelID: 0x0000,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`Sending IR command success.`, NS);
        },
    } as Tz.Converter,

    easyiot_sp1000_play_voice: {
        key: ['play_voice'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error(`There is no text to send`);
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x01, 0x00]);
            const dataLen = Buffer.from([0x02]);
            const dataType = Buffer.from([0x21]);
            const playId = Buffer.from([(value as number) & 0xff, ((value as number) >> 8) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, playId]);

            await entity.command(
                'tunneling',
                'transferData',
                {
                    tunnelID: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`Sending IR command success.`, NS);
        },
    } as Tz.Converter,

    easyiot_sp1000_set_volume: {
        key: ['set_volume'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error(`There is no text to send`);
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x02, 0x00]);
            const dataLen = Buffer.from([0x01]);
            const dataType = Buffer.from([0x20]);
            const volume = Buffer.from([(value as number) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, volume]);

            await entity.command(
                'tunneling',
                'transferData',
                {
                    tunnelID: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug(`Sending IR command success.`, NS);
        },
    } as Tz.Converter,
};

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'ZB-IR01', manufacturerName: 'easyiot'}],
        model: 'ZB-IR01',
        vendor: 'easyiot',
        description:
            'This is an infrared remote control equipped with a local code library,' +
            'supporting devices such as air conditioners, televisions, projectors, and more.',
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [tzLocal.easyiot_ir_send_command],
        exposes: [
            e.text('last_received_command', ea.STATE).withDescription('Received infrared control command'),
            e.text('send_command', ea.SET).withDescription('Send infrared control command'),
        ],
    },
    {
        fingerprint: [{modelID: 'ZB-TTS01', manufacturerName: 'easyiot'}],
        model: 'ZB-TTS01',
        vendor: 'easyiot',
        description: 'This is a Simplified Chinese (GB2312) TTS converter that can convert GB2312 encoded text to speech',
        fromZigbee: [fzLocal.easyiot_tts_recv_status],
        toZigbee: [tzLocal.easyiot_tts_send_command],
        exposes: [
            e.text('last_received_status', ea.STATE).withDescription('status'),
            e.text('send_tts', ea.SET).withDescription('Please enter text'),
        ],
    },
    {
        fingerprint: [{modelID: 'ZB-SP1000', manufacturerName: 'easyiot'}],
        model: 'ZB-SP1000',
        vendor: 'easyiot',
        description: 'ZB-SP1000 is an MP3 player that can support 1,000 voices.',

        fromZigbee: [fzLocal.easyiot_sp1000_recv_status],
        toZigbee: [tzLocal.easyiot_sp1000_play_voice, tzLocal.easyiot_sp1000_set_volume],
        exposes: [
            e.numeric('play_voice', ea.SET).withDescription('Please enter ID(1-999)').withValueMin(1).withValueMax(999).withValueStep(1),
            e.numeric('set_volume', ea.SET).withDescription('Please enter volume(1-30)').withValueMin(1).withValueMax(30).withValueStep(1),
            e.text('last_received_status', ea.STATE).withDescription('status'),
        ],
    },
];

export default definitions;
module.exports = definitions;
