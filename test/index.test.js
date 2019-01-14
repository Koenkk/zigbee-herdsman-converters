const chai = require('chai');
const index = require('../index');

describe('index.js', () => {
    it('Find device by model ID', () => {
        const device = index.findByZigbeeModel('WaterSensor-N');
        chai.assert.strictEqual(device.model, 'HS1WL');
    });

    it('Find device by model ID with strange characters', () => {
        const device = index.findByZigbeeModel('lumi.remote.b1acn01\u0000\u0000\u0000\u0000\u0000\u0000');
        chai.assert.strictEqual(device.model, 'WXKG11LM');
    });

    it('Find device by model ID without strange characters', () => {
        const device = index.findByZigbeeModel('lumi.sensor_switch.aq2\u0000\u0000\u0000\u0000\u0000\u0000');
        chai.assert.strictEqual(device.model, 'WXKG11LM');
    });
});
