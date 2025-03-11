const m = require("zigbee-herdsman-converters/lib/modernExtend");

const definition = {
    zigbeeModel: ["ZBT-CCTLight-D0001"],
    model: "HLL6948V1",
    vendor: "CWD",
    description: "Collingwood H2 Pro",
    extend: [m.light({colorTemp: {range: [153, 370]}})],
    meta: {},
};

module.exports = definition;
