'use strict';

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

module.exports = {
    nextSeq,
    messagesGet,
    messagesSet,
    messagesClear,
    calcArrayCrc,
    calcStringCrc,
};
