import { Definition } from "../lib/types";
import * as exposes from "../lib/exposes";
import fz from "../converters/fromZigbee";

const e = exposes.presets;

const definitions: Definition[] = [
  {
    zigbeeModel: ["MIR-TE100-E"],
    model: "MIR-TE100-E",
    vendor: "MultIR",
    description: "Temperature & humidity sensor with display",
    fromZigbee: [fz.battery, fz.temperature, fz.humidity],
    toZigbee: [],
    exposes: [e.battery(), e.temperature(), e.humidity()],
  },
];

module.exports = definitions;
