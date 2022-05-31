'use strict';

const exposes = require('./exposes');
const ea = exposes.access;

function nextSeq(entity) {
    entity.seq = ((entity.seq || -1)+1) % 0x10000;
    return entity.seq;
}

function messagesGet(entity, seq) {
    const info = entity.irMessageInfo;
    if (info.seq!=seq) {
        throw new Error(`Unexpected sequence value (expected: ${info.seq} current: ${seq}).`);
    }
    return info.data;
}
function messagesSet(entity, seq, data) {
    entity.irMessageInfo={seq: seq, data: data};
}

function messagesClear(entity, seq) {
    const info = entity.irMessageInfo;
    if (info.seq!=seq) {
        throw new Error(`Unexpected sequence value (expected: ${info.seq} current: ${seq}).`);
    }
    delete entity.irMessageInfo;
}

function calcArrayCrc(values) {
    return Array.from(values.values()).reduce((a, b)=>a+b)%0x100;
}

function calcStringCrc(str) {
    return str.split('').map((x)=>x.charCodeAt(0)).reduce((a, b)=>a+b)%0x100;
}


const fzZosung = {
    zosung_send_ir_code_01: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode01'],
        convert: (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code01" received (msg:${JSON.stringify(msg.data)})`);
            const seq = msg.data.seq;
            const irMsg = messagesGet(msg.endpoint, seq);
            meta.logger.debug(`IRCode to send: ${JSON.stringify(irMsg)} (seq:${seq})`);
        },
    },
    zosung_send_ir_code_02: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode02'],
        convert: async (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code02" received (msg:${JSON.stringify(msg.data)})`);
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
            meta.logger.debug(`Sent IRCode part: ${part} (sum: ${sum}, seq:${seq})`);
        },
    },
    zosung_send_ir_code_04: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode04'],
        convert: async (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code04" received (msg:${JSON.stringify(msg.data)})`);
            const seq = msg.data.seq;
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode05',
                {
                    seq: seq,
                    zero: 0,
                },
                {disableDefaultResponse: true});
            messagesClear(msg.endpoint, seq);
            meta.logger.debug(`IRCode has been successfuly sent. (seq:${seq})`);
        },
    },
    zosung_send_ir_code_00: {
        cluster: 'zosungIRTransmit',
        type: ['commandZosungSendIRCode00'],
        convert: async (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code00" received (msg:${JSON.stringify(msg.data)})`);
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
            meta.logger.debug(`"IR-Message-Code00" response sent.`);
            await msg.endpoint.command('zosungIRTransmit', 'zosungSendIRCode02',
                {
                    seq: msg.data.seq,
                    position: 0,
                    maxlen: 0x38,
                },
                {disableDefaultResponse: true});
            meta.logger.debug(`"IR-Message-Code00" transfer started.`);
        },
    },
    zosung_send_ir_code_03: {
        cluster: 'zosungIRTransmit',
        type: ['zosungSendIRCode03Resp'],
        convert: async (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code03" received (msg:${JSON.stringify(msg.data)})`);
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
                    meta.logger.debug(`${rcvMsgPart.length} bytes received.`);
                } else {
                    meta.logger.error(`Invalid msg part CRC: ${sum} expecting: ${expectedPartCrc}.`);
                }
            } else {
                meta.logger.error(`Unexpected IR code position: ${JSON.stringify(msg.data)}, expecting: ${rcv.position}.`);
            }
        },
    },
    zosung_send_ir_code_05: {
        cluster: 'zosungIRTransmit',
        type: ['zosungSendIRCode05Resp'],
        convert: async (model, msg, publish, options, meta) => {
            meta.logger.debug(`"IR-Message-Code05" received (msg:${JSON.stringify(msg.data)})`);
            const seq = msg.data.seq;
            const rcv = messagesGet(msg.endpoint, seq);
            const learnedIRCode = rcv.buf.toString('base64');
            meta.logger.debug(`Received: ${learnedIRCode}`);
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
    },
};

const tzZosung = {
    zosung_ir_code_to_send: {
        key: ['ir_code_to_send'],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                meta.logger.error(`There is no IR code to send`);
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
            meta.logger.debug(`Sending IR code: ${JSON.stringify(value)}`);
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
            meta.logger.debug(`Sending IR code initiated.`);
        },
    },
    zosung_learn_ir_code: {
        key: ['learn_ir_code'],
        convertSet: async (entity, key, value, meta) => {
            meta.logger.debug(`Starting IR Code Learning...`);
            await entity.command('zosungIRControl', 'zosungControlIRCommand00',
                {
                    data: Buffer.from(JSON.stringify({'study': 0})),
                },
                {disableDefaultResponse: true});
            meta.logger.debug(`IR Code Learning started.`);
        },
    },
};


const presetsZosung = {
    learn_ir_code: () => exposes.switch().withState('learn_ir_code', undefined, 'Turn on to learn new IR code', ea.SET),
    learned_ir_code: () => exposes.text('learned_ir_code', ea.STATE).withDescription('The IR code learned by device'),
    ir_code_to_send: () => exposes.text('ir_code_to_send', ea.SET).withDescription('The IR code to send by device'),
};

module.exports = {
    fzZosung,
    tzZosung,
    presetsZosung,
};
