import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, ModernExtend, Zh} from "../lib/types";

const ea = exposes.access;
const e = exposes.presets;
// Cache only reports received in this process; do not infer a live position from stale MQTT state.
const contacts = new WeakMap<Zh.Device, {closed?: boolean; open?: boolean}>();
const modeOf = (device: Zh.Device) => (["two", "Kaks andurit"].includes(device.meta?.mdGateSensorMode as string) ? "two" : "one");
function contactValue(value: unknown) {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    return undefined;
}
function gateState(values: {closed?: boolean; open?: boolean}, mode: string) {
    if (typeof values.closed !== "boolean") return "unknown";
    if (mode === "one") return values.closed ? "closed" : "open";
    if (typeof values.open !== "boolean") return "unknown";
    if (values.closed && values.open) return "sensor_error";
    if (values.closed) return "closed";
    if (values.open) return "open";
    return "intermediate";
}
function stateFor(device: Zh.Device) {
    const sensor_mode = modeOf(device);
    return {sensor_mode, gate_state: gateState(contacts.get(device) || {}, sensor_mode)};
}
async function readContacts(device: Zh.Device) {
    // Reads never send a relay command. Both reads must complete before returning a combined result.
    const values: {closed?: boolean; open?: boolean} = {};
    for (const [id, key] of [
        [2, "closed"],
        [3, "open"],
    ] as const) {
        if (id === 3 && modeOf(device) === "one") continue;
        const data = await device.getEndpoint(id).read("genBinaryInput", ["presentValue"]);
        const value = contactValue(data.presentValue);
        if (value !== undefined) values[key] = value;
    }
    contacts.set(device, values);
    return stateFor(device);
}
const gateController = (): ModernExtend => ({
    isModernExtend: true,
    fromZigbee: [
        {
            cluster: "genBinaryInput",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const value = contactValue(msg.data.presentValue);
                const key = msg.endpoint.ID === 2 ? "closed" : msg.endpoint.ID === 3 ? "open" : undefined;
                if (!key || value === undefined) return;
                contacts.set(meta.device, {...(contacts.get(meta.device) || {}), [key]: value});
                return {[key]: value, ...stateFor(meta.device)};
            },
        },
        {
            cluster: "genAnalogOutput",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg) => {
                if (msg.endpoint.ID === 4 && Number.isFinite(msg.data.presentValue)) {
                    return {pulse_duration: msg.data.presentValue};
                }
            },
        },
    ],
    toZigbee: [
        {
            key: ["sensor_mode"],
            convertSet: async (entity, key, value, meta) => {
                if (typeof value !== "string" || !["one", "two"].includes(value)) throw new Error("sensor_mode must be one or two");
                meta.device.meta ??= {};
                const previous = meta.device.meta.mdGateSensorMode;
                meta.device.meta.mdGateSensorMode = value;
                try {
                    await meta.device.save();
                } catch (error) {
                    meta.device.meta.mdGateSensorMode = previous;
                    throw error;
                }
                contacts.delete(meta.device);
                // State stays unknown until fresh readings arrive after a mode change.
                return {state: {sensor_mode: value, gate_state: "unknown", ...(await readContacts(meta.device))}};
            },
            convertGet: async (entity, key, meta) => {
                meta.publish(await readContacts(meta.device));
            },
        },
        {
            key: ["gate_state"],
            convertGet: async (entity, key, meta) => {
                meta.publish(await readContacts(meta.device));
            },
        },
        {
            key: ["pulse_duration"],
            convertSet: async (entity, key, value, meta) => {
                if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000) {
                    throw new Error("pulse_duration must be 0..1000 ms in 1 ms steps");
                }
                await meta.device.getEndpoint(4).write("genAnalogOutput", {presentValue: value});
                // Read back from the device; writes do not always trigger a report.
                await new Promise((resolve) => setTimeout(resolve, 250));
                await meta.device.getEndpoint(4).read("genAnalogOutput", ["presentValue"]);
            },
            convertGet: async (entity, key, meta) => {
                await meta.device.getEndpoint(4).read("genAnalogOutput", ["presentValue"]);
            },
        },
        {
            key: ["pulse"],
            convertSet: async (entity, key, value, meta) => {
                if (value !== "PRESS") throw new Error("pulse must be PRESS");
                await meta.device.getEndpoint(1).command("genOnOff", "on", {}, {});
            },
        },
        {
            key: ["walk"],
            convertSet: async (entity, key, value, meta) => {
                if (value !== "PRESS") throw new Error("walk must be PRESS");
                const endpoint = meta.device.getEndpoint(5);
                if (!endpoint) throw new Error("WALK requires firmware 1.7.0 and a fresh interview");
                await endpoint.command("genOnOff", "on", {}, {});
            },
        },
        {
            key: ["closed", "open"],
            convertGet: async (entity, key, meta) => {
                await meta.device.getEndpoint(key === "closed" ? 2 : 3).read("genBinaryInput", ["presentValue"]);
            },
        },
    ],
    exposes: [
        (device) => [
            ...(device && (!("getEndpoint" in device) || device.getEndpoint(5))
                ? [
                      e
                          .enum("movement", ea.SET, ["PRESS"])
                          .withProperty("walk")
                          .withHomeAssistant({icon: "mdi:walk"})
                          .withLabel("Pedestrian gate")
                          .withDescription("Pedestrian pulse on GPIO11. Commands during an active pulse are ignored."),
                  ]
                : []),
            e
                .enum("door", ea.SET, ["PRESS"])
                .withProperty("pulse")
                .withHomeAssistant({icon: "mdi:gate"})
                .withLabel("Full gate")
                .withDescription(
                    "Main gate pulse on GPIO10. Repeats during an active pulse are ignored; firmware 1.7.0-rc2 removes the post-pulse cooldown.",
                ),
            e
                .numeric("duration", ea.ALL)
                .withProperty("pulse_duration")
                .withHomeAssistant({icon: "mdi:timer-outline"})
                .withLabel("Pulse duration")
                .withUnit("ms")
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withCategory("config")
                .withDescription("Relay pulse duration, saved on device. Zero disables pulses. Changing this does not activate the relay"),
            e
                .enum("door_state", ea.STATE_GET, ["open", "closed", "intermediate", "sensor_error", "unknown"])
                .withProperty("gate_state")
                .withHomeAssistant({icon: "mdi:gate"})
                .withLabel("Gate state")
                .withDescription(
                    "One sensor: open means not at the closed limit. Two sensors: intermediate means neither limit is active; sensor_error means both are active.",
                ),
            e
                .enum("mode", ea.ALL, ["one", "two"])
                .withProperty("sensor_mode")
                .withHomeAssistant({icon: "mdi:counter"})
                .withLabel("Sensor count")
                .withCategory("config")
                .withDescription(
                    "Number of limit sensors. One uses only the closed limit; two uses both limits. Stored in Zigbee2MQTT, default one.",
                ),
        ],
    ],
    configure: [
        async (device, coordinatorEndpoint) => {
            const durationEndpoint = device.getEndpoint(4);
            if (durationEndpoint) {
                // Duration uses explicit readback; disable scheduled reports on this cluster.
                for (const [cluster, delta] of [["genAnalogOutput", 100]] as const) {
                    try {
                        await durationEndpoint.configureReporting(cluster, [
                            {
                                attribute: "presentValue",
                                minimumReportInterval: 0,
                                maximumReportInterval: 65535,
                                reportableChange: delta,
                            },
                        ]);
                    } catch (error) {
                        // ESP returns FAILURE when terminating an already absent report.
                        // Transport/timeouts must still fail configuration.
                        if (!String(error).includes("Status 'FAILURE'")) throw error;
                    }
                }
                await durationEndpoint.read("genAnalogOutput", ["presentValue"]);
            }
            for (const id of [2, 3]) {
                const endpoint = device.getEndpoint(id);
                await endpoint.bind("genBinaryInput", coordinatorEndpoint);
                // Firmware sends contact reports on change; configure reads the initial state.
                // Avoid the SDK's separate scheduled-report path.
                try {
                    await endpoint.configureReporting("genBinaryInput", [
                        {
                            attribute: "presentValue",
                            minimumReportInterval: 0,
                            maximumReportInterval: 65535,
                        },
                    ]);
                } catch (error) {
                    if (!String(error).includes("Status 'FAILURE'")) throw error;
                }
                await endpoint.read("genBinaryInput", ["presentValue"]);
            }
            for (const id of [1, 5]) {
                const relayEndpoint = device.getEndpoint(id);
                if (!relayEndpoint) continue;
                try {
                    await relayEndpoint.configureReporting("genOnOff", [
                        {
                            attribute: "onOff",
                            minimumReportInterval: 0,
                            maximumReportInterval: 65535,
                        },
                    ]);
                } catch (error) {
                    if (!String(error).includes("Status 'FAILURE'")) throw error;
                }
            }
        },
    ],
});

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MD-GATE-ZB1"],
        model: "MD-GATE-ZB1",
        vendor: "MakeDIY",
        description: "Gate controller with main and optional pedestrian pulse and one or two limit contacts",
        extend: [gateController()],
    },
];
