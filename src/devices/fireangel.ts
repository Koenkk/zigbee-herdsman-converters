import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    fireangel_co_test: {
        cluster: "ssIasZone",
        type: "commandStatusChangeNotification",
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            const testActive = !!(zoneStatus & (1 << 5)) || !!(zoneStatus & (1 << 9));

            const lastTestTimeout = globalStore.getValue(msg.endpoint, "lastTestTimeout");
            if (lastTestTimeout) clearTimeout(lastTestTimeout);

            if (testActive) {
                const timeout = setTimeout(() => publish({test: false}), 8000);
                globalStore.putValue(msg.endpoint, "lastTestTimeout", timeout);
            }

            return {test: testActive};
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
};

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
        description: "CO alarm",
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fzLocal.fireangel_co_test],
        toZigbee: [],
        exposes: [
            e.binary("alarm", ea.STATE, true, false).withDescription("CO alarm active"),
            e.binary("test", ea.STATE, true, false).withDescription("Self-test in progress"),
            e.carbon_monoxide(),
            e.tamper(),
            e.battery_low(),
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
