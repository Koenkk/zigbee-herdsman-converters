import * as m from "../lib/modernExtend";

export default {
    zigbeeModel: ["DS150ZB"],
    model: "DS150ZB",
    vendor: "HomeSeer",
    description: "DS150ZB Door Sensor",
    extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]})],
    meta: {},
};
