/* eslint-disable linebreak-style */
const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS1201', manufacturerName: '_TZ3290_acv1iuslxi3shaaj'}],
        model: 'ZXZIR-02',
        vendor: 'AUBESS',
        description: 'Universal Smart IR Remote Control',
        fromZigbee: [
            fz.zosung_send_ir_code_00, fz.zosung_send_ir_code_01, fz.zosung_send_ir_code_02, fz.zosung_send_ir_code_03,
            fz.zosung_send_ir_code_04, fz.zosung_send_ir_code_05,
        ],
        toZigbee: [
            tz.zosung_ir_code_to_send, tz.zosung_learn_ir_code,
        ],
        exposes: [
            exposes.switch().withState('learnIRCode', undefined, 'Turn on to learn new IR code', ea.SET),
            exposes.text('learnedIRCode', ea.STATE).withDescription('The IR code learned by device'),
            exposes.text('IRCodeToSend', ea.SET).withDescription('The IR code to send by device'),
        ],
    },
];
