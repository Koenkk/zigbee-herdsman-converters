const fz = require("zigbee-herdsman-converters/converters/fromZigbee");
const tz = require("zigbee-herdsman-converters/converters/toZigbee");
const exposes = require("zigbee-herdsman-converters/lib/exposes");
const reporting = require("zigbee-herdsman-converters/lib/reporting");
const e = exposes.presets;
const ea = exposes.access;
const tuya = require("zigbee-herdsman-converters/lib/tuya");

const definition = {
    // Since a lot of TuYa devices use the same modelID, but use different datapoints
    // it's necessary to provide a fingerprint instead of a zigbeeModel
    fingerprint: [
        {
            // The model ID from: Device with modelID 'TS0601' is not supported
            // You may need to add \u0000 at the end of the name in some cases
            modelID: "TS0601",
            // The manufacturer name from: Device with modelID 'TS0601' is not supported.
            manufacturerName: "_TZE204_w1wwxoja",
        },
    ],
    model: "TS0601_light",
    vendor: "TuYa",
    description: "6 gangs switch",
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: async (device, coordinatorEndpoint, logger) => {
        await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        device.powerSource = "Mains (single phase)";
        device.save();
    },
    exposes: [
        tuya.exposes.switch().withEndpoint("l1"),
        tuya.exposes.switch().withEndpoint("l2"),
        tuya.exposes.switch().withEndpoint("l3"),
        tuya.exposes.switch().withEndpoint("l4"),
        tuya.exposes.switch().withEndpoint("l5"),
        tuya.exposes.switch().withEndpoint("l6"),
    ],
    endpoint: (device) => {
        return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
    },
    whiteLabel: [tuya.whitelabel("Mercator Ikuü", "SSW06G", "6 Gang switch", ["_TZE200_wnp4d4va"])],
    meta: {
        multiEndpoint: true,
        tuyaDatapoints: [
            [1, "state_l1", tuya.valueConverter.onOff],
            [2, "state_l2", tuya.valueConverter.onOff],
            [3, "state_l3", tuya.valueConverter.onOff],
            [4, "state_l4", tuya.valueConverter.onOff],
            [5, "state_l5", tuya.valueConverter.onOff],
            [6, "state_l6", tuya.valueConverter.onOff],
        ],
    },
};

module.exports = definition;
