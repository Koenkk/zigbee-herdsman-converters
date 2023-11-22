import {Definition} from '../lib/types';
import * as easyiot from '../lib/easyiot';

const fzEasyiot = easyiot.fzEasyiot;
const tzEasyiot = easyiot.tzEasyiot;
const ez = easyiot.presetsEasyiot;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'ZB-IR01', manufacturerName: 'easyiot'}],
        model: 'ZB-IR01',
        vendor: 'easyiot',
        description: 'Universal smart IR remote control',
        fromZigbee: [
            fzEasyiot.easyiot_ir_recv_command,
        ],
        toZigbee: [tzEasyiot.easyiot_ir_send_command],
        exposes: [ez.ir_info(), ez.ir01_send_command(), ez.ir01_recv_command()],
    },
];

export default definitions;
module.exports = definitions;
