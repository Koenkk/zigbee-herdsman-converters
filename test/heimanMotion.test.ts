import assert from "node:assert/strict";
import {it as test, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import {contactFromZigbee, hs2vtdPlus as definition, doorFromZigbee, motionFromZigbee, motionToZigbee} from "../src/lib/heimanMotion";
import {cluster, implementedAttributes, motionCluster} from "../src/lib/heimanMotionProtocol";
import {mockDevice} from "./utils";

const clusters = {[cluster]: motionCluster};
const make = (name, payload, direction = 1) => Zcl.Frame.create(1, direction, true, 0x120b, 0x5a, name, cluster, payload, clusters);
const parse = (bytes) => Zcl.Frame.fromBuffer(0xfc90, Zcl.Header.fromBuffer(bytes), bytes, clusters);
const responseCases = [
    ["configurationResult", 0x10, 4, {status: 0, setting: 3, enabled: 1, sensitivity: 5}],
    ["actionNotification", 0x11, 1, {action: 1}],
    ["vibrationConfigurationResult", 0x12, 4, {status: 0, setting: 5, enabled: 1, sensitivity: 5}],
    ["vibrationStatus", 0x13, 1, {active: 1}],
    ["tiltConfigurationResult", 0x14, 4, {status: 0, setting: 7, enabled: 1, sensitivity: 5}],
    ["tiltStatus", 0x15, 1, {state: 4}],
    ["tiltCalibrationResult", 0x16, 1, {status: 0}],
    ["doorConfigurationResult", 0x17, 3, {status: 0, setting: 12, enabled: 1}],
    ["doorStatus", 0x18, 1, {state: 3}],
    ["doorCalibrationResult", 0x19, 1, {status: 0}],
    ["gestureConfigurationResult", 0x21, 3, {status: 0, setting: 26, enabled: 1}],
    ["gestureLearnResult", 0x22, 9, {status: 0, requestId: 0x12345678, gestureId: 7}],
    ["gestureStatus", 0x23, 7, {state: 1, phase: 2, requestId: 0x12345678, sampleCount: 2}],
    ["gestureOperationResult", 0x24, 1, {status: 0}],
    ["gestureListResponse", 0x25, 8, {status: 0, total: 0, index: 0, gestureId: 0, name: ""}],
    ["gestureRecognized", 0x26, 8, {gestureId: 7, eventSequence: 0xfffffffe}],
];
const requests = [
    ["setTapEnabled", 3, 0x10, {value: 1}],
    ["setTapSensitivity", 4, 0x10, {value: 5}],
    ["setVibrationEnabled", 5, 0x12, {value: 1}],
    ["setVibrationSensitivity", 6, 0x12, {value: 5}],
    ["setTiltEnabled", 7, 0x14, {value: 1}],
    ["setTiltSensitivity", 8, 0x14, {value: 5}],
    ["requestTiltCalibration", 0x0b, 0x16, {}],
    ["setDoorEnabled", 0x0c, 0x17, {value: 1}],
    ["requestDoorCalibration", 0x0f, 0x19, {}],
    ["setGestureEnabled", 0x1a, 0x21, {value: 1}],
    ["gestureLearnStart", 0x1b, 0x22, {name: "慢敲两下"}],
    ["gestureDelete", 0x1c, 0x24, {gestureId: 0x12345678}],
    ["gestureList", 0x1d, 0x25, {startIndex: 0}],
];

test("clean V0.1 defines exactly 13 attributes and 13/16 commands without deleted controls", () => {
    assert.equal(motionCluster.ID, 0xfc90);
    assert.equal(motionCluster.manufacturerCode, 0x120b);
    assert.equal(Object.keys(motionCluster.attributes).length, 13);
    assert.equal(Object.keys(motionCluster.commands).length, 13);
    assert.equal(Object.keys(motionCluster.commandsResponse).length, 16);
    assert.equal(motionCluster.attributes.gestureLastId.ID, 0x0061);
    assert.equal(motionCluster.attributes.gestureLastId.type, Zcl.DataType.UINT32);
    for (const table of [motionCluster.attributes, motionCluster.commands, motionCluster.commandsResponse])
        assert.equal(new Set(Object.values(table).map((v) => v.ID)).size, Object.keys(table).length);
    for (const name of ["gestureLearnCapture", "gestureLearnCancel", "gestureRename", "setTiltStillMs", "setDoorTimeoutMs"])
        assert.equal(motionCluster.commands[name], undefined);
    assert.equal(implementedAttributes.length, 10);
});

test("all request IDs, responses and UTF-8/little-endian payloads round-trip in herdsman", () => {
    for (const [name, id, response, payload] of requests) {
        assert.equal(motionCluster.commands[name].ID, id);
        assert.equal(motionCluster.commands[name].response, response);
        const frame = make(name, payload, 0);
        const raw = frame.toBuffer();
        assert.equal(raw[4], id);
        assert.deepEqual(parse(raw).payload, payload);
        if (name === "gestureLearnStart") assert.equal(raw.length, 6 + Buffer.byteLength(payload.name, "utf8"));
        if (name === "gestureDelete") assert.deepEqual([...raw.subarray(5)], [0x78, 0x56, 0x34, 0x12]);
    }
});

test("all 16 response/notification payload lengths match the first-version contract", () => {
    for (const [name, id, size, payload] of responseCases) {
        const raw = make(name, payload).toBuffer();
        assert.equal(raw[4], id);
        assert.equal(raw.length, size + 5, name);
        assert.deepEqual(parse(raw).payload, payload);
    }
    const named = make("gestureListResponse", {status: 0, total: 1, index: 0, gestureId: 7, name: "慢敲两下"}).toBuffer();
    assert.equal(named.length, 13 + Buffer.byteLength("慢敲两下", "utf8"));
    const invalid = make("gestureRecognized", {gestureId: 7, eventSequence: 0xffffffff}).toBuffer();
    assert.ok(Number.isNaN(parse(invalid).payload.eventSequence));
});

test("only final product actions are published and ordinary reads do not generate actions", () => {
    for (const [value, action] of [
        [1, "triple_tap"],
        [2, "tilted"],
        [3, "tilt_recovered"],
        [4, "vibration"],
    ])
        assert.deepEqual(motionFromZigbee.convert(null, {type: "commandActionNotification", data: {action: value}}), {action});
    assert.equal(motionFromZigbee.convert(null, {type: "commandActionNotification", data: {action: 5}}), undefined);
    assert.equal(motionFromZigbee.convert(null, {type: "readResponse", data: {tiltState: 4}}).tilt_state, "ERROR");
});

test("contact waits for fresh IAS and ignores late reads after ERROR or disable", async () => {
    let complete: (value: {zoneStatus: number}) => void;
    const endpoint = {read: () => new Promise((resolve) => (complete = resolve))};
    const published = [];
    const msg = (state) => ({endpoint, type: "commandDoorStatus", data: {state}});
    assert.deepEqual(contactFromZigbee.convert(null, {endpoint, data: {zonestatus: 0}}), {contact: null});
    assert.deepEqual(
        doorFromZigbee.convert(null, msg(2), (v) => published.push(v)),
        {door_status: "READY", contact: null},
    );
    assert.deepEqual(
        doorFromZigbee.convert(null, msg(3), (v) => published.push(v)),
        {door_status: "ERROR", contact: null},
    );
    complete({zoneStatus: 0});
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(published.length, 0);
    endpoint.read = async () => ({zoneStatus: 0});
    await doorFromZigbee.convert(null, msg(2), (v) => published.push(v));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(published.pop(), {door_status: "READY", contact: true});
    assert.deepEqual(contactFromZigbee.convert(null, {endpoint, data: {zonestatus: 1}}), {contact: false});
    assert.deepEqual(
        doorFromZigbee.convert(null, msg(0), (v) => published.push(v)),
        {door_status: "UNKNOWN", contact: null},
    );
    assert.deepEqual(contactFromZigbee.convert(null, {endpoint, data: {zonestatus: 0}}), {contact: null});
});

test("configuration uses actual response and rejects failed saves and invalid inputs", async () => {
    const entity = mockDevice({modelID: "HS2VDT-PLUS", endpoints: [{ID: 1}]}, "EndDevice").getEndpoint(1);
    entity.command = vi.fn().mockResolvedValue({status: 0, setting: 4, enabled: 1, sensitivity: 6});
    assert.deepEqual(await motionToZigbee.convertSet(entity, "tap_sensitivity", 6), {state: {tap_enabled: "ON", tap_sensitivity: 6}});
    entity.command = async () => ({status: 1});
    await assert.rejects(motionToZigbee.convertSet(entity, "tap_sensitivity", 6), /rejected/);
    await assert.rejects(motionToZigbee.convertSet(entity, "door_calibration", "START"), /rejected/);
    await assert.rejects(motionToZigbee.convertSet(entity, "tilt_sensitivity", 11), /1\.\.10/);
    await assert.rejects(motionToZigbee.convertSet(entity, "gesture_learn_start", {name: "未实现"}), /Unsupported/);
});

test("configure reads implemented attributes and preserves exact PLUS identity/IAS descriptor", async () => {
    const calls = [];
    const schemas = {oldAlias: {ID: 0xfc90}};
    const device = {
        customClusters: schemas,
        addCustomCluster: (key, value) => (schemas[key] = value),
        getEndpoint: () => ({read: async (...args) => calls.push(args)}),
    };
    await definition.extend[2].configure[0](device);
    assert.deepEqual(calls[0][1], implementedAttributes);
    assert.equal(schemas.oldAlias, motionCluster);
    assert.equal(definition.fingerprint[0].modelID, "HS2VDT-PLUS");
    assert.ok(definition.fingerprint[0].endpoints[0].inputClusters.includes(0x0500));
    const names = definition.exposes.map((x) => x.name);
    assert.ok(!names.some((x) => x.startsWith("gesture_"))); // Algorithm not claimed as implemented.
});

test("PLUS endpoint fingerprint leaves the existing HS2VTD model separate", async () => {
    const device = mockDevice(
        {
            modelID: "HS2VDT-PLUS",
            manufacturerName: "HEIMAN",
            endpoints: [
                {
                    ID: 1,
                    profileID: 0x0104,
                    deviceID: 0xfff0,
                    inputClusters: ["genBasic", "genIdentify", "genPollCtrl", "ssIasZone"],
                    inputClusterIDs: [0xfc90],
                },
            ],
        },
        "EndDevice",
    );
    assert.equal((await findByDevice(device)).model, "HS2VDT-PLUS");
    const legacy = mockDevice({modelID: "HS2VTD", manufacturerName: "HEIMAN", endpoints: [{ID: 1}, {ID: 2}]}, "EndDevice");
    assert.equal((await findByDevice(legacy)).model, "HS2VTD");
});
