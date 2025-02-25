const m = require("zigbee-herdsman-converters/lib/modernExtend");

const definition = {
    zigbeeModel: ["dqhome.re4"],
    model: "dqhome.re4",
    vendor: "DQHOME",
    description: "DQSmart Switch 4 Gang",
    extend: [
        m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
        m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
    ],
    meta: {multiEndpoint: true},
};

module.exports = definition;
