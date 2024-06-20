import * as exposes from './exposes';
import {logger} from './logger';
import * as globalStore from './store';
import {Fz, Tz, Zh} from './types';

const NS = 'zhc:zosung';
const ea = exposes.access;
const e = exposes.presets;

function nextSeq(entity: Zh.Endpoint | Zh.Group) {
    return (globalStore.getValue(entity, 'seq', -1) + 1) % 0x10000;
}

function messagesGet(entity: Zh.Endpoint | Zh.Group, seq: number) {
    const info = globalStore.getValue(entity, 'irMessageInfo');
    const expected = (info&&info.seq) || 0;
    if (expected!==seq) {
        throw new Error(`Unexpected sequence value (expected: ${expected} current: ${seq}).`);
    }
    return info.data;
}
function messagesSet(entity: Zh.Endpoint | Zh.Group, seq: number, data: unknown) {
    globalStore.putValue(entity, 'irMessageInfo', {seq: seq, data: data});
}

function messagesClear(entity: Zh.Endpoint | Zh.Group, seq: number) {
    const info = globalStore.getValue(entity, 'irMessageInfo');
    const expected = (info&&info.seq) || 0;
    if (expected!==seq) {
        throw new Error(`Unexpected sequence value (expected: ${expected} current: ${seq}).`);
    }
    globalStore.clearValue(entity, 'irMessageInfo');
}

function calcArrayCrc(values: number[]) {
    return Array.from(values.values()).reduce((a, b)=>a+b, 0)%0x100;
}

function calcStringCrc(str: string) {
    return str.split('').map((x)=>x.charCodeAt(0)).reduce((a, b)=>a+b, 0)%0x100;
}


export const fzZosung = {
    zosung_send_ir_code_01: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode01'],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code01" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const irMsg = messagesGet(msg.endpoint, seq);
            logger.debug(`IRCode to send: ${JSON.stringify(irMsg)} (seq:${seq})`, NS);
        },
    } satisfies Fz.Converter,
    zosung_send_ir_code_02: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode02'],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code02" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const position = msg.data.position;
            const irMsg = messagesGet(msg.endpoint, seq);
            const part = irMsg.substring(position, position+0x32);
            const sum = calcStringCrc(part);
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode03',
                {
                    zero: 0,
                    seq: seq,
                    position: position,
                    msgpart: Buffer.from(part),
                    msgpartcrc: sum,
                },
                {disableDefaultResponse: true});
            logger.debug(`Sent IRCode part: ${part} (sum: ${sum}, seq:${seq})`, NS);
        },
    } satisfies Fz.Converter,
    zosung_send_ir_code_04: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode04'],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code04" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode05',
                {
                    seq: seq,
                    zero: 0,
                },
                {disableDefaultResponse: true});
            messagesClear(msg.endpoint, seq);
            logger.debug(`IRCode has been successfully sent. (seq:${seq})`, NS);
        },
    } satisfies Fz.Converter,
    zosung_send_ir_code_00: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode00'],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code00" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const length = msg.data.length;
            messagesSet(msg.endpoint, seq, {position: 0, buf: Buffer.alloc(length)});
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode01',
                {
                    zero: 0,
                    seq: seq,
                    length: length,
                    unk1: msg.data.unk1,
                    unk2: msg.data.unk2,
                    unk3: msg.data.unk3,
                    cmd: msg.data.cmd,
                    unk4: msg.data.unk4,
                },
                {disableDefaultResponse: true});
            logger.debug(`"IR-Message-Code00" response sent.`, NS);
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode02',
                {
                    seq: msg.data.seq,
                    position: 0,
                    maxlen: 0x38,
                },
                {disableDefaultResponse: true});
            logger.debug(`"IR-Message-Code00" transfer started.`, NS);
        },
    } satisfies Fz.Converter,
    zosung_send_ir_code_03: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode03Resp'],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code03" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const rcv = messagesGet(msg.endpoint, seq);
            if (rcv.position==msg.data.position) {
                const rcvMsgPart = msg.data.msgpart;
                const sum = calcArrayCrc(rcvMsgPart);
                const expectedPartCrc = msg.data.msgpartcrc;
                if (sum==expectedPartCrc) {
                    const position = rcvMsgPart.copy(rcv.buf, rcv.position);
                    rcv.position += position;
                    if (rcv.position<rcv.buf.length) {
                        await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode02',
                            {
                                seq: seq,
                                position: rcv.position,
                                maxlen: 0x38,
                            },
                            {disableDefaultResponse: true});
                    } else {
                        await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode04',
                            {
                                zero0: 0,
                                seq: seq,
                                zero1: 0,
                            },
                            {disableDefaultResponse: true});
                    }
                    logger.debug(`${rcvMsgPart.length} bytes received.`, NS);
                } else {
                    logger.error(`Invalid msg part CRC: ${sum} expecting: ${expectedPartCrc}.`, NS);
                }
            } else {
                logger.error(`Unexpected IR code position: ${JSON.stringify(msg.data)}, expecting: ${rcv.position}.`, NS);
            }
        },
    } satisfies Fz.Converter,
    zosung_send_ir_code_05: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode05Resp'],
        convert: async (model, msg, publish, options, meta) => {
            logger.debug(`"IR-Message-Code05" received (msg:${JSON.stringify(msg.data)})`, NS);
            const seq = msg.data.seq;
            const rcv = messagesGet(msg.endpoint, seq);
            const learnedIRCode = rcv.buf.toString('base64');
            logger.debug(`Received: ${learnedIRCode}`, NS);
            messagesClear(msg.endpoint, seq);
            await msg.endpoint.command('zosungIRControl', 'zosungControlIRCommand00',
                {
                    data: Buffer.from(JSON.stringify({'study': 1})),
                },
                {disableDefaultResponse: true});
            return {
                learned_ir_code: learnedIRCode,
            };
        },
    } satisfies Fz.Converter,
};

