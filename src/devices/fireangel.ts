import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Alarm_SD_Device"],
        model: "W2-Module",
        description: "Carbon monoxide sensor",
        vendor: "FireAngel",
        fromZigbee: [fz.W2_module_carbon_monoxide, fz.battery],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.battery()],
    },
    {
        fingerprint: [{modelID: "Alarm_SD_Device", manufacturerName: "Fireangel"}],
        model: "ZBCO-AE-10X-EUR",
        vendor: "FireAngel",
        description: "FireAngel CO alarm",
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.fireangel_co_test],
        toZigbee: [],
        exposes: [
            e.binary("alarm", ea.STATE, true, false).withDescription("CO alarm active"),
            e.binary("test", ea.STATE, true, false).withDescription("Self-test in progress"),
            e.binary("carbon_monoxide", ea.STATE, true, false),
            e.binary("tamper", ea.STATE, true, false),
            e.binary("battery_low", ea.STATE, true, false),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            try {
                await ep.bind("ssIasZone", coordinatorEndpoint);
                await ep.bind("ssIasWd", coordinatorEndpoint);
            } catch (err) {
                console.error(`Failed to configure ${device.ieeeAddr}: ${err}`);
            }
        },
    },
];
