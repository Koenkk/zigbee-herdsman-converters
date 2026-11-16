import * as exposes from "./exposes";
import {cluster, implementedAttributes, manufacturerCode, motionCluster} from "./heimanMotionProtocol";
import {deviceAddCustomCluster, identify} from "./modernExtend";

export {motionCluster} from "./heimanMotionProtocol";

import type {DefinitionWithExtend, Fz, KeyValueAny, Tz, Zh} from "./types";
import {assertEndpoint} from "./utils";

interface MotionWire {
    attributes: {
        tapEnabled: number;
        tapSensitivity: number;
        vibrationEnabled: number;
        vibrationSensitivity: number;
        vibration: number;
        tiltEnabled: number;
        tiltSensitivity: number;
        tiltState: number;
        doorEnabled: number;
        doorStatus: number;
        gestureEnabled: number;
        gestureState: number;
        gestureLastId: number;
    };
    commands: Record<string, {value?: number}>;
    commandResponses: Record<
        string,
        {state?: number; action?: number; status?: number; setting?: number; enabled?: number; sensitivity?: number; active?: number}
    >;
}
type MotionData = Partial<
    MotionWire["attributes"] & {state: number; action: number; status: number; setting: number; enabled: number; sensitivity: number; active: number}
> &
    Record<number, number>;

const options = {manufacturerCode, timeout: 20000};
const ea = exposes.access;
const e = exposes.presets;
const configurationPrefixes: Record<string, string | undefined> = {
    commandConfigurationResult: "tap",
    commandVibrationConfigurationResult: "vibration",
    commandTiltConfigurationResult: "tilt",
    commandDoorConfigurationResult: "door",
};
const readAttributes: Record<string, keyof MotionWire["attributes"]> = {
    vibration: "vibration",
    tilt_state: "tiltState",
    door_status: "doorStatus",
    contact: "doorStatus",
};
const controls: Record<string, [string, keyof MotionWire["attributes"]]> = {
    tap_enabled: ["setTapEnabled", "tapEnabled"],
    tap_sensitivity: ["setTapSensitivity", "tapSensitivity"],
    vibration_enabled: ["setVibrationEnabled", "vibrationEnabled"],
    vibration_sensitivity: ["setVibrationSensitivity", "vibrationSensitivity"],
    tilt_enabled: ["setTiltEnabled", "tiltEnabled"],
    tilt_sensitivity: ["setTiltSensitivity", "tiltSensitivity"],
    door_enabled: ["setDoorEnabled", "doorEnabled"],
};

export const motionFromZigbee: Fz.Converter<"heimanMotion", MotionWire> = {
    cluster,
    type: [
        "readResponse",
        "attributeReport",
        "commandConfigurationResult",
        "commandVibrationConfigurationResult",
        "commandTiltConfigurationResult",
        "commandDoorConfigurationResult",
        "commandActionNotification",
        "commandVibrationStatus",
        "commandTiltStatus",
    ],
    convert: (model, msg) => {
        const d = msg.data as MotionData;
        if (msg.type === "commandActionNotification") {
            const action = [undefined, "triple_tap", "tilted", "tilt_recovered", "vibration"][d.action];
            return action ? {action} : undefined;
        }
        const result: KeyValueAny = {};
        const prefix = configurationPrefixes[msg.type];
        for (const [key, [, name]] of Object.entries(controls)) {
            const value =
                d[name] ??
                d[motionCluster.attributes[name].ID] ??
                (prefix && key.startsWith(`${prefix}_`) ? d[key.endsWith("_enabled") ? "enabled" : "sensitivity"] : undefined);
            if (value !== undefined) result[key] = key.endsWith("_enabled") ? (value ? "ON" : "OFF") : value;
        }
        const tilt = d.tiltState ?? d[0x0051] ?? (msg.type === "commandTiltStatus" ? d.state : undefined);
        if (tilt !== undefined) result.tilt_state = ["UNKNOWN", "NORMAL", "TILTED", "CALIBRATING", "ERROR"][tilt] ?? "UNKNOWN";
        const active = d.vibration ?? d[0x0050] ?? (msg.type === "commandVibrationStatus" ? d.active : undefined);
        if (active !== undefined) result.vibration = !!active;
        return result;
    },
};

// A fresh IAS read after READY prevents the previous Alarm1 cache becoming a new contact result.
const doorGate = new WeakMap<Zh.Endpoint, {state: number; fresh: boolean}>();
export const doorFromZigbee: Fz.Converter<"heimanMotion", MotionWire> = {
    cluster,
    type: ["commandDoorStatus", "readResponse", "attributeReport"],
    convert: (model, msg, publish) => {
        const d = msg.data as MotionData;
        const value = d.doorStatus ?? d[0x0058] ?? (msg.type === "commandDoorStatus" ? d.state : undefined);
        if (value === undefined) return;
        const gate = {state: value, fresh: false};
        doorGate.set(msg.endpoint, gate);
        const result: Record<string, string | boolean | null> = {
            door_status: ["UNKNOWN", "CALIBRATING", "READY", "ERROR"][value] ?? "UNKNOWN",
            contact: null,
        };
        if (value === 2) {
            msg.endpoint
                .read("ssIasZone", ["zoneStatus"], {timeout: 20000})
                .then((data) => {
                    if (doorGate.get(msg.endpoint) !== gate) return;
                    const zone = data.zoneStatus;
                    if (typeof zone !== "number" || !Number.isInteger(zone)) return;
                    gate.fresh = true;
                    publish({...result, contact: !(zone & 1)});
                })
                .catch(() => {}); // Invalid until a later READY/read succeeds.
        }
        return result;
    },
};
export const contactFromZigbee: Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
    convert: (model, msg) => {
        const zone = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
        if (zone === undefined) return;
        const gate = doorGate.get(msg.endpoint);
        return {contact: gate?.state === 2 && gate.fresh ? !(zone & 1) : null};
    },
};

export const motionToZigbee: Tz.Converter = {
    key: [...Object.keys(controls), "vibration", "tilt_state", "tilt_calibration", "door_status", "door_calibration", "contact"],
    convertSet: async (entity, key, value) => {
        assertEndpoint(entity);
        if (key === "tilt_calibration" || key === "door_calibration") {
            if (value !== "START") throw new Error(`${key} must be START`);
            const response = await entity.command<"heimanMotion", string, MotionWire>(
                cluster,
                key === "tilt_calibration" ? "requestTiltCalibration" : "requestDoorCalibration",
                {},
                options,
            );
            if (response.status !== 0) throw new Error(`Calibration rejected: ZCL status ${response.status}`);
            return;
        }
        const control = controls[key];
        if (!control) throw new Error(`Unsupported motion control: ${key}`);
        let wireValue: number;
        if (key.endsWith("_enabled")) {
            if (value !== "ON" && value !== "OFF") throw new Error(`${key} must be ON or OFF`);
            wireValue = value === "ON" ? 1 : 0;
        } else {
            if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 10) throw new Error(`${key} must be 1..10`);
            wireValue = value;
        }
        const response = await entity.command<"heimanMotion", string, MotionWire>(cluster, control[0], {value: wireValue}, options);
        if (response.status !== 0) throw new Error(`Configuration rejected: ZCL status ${response.status}`);
        const prefix = key.split("_")[0];
        const state: KeyValueAny = {[`${prefix}_enabled`]: response.enabled ? "ON" : "OFF"};
        if (prefix !== "door") state[`${prefix}_sensitivity`] = response.sensitivity;
        return {state};
    },
    convertGet: async (entity, key) => {
        assertEndpoint(entity);
        const name = controls[key]?.[1] ?? readAttributes[key];
        if (!name) throw new Error(`Unsupported motion read: ${key}`);
        await entity.read<"heimanMotion", MotionWire>(cluster, [name], options);
    },
};

export const hs2vtdPlus: DefinitionWithExtend = {
    fingerprint: [
        {
            modelID: "HS2VDT-PLUS",
            manufacturerName: "HEIMAN",
            type: "EndDevice",
            endpoints: [{ID: 1, profileID: 0x0104, deviceID: 0xfff0, inputClusters: [0x0000, 0x0003, 0x0020, 0x0500, 0xfc90], outputClusters: []}],
        },
    ],
    model: "HS2VDT-PLUS",
    vendor: "HEIMAN",
    description: "Motion and contact sensor with tap, vibration and tilt detection",
    extend: [
        identify(),
        deviceAddCustomCluster(cluster, motionCluster),
        {
            isModernExtend: true,
            configure: [
                async (device) => {
                    for (const [name, schema] of Object.entries(device.customClusters)) {
                        if (schema.ID === motionCluster.ID) device.addCustomCluster(name, motionCluster);
                    }
                    device.addCustomCluster(cluster, motionCluster);
                    await device.getEndpoint(1).read<"heimanMotion", MotionWire>(cluster, [...implementedAttributes], options);
                },
            ],
        },
    ],
    fromZigbee: [motionFromZigbee, doorFromZigbee, contactFromZigbee],
    toZigbee: [motionToZigbee],
    exposes: [
        e.contact().withAccess(ea.STATE_GET),
        e.enum("door_status", ea.STATE_GET, ["UNKNOWN", "CALIBRATING", "READY", "ERROR"]),
        e.enum("door_calibration", ea.SET, ["START"]).withCategory("config"),
        e.binary("door_enabled", ea.ALL, "ON", "OFF").withCategory("config"),
        e.binary("tap_enabled", ea.ALL, "ON", "OFF").withCategory("config"),
        e.numeric("tap_sensitivity", ea.ALL).withValueMin(1).withValueMax(10).withCategory("config"),
        e.binary("vibration_enabled", ea.ALL, "ON", "OFF").withCategory("config"),
        e.numeric("vibration_sensitivity", ea.ALL).withValueMin(1).withValueMax(10).withCategory("config"),
        e.binary("vibration", ea.STATE_GET, true, false),
        e.binary("tilt_enabled", ea.ALL, "ON", "OFF").withCategory("config"),
        e.numeric("tilt_sensitivity", ea.ALL).withValueMin(1).withValueMax(10).withCategory("config"),
        e.enum("tilt_state", ea.STATE_GET, ["UNKNOWN", "NORMAL", "TILTED", "CALIBRATING", "ERROR"]),
        e.enum("tilt_calibration", ea.SET, ["START"]).withCategory("config"),
        e.action(["triple_tap", "vibration", "tilted", "tilt_recovered"]),
    ],
};
