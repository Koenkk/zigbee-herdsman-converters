import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
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

// The SDK sends contact reports itself. Terminate scheduled reports, including old configurations.
async function disableReporting(endpoint: Zh.Endpoint, cluster: "genBinaryInput" | "genAnalogOutput" | "genOnOff") {
    try {
        await endpoint.configureReporting(cluster, [
            {
                attribute: cluster === "genOnOff" ? "onOff" : "presentValue",
                minimumReportInterval: 0,
                maximumReportInterval: 65535,
                ...(cluster === "genAnalogOutput" ? {reportableChange: 100} : {}),
            },
        ]);
    } catch (error) {
        // ESP returns FAILURE for an already absent report; transport errors must still propagate.
        if (!String(error).includes("Status 'FAILURE'")) throw error;
    }
}

function limitContact(name: "closed" | "open", endpointID: number): ModernExtend {
    const extension = m.binary({
        name,
        cluster: "genBinaryInput",
        attribute: "presentValue",
        valueOn: [true, 1],
        valueOff: [false, 0],
        access: "STATE_GET",
        reporting: false,
        description: `${name} limit contact`,
    });
    const from = extension.fromZigbee[0];
    const to = extension.toZigbee[0];
    return {
        ...extension,
        // Keep the existing public exposes; raw contacts remain available in MQTT and through /get.
        exposes: [],
        fromZigbee: [
            {
                ...from,
                convert: (model, msg, publish, options, meta) => {
                    const value = contactValue(msg.data.presentValue);
                    if (msg.endpoint.ID !== endpointID || value === undefined) return;
                    // Accept both boolean and numeric representations of the ZCL boolean.
                    return from.convert(model, {...msg, data: {...msg.data, presentValue: Number(value)}}, publish, options, meta);
                },
            },
        ],
        toZigbee: [
            {
                ...to,
                convertGet: (entity, key, meta) => to.convertGet(meta.device.getEndpoint(endpointID), key, {...meta, endpoint_name: name}),
            },
        ],
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint = device.getEndpoint(endpointID);
                await endpoint.bind("genBinaryInput", coordinatorEndpoint);
                await disableReporting(endpoint, "genBinaryInput");
                await endpoint.read("genBinaryInput", ["presentValue"]);
            },
        ],
    };
}

function pulseDuration(): ModernExtend {
    const extension = m.numeric({
        name: "pulse_duration",
        cluster: "genAnalogOutput",
        attribute: "presentValue",
        unit: "ms",
        valueMin: 0,
        valueMax: 1000,
        valueStep: 1,
        access: "ALL",
        reporting: false,
        entityCategory: "config",
        label: "Pulse duration",
        homeassistant: {icon: "mdi:timer-outline"},
        description: "Relay pulse duration, saved on device. Zero disables pulses. Changing this does not activate the relay",
    });
    // Frontend icons use the expose name; retain the MQTT property and converter key.
    for (const expose of extension.exposes) if (typeof expose !== "function") expose.name = "duration";
    const from = extension.fromZigbee[0];
    const to = extension.toZigbee[0];
    return {
        ...extension,
        fromZigbee: [
            {
                ...from,
                convert: (model, msg, publish, options, meta) => {
                    if (msg.endpoint.ID !== 4 || !Number.isFinite(msg.data.presentValue)) return;
                    return from.convert(model, msg, publish, options, meta);
                },
            },
        ],
        toZigbee: [
            {
                ...to,
                convertSet: async (entity, key, value, meta) => {
                    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 1000) {
                        throw new Error("pulse_duration must be 0..1000 ms in 1 ms steps");
                    }
                    const endpoint = meta.device.getEndpoint(4);
                    const endpointMeta = {...meta, endpoint_name: "duration"};
                    await to.convertSet(endpoint, key, value, endpointMeta);
                    // Publish the device's readback, not an optimistic write result.
                    await new Promise((resolve) => setTimeout(resolve, 250));
                    await to.convertGet(endpoint, key, endpointMeta);
                },
                convertGet: (entity, key, meta) => to.convertGet(meta.device.getEndpoint(4), key, {...meta, endpoint_name: "duration"}),
            },
        ],
        configure: [
            async (device) => {
                const endpoint = device.getEndpoint(4);
                if (!endpoint) return;
                await disableReporting(endpoint, "genAnalogOutput");
                await endpoint.read("genAnalogOutput", ["presentValue"]);
            },
        ],
    };
}

function gatePulse(property: "pulse" | "walk", endpointID: number): ModernExtend {
    const pedestrian = property === "walk";
    const expose = e
        .enum(pedestrian ? "movement" : "door", ea.SET, ["PRESS"])
        .withProperty(property)
        .withHomeAssistant({icon: pedestrian ? "mdi:walk" : "mdi:gate"})
        .withLabel(pedestrian ? "Pedestrian gate" : "Full gate")
        .withDescription(
            pedestrian
                ? "Pedestrian pulse on GPIO11. Commands during an active pulse are ignored."
                : "Main gate pulse on GPIO10. Repeats during an active pulse are ignored; firmware 1.7.0-rc2 removes the post-pulse cooldown.",
        );
    return {
        isModernExtend: true,
        exposes: pedestrian ? [(device) => (device && (!("getEndpoint" in device) || device.getEndpoint(endpointID)) ? [expose] : [])] : [expose],
        // These are commands, not attribute writes: m.enumLookup/onOff would change the pulse-only contract.
        toZigbee: [
            {
                key: [property],
                convertSet: async (entity, key, value, meta) => {
                    if (value !== "PRESS") throw new Error(`${property} must be PRESS`);
                    const endpoint = meta.device.getEndpoint(endpointID);
                    if (!endpoint) throw new Error("WALK requires firmware 1.7.0 and a fresh interview");
                    await endpoint.command("genOnOff", "on", {}, {});
                },
            },
        ],
        configure: [
            async (device) => {
                const endpoint = device.getEndpoint(endpointID);
                if (endpoint) await disableReporting(endpoint, "genOnOff");
            },
        ],
    };
}

// Sensor mode is coordinator metadata and gate_state is derived from two endpoints, not a ZCL enum attribute.
function gatePosition(): ModernExtend {
    return {
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
                    return stateFor(meta.device);
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
        ],
        exposes: [
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
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MD-GATE-ZB1"],
        model: "MD-GATE-ZB1",
        vendor: "MakeDIY",
        description: "Gate controller with main and optional pedestrian pulse and one or two limit contacts",
        extend: [limitContact("closed", 2), limitContact("open", 3), pulseDuration(), gatePulse("walk", 5), gatePulse("pulse", 1), gatePosition()],
    },
];
