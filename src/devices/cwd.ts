const m = require("zigbee-herdsman-converters/lib/modernExtend");

export const definitions: DefinitionWithExtend[] = [{
    zigbeeModel: ["ZBT-CCTLight-D0001"],
    model: "HLL6948V1",
    vendor: "CWD",
    description: "Collingwood H2 pro",
    extend: [m.light({colorTemp: {range: [153, 370]}})],
}];
