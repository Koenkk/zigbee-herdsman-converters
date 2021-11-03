const fz = require("zigbee-herdsman-converters/converters/fromZigbee");
const tz = require("zigbee-herdsman-converters/converters/toZigbee");
const exposes = require("zigbee-herdsman-converters/lib/exposes");
const reporting = require("zigbee-herdsman-converters/lib/reporting");
const extend = require("zigbee-herdsman-converters/lib/extend");
const e = exposes.presets;
const ea = exposes.access;
const tuya = require("zigbee-herdsman-converters/lib/tuya");

module.exports = [
  {
    fingerprint: [{ modelID: "TS0001", manufacturerName: "_TZ3000_majwnphg" }],
    model: "JR-ZDS01",
    vendor: "Girier",
    description: "Girier JR-ZDS01 zigbee 1 gang mini switch",
    toZigbee: extend
      .switch()
      .toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
    fromZigbee: extend
      .switch()
      .fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
    exposes: extend
      .switch()
      .exposes.concat([
        exposes.presets.power_on_behavior(),
        exposes.presets.switch_type_2(),
      ]),
    configure: async (device, coordinatorEndpoint, logger) => {
      await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
        "genOnOff",
      ]);
    },
  },
];
