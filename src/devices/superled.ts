const m = require("zigbee-herdsman-converters/lib/modernExtend");

const definition = {
    zigbeeModel: ["70012"],
    model: "70012",
    vendor: "SuperLED",
    description: "SÄVY NUPPI, Zigbee LED-dimmer, triac, 5-200W",
    extend: [m.light({state: true, brightness: true, effect: false, powerOnBehavior: false})],
    meta: {},
};

module.exports = definition;