export const tzZosung = {
    zosung_ir_code_to_send: {
        key: ['ir_code_to_send'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                logger.error(`There is no IR code to send`, NS);
                return;
            }
            const irMsg = JSON.stringify({
                'key_num': 1,
                'delay': 300,
                'key1': {
                    'num': 1,
                    'freq': 38000,
                    'type': 1,
                    'key_code': value,
                },
            });
            logger.debug(`Sending IR code: ${JSON.stringify(value)}`, NS);
            const seq = nextSeq(entity);
            messagesSet(entity, seq, irMsg);
            await entity.command('zosungIRTransmit', 'zosungSendIRCode00',
                {
                    seq: seq,
                    length: irMsg.length,
                    unk1: 0x00000000,
                    unk2: 0xe004,
                    unk3: 0x01,
                    cmd: 0x02,
                    unk4: 0x0000,
                },
                {disableDefaultResponse: true});
            logger.debug(`Sending IR code initiated.`, NS);
        },
    } satisfies Tz.Converter,
    zosung_learn_ir_code: {
        key: ['learn_ir_code'],
        convertSet: async (entity, key, value, meta) => {
            logger.debug(`Starting IR Code Learning...`, NS);
            await entity.command('zosungIRControl', 'zosungControlIRCommand00',
                {
                    data: Buffer.from(JSON.stringify({'study': 0})),
                },
                {disableDefaultResponse: true});
            logger.debug(`IR Code Learning started.`, NS);
        },
    } satisfies Tz.Converter,
};


export const presetsZosung = {
    learn_ir_code: () => e.switch_().withState('learn_ir_code', false, 'Turn on to learn new IR code', ea.SET),
    learned_ir_code: () => e.text('learned_ir_code', ea.STATE).withDescription('The IR code learned by device'),
    ir_code_to_send: () => e.text('ir_code_to_send', ea.SET).withDescription('The IR code to send by device'),
};

exports.fzZosung = fzZosung;
exports.tzZosung = tzZosung;
exports.presetsZosung = presetsZosung;
