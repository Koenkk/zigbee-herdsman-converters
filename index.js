const devices = require('./devices');

module.exports = {
    devices: devices,
    findByZigbeeModel: (model) => devices.find((d) => d.zigbeeModel.includes(model)),
};
