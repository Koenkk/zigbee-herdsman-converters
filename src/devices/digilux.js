const modernExtend_1 = require("../lib/modernExtend");
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const fromZigbee = require("../converters/fromZigbee");
const toZigbee = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const definitions = [
    {
        zigbeeModel: ['DGL_ZB4S2D1F'],
        model: 'DGL_ZB4S2D1F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6, '7': 7} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '6', '7'] }),
            modernExtend_1.light({ endpointNames: ['3', '4' , '5'] }),
        ],
        meta:{multiEndpoint: true}
    },
    {
        zigbeeModel: ['DGL_ZB8S0D1F'],
        model: 'DGL_ZB8S0D1F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6, '7': 7 ,'8' : 8, '9':9} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4','5','6','7','8'] }),
   modernExtend_1.light({ endpointNames: ['9'] }),
   ],
   meta:{multiEndpoint: true}
},
{
        zigbeeModel: ['DGL_ZB6S0D1F'],
        model: 'DGL_ZB6S0D1F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6, '7': 7} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4','5','6'] }),
   modernExtend_1.light({ endpointNames: ['7'] }),
   ],
   meta:{multiEndpoint: true}
},
{
        zigbeeModel: ['DGL_ZB4S0D1F'],
        model: 'DGL_ZB4S0D1F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3', '4'] }),
   modernExtend_1.light({ endpointNames: ['5'] }),
   ],
   meta:{multiEndpoint: true}
},
{
        zigbeeModel: ['DGL_ZB2S1D1F'],
        model: 'DGL_ZB2S1D1F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2'] }),
   modernExtend_1.light({ endpointNames: ['3','4'] }),
   ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZB2S1D0F'],
        model: 'DGL_ZB2S1D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2'] }),
   modernExtend_1.light({ endpointNames: ['3'] }),
   ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZB6S0D0F'],
        model: 'DGL_ZB6S0D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4','5','6'] }),
            ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZBAS0D0F'],
        model: 'DGL_ZBAS0D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6, '7': 7 ,'8' : 8, '9':9 , '10':10} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4','5','6','7','8','9' ,'10'] }),
            ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZB8S0D0F'],
        model: 'DGL_ZB8S0D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4, '5': 5, '6': 6, '7': 7 ,'8' : 8} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4','5','6','7','8'] }),
            ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZB4S0D0F'],
        model: 'DGL_ZB4S0D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3 , '4': 4} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3','4'] }),
            ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_ZB3S0D0F'],
        model: 'DGL_ZB3S0D0F',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.deviceEndpoints({ endpoints: { '1': 1, '2': 2, '3' :3} }),
            modernExtend_1.onOff({ endpointNames: ['1', '2', '3'] }),
            ],
   meta:{multiEndpoint: true},
},
{
        zigbeeModel: ['DGL_CCTDRIVER'],
        model: 'DGL_CCTDRIVER',
        vendor: 'Digilux',
        description: 'Digilux panel',
        extend: [
            modernExtend_1.identify(),
            modernExtend_1.light({colorTemp: {startup: false}}),
        ],
 },
];
exports.default = definitions;
module.exports = definitions;