import {Zcl} from "zigbee-herdsman";
import type {Cluster} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";

export const cluster = "heimanMotion";
export const manufacturerCode = 0x120b;
const type = Zcl.DataType;
const attr = (name: string, id: number, type: Zcl.DataType) => ({name, ID: id, type});
const field = (name: string, type = Zcl.DataType.UINT8) => ({name, type});
const command = (name: string, id: number, response: number, parameters: {name: string; type: Zcl.DataType}[]) => ({
    name,
    ID: id,
    response,
    parameters,
});
const response = (name: string, id: number, parameters: {name: string; type: Zcl.DataType}[]) => ({name, ID: id, parameters});
const setting = [field("status"), field("setting"), field("enabled", type.BOOLEAN)];
const sensitivity = [...setting, field("sensitivity")];

// Uint32 0xffffffff is the ZCL invalid sentinel; identifiers/sequences use at most 0xfffffffe.
// Complete V0.1 wire contract. The current firmware implements the first ten attributes;
// gesture learning/recognition is specified here without advertising it as an available feature.
export const motionCluster: Cluster = {
    name: cluster,
    ID: 0xfc90,
    manufacturerCode,
    attributes: {
        tapEnabled: attr("tapEnabled", 0x2041, type.BOOLEAN),
        tapSensitivity: attr("tapSensitivity", 0x2042, type.UINT8),
        vibrationEnabled: attr("vibrationEnabled", 0x2043, type.BOOLEAN),
        vibrationSensitivity: attr("vibrationSensitivity", 0x2044, type.UINT8),
        vibration: attr("vibration", 0x0050, type.BOOLEAN),
        tiltEnabled: attr("tiltEnabled", 0x2045, type.BOOLEAN),
        tiltSensitivity: attr("tiltSensitivity", 0x2046, type.UINT8),
        tiltState: attr("tiltState", 0x0051, type.UINT8),
        doorEnabled: attr("doorEnabled", 0x2049, type.BOOLEAN),
        doorStatus: attr("doorStatus", 0x0058, type.UINT8),
        gestureEnabled: attr("gestureEnabled", 0x204c, type.BOOLEAN),
        gestureState: attr("gestureState", 0x0060, type.UINT8),
        gestureLastId: attr("gestureLastId", 0x0061, type.UINT32),
    },
    commands: {
        setTapEnabled: command("setTapEnabled", 0x03, 0x10, [field("value")]),
        setTapSensitivity: command("setTapSensitivity", 0x04, 0x10, [field("value")]),
        setVibrationEnabled: command("setVibrationEnabled", 0x05, 0x12, [field("value")]),
        setVibrationSensitivity: command("setVibrationSensitivity", 0x06, 0x12, [field("value")]),
        setTiltEnabled: command("setTiltEnabled", 0x07, 0x14, [field("value")]),
        setTiltSensitivity: command("setTiltSensitivity", 0x08, 0x14, [field("value")]),
        requestTiltCalibration: command("requestTiltCalibration", 0x0b, 0x16, []),
        setDoorEnabled: command("setDoorEnabled", 0x0c, 0x17, [field("value")]),
        requestDoorCalibration: command("requestDoorCalibration", 0x0f, 0x19, []),
        setGestureEnabled: command("setGestureEnabled", 0x1a, 0x21, [field("value")]),
        gestureLearnStart: command("gestureLearnStart", 0x1b, 0x22, [field("name", type.CHAR_STR)]),
        gestureDelete: command("gestureDelete", 0x1c, 0x24, [field("gestureId", type.UINT32)]),
        gestureList: command("gestureList", 0x1d, 0x25, [field("startIndex")]),
    },
    commandsResponse: {
        configurationResult: response("configurationResult", 0x10, sensitivity),
        actionNotification: response("actionNotification", 0x11, [field("action")]),
        vibrationConfigurationResult: response("vibrationConfigurationResult", 0x12, sensitivity),
        vibrationStatus: response("vibrationStatus", 0x13, [field("active", type.BOOLEAN)]),
        tiltConfigurationResult: response("tiltConfigurationResult", 0x14, sensitivity),
        tiltStatus: response("tiltStatus", 0x15, [field("state")]),
        tiltCalibrationResult: response("tiltCalibrationResult", 0x16, [field("status")]),
        doorConfigurationResult: response("doorConfigurationResult", 0x17, setting),
        doorStatus: response("doorStatus", 0x18, [field("state")]),
        doorCalibrationResult: response("doorCalibrationResult", 0x19, [field("status")]),
        gestureConfigurationResult: response("gestureConfigurationResult", 0x21, setting),
        gestureLearnResult: response("gestureLearnResult", 0x22, [field("status"), field("requestId", type.UINT32), field("gestureId", type.UINT32)]),
        gestureStatus: response("gestureStatus", 0x23, [field("state"), field("phase"), field("requestId", type.UINT32), field("sampleCount")]),
        gestureOperationResult: response("gestureOperationResult", 0x24, [field("status")]),
        gestureListResponse: response("gestureListResponse", 0x25, [
            field("status"),
            field("total"),
            field("index"),
            field("gestureId", type.UINT32),
            field("name", type.CHAR_STR),
        ]),
        gestureRecognized: response("gestureRecognized", 0x26, [field("gestureId", type.UINT32), field("eventSequence", type.UINT32)]),
    },
};

export const implementedAttributes = [
    "tapEnabled",
    "tapSensitivity",
    "vibrationEnabled",
    "vibrationSensitivity",
    "vibration",
    "tiltEnabled",
    "tiltSensitivity",
    "tiltState",
    "doorEnabled",
    "doorStatus",
] as const;
