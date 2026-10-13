import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

export const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    U02I007C01_contact: {
        cluster: "ssIasZone",
        type: "commandStatusChangeNotification",
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            if (msg.endpoint.ID !== 1) return;
            return {
                contact: !((zoneStatus & 1) > 0),
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    U02I007C01_water_leak: {
        cluster: "ssIasZone",
        type: "commandStatusChangeNotification",
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            if (msg.endpoint.ID !== 2) return;
            return {
                water_leak: (zoneStatus & 1) > 0,
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MultiSensor"],
        model: "U02I007C.01",
        vendor: "Wally",
        description: "WallyHome multi-sensor",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.battery,
            fz.temperature,
            fz.humidity,
            fzLocal.U02I007C01_contact,
            fzLocal.U02I007C01_water_leak,
        ],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.action(["on", "off"]), e.contact(), e.water_leak()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "genOnOff", "msTemperatureMeasurement", "msRelativeHumidity"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
];
