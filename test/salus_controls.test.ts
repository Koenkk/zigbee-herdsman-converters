import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {Device} from "zigbee-herdsman/dist/controller/model";
import type {DeviceType} from "zigbee-herdsman/dist/controller/tstype";
import {definitions as salusDefinitions} from "../src/devices/salus_controls";
import {findByDevice} from "../src/index";
import * as exposes from "../src/lib/exposes";
import {logger} from "../src/lib/logger";
import * as globalStore from "../src/lib/store";
import type {Definition, Fz, KeyValue, OnEvent, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

// The records and frames are from real devices. The simulated thermostat and wiring centre answer like the real ones. The short addresses are
// placeholders.

const CLUSTER = "manuSpecificSalusIt600";
const access = exposes.access;
const hex = (text: string) => Buffer.from(text.replace(/\s+/g, ""), "hex");
const settle = () => new Promise((resolve) => setImmediate(() => setImmediate(resolve)));

// Lets a B-command be sent and echoed.
async function settled() {
    for (let hop = 0; hop < 10; hop++) {
        await settle();
    }
}

const echoOf = (device: Thermostat, text: string) => runConverters(definition, device.device, device.endpoint, "commandEcho", {payload: hex(text)});

function watch(promise: Promise<unknown>) {
    const watched: {state: "pending" | "resolved" | "rejected"; error?: Error} = {state: "pending"};
    promise.then(
        () => {
            watched.state = "resolved";
        },
        (error: Error) => {
            watched.state = "rejected";
            watched.error = error;
        },
    );
    return watched;
}

// Fakes setTimeout for the tests of the describe it is called in, so that the 30 s waits can be stepped through.
function fakeTimeouts() {
    beforeEach(() => {
        vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    });

    afterEach(() => {
        vi.useRealTimers();
    });
}

let definition: Definition;
let wiringCentreDefinition: Definition;
let warnings: string[];
let infos: string[];
let debugs: string[];

const converterOf = (candidate: Definition, key: string): Tz.Converter => candidate.toZigbee.find((converter) => converter.key?.includes(key));
const setter = (key: string) => converterOf(definition, key);
const rawDefinition = (model: string) => salusDefinitions.find((candidate) => candidate.model === model);

// Bytes 0-47 of a 0x72 from a thermostat on factory settings (report counter 7, no PIN).
const FACTORY =
    "72 07 01 00 00 01 05 00 40 50 00 00 00 01 04 00 27 00 10 00 06 00 35 00 05 00 40 00 05 00 01 00 00 00 01 01 80 00 00 00 0d fe 00 00 00 00 01 00";

// Sets the report counter of a 0x72 and scrambles the PIN (0xFFFF = none) into bytes 40-41 with it, the way the thermostat does.
function withCounter(record: Buffer, counter: number, pin = 0xffff) {
    record[1] = counter;
    record[40] = ((pin >> 8) + 2 * counter) & 0xff;
    record[41] = ((pin & 0xff) - (counter >> 2)) & 0xff;
    return record;
}

function settingsRecord(changes: Record<number, number> = {}, counter = 7) {
    const record = Buffer.concat([hex(FACTORY), Buffer.alloc(27, 0xff), Buffer.alloc(2)]);
    for (const [index, value] of Object.entries(changes)) {
        record[Number(index)] = value;
    }
    return withCounter(record, counter);
}

// `mode` is byte 15: 4 heat, 3 cool. `setpoint` is bytes 9-10, the active setpoint of that mode, `schedule` bytes 11-12.
function statusRecord({hold = 2, temperature = [0x22, 0x50], mode = 4, setpoint = [0x21, 0x00], schedule = [0x19, 0x50]} = {}) {
    const record = Buffer.alloc(77);
    record[0] = 0x71;
    record[3] = hold;
    record.set(temperature, 4);
    record.set(setpoint, 9);
    record.set(schedule, 11);
    record[15] = mode;
    record[23] = 1;
    record[24] = 0x55;
    record[49] = 4;
    return record;
}

function convertersFor(candidate: Definition, type: string) {
    return candidate.fromZigbee.filter((converter) => converter.cluster === CLUSTER && ([] as unknown[]).concat(converter.type).includes(type));
}

function runConverters(candidate: Definition, device: Zh.Device, endpoint: Zh.Endpoint, type: string, data: unknown) {
    const msg = {type, cluster: CLUSTER, data, device, endpoint} as unknown as Fz.Message<typeof CLUSTER>;
    const converters = convertersFor(candidate, type);
    expect(converters.length, `no converter for ${type}`).toBeGreaterThan(0);
    return converters.map((converter) => converter.convert(candidate, msg, vi.fn(), {}, {} as Fz.Meta));
}

function merged(results: unknown[]) {
    const published = results.filter((result) => result !== undefined);
    return published.length ? Object.assign({}, ...published) : undefined;
}

const USER_BYTES = [2, 3, 4, 5, 6, 7, 8, 9, 42, 45];
const ADMIN_BYTES = [...Array.from({length: 30}, (_, index) => index + 10), 43, 46, 47];
let thermostats = 0;

// Answers like the real one: echoes every B-command, applies B11 and follows B74 with a 0x72.
class Thermostat {
    readonly ieee = `0x001e5e${String(++thermostats).padStart(10, "0")}`;
    readonly device: Zh.Device;
    readonly endpoint: Zh.Endpoint;
    counter: number;
    frames: string[] = [];
    handles: number[] = [];
    published: KeyValue[] = [];
    syncs: Buffer[] = [];
    wiringCentreAnswers: Buffer[] = [];
    failSync = false;
    silent = new Set<string>();
    reportsB74: "before" | "after" | "never" = "after";
    // While `hold` is set the 0x72 records stay on their way, as if the network delayed them, until `release` delivers one.
    hold = false;
    held: Buffer[] = [];

    constructor(
        public settings = settingsRecord(),
        public pin = 0xffff,
    ) {
        this.counter = settings[1] - 1;
        this.device = mockDevice(
            {modelID: "SQ610RFNH", manufacturerName: "SALUS", ieeeAddr: this.ieee, endpoints: [{ID: 9, inputClusterIDs: [0xfc00]}]},
            "EndDevice",
        );
        this.endpoint = this.device.getEndpoint(9);
        this.endpoint.deviceNetworkAddress = 0x1201;
        vi.spyOn(this.endpoint, "commandResponse").mockImplementation((cluster, command, fields) => {
            const payload = fields.payload as Buffer;
            if (command === "wiringCentreResponse") {
                this.wiringCentreAnswers.push(payload);
            } else if (command !== "syncResponse") {
                this.receive(payload);
            } else if (this.failSync) {
                return Promise.reject(new Error("no route"));
            } else {
                this.syncs.push(payload);
            }
            return Promise.resolve();
        });
    }

    // Runs the converters for a 0x31 frame the way zigbee2mqtt does and merges what they publish.
    publish(record: Buffer) {
        return merged(runConverters(definition, this.device, this.endpoint, "commandRecord", {payload: record}));
    }

    receive(payload: Buffer) {
        const code = payload.subarray(1, 4).toString("latin1");
        this.frames.push(payload.subarray(1).toString("hex"));
        this.handles.push(payload[0]);
        // "B74" is never echoed, "B74:2" only the second B74.
        if (this.silent.has(code) || this.silent.has(`${code}:${this.codes.filter((sent) => sent === code).length}`)) {
            return;
        }
        setImmediate(() => {
            if (code === "B74" && this.reportsB74 === "before") {
                this.report();
            }
            runConverters(definition, this.device, this.endpoint, "commandEcho", {payload});
            if (code === "B11") {
                this.store(payload.subarray(4));
            }
            if (code === "B74" && this.reportsB74 === "after") {
                setImmediate(() => this.report());
            }
        });
    }

    store(record: Buffer) {
        const admin = record[0] === 0x73;
        for (const index of admin ? [...USER_BYTES, ...ADMIN_BYTES] : USER_BYTES) {
            this.settings[index] = record[index];
        }
        if (admin) {
            this.pin = (((record[40] - 2 * record[1]) & 0xff) << 8) | ((record[41] + (record[1] >> 2)) & 0xff);
        }
    }

    report() {
        this.counter += 1;
        const record = withCounter(Buffer.from(this.settings), this.counter, this.pin);
        if (this.hold) {
            this.held.push(record);
        } else {
            this.published.push(this.publish(record));
        }
    }

    release(index: number) {
        this.published.push(this.publish(this.held[index]));
    }

    set(key: string, value: unknown) {
        return Promise.resolve(setter(key).convertSet(this.endpoint, key, value, {message: {[key]: value}} as unknown as Tz.Meta));
    }

    // Runs a /set message the way zigbee2mqtt does: the keys in the order they are written, and a converter that has several of them only
    // once, for the first. `lastState` is the state zigbee2mqtt holds for the device. Returns the state the converters publish.
    async send(message: KeyValue, lastState?: KeyValue) {
        const used = new Set<Tz.Converter>();
        const state: KeyValue = {};
        for (const [key, value] of Object.entries(message)) {
            const converter = setter(key);
            if (!used.has(converter)) {
                used.add(converter);
                const result = await converter.convertSet(this.endpoint, key, value, {message: {...message}, state: lastState} as unknown as Tz.Meta);
                Object.assign(state, result ? result.state : undefined);
            }
        }
        return state;
    }

    // The code of every frame received, e.g. B74, B11.
    get codes() {
        return this.frames.map((frame) => Buffer.from(frame.slice(0, 6), "hex").toString("latin1"));
    }

    // Record bytes 0-47 of the last B11 received.
    get written() {
        return Buffer.from(this.frames.filter((frame) => frame.startsWith("423131")).at(-1), "hex").subarray(3);
    }
}

// A thermostat that has sent a 0x71 with this byte 15 (none when undefined), and a 0x72 with these changes when given.
function reporting(mode: number | undefined, settings?: Record<number, number>) {
    const device = new Thermostat();
    if (mode !== undefined) {
        device.publish(statusRecord({mode}));
    }
    if (settings) {
        device.publish(settingsRecord(settings));
    }
    return device;
}

// The IEEE address that the stubbed device lookup gives the thermostat with this short address.
const ieeeOf = (short: number) => `0x001e5e${short.toString(16).padStart(10, "0")}`;
// The zone table it sends unprompted when it boots, as the payload of a 0x33 with handle 0. Zone 8 is free.
const ZONE_TABLE_AT_BOOT = "00423730000000000008120100120200120300120100120400120500120600ffff00ffff00ffff00ffff00ffff000000007eaaaaa8800000000078";
const AT_BOOT: Record<string, string | null> = {
    zone_1: ieeeOf(0x1201),
    zone_2: ieeeOf(0x1202),
    zone_3: ieeeOf(0x1203),
    zone_4: ieeeOf(0x1201),
    zone_5: ieeeOf(0x1204),
    zone_6: ieeeOf(0x1205),
    zone_7: "0x1206",
    zone_8: null,
};
// What the gateway sends to ask for the table: handle 1, B70 and its arguments.
const ZONE_TABLE_REQUEST = "014237307eaaaaa88000000078";
const SYNC_REQUEST = "ff 00 ff 22 03 18 20";
const ZONE_KEYS = Array.from({length: 8}, (_, index) => `zone_${index + 1}`);

// A frame as it is on air: frame control, manufacturer code 0x1078, sequence number, command and payload. The wiring centre sends frame
// control 0x15, which has the client-to-server bit, and the thermostat 0x1d, which has the server-to-client bit.
const frame = (frameControl: number, command: number, payload: string) =>
    Buffer.concat([Buffer.from([frameControl, 0x78, 0x10, 0x28, command]), hex(payload)]);

let wiringCentres = 0;

// A wiring centre with the placeholder short address 0x5678. It records what is sent to it as [command, payload in hex] and echoes every write.
class WiringCentre {
    readonly device: Zh.Device;
    readonly endpoint: Zh.Endpoint;
    sent: [string, string][] = [];
    failing = new Set<string>();

    constructor() {
        this.device = mockDevice(
            {
                modelID: undefined,
                manufacturerName: "Computime",
                ieeeAddr: `0x001e5f${String(++wiringCentres).padStart(10, "0")}`,
                endpoints: [{ID: 8, profileID: 260, inputClusterIDs: [0x0000, 0xfc00]}],
            },
            "Router",
        );
        this.endpoint = this.device.getEndpoint(8);
        this.endpoint.deviceNetworkAddress = 0x5678;
        vi.spyOn(this.endpoint, "commandResponse").mockImplementation((cluster, command, fields) => {
            const payload = fields.payload as Buffer;
            if (this.failing.has(command as string)) {
                return Promise.reject(new Error("no route"));
            }
            this.sent.push([command as string, payload.toString("hex")]);
            if (command === "write") {
                setImmediate(() => void received(this, "commandEcho", payload.toString("hex")));
            }
            return Promise.resolve();
        });
    }

    get commands() {
        return this.sent.map(([command]) => command);
    }
}

async function fromWiringCentre(centre: WiringCentre, type: string, data: unknown, device: Zh.Device = centre.device) {
    const results = [];
    for (const result of runConverters(wiringCentreDefinition, device, centre.endpoint, type, data)) {
        results.push(await result);
    }
    return merged(results);
}

const received = (centre: WiringCentre, type: string, payload: string) => fromWiringCentre(centre, type, {payload: hex(payload)});

async function greetedWiringCentre() {
    const centre = new WiringCentre();
    await received(centre, "commandSyncRequest", SYNC_REQUEST);
    return centre;
}

// A zone table as the wiring centre sends it: the short addresses of the thermostats by zone, null for a free zone.
function zoneTable(shorts: (number | null)[]) {
    const table = hex(ZONE_TABLE_AT_BOOT);
    table[0] = 0x8a;
    for (const [index, short] of shorts.entries()) {
        table.writeUInt16BE(short ?? 0xffff, 10 + 3 * index);
    }
    return table.toString("hex");
}

const NO_ZONES: null[] = Array(8).fill(null);
const zonesWith = (short: number, zones: number[]) => NO_ZONES.map((_, index) => (zones.includes(index + 1) ? short : null));

// The reset form of B47 that a replace sends first: 00 11, ff ff ff ff, fd, then zeros.
const RESET_FRAME = `423437 0011 ffff ffff fd ${"00".repeat(26)}`.replaceAll(" ", "");

// B47 for the wiring centre 0x5678 (78 56): the code, 00 11, the wiring centre number 1, its short address, fe, the replace flag, one flag per
// zone and 17 zeros.
function pairFrame(zones: number[], {replace = 0, short = "7856"} = {}) {
    const flags = Array.from({length: 8}, (_, index) => (zones.includes(index + 1) ? "01" : "00")).join("");
    return `423437 0011 0100 ${short} fe 0${replace} ${flags} ${"00".repeat(17)}`.replaceAll(" ", "");
}

// A thermostat sends 0x16 with this payload; returns the 0x86 payloads it was sent back, in hex.
async function asksForWiringCentre(device: Thermostat, payload: string) {
    const before = device.wiringCentreAnswers.length;
    await Promise.all(runConverters(definition, device.device, device.endpoint, "commandWiringCentreRequest", {payload: hex(payload)}));
    return device.wiringCentreAnswers.slice(before).map((answer) => answer.toString("hex"));
}

// The custom clusters that herdsman holds for a device of this definition once its extends have added them.
async function customClustersOf(candidate: Definition, device: Zh.Device) {
    await candidate.configure?.(device, device.endpoints[0], candidate);
    return device.customClusters;
}

// A device as herdsman's definition lookup reads it: by default a router with endpoint 8 on the home automation profile.
function lookupDevice(args: {manufacturerName?: string; modelID?: string; type?: DeviceType}, endpoints: [number, number][] = [[8, 0x0104]]) {
    return mockDevice(
        {
            modelID: args.modelID,
            manufacturerName: args.manufacturerName,
            endpoints: endpoints.map(([id, profileID]) => ({ID: id, profileID, inputClusterIDs: [0x0000, 0xfc00]})),
        },
        args.type ?? "Router",
    );
}

async function inTimeZone<T>(zone: string, run: () => T | Promise<T>) {
    const before = process.env.TZ;
    process.env.TZ = zone;
    try {
        return await run();
    } finally {
        process.env.TZ = before;
    }
}

// The sync response a thermostat gets from a status record at `at`.
function syncAt(at: number) {
    vi.useFakeTimers({toFake: ["Date"]});
    try {
        vi.setSystemTime(at);
        const device = new Thermostat();
        device.publish(statusRecord());
        return device.syncs[0];
    } finally {
        vi.useRealTimers();
    }
}

// 2026-06-10 12:00 in Copenhagen, far from a summer time change.
const SUMMER_NOON = Date.UTC(2026, 5, 10, 10, 0, 0);
const HOUR = 60 * 60 * 1000;

describe("Salus Controls iT600", () => {
    const originalTimeZone = process.env.TZ;
    let parser: Thermostat;

    beforeAll(async () => {
        // The sync response carries the host's local time; the expected clocks below are Copenhagen's.
        process.env.TZ = "Europe/Copenhagen";
        definition = await findByDevice(new Thermostat().device);
        wiringCentreDefinition = await findByDevice(new WiringCentre().device);
    });

    afterAll(() => {
        if (originalTimeZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = originalTimeZone;
        }
    });

    beforeEach(() => {
        globalStore.clear();
        warnings = [];
        infos = [];
        debugs = [];
        vi.spyOn(logger, "warning").mockImplementation((message) => {
            warnings.push(String(message));
        });
        vi.spyOn(logger, "info").mockImplementation((message) => {
            infos.push(String(message));
        });
        vi.spyOn(logger, "debug").mockImplementation((message) => {
            debugs.push(typeof message === "function" ? message() : message);
        });
        parser = new Thermostat();
    });

    describe("SQ610RFNH", () => {
        it("the record helper reproduces the real counter and PIN bytes", () => {
            expect(settingsRecord().subarray(0, 48).toString("hex")).toBe(hex(FACTORY).toString("hex"));
            const real = {1: "01ff", 2: "03ff", 3: "05ff", 4: "07fe", 5: "09fe", 6: "0bfe", 7: "0dfe"};
            for (const [counter, bytes] of Object.entries(real)) {
                expect(settingsRecord({}, Number(counter)).subarray(40, 42).toString("hex")).toBe(bytes);
            }
        });

        it("registers the manufacturer cluster with the Computime code and the gateway identity on genBasic", async () => {
            const thermostat = new Thermostat();
            const clusters = await customClustersOf(definition, thermostat.device);
            const cluster = clusters.manuSpecificSalusIt600;
            const ids = (commands: typeof cluster.commands) =>
                Object.fromEntries(Object.entries(commands).map(([name, command]) => [name, command.ID]));
            expect(cluster.ID).toBe(0xfc00);
            expect(cluster.manufacturerCode).toBe(0x1078);
            // The thermostat and the coordinator set the server-to-client bit, so their commands are command responses.
            expect(ids(cluster.commandsResponse)).toStrictEqual({
                syncRequest: 0x10,
                echo: 0x33,
                syncAck: 0x37,
                replacedThermostat: 0x1a,
                wiringCentreRequest: 0x16,
                record: 0x31,
                write: 0x32,
                syncResponse: 0x81,
                wiringCentreResponse: 0x86,
            });
            // The wiring centre sets the client-to-server bit, so what it and the thermostat send to the coordinator is also a command.
            expect(ids(cluster.commands)).toStrictEqual({
                syncRequest: 0x10,
                echo: 0x33,
                syncAck: 0x37,
                replacedThermostat: 0x1a,
                wiringCentreRequest: 0x16,
                pairButton: 0xa9,
            });
            expect(clusters.genBasic.attributes).toMatchObject({
                manufacturerName: {ID: 0x0004, default: "Computime"},
                modelId: {ID: 0x0005, default: "SAU2AG1"},
            });
        });

        it("a real 0x72 publishes the settings", () => {
            expect(parser.publish(settingsRecord())).toStrictEqual({
                frost_setpoint: 5,
                temperature_offset: 0,
                heat_control: "itlc_ufh",
                min_heat_setpoint: 5,
                max_heat_setpoint: 35,
                min_cool_setpoint: 5,
                max_cool_setpoint: 40,
                display_resolution: 0.5,
            });
        });

        it("the temperature offset decodes as signed BCD", () => {
            const offsets: [number[], number][] = [
                [[0x00, 0x50], 0.5],
                [[0x80, 0x50], -0.5],
                [[0x00, 0x00], 0],
                [[0x80, 0x00], 0],
                [[0x03, 0x00], 3],
                [[0x83, 0x00], -3],
                [[0x83, 0x50], -3.5],
            ];
            for (const [bytes, expected] of offsets) {
                expect(parser.publish(settingsRecord({3: bytes[0], 4: bytes[1]})).temperature_offset).toBe(expected);
            }
        });

        it("heat control codes map to names and unknown codes stay unpublished", () => {
            const names = ["itlc_ufh", "itlc_rad", "itlc_elect", "span_0.25", "span_0.5", "thb_actuator"];
            for (const [code, name] of names.entries()) {
                expect(parser.publish(settingsRecord({12: code})).heat_control).toBe(name);
            }
            expect(parser.publish(settingsRecord({12: 6}))).not.toHaveProperty("heat_control");
        });

        it("display resolution and setpoint limits come from their bytes", () => {
            const published = parser.publish(settingsRecord({11: 1, 22: 0x25, 24: 0x15, 26: 0x30, 28: 0x10}));
            expect(published.display_resolution).toBe(0.1);
            expect(published.max_heat_setpoint).toBe(25);
            expect(published.min_heat_setpoint).toBe(15);
            expect(published.max_cool_setpoint).toBe(30);
            expect(published.min_cool_setpoint).toBe(10);
        });

        it("a short 0x72 is ignored, so it does not answer the B74 of a write", async () => {
            const device = new Thermostat();
            device.reportsB74 = "never";
            let done = false;
            const write = device.set("frost_setpoint", 7).then(() => {
                done = true;
            });
            await settled();
            expect(device.publish(settingsRecord().subarray(0, 47))).toBeUndefined();
            await settled();
            expect(done).toBe(false);
            expect(device.codes).toStrictEqual(["B74"]);
            device.report();
            await write;
            expect(device.codes).toStrictEqual(["B74", "B11", "B74"]);
        });

        it("a status record keeps its fields", () => {
            const expected = {
                local_temperature: 22.5,
                current_heating_setpoint: 21,
                schedule_setpoint: 19.5,
                system_mode: "heat",
                hold_type: "permanent_hold",
                preset: "permanent_hold",
                running_state: "idle",
                child_lock: "LOCK",
                humidity: 55,
                battery: 75,
            };
            expect(parser.publish(statusRecord())).toStrictEqual(expected);
            const {preset, ...standby} = {...expected, system_mode: "off", hold_type: "standby"};
            expect(parser.publish(statusRecord({hold: 7}))).toStrictEqual(standby);
        });

        it("a status record with the temperature 12.34 keeps everything but the temperature", () => {
            const published = parser.publish(statusRecord({temperature: [0x12, 0x34]}));
            expect(published).not.toHaveProperty("local_temperature");
            expect(published).toStrictEqual({
                current_heating_setpoint: 21,
                schedule_setpoint: 19.5,
                system_mode: "heat",
                hold_type: "permanent_hold",
                preset: "permanent_hold",
                running_state: "idle",
                child_lock: "LOCK",
                humidity: 55,
                battery: 75,
            });
            expect(parser.publish(statusRecord({temperature: [0x12, 0x35]})).local_temperature).toBe(12.35);
        });

        it("the system mode comes from byte 15, and standby is off in either mode", () => {
            expect(parser.publish(statusRecord({mode: 4})).system_mode).toBe("heat");
            expect(parser.publish(statusRecord({mode: 3})).system_mode).toBe("cool");
            for (const mode of [4, 3, 0]) {
                expect(parser.publish(statusRecord({hold: 7, mode})).system_mode).toBe("off");
            }
        });

        it("an unknown system mode leaves only the mode unpublished", () => {
            for (const mode of [0, 1, 2, 5, 255]) {
                const published = parser.publish(statusRecord({mode}));
                expect(published, `mode ${mode}`).not.toHaveProperty("system_mode");
                expect(published.current_heating_setpoint, `mode ${mode}`).toBe(21);
                expect(published.hold_type).toBe("permanent_hold");
            }
        });

        it("bytes 9 and 10 are the one setpoint whatever the system mode, and no cooling setpoint is published next to it", () => {
            const states = [
                {mode: 4, hold: 2},
                {mode: 3, hold: 2},
                {mode: 0, hold: 2},
                {mode: 4, hold: 7},
                {mode: 3, hold: 7},
            ];
            for (const {mode, hold} of states) {
                const published = parser.publish(statusRecord({mode, hold, setpoint: [0x19, 0x50]}));
                expect(published.current_heating_setpoint, `mode ${mode} hold ${hold}`).toBe(19.5);
                expect(Object.keys(published).filter((key) => key.endsWith("_setpoint"))).toStrictEqual([
                    "current_heating_setpoint",
                    "schedule_setpoint",
                ]);
                expect(published.schedule_setpoint, `mode ${mode} hold ${hold}`).toBe(19.5);
            }
        });

        it("the hold type is published as hold_type and as the preset, with standby having no preset", () => {
            const cases: [number, string, string | undefined][] = [
                [0, "schedule", "schedule"],
                [1, "temporary_hold", "schedule"],
                [2, "permanent_hold", "permanent_hold"],
                [6, "away", "away"],
                [7, "standby", undefined],
            ];
            for (const [hold, holdType, preset] of cases) {
                const published = parser.publish(statusRecord({hold}));
                expect(published.hold_type).toBe(holdType);
                expect(published.preset).toBe(preset);
                expect("preset" in published).toBe(preset !== undefined);
            }
        });

        it("the schedule setpoint is bytes 11 and 12 of the status record, whatever the hold type and the setpoint", () => {
            for (const hold of [0, 1, 2, 6, 7]) {
                const published = parser.publish(statusRecord({hold, setpoint: [0x28, 0x00], schedule: [0x20, 0x50]}));
                expect(published.schedule_setpoint, `hold ${hold}`).toBe(20.5);
                expect(published.current_heating_setpoint, `hold ${hold}`).toBe(28);
            }
        });

        it("hold type codes outside the table are left unpublished, including 10 (eco)", () => {
            for (const hold of [3, 4, 10, 255]) {
                const published = parser.publish(statusRecord({hold}));
                expect(published, `hold ${hold}`).not.toHaveProperty("hold_type");
                expect(published, `hold ${hold}`).not.toHaveProperty("preset");
                expect(published.system_mode).toBe("heat");
            }
        });

        describe("clock sync", () => {
            const localClock = (payload: Buffer) => new Date((payload.readUInt32LE(2) + 946684800) * 1000).toISOString().slice(11, 16);

            beforeEach(() => {
                vi.useFakeTimers({toFake: ["Date"]});
            });

            afterEach(() => {
                vi.useRealTimers();
            });

            it("a status record syncs the clock once, then again after a day", () => {
                vi.setSystemTime(SUMMER_NOON);
                const device = new Thermostat();
                device.publish(settingsRecord());
                expect(device.syncs.length).toBe(0);
                device.publish(statusRecord());
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
                vi.setSystemTime(SUMMER_NOON + HOUR);
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
                vi.setSystemTime(SUMMER_NOON + 24 * HOUR);
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
                vi.setSystemTime(SUMMER_NOON + 24 * HOUR + 1);
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(2);
                expect(device.syncs[1].readUInt32LE(2) + 946684800).toBe(Date.UTC(2026, 5, 11, 12, 0, 0) / 1000);
            });

            it("the sync response is the one the Salus gateway sends", () => {
                // The gateway's frame from PROTOCOL.md section 4.2, 2026-10-15 20:44:26 CEST.
                vi.setSystemTime(Date.UTC(2026, 9, 15, 18, 44, 26));
                const device = new Thermostat();
                device.publish(statusRecord());
                expect(device.syncs[0].toString("hex")).toBe(hex("20 00 aa f7 63 32 03 0e 01 ff ff ff ff 31 00").toString("hex"));
            });

            it("the sync response follows the time zone of the host: clock, summer time flag, gateway time zone index and summer time hours", async () => {
                const winter = Date.UTC(2026, 0, 15, 12, 0, 0);
                // [zone, instant, summer time flag, index in the gateway's table, summer time offset in hours, local hours ahead of UTC]
                const zones: [string, number, number, number, number, number][] = [
                    ["Europe/Copenhagen", winter, 0, 14, 1, 1],
                    ["Europe/Copenhagen", SUMMER_NOON, 1, 14, 1, 2],
                    ["Europe/London", winter, 0, 13, 1, 0],
                    ["Europe/London", SUMMER_NOON, 1, 13, 1, 1],
                    ["UTC", SUMMER_NOON, 0, 13, 0, 0],
                    ["Asia/Tokyo", SUMMER_NOON, 0, 22, 0, 9],
                    ["America/New_York", winter, 0, 8, 1, -5],
                    ["America/New_York", SUMMER_NOON, 1, 8, 1, -4],
                    ["Pacific/Honolulu", SUMMER_NOON, 0, 3, 0, -10],
                    // Southern summer time is in January.
                    ["Australia/Sydney", winter, 1, 23, 1, 11],
                    ["Australia/Sydney", SUMMER_NOON, 0, 23, 1, 10],
                    ["Pacific/Auckland", winter, 1, 25, 1, 13],
                    ["Pacific/Kiritimati", SUMMER_NOON, 0, 27, 0, 14],
                    // Zones with minutes in their offset are in the second part of the table.
                    ["Asia/Kolkata", SUMMER_NOON, 0, 34, 0, 5.5],
                    ["Asia/Kathmandu", SUMMER_NOON, 0, 35, 0, 5.75],
                    ["America/St_Johns", SUMMER_NOON, 1, 30, 1, -2.5],
                    ["Pacific/Chatham", winter, 1, 41, 1, 13.75],
                    // Summer time of half an hour is signalled as one hour.
                    ["Australia/Lord_Howe", winter, 1, 39, 1, 11],
                ];
                for (const [zone, instant, dst, index, dstHours, hours] of zones) {
                    await inTimeZone(zone, () => {
                        const payload = syncAt(instant);
                        expect([...payload.subarray(6, 9)], `${zone} ${new Date(instant).toISOString()}`).toStrictEqual([
                            0x02 | dst,
                            index,
                            dstHours,
                        ]);
                        expect(payload.readUInt32LE(2) + 946684800, `${zone} clock`).toBe(instant / 1000 + hours * 3600);
                    });
                }
            });

            it("an offset that the gateway's table lacks gets the nearest index, with one warning", async () => {
                // North Korea was UTC+8:30 from 2015 to 2018, between the table's +8:00 and +8:45.
                const at = Date.UTC(2016, 5, 1, 0, 0, 0);
                await inTimeZone("Asia/Pyongyang", () => {
                    const [first, second] = [syncAt(at), syncAt(at + 60000)];
                    expect([...first.subarray(6, 9)]).toStrictEqual([0x02, 37, 0]);
                    expect([...second.subarray(6, 9)]).toStrictEqual([0x02, 37, 0]);
                    expect(first.readUInt32LE(2) + 946684800).toBe(at / 1000 + 8.5 * 3600);
                    expect(warnings.length).toBe(1);
                    expect(warnings[0]).toMatch(/Asia\/Pyongyang.*30600 s.*lacks.*index 37 \(31500 s\)/);
                });
            });

            it("zigbee2mqtt starting on a host in UTC or in a zone without a region gets one warning that TZ is not set", async () => {
                const start = {type: "start", data: {device: parser.device}} as unknown as OnEvent.Event;
                const wiringCentreStart = {type: "start", data: {device: new WiringCentre().device}} as unknown as OnEvent.Event;
                await definition.onEvent(start);
                await wiringCentreDefinition.onEvent(wiringCentreStart);
                expect(warnings.length).toBe(0);
                await inTimeZone("UTC", async () => {
                    await definition.onEvent(start);
                    await wiringCentreDefinition.onEvent(wiringCentreStart);
                    await definition.onEvent(start);
                });
                expect(warnings.length).toBe(1);
                expect(warnings[0]).toMatch(/time zone of the host is UTC.*Set TZ.*TZ=Europe\/Copenhagen/);
                await inTimeZone("Etc/GMT-2", () => definition.onEvent(start));
                expect(warnings.length).toBe(2);
                expect(warnings[1]).toMatch(/time zone of the host is Etc\/GMT-2/);
                await inTimeZone("Europe/London", () => definition.onEvent(start));
                expect(warnings.length).toBe(2);
            });

            it("a sync after the join counts, so the next status record does not repeat it", async () => {
                const device = new Thermostat();
                const event = {type: "deviceAnnounce", data: {device: device.device}} as unknown as OnEvent.Event;
                await definition.onEvent(event);
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
            });

            it("a status record syncs the clock again when summer time starts or ends", () => {
                const changes = [
                    {at: Date.UTC(2026, 2, 29, 1, 0, 0), before: 0, after: 1, first: "01:00", second: "03:01"},
                    {at: Date.UTC(2026, 9, 25, 1, 0, 0), before: 1, after: 0, first: "02:00", second: "02:01"},
                ];
                for (const {at, before, after, first: firstClock, second: secondClock} of changes) {
                    vi.setSystemTime(at - HOUR);
                    const device = new Thermostat();
                    device.publish(statusRecord());
                    vi.setSystemTime(at - HOUR / 2);
                    device.publish(statusRecord());
                    expect(device.syncs.length).toBe(1);
                    vi.setSystemTime(at + 60 * 1000);
                    device.publish(statusRecord());
                    expect(device.syncs.length).toBe(2);
                    const [first, second] = device.syncs;
                    expect(first[6] & 0x01).toBe(before);
                    expect(second[6] & 0x01).toBe(after);
                    expect(localClock(first)).toBe(firstClock);
                    expect(localClock(second)).toBe(secondClock);
                }
            });

            it("a sync that fails is tried again with the next status record", async () => {
                const device = new Thermostat();
                device.failSync = true;
                device.publish(statusRecord());
                await settle();
                expect(warnings.at(-1)).toMatch(/Sync response to 0x[0-9a-f]+ failed \(no route\)/);
                device.failSync = false;
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
            });

            it("the stop event drops the thermostat's state", async () => {
                const device = new Thermostat();
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(1);
                await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
                device.publish(statusRecord());
                expect(device.syncs.length).toBe(2);
            });
        });

        describe("settings writes", () => {
            // The B11 commands a real thermostat accepted.
            const PROVEN_WRITES: [string, number | string, string][] = [
                ["frost_setpoint", 7, "4231317201010000010700405000000001040027001000060035000500400005000100000001018000000001ff000000000100"],
                ["temperature_offset", 0.5, "4231317201010050010500405000000001040027001000060035000500400005000100000001018000000001ff000000000100"],
                [
                    "temperature_offset",
                    -0.5,
                    "4231317201018050010500405000000001040027001000060035000500400005000100000001018000000001ff000000000100",
                ],
                [
                    "heat_control",
                    "itlc_rad",
                    "4231317301010000010500405000000101040027001000060035000500400005000100000001018000000001ff000000000100",
                ],
                [
                    "heat_control",
                    "thb_actuator",
                    "4231317301010000010500405000000501040027001000060035000500400005000100000001018000000001ff000000000100",
                ],
            ];

            it("the B11 write equals the proven command whatever the thermostat's counter is", async () => {
                for (const [key, value, expected] of PROVEN_WRITES) {
                    for (let counter = 1; counter <= 7; counter++) {
                        const device = new Thermostat(settingsRecord({}, counter));
                        await device.set(key, value);
                        expect(device.frames[1], `${key} ${value} with counter ${counter}`).toBe(expected);
                        expect(device.pin).toBe(0xffff);
                    }
                }
            });

            it("setpoints and offsets are rounded to 0.5 and encoded as BCD", async () => {
                const written = async (key: string, value: number | string) => {
                    const device = new Thermostat();
                    await device.set(key, value);
                    return device.written;
                };
                expect((await written("frost_setpoint", 7.3)).subarray(6, 8).toString("hex")).toBe("0750");
                expect((await written("frost_setpoint", "12")).subarray(6, 8).toString("hex")).toBe("1200");
                expect((await written("frost_setpoint", 35)).subarray(6, 8).toString("hex")).toBe("3500");
                expect((await written("temperature_offset", -0.2)).subarray(3, 5).toString("hex")).toBe("0000");
                expect((await written("temperature_offset", 3)).subarray(3, 5).toString("hex")).toBe("0300");
                expect((await written("temperature_offset", -3)).subarray(3, 5).toString("hex")).toBe("8300");
                expect((await written("temperature_offset", 3.5)).subarray(3, 5).toString("hex")).toBe("0350");
                expect((await written("temperature_offset", -3.5)).subarray(3, 5).toString("hex")).toBe("8350");
            });

            // The admin settings are written with 's' (0x73), and the thermostat applies them as the user settings.
            it("display_resolution, min_heat_setpoint and max_heat_setpoint are written with B11 's', each into its own bytes of the record", async () => {
                const written = async (key: string, value: number | string, settings?: Record<number, number>) => {
                    const device = new Thermostat(settingsRecord(settings));
                    await device.set(key, value);
                    await settle();
                    return device;
                };
                let device = await written("display_resolution", 0.1);
                expect([device.written[0], device.written[11]]).toStrictEqual([0x73, 1]);
                expect(device.published.at(-1).display_resolution).toBe(0.1);
                device = await written("display_resolution", "0.5", {11: 1});
                expect([device.written[0], device.written[11]]).toStrictEqual([0x73, 0]);
                expect(device.published.at(-1).display_resolution).toBe(0.5);

                device = await written("max_heat_setpoint", 25.3);
                expect([device.written[0], device.written.subarray(22, 24).toString("hex")]).toStrictEqual([0x73, "2550"]);
                expect(device.published.at(-1).max_heat_setpoint).toBe(25.5);
                expect(device.written.subarray(24, 26).toString("hex")).toBe("0500");
                device = await written("min_heat_setpoint", 15);
                expect([device.written[0], device.written.subarray(24, 26).toString("hex")]).toStrictEqual([0x73, "1500"]);
                expect(device.published.at(-1).min_heat_setpoint).toBe(15);
                expect(device.written.subarray(22, 24).toString("hex")).toBe("3500");
                expect(device.written[12]).toBe(0);
            });

            it("the heating setpoint limits stay 0.5 apart, and display_resolution takes 0.1 or 0.5 only", async () => {
                const cases: [string, number | string, Record<number, number>, RegExp, string[]][] = [
                    ["min_heat_setpoint", 35, {}, /min_heat_setpoint must be at most 34.5 .*got 35/, ["B74"]],
                    ["min_heat_setpoint", 4.5, {}, /min_heat_setpoint must be between 5 and 39.5, got 4.5/, []],
                    ["min_heat_setpoint", 40, {}, /min_heat_setpoint must be between 5 and 39.5, got 40/, []],
                    ["min_heat_setpoint", 25, {22: 0x25}, /min_heat_setpoint must be at most 24.5 .*got 25/, ["B74"]],
                    ["max_heat_setpoint", 5, {}, /max_heat_setpoint must be between 5.5 and 40, got 5/, []],
                    ["max_heat_setpoint", 40.5, {}, /max_heat_setpoint must be between 5.5 and 40, got 40.5/, []],
                    ["max_heat_setpoint", 15, {24: 0x15}, /max_heat_setpoint must be at least 15.5 .*got 15/, ["B74"]],
                    ["display_resolution", 0.2, {}, /display_resolution must be 0.1 or 0.5, got 0.2/, []],
                    ["display_resolution", 1, {}, /display_resolution must be 0.1 or 0.5, got 1/, []],
                    ["display_resolution", "fine", {}, /'display_resolution' is not a number/, []],
                ];
                for (const [key, value, settings, error, codes] of cases) {
                    const device = new Thermostat(settingsRecord(settings));
                    await expect(device.set(key, value), `${key} ${value}`).rejects.toThrow(error);
                    expect(device.codes, `${key} ${value}`).toStrictEqual(codes);
                }
                const device = new Thermostat();
                await device.set("min_heat_setpoint", 34.5);
                await device.set("max_heat_setpoint", 35);
                await device.set("max_heat_setpoint", 35);
                expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B74", "B11", "B74", "B74", "B11", "B74"]);
            });

            it("the heating setpoint limits and the display resolution are refused for a thermostat with a PIN", async () => {
                const device = new Thermostat(settingsRecord(), 0x1234);
                for (const [key, value] of [
                    ["display_resolution", 0.1],
                    ["min_heat_setpoint", 15],
                    ["max_heat_setpoint", 25],
                ]) {
                    await expect(device.set(key as string, value)).rejects.toThrow(/PIN/);
                }
                expect(device.codes).toStrictEqual(["B74", "B74", "B74"]);
            });

            it("values outside the ranges are refused before anything is sent", async () => {
                const refused: [string, number | string][] = [
                    ["frost_setpoint", 4.5],
                    ["frost_setpoint", 35.5],
                    ["temperature_offset", 4],
                    ["temperature_offset", -4],
                    ["heat_control", "span_1.0"],
                ];
                for (const [key, value] of refused) {
                    const device = new Thermostat();
                    await expect(device.set(key, value)).rejects.toThrow(/must be/);
                    expect(device.frames).toStrictEqual([]);
                }
            });

            it("a thermostat with a PIN is not written, including the PIN 0000", async () => {
                for (const pin of [0x1234, 0x0000, 0xff00, 0x00ff]) {
                    const device = new Thermostat(settingsRecord(), pin);
                    await expect(device.set("frost_setpoint", 7)).rejects.toThrow(/PIN/);
                    await expect(device.set("heat_control", "itlc_rad")).rejects.toThrow(/PIN/);
                    expect(device.codes).toStrictEqual(["B74", "B74"]);
                }
            });

            it("a write asks for the settings first, then writes them, then asks again", async () => {
                const device = new Thermostat();
                await device.set("frost_setpoint", 7);
                await settle();
                expect(device.codes).toStrictEqual(["B74", "B11", "B74"]);
                expect(device.published.length).toBe(2);
                expect(device.published[0].frost_setpoint).toBe(5);
                expect(device.published[1].frost_setpoint).toBe(7);
            });

            it("the setters do not publish anything themselves", async () => {
                const device = new Thermostat();
                expect(await device.set("temperature_offset", 0.5)).toBeUndefined();
            });

            it("writes at the same time do not undo each other", async () => {
                const device = new Thermostat();
                await Promise.all([device.set("frost_setpoint", 7), device.set("temperature_offset", 0.5), device.set("heat_control", "itlc_rad")]);
                await settle();
                expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B74", "B11", "B74", "B74", "B11", "B74"]);
                expect(device.published.at(-1)).toStrictEqual({
                    frost_setpoint: 7,
                    temperature_offset: 0.5,
                    heat_control: "itlc_rad",
                    min_heat_setpoint: 5,
                    max_heat_setpoint: 35,
                    min_cool_setpoint: 5,
                    max_cool_setpoint: 40,
                    display_resolution: 0.5,
                });
            });

            it("a 0x72 that arrives late does not take back a newer write", async () => {
                const device = new Thermostat();
                device.hold = true;
                device.report();
                device.hold = false;
                await device.set("frost_setpoint", 7);
                await device.set("temperature_offset", 0.5);
                await settle();
                expect(device.held[0].subarray(3, 5).toString("hex")).toBe("0000");
                expect(device.held[0].subarray(6, 8).toString("hex")).toBe("0500");
                device.release(0);
                await device.set("heat_control", "itlc_rad");
                expect(device.written.subarray(3, 5).toString("hex")).toBe("0050");
                expect(device.written.subarray(6, 8).toString("hex")).toBe("0700");
                expect(device.written[12]).toBe(1);
            });

            it("a change made at the thermostat right after a write is not overwritten by the next write", async () => {
                const device = new Thermostat();
                await device.set("frost_setpoint", 7);
                await settle();
                device.settings[3] = 0x01;
                device.report();
                await device.set("heat_control", "itlc_rad");
                expect(device.written.subarray(3, 5).toString("hex")).toBe("0100");
                expect(device.written.subarray(6, 8).toString("hex")).toBe("0700");
                expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B74", "B11", "B74"]);
            });

            it("nine writes in a row keep the thermostat at no PIN", async () => {
                const device = new Thermostat();
                for (let write = 0; write < 9; write++) {
                    await device.set("heat_control", write % 2 ? "itlc_ufh" : "itlc_rad");
                    await settle();
                    expect(device.pin).toBe(0xffff);
                    expect([device.written[1], device.written[40], device.written[41]]).toStrictEqual([0x01, 0x01, 0xff]);
                }
            });

            describe("timeouts", () => {
                fakeTimeouts();

                it("a 0x72 that arrives before the B74 echo is not missed", async () => {
                    const device = new Thermostat();
                    device.reportsB74 = "before";
                    const write = device.set("frost_setpoint", 7);
                    await settled();
                    vi.advanceTimersByTime(30000);
                    await write;
                    expect(device.codes).toStrictEqual(["B74", "B11", "B74"]);
                });

                it("a missing echo fails the write after 30 s, and the next write goes through", async () => {
                    const device = new Thermostat();
                    device.silent.add("B11");
                    let done = false;
                    const write = device.set("frost_setpoint", 7);
                    const failed = expect(write).rejects.toThrow(/No B11 echo from 0x[0-9a-f]+ within 30000 ms/);
                    write.then(
                        () => {
                            done = true;
                        },
                        () => {
                            done = true;
                        },
                    );
                    await settled();
                    vi.advanceTimersByTime(29999);
                    await settle();
                    expect(done).toBe(false);
                    vi.advanceTimersByTime(1);
                    await failed;

                    device.silent.clear();
                    await device.set("frost_setpoint", 7);
                    expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B11", "B74"]);
                });

                it("after a write without an echo the next write is built on what the thermostat reports", async () => {
                    const device = new Thermostat();
                    await device.set("frost_setpoint", 7);
                    await settle();
                    device.silent.add("B11");
                    const failed = expect(device.set("frost_setpoint", 8)).rejects.toThrow(/No B11 echo/);
                    await settled();
                    vi.advanceTimersByTime(30000);
                    await failed;
                    device.silent.clear();
                    await device.set("temperature_offset", 0.5);
                    expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B74", "B11", "B74", "B11", "B74"]);
                    expect(device.written.subarray(3, 8).toString("hex")).toBe("0050010700");
                });

                it("without a 0x72 within 30 s of B74 the write fails and nothing is written", async () => {
                    const device = new Thermostat();
                    device.reportsB74 = "never";
                    const failed = expect(device.set("frost_setpoint", 7)).rejects.toThrow(
                        /No settings record \(0x72\) from 0x[0-9a-f]+ within 30000 ms after B74/,
                    );
                    await settle();
                    vi.advanceTimersByTime(30000);
                    await failed;
                    expect(device.codes).toStrictEqual(["B74"]);
                });

                it("a write fails when the B74 before it is not echoed, and nothing is written", async () => {
                    const device = new Thermostat();
                    device.silent.add("B74");
                    const failed = expect(device.set("frost_setpoint", 7)).rejects.toThrow(/No B74 echo from 0x[0-9a-f]+ within 30000 ms/);
                    await settled();
                    vi.advanceTimersByTime(30000);
                    await failed;
                    expect(device.codes).toStrictEqual(["B74"]);
                });

                it("a B74 that is never echoed after the write only logs a warning", async () => {
                    const device = new Thermostat();
                    device.silent.add("B74:2");
                    let done = false;
                    const write = (async () => {
                        await device.set("frost_setpoint", 7);
                        done = true;
                    })();
                    await settled();
                    expect(done).toBe(false);
                    vi.advanceTimersByTime(30000);
                    await write;
                    expect(warnings.at(-1)).toMatch(/Settings request to 0x[0-9a-f]+ failed \(No B74 echo/);
                    expect(device.settings[6]).toBe(0x07);
                });
            });
        });

        // The frames below are '<B-code><arguments>' in hex without the handle: B20 is 423230, B33 is 423333, B34 is 423334 and B48 is 423438.

        describe("system mode and setpoint", () => {
            it("system mode off is B20 07, heat is B20 02 then B48 04 and cool is B20 02 then B48 03", async () => {
                const expected = {off: ["42323007"], heat: ["42323002", "42343804"], cool: ["42323002", "42343803"]};
                for (const [mode, frames] of Object.entries(expected)) {
                    const device = new Thermostat();
                    expect(await device.send({system_mode: mode})).toStrictEqual({system_mode: mode});
                    expect(device.frames).toStrictEqual(frames);
                }
            });

            it("a system mode other than off, heat and cool is refused before anything is sent", async () => {
                for (const mode of ["auto", "dry", "fan_only", "", null]) {
                    const device = new Thermostat();
                    await expect(device.send({system_mode: mode})).rejects.toThrow(/system_mode must be off, heat or cool/);
                    expect(device.frames).toStrictEqual([]);
                }
            });

            it("the setpoint is B33 when byte 15 of the last 0x71 is 3 and B34 otherwise, rounded to 0.5", async () => {
                // 30 is the proven B33 5c: the byte is the setpoint over 0.5, plus 0x20.
                const cases = [
                    {mode: 3, command: "423333", value: 30, byte: "5c", setpoint: 30},
                    {mode: 3, command: "423333", value: 21.3, byte: "4b", setpoint: 21.5},
                    {mode: 3, command: "423333", value: "25", byte: "52", setpoint: 25},
                    {mode: 3, command: "423333", value: 40, byte: "70", setpoint: 40},
                    {mode: 4, command: "423334", value: 21, byte: "4a", setpoint: 21},
                    {mode: 4, command: "423334", value: 5, byte: "2a", setpoint: 5},
                    {mode: 4, command: "423334", value: 35, byte: "66", setpoint: 35},
                    {mode: 0, command: "423334", value: 21, byte: "4a", setpoint: 21},
                ];
                for (const {mode, command, value, byte, setpoint} of cases) {
                    const device = reporting(mode);
                    expect(await device.send({current_heating_setpoint: value})).toStrictEqual({current_heating_setpoint: setpoint});
                    expect(device.frames).toStrictEqual([`${command}${byte}`]);
                }
            });

            it("until a 0x71 has been seen the setpoint is B34", async () => {
                const device = reporting(undefined);
                await device.send({current_heating_setpoint: 21});
                expect(device.frames).toStrictEqual(["4233344a"]);
            });

            it("every 0x71 updates the mode byte, and each thermostat has its own", async () => {
                const device = reporting(3);
                const other = reporting(undefined);
                await device.send({current_heating_setpoint: 21});
                device.publish(statusRecord({mode: 4}));
                await device.send({current_heating_setpoint: 21});
                device.publish(statusRecord({mode: 3}));
                await device.send({current_heating_setpoint: 21});
                await other.send({current_heating_setpoint: 21});
                expect(device.frames).toStrictEqual(["4233334a", "4233344a", "4233334a"]);
                expect(other.frames).toStrictEqual(["4233344a"]);
            });

            it("a setpoint after a system mode that was echoed uses the command of that mode, without a 0x71 in between", async () => {
                for (const reported of [4, 3, undefined]) {
                    const device = reporting(reported);
                    await device.send({system_mode: "cool"});
                    await device.send({current_heating_setpoint: 25});
                    await device.send({system_mode: "heat"});
                    await device.send({current_heating_setpoint: 21});
                    expect(device.frames, `reported ${reported}`).toStrictEqual([
                        "42323002",
                        "42343803",
                        "42333352",
                        "42323002",
                        "42343804",
                        "4233344a",
                    ]);
                }
            });

            it("off keeps the mode of the setpoint command: the mode byte is the one of the last cool or heat", async () => {
                const device = reporting(undefined);
                await device.send({system_mode: "cool"});
                await device.send({system_mode: "off"});
                await device.send({current_heating_setpoint: 25});
                expect(device.frames).toStrictEqual(["42323002", "42343803", "42323007", "42333352"]);
            });

            it("without a 0x71 yet the system mode zigbee2mqtt last published decides the command, else heat, and a 0x71 overrules it", async () => {
                const cases: [KeyValue | undefined, string][] = [
                    [{system_mode: "cool"}, "423333"],
                    [{system_mode: "heat"}, "423334"],
                    [{system_mode: "off"}, "423334"],
                    [{system_mode: "auto"}, "423334"],
                    [{system_mode: "constructor"}, "423334"],
                    [{}, "423334"],
                    [undefined, "423334"],
                ];
                for (const [state, command] of cases) {
                    const device = reporting(undefined);
                    await device.send({current_heating_setpoint: 21}, state);
                    expect(device.frames, JSON.stringify(state)).toStrictEqual([`${command}4a`]);
                }
                const heating = reporting(4);
                await heating.send({current_heating_setpoint: 21}, {system_mode: "cool"});
                expect(heating.frames).toStrictEqual(["4233344a"]);
            });

            it("the setpoint is not refused while off: standby keeps the mode byte", async () => {
                for (const [mode, command] of [
                    [3, "423333"],
                    [4, "423334"],
                ] as const) {
                    const device = new Thermostat();
                    expect(device.publish(statusRecord({hold: 7, mode})).system_mode).toBe("off");
                    await device.send({current_heating_setpoint: 21});
                    expect(device.frames).toStrictEqual([`${command}4a`]);
                }
            });

            it("a system mode in the same message decides the command and is written first, whatever the order of the keys", async () => {
                const cool = ["42323002", "42343803", "42333352"];
                const heat = ["42323002", "42343804", "4233344a"];
                const cases = [
                    {reported: 4, message: {system_mode: "cool", current_heating_setpoint: 25}, frames: cool},
                    {reported: 4, message: {current_heating_setpoint: 25, system_mode: "cool"}, frames: cool},
                    {reported: undefined, message: {current_heating_setpoint: 25, system_mode: "cool"}, frames: cool},
                    {reported: 3, message: {system_mode: "heat", current_heating_setpoint: 21}, frames: heat},
                    {reported: 3, message: {current_heating_setpoint: 21, system_mode: "heat"}, frames: heat},
                    // Off is no mode for the setpoint: standby keeps the mode byte as it was.
                    {reported: 3, message: {current_heating_setpoint: 25, system_mode: "off"}, frames: ["42323007", "42333352"]},
                    {reported: 4, message: {system_mode: "off", current_heating_setpoint: 21}, frames: ["42323007", "4233344a"]},
                ];
                for (const {reported, message, frames} of cases) {
                    const device = reporting(reported);
                    expect(await device.send(message)).toStrictEqual(message);
                    expect(device.frames, JSON.stringify(message)).toStrictEqual(frames);
                }
            });

            it("messages that overlap are written one after the other, so a setpoint uses the command of the mode that was sent before it", async () => {
                const device = reporting(4);
                const sent = await Promise.all([
                    device.send({system_mode: "cool"}),
                    device.send({current_heating_setpoint: 25}),
                    device.send({system_mode: "heat"}),
                    device.send({current_heating_setpoint: 21}),
                ]);
                expect(sent).toStrictEqual([
                    {system_mode: "cool"},
                    {current_heating_setpoint: 25},
                    {system_mode: "heat"},
                    {current_heating_setpoint: 21},
                ]);
                expect(device.frames).toStrictEqual(["42323002", "42343803", "42333352", "42323002", "42343804", "4233344a"]);
            });

            it("a climate message waits for a settings write that is under way", async () => {
                const device = new Thermostat();
                await Promise.all([device.set("frost_setpoint", 7), device.send({system_mode: "cool"})]);
                expect(device.codes).toStrictEqual(["B74", "B11", "B74", "B20", "B48"]);
            });

            it("the setpoint is limited to 5 to 35 in heat and 5 to 40 in cool until a 0x72 has been seen", async () => {
                for (const [mode, max] of [
                    [4, 35],
                    [3, 40],
                ]) {
                    const device = reporting(mode);
                    const refused = new RegExp(`current_heating_setpoint must be between 5 and ${max}, got`);
                    for (const value of [4.5, max + 0.5]) {
                        await expect(device.send({current_heating_setpoint: value})).rejects.toThrow(refused);
                    }
                    expect(device.frames).toStrictEqual([]);
                    await device.send({current_heating_setpoint: max});
                    expect(device.frames.length).toBe(1);
                }
            });

            it("after a 0x72 the setpoint is limited to the thermostat's own limits for its mode", async () => {
                // Heating limits 15 to 25 (bytes 24-25 and 22-23), cooling limits 10 to 30 (bytes 28-29 and 26-27).
                const settings = {22: 0x25, 24: 0x15, 26: 0x30, 28: 0x10};
                for (const {mode, min, max} of [
                    {mode: 4, min: 15, max: 25},
                    {mode: 3, min: 10, max: 30},
                ]) {
                    const device = reporting(mode, settings);
                    for (const value of [min - 0.5, max + 0.5]) {
                        await expect(device.send({current_heating_setpoint: value})).rejects.toThrow(
                            new RegExp(`must be between ${min} and ${max}, got`),
                        );
                    }
                    expect(device.frames).toStrictEqual([]);
                    await device.send({current_heating_setpoint: min});
                    await device.send({current_heating_setpoint: max});
                    expect(device.frames.length).toBe(2);
                }
            });

            it("the limits follow the mode written in the same message", async () => {
                const settings = {22: 0x25, 24: 0x15, 26: 0x30, 28: 0x10};
                // 28 is above the heating limit of 25 and within the cooling limit of 30.
                const cooling = reporting(4, settings);
                await cooling.send({system_mode: "cool", current_heating_setpoint: 28});
                expect(cooling.frames).toStrictEqual(["42323002", "42343803", "42333358"]);
                const heating = reporting(3, settings);
                await expect(heating.send({system_mode: "heat", current_heating_setpoint: 28})).rejects.toThrow(/must be between 15 and 25, got 28/);
                expect(heating.frames).toStrictEqual([]);
            });

            it("a message with a bad mode or a bad setpoint writes nothing", async () => {
                const cases: [KeyValue, RegExp][] = [
                    [{system_mode: "auto", current_heating_setpoint: 21}, /system_mode must be off, heat or cool, got auto/],
                    [{current_heating_setpoint: 21, system_mode: "auto"}, /system_mode must be off, heat or cool, got auto/],
                    [{system_mode: "cool", current_heating_setpoint: 45}, /must be between 5 and 40, got 45/],
                    [{current_heating_setpoint: 45, system_mode: "cool"}, /must be between 5 and 40, got 45/],
                ];
                for (const [message, error] of cases) {
                    const device = reporting(4);
                    await expect(device.send(message)).rejects.toThrow(error);
                    expect(device.frames).toStrictEqual([]);
                }
            });

            describe("timeouts", () => {
                fakeTimeouts();

                it("when the system mode gets no echo the setpoint is not written after it", async () => {
                    const device = reporting(4);
                    device.silent.add("B20");
                    const sent = expect(device.send({system_mode: "cool", current_heating_setpoint: 25})).rejects.toThrow(
                        /No B20 echo from 0x[0-9a-f]+ within 30000 ms/,
                    );
                    await settle();
                    vi.advanceTimersByTime(30000);
                    await sent;
                    expect(device.codes).toStrictEqual(["B20"]);
                });

                it("a system mode that gets no echo leaves the mode of the setpoint command as it was", async () => {
                    const device = reporting(4);
                    device.silent.add("B48");
                    const failed = expect(device.send({system_mode: "cool"})).rejects.toThrow(/No B48 echo/);
                    await settle();
                    vi.advanceTimersByTime(30000);
                    await failed;
                    await device.send({current_heating_setpoint: 21});
                    expect(device.frames.at(-1)).toBe("4233344a");
                });
            });
        });

        describe("presets", () => {
            it("presets set the hold type: schedule is B20 00, permanent_hold B20 02 and away B20 06", async () => {
                const expected = {schedule: "42323000", permanent_hold: "42323002", away: "42323006"};
                for (const [preset, frame] of Object.entries(expected)) {
                    const device = new Thermostat();
                    expect(await device.set("preset", preset)).toStrictEqual({state: {preset, hold_type: preset}});
                    expect(device.frames).toStrictEqual([frame]);
                }
            });

            it("a preset in the same message as a system mode is written after it, so the preset is the hold type that is left", async () => {
                const cases = [
                    {message: {preset: "schedule", system_mode: "heat"}, frames: ["42323002", "42343804", "42323000"]},
                    {message: {system_mode: "heat", preset: "schedule"}, frames: ["42323002", "42343804", "42323000"]},
                    {message: {preset: "away", system_mode: "cool"}, frames: ["42323002", "42343803", "42323006"]},
                    {message: {system_mode: "cool", preset: "away"}, frames: ["42323002", "42343803", "42323006"]},
                    {message: {preset: "permanent_hold", system_mode: "heat"}, frames: ["42323002", "42343804", "42323002"]},
                ];
                for (const {message, frames} of cases) {
                    const device = reporting(4);
                    expect(await device.send(message), JSON.stringify(message)).toStrictEqual({...message, hold_type: message.preset});
                    expect(device.frames, JSON.stringify(message)).toStrictEqual(frames);
                }
            });

            it("a preset and a setpoint in one message are written in that order, whatever the order of the keys", async () => {
                const scheduleInCool = ["42323002", "42343803", "42323000", "42333352"];
                const cases = [
                    {message: {preset: "away", current_heating_setpoint: 18}, frames: ["42323006", "42333444"]},
                    {message: {current_heating_setpoint: 18, preset: "away"}, frames: ["42323006", "42333444"]},
                    {message: {current_heating_setpoint: 25, preset: "schedule", system_mode: "cool"}, frames: scheduleInCool},
                    {message: {preset: "schedule", system_mode: "cool", current_heating_setpoint: 25}, frames: scheduleInCool},
                ];
                for (const {message, frames} of cases) {
                    const device = reporting(4);
                    expect(await device.send(message), JSON.stringify(message)).toStrictEqual({...message, hold_type: message.preset});
                    expect(device.frames, JSON.stringify(message)).toStrictEqual(frames);
                }
            });

            it("a preset with system mode off is refused, as are a bad preset or a bad mode next to a good one, and nothing is written", async () => {
                const cases: [KeyValue, RegExp][] = [
                    [{preset: "schedule", system_mode: "off"}, /preset cannot be set together with system_mode off/],
                    [{system_mode: "off", preset: "away"}, /preset cannot be set together with system_mode off/],
                    [{system_mode: "heat", preset: "eco"}, /preset must be one of schedule, permanent_hold, away, got eco/],
                    [{preset: "standby", system_mode: "cool"}, /preset must be one of schedule, permanent_hold, away, got standby/],
                    [{preset: "away", system_mode: "auto"}, /system_mode must be off, heat or cool, got auto/],
                    [{preset: "away", current_heating_setpoint: 45}, /must be between 5 and 35, got 45/],
                    [{preset: "away", current_heating_setpoint: 21, system_mode: "dry"}, /system_mode must be off, heat or cool, got dry/],
                ];
                for (const [message, error] of cases) {
                    const device = reporting(4);
                    await expect(device.send(message), JSON.stringify(message)).rejects.toThrow(error);
                    expect(device.frames, JSON.stringify(message)).toStrictEqual([]);
                }
            });

            it("only the settable presets are accepted, and hold_type itself cannot be set", async () => {
                for (const preset of ["temporary_hold", "standby", "eco", "heat", ""]) {
                    const device = new Thermostat();
                    await expect(device.set("preset", preset)).rejects.toThrow(/preset must be one of schedule, permanent_hold, away, got/);
                    expect(device.frames).toStrictEqual([]);
                }
                expect(setter("hold_type")).toBeUndefined();
            });

            describe("timeouts", () => {
                fakeTimeouts();

                it("when the system mode gets no echo the preset is not written after it", async () => {
                    const device = reporting(4);
                    device.silent.add("B48");
                    const sent = expect(device.send({system_mode: "cool", preset: "away"})).rejects.toThrow(/No B48 echo/);
                    await settle();
                    vi.advanceTimersByTime(30000);
                    await sent;
                    expect(device.codes).toStrictEqual(["B20", "B48"]);
                });
            });
        });

        describe("handles", () => {
            it("a handle that waits for its echo is not handed out again when the handles wrap", async () => {
                const device = new Thermostat();
                device.silent.add("B03:1");
                const waiting = watch(device.set("child_lock", "LOCK"));
                for (let write = 0; write < 130; write++) {
                    await device.set("child_lock", "UNLOCK");
                }
                expect(device.handles.filter((handle) => handle === 1).length).toBe(1);
                expect(waiting.state).toBe("pending");
                echoOf(device, "01 42 30 33");
                await settle();
                expect(waiting.state).toBe("resolved");
            });

            it("an echo completes only a waiter for the same B-code, whatever the handle", async () => {
                const device = new Thermostat();
                device.silent.add("B03");
                const waiting = watch(device.set("child_lock", "LOCK"));
                await settle();
                echoOf(device, "01 42 37 30 00");
                await settle();
                expect(waiting.state).toBe("pending");
                echoOf(device, "01 42 30 33");
                await settle();
                expect(waiting.state).toBe("resolved");
            });

            describe("timeouts", () => {
                fakeTimeouts();

                it("a device whose 127 handles all wait for an echo gets an error and not a hang", async () => {
                    const device = new Thermostat();
                    device.silent.add("B03");
                    const waiting = Array.from({length: 127}, () => watch(device.set("child_lock", "LOCK")));
                    await settle();
                    const extra = watch(device.set("child_lock", "LOCK"));
                    await settle();
                    expect(extra.state).toBe("rejected");
                    expect(extra.error?.message).toMatch(/All 127 handles/);
                    expect(new Set(device.handles).size).toBe(127);
                    vi.advanceTimersByTime(30000);
                    await settle();
                    expect(waiting.every((watched) => watched.state === "rejected")).toBe(true);
                });
            });
        });

        describe("stop", () => {
            fakeTimeouts();

            it("the stop event fails what waits for an echo, and clears its timer", async () => {
                const device = reporting(4);
                device.silent.add("B20");
                const sent = watch(device.send({system_mode: "cool"}));
                await settle();
                expect(vi.getTimerCount()).toBe(1);
                await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
                await settle();
                expect(sent.state).toBe("rejected");
                expect(sent.error?.message).toMatch(/stopped/);
                expect(vi.getTimerCount()).toBe(0);
                expect(device.codes).toStrictEqual(["B20"]);
            });

            it("the stop event fails a write that waits for a 0x72, and clears its timer", async () => {
                const device = new Thermostat();
                device.reportsB74 = "never";
                const write = watch(device.set("frost_setpoint", 7));
                await settled();
                expect(vi.getTimerCount()).toBe(1);
                await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
                await settle();
                expect(write.state).toBe("rejected");
                expect(write.error?.message).toMatch(/stopped/);
                expect(vi.getTimerCount()).toBe(0);
                expect(device.codes).toStrictEqual(["B74"]);
            });

            it("the stop event fails queued work without running it, and the thermostat works again afterwards", async () => {
                const device = new Thermostat();
                device.reportsB74 = "never";
                const queued = [
                    watch(device.set("frost_setpoint", 7)),
                    watch(device.set("temperature_offset", 0.5)),
                    watch(device.send({system_mode: "cool"})),
                ];
                await settled();
                await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
                await settled();
                for (const watched of queued) {
                    expect(watched.state).toBe("rejected");
                    expect(watched.error?.message).toMatch(/stopped/);
                }
                expect(device.codes).toStrictEqual(["B74"]);
                device.reportsB74 = "after";
                await device.set("frost_setpoint", 7);
                expect(device.codes).toStrictEqual(["B74", "B74", "B11", "B74"]);
            });
        });

        describe("exposes", () => {
            const exposesOf = (candidate: Definition) => candidate.exposes as exposes.Base[];
            const featuresOf = (expose: exposes.Base) => Object.fromEntries(expose.features.map((feature) => [feature.name, feature]));

            it("the climate has one setpoint, the three system modes and the three settable presets", () => {
                // A second setpoint would turn zigbee2mqtt's Home Assistant discovery into a low and high pair instead of one temperature.
                const climate = exposesOf(definition).find((expose) => expose.type === "climate");
                const features = featuresOf(climate);
                expect(Object.keys(features)).toStrictEqual([
                    "current_heating_setpoint",
                    "local_temperature",
                    "system_mode",
                    "running_state",
                    "preset",
                ]);
                const setpoint = features.current_heating_setpoint as exposes.Numeric;
                expect([setpoint.value_min, setpoint.value_max, setpoint.value_step, setpoint.access]).toStrictEqual([5, 40, 0.5, access.STATE_SET]);
                expect((features.system_mode as exposes.Enum).values).toStrictEqual(["off", "heat", "cool"]);
                expect(features.system_mode.access).toBe(access.STATE_SET);
                expect((features.running_state as exposes.Enum).values).toStrictEqual(["idle", "heat"]);
                expect(features.running_state.access).toBe(access.STATE);
                expect((features.preset as exposes.Enum).values).toStrictEqual(["schedule", "permanent_hold", "away"]);
                expect(features.preset.access).toBe(access.STATE_SET);
            });

            it("hold_type is exposed read-only with the five hold types and no eco", () => {
                const holdType = exposesOf(definition).find((expose) => expose.property === "hold_type") as exposes.Enum;
                expect(holdType.values).toStrictEqual(["schedule", "temporary_hold", "permanent_hold", "away", "standby"]);
                expect(holdType.access).toBe(access.STATE);
            });

            it("the cooling limits and the schedule setpoint are exposed read-only, the heating limits and the display resolution settable, in degrees", () => {
                const readOnly = ["min_cool_setpoint", "max_cool_setpoint", "schedule_setpoint"];
                const settable = ["min_heat_setpoint", "max_heat_setpoint", "display_resolution"];
                for (const property of [...readOnly, ...settable]) {
                    const expose = exposesOf(definition).find((candidate) => candidate.property === property) as exposes.Numeric;
                    const expected = readOnly.includes(property) ? access.STATE : access.STATE_SET;
                    expect([expose?.type, expose?.access, expose?.unit], property).toStrictEqual(["numeric", expected, "°C"]);
                }
            });

            it("the settable exposes and the converters have the same keys", () => {
                const features: exposes.Base[] = exposesOf(definition).flatMap((expose) => expose.features ?? [expose]);
                const settable = features.filter((feature) => feature.access & access.SET).map((feature) => feature.property);
                expect(settable.toSorted()).toStrictEqual([
                    "child_lock",
                    "current_heating_setpoint",
                    "display_resolution",
                    "frost_setpoint",
                    "heat_control",
                    "max_heat_setpoint",
                    "min_heat_setpoint",
                    "preset",
                    "system_mode",
                    "temperature_offset",
                    "wiring_centre_zones",
                ]);
                // findByDevice adds the default converters (read, write, scenes, ...), so the definition's own list is checked.
                const own = rawDefinition("SQ610RFNH").toZigbee;
                expect(own.flatMap((converter) => converter.key).toSorted()).toStrictEqual(settable.toSorted());
            });
        });
    });

    describe("KL08RF", () => {
        beforeEach(() => {
            // herdsman's Device class finds a device by network address. These know the thermostats at 0x1201 to 0x1205 and not the one at 0x1206.
            vi.spyOn(Device, "byNetworkAddress").mockImplementation((address) =>
                address >= 0x1201 && address <= 0x1205 ? ({ieeeAddr: ieeeOf(address)} as Zh.Device) : undefined,
            );
        });

        it("the definitions are the thermostat and the wiring centre, both Salus Controls", () => {
            expect(
                salusDefinitions.filter((candidate) => ["SQ610RFNH", "KL08RF"].includes(candidate.model)).map((c) => [c.model, c.vendor]),
            ).toStrictEqual([
                ["SQ610RFNH", "Salus Controls"],
                ["KL08RF", "Salus Controls"],
            ]);
            const raw = rawDefinition("KL08RF");
            expect(raw.description).toBe("iT600 8-zone wiring centre");
            expect(raw.zigbeeModel).toBeUndefined();
            expect(raw.fingerprint).toStrictEqual([{manufacturerName: "Computime", type: "Router", endpoints: [{ID: 8, profileID: 260}]}]);
            expect([definition.endpoint(undefined), wiringCentreDefinition.endpoint(undefined)]).toStrictEqual([{default: 9}, {default: 8}]);
        });

        it("herdsman parses the commands a wiring centre sends, which have the client-to-server bit", async () => {
            const clusters = await customClustersOf(wiringCentreDefinition, new WiringCentre().device);
            const commands: [number, string, string][] = [
                [0x10, SYNC_REQUEST, "syncRequest"],
                [0x33, ZONE_TABLE_AT_BOOT, "echo"],
                [0x37, "11 00 00", "syncAck"],
                [0x1a, "01 00 06 12", "replacedThermostat"],
                [0x16, "01", "wiringCentreRequest"],
                [0xa9, "", "pairButton"],
            ];
            for (const [command, payload, name] of commands) {
                const buffer = frame(0x15, command, payload);
                expect(Zcl.Header.fromBuffer(buffer).frameControl.direction).toBe(Zcl.Direction.CLIENT_TO_SERVER);
                const parsed = Zcl.Frame.fromBuffer(0xfc00, Zcl.Header.fromBuffer(buffer), buffer, clusters);
                expect(parsed.command.name).toBe(name);
                expect(parsed.payload.payload.toString("hex")).toBe(hex(payload).toString("hex"));
            }
        });

        it("the thermostat's commands, which have the server-to-client bit, still parse", async () => {
            const clusters = await customClustersOf(definition, new Thermostat().device);
            const commands: [number, string, string][] = [
                [0x10, "ff 42 ff 50 00 00 00", "syncRequest"],
                [0x31, "71 01 00", "record"],
                [0x33, "01 42 32 30 07", "echo"],
                [0x16, "01", "wiringCentreRequest"],
            ];
            for (const [command, payload, name] of commands) {
                const buffer = frame(0x1d, command, payload);
                expect(Zcl.Header.fromBuffer(buffer).frameControl.direction).toBe(Zcl.Direction.SERVER_TO_CLIENT);
                expect(Zcl.Frame.fromBuffer(0xfc00, Zcl.Header.fromBuffer(buffer), buffer, clusters).command.name).toBe(name);
            }
        });

        it("a command the cluster does not declare is not parsed, so herdsman passes it on as a raw message of the cluster", async () => {
            const clusters = await customClustersOf(wiringCentreDefinition, new WiringCentre().device);
            const buffer = frame(0x15, 0x42, "aa bb");
            expect(() => Zcl.Frame.fromBuffer(0xfc00, Zcl.Header.fromBuffer(buffer), buffer, clusters)).toThrow(/manuSpecificSalusIt600/);
            // The cluster name herdsman puts on a raw message is the one the converter for it is registered under.
            expect(Zcl.Utils.getCluster(0xfc00, 0x1078, clusters).name).toBe(CLUSTER);
        });

        it("a sync request from the wiring centre is answered with device number 1 and the clock", async () => {
            vi.useFakeTimers({toFake: ["Date"]});
            try {
                vi.setSystemTime(SUMMER_NOON);
                const centre = new WiringCentre();
                expect(await received(centre, "commandSyncRequest", SYNC_REQUEST)).toBeUndefined();
                // Device number 1, then 12:00 local time in summer: flags 03 (summer time, 24 hour clock), time zone index 14, summer time offset 1 hour.
                expect(centre.sent).toStrictEqual([["syncResponse", "0100400ebc31030e01ffffffff3100"]]);
                expect(Buffer.from(centre.sent[0][1], "hex").readUInt32LE(2) + 946684800).toBe(Date.UTC(2026, 5, 10, 12, 0, 0) / 1000);
            } finally {
                vi.useRealTimers();
            }
        });

        it("the sync response gives a thermostat device number 0x20 and a wiring centre device number 1", async () => {
            const device = new Thermostat();
            await definition.onEvent({type: "deviceAnnounce", data: {device: device.device}} as unknown as OnEvent.Event);
            const centre = new WiringCentre();
            await wiringCentreDefinition.onEvent({type: "deviceAnnounce", data: {device: centre.device}} as unknown as OnEvent.Event);
            expect([device.syncs[0][0], centre.sent[0][1].slice(0, 2)]).toStrictEqual([0x20, "01"]);
        });

        it("a wiring centre that announces itself or finishes its interview gets the sync response and then the zone table request", async () => {
            for (const event of [
                {type: "deviceAnnounce", data: {}},
                {type: "deviceInterview", data: {status: "successful"}},
            ]) {
                const centre = new WiringCentre();
                await wiringCentreDefinition.onEvent({...event, data: {...event.data, device: centre.device}} as unknown as OnEvent.Event);
                expect(centre.commands).toStrictEqual(["syncResponse", "write"]);
                expect(centre.sent[0][1].length / 2).toBe(15);
                expect(centre.sent[1]).toStrictEqual(["write", ZONE_TABLE_REQUEST]);
            }
        });

        it("nothing is sent to a wiring centre for other events, a failed interview or a device without endpoint 8", async () => {
            const centre = new WiringCentre();
            const device = centre.device;
            for (const event of [
                {type: "start", data: {device}},
                {type: "deviceInterview", data: {device, status: "failed"}},
                {type: "deviceNetworkAddressChanged", data: {device}},
                {type: "deviceAnnounce", data: {device: {getEndpoint: (): Zh.Endpoint => undefined}}},
            ]) {
                await wiringCentreDefinition.onEvent(event as unknown as OnEvent.Event);
            }
            expect(centre.sent).toStrictEqual([]);
        });

        it("a zone table request that fails after the join only logs a warning", async () => {
            const centre = new WiringCentre();
            centre.failing.add("write");
            await wiringCentreDefinition.onEvent({type: "deviceAnnounce", data: {device: centre.device}} as unknown as OnEvent.Event);
            expect(centre.commands).toStrictEqual(["syncResponse"]);
            expect(warnings.at(-1)).toMatch(/Zone table request to 0x[0-9a-f]+ failed \(no route\)/);
        });

        it("the zone table at boot publishes zone_1 to zone_8 as the IEEE address of each thermostat, with null for the free zone", async () => {
            expect(await received(new WiringCentre(), "commandEcho", ZONE_TABLE_AT_BOOT)).toStrictEqual(AT_BOOT);
        });

        it("a zone whose short address no device has shows the short address, and so does every zone when the lookup is missing", async () => {
            expect(AT_BOOT.zone_7).toBe("0x1206");
            const withoutLookup = {ieeeAddr: "0x001e5f0000000000"} as Zh.Device;
            const published = await fromWiringCentre(new WiringCentre(), "commandEcho", {payload: hex(ZONE_TABLE_AT_BOOT)}, withoutLookup);
            expect(published).toStrictEqual({
                ...AT_BOOT,
                zone_1: "0x1201",
                zone_2: "0x1202",
                zone_3: "0x1203",
                zone_4: "0x1201",
                zone_5: "0x1204",
                zone_6: "0x1205",
            });
        });

        it("the zone table is read whatever its handle, and addresses keep their leading zeros", async () => {
            // 0x8a is the handle of the table the wiring centre sends after a pairing, and the zone 8 is taken then.
            const table = hex(ZONE_TABLE_AT_BOOT);
            table[0] = 0x8a;
            table.writeUInt16BE(0x1207, 10 + 3 * 7);
            table.writeUInt16BE(0x0000, 10);
            const published = await received(new WiringCentre(), "commandEcho", table.toString("hex"));
            expect(published).toStrictEqual({...AT_BOOT, zone_1: "0x0000", zone_8: "0x1207"});
        });

        it("an echo of another B-command, or a zone table that is cut short, publishes nothing", async () => {
            const centre = new WiringCentre();
            expect(await received(centre, "commandEcho", "09 42 32 31 01")).toBeUndefined();
            expect(await received(centre, "commandEcho", ZONE_TABLE_AT_BOOT.slice(0, 33 * 2))).toBeUndefined();
            expect(await received(centre, "commandEcho", ZONE_TABLE_AT_BOOT.slice(0, 34 * 2))).toStrictEqual(AT_BOOT);
        });

        it("the 0x1a report publishes the thermostat that was replaced: its IEEE address if a device has the short address, else the short address", async () => {
            const centre = new WiringCentre();
            expect(await received(centre, "commandReplacedThermostat", "01 00 06 12")).toStrictEqual({replaced_thermostat: "0x1206"});
            expect(await received(centre, "commandReplacedThermostat", "01 00 01 12")).toStrictEqual({replaced_thermostat: ieeeOf(0x1201)});
            expect(await received(centre, "commandReplacedThermostat", "01 00 06")).toBeUndefined();
        });

        it("replaced_thermostat is a read-only text expose of the wiring centre", () => {
            const expose = (wiringCentreDefinition.exposes as exposes.Base[]).find((candidate) => candidate.property === "replaced_thermostat");
            expect([expose.type, expose.access]).toStrictEqual(["text", access.STATE]);
            expect(expose.description).toMatch(/^IEEE address of the thermostat .*replaced.*short address while no device has it$/);
        });

        it("the 0xa9 frame of the wiring centre is logged at info with its payload", async () => {
            const centre = new WiringCentre();
            infos.length = 0;
            expect(await received(centre, "commandPairButton", "")).toBeUndefined();
            expect(infos.length).toBe(1);
            expect(infos[0]).toMatch(/^Command 0xa9 \(probably the Pair button\) from 0x[0-9a-f]+, payload empty$/);
            expect(centre.sent).toStrictEqual([]);
        });

        it("the 0x37 after the sync request publishes and sends nothing", async () => {
            const centre = new WiringCentre();
            debugs.length = 0;
            expect(await received(centre, "commandSyncAck", "11 00 00")).toBeUndefined();
            expect(debugs).toHaveLength(1);
            expect(debugs[0]).toMatch(/^Sync acknowledgement 110000 from 0x[0-9a-f]+$/);
            expect(centre.sent).toStrictEqual([]);
        });

        it("the answer to 0x16 is command 0x86 of the cluster, built with the server-to-client bit like the sync response", async () => {
            for (const [candidate, device] of [
                [definition, new Thermostat().device],
                [wiringCentreDefinition, new WiringCentre().device],
            ] as const) {
                const clusters = await customClustersOf(candidate, device);
                const answer = Zcl.Frame.create(
                    Zcl.FrameType.SPECIFIC,
                    Zcl.Direction.SERVER_TO_CLIENT,
                    true,
                    0x1078,
                    0x28,
                    "wiringCentreResponse",
                    0xfc00,
                    {payload: hex("01 78 56")},
                    clusters,
                );
                expect(answer.toBuffer().toString("hex")).toBe("1d78102886017856");
            }
        });

        it("a thermostat that asks for wiring centre 1 is told the short address of the wiring centre, little-endian", async () => {
            await greetedWiringCentre();
            const device = new Thermostat();
            infos.length = 0;
            expect(await asksForWiringCentre(device, "01")).toStrictEqual(["017856"]);
            expect(infos.length).toBe(1);
            expect(infos[0]).toMatch(/^0x[0-9a-f]+ asked for wiring centre 1, answering 017856$/);
        });

        it("the wiring centre is known from its join, its interview, its sync request and the start of zigbee2mqtt", async () => {
            const onEvent = (type: string, data: KeyValue) => async (centre: WiringCentre) => {
                await wiringCentreDefinition.onEvent({type, data: {device: centre.device, ...data}} as unknown as OnEvent.Event);
            };
            const learns = [
                onEvent("deviceAnnounce", {}),
                onEvent("deviceInterview", {status: "successful"}),
                (centre: WiringCentre) => received(centre, "commandSyncRequest", SYNC_REQUEST),
                onEvent("start", {}),
            ];
            for (const learn of learns) {
                // Each case starts without a wiring centre, so its answer shows what that case learned.
                globalStore.clear();
                const device = new Thermostat();
                expect(await asksForWiringCentre(device, "01")).toStrictEqual(["00ffff"]);
                await learn(new WiringCentre());
                expect(await asksForWiringCentre(device, "01")).toStrictEqual(["017856"]);
            }
        });

        it("the wiring centre's short address is read when it is asked for, so a new one after a rejoin is followed", async () => {
            const centre = await greetedWiringCentre();
            const device = new Thermostat();
            expect(await asksForWiringCentre(device, "01")).toStrictEqual(["017856"]);
            centre.endpoint.deviceNetworkAddress = 0x1207;
            expect(await asksForWiringCentre(device, "01")).toStrictEqual(["010712"]);
        });

        it("a number that no wiring centre holds is answered 00 ff ff, and a thermostat's own number is not a wiring centre", async () => {
            await greetedWiringCentre();
            const device = new Thermostat();
            await definition.onEvent({type: "deviceAnnounce", data: {device: device.device}} as unknown as OnEvent.Event);
            for (const number of ["00", "02", "09", "20", "ff"]) {
                expect(await asksForWiringCentre(device, number), number).toStrictEqual(["00ffff"]);
            }
        });

        it("a request without a number is not answered", async () => {
            const device = new Thermostat();
            infos.length = 0;
            expect(await asksForWiringCentre(device, "")).toStrictEqual([]);
            expect(infos).toStrictEqual([]);
        });

        it("the wiring centre answers a request for itself too, and an answer that cannot be sent only logs a warning", async () => {
            const centre = await greetedWiringCentre();
            expect(await received(centre, "commandWiringCentreRequest", "01")).toBeUndefined();
            expect(centre.sent.slice(1)).toStrictEqual([["wiringCentreResponse", "017856"]]);
            centre.failing.add("wiringCentreResponse");
            expect(await received(centre, "commandWiringCentreRequest", "01")).toBeUndefined();
            expect(warnings.at(-1)).toMatch(/Wiring centre answer to 0x[0-9a-f]+ failed \(no route\)/);
        });

        it("the stop event of the wiring centre drops it as the holder of the number, and the stop of another device does not", async () => {
            const centre = await greetedWiringCentre();
            const device = new Thermostat();
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
            expect(await asksForWiringCentre(device, "01")).toStrictEqual(["017856"]);
            await wiringCentreDefinition.onEvent({type: "stop", data: {ieeeAddr: centre.device.ieeeAddr}});
            expect(await asksForWiringCentre(device, "01")).toStrictEqual(["00ffff"]);
        });

        it("an unknown command is logged at info with its id and payload, but only if it is cluster specific", async () => {
            const centre = new WiringCentre();
            infos.length = 0;
            expect(await fromWiringCentre(centre, "raw", frame(0x15, 0x42, "aa bb 01"))).toBeUndefined();
            expect(infos.length).toBe(1);
            expect(infos[0]).toMatch(/^Unknown command 0x42 from 0x[0-9a-f]+: aabb01$/);
            expect(await fromWiringCentre(centre, "raw", hex("08 01 0b 42 00"))).toBeUndefined();
            expect(infos.length).toBe(1);
        });

        it("a get on any zone sends the zone table request, and nothing else", async () => {
            for (const key of ZONE_KEYS) {
                const centre = new WiringCentre();
                const converter = converterOf(wiringCentreDefinition, key);
                expect(converter.convertSet).toBeUndefined();
                await converter.convertGet(centre.endpoint, key, {} as Tz.Meta);
                expect(centre.sent).toStrictEqual([["write", ZONE_TABLE_REQUEST]]);
            }
            expect(converterOf(wiringCentreDefinition, "zone_9")).toBeUndefined();
        });

        it("a get on a zone fails when the request cannot be sent", async () => {
            const centre = new WiringCentre();
            centre.failing.add("write");
            await expect(converterOf(wiringCentreDefinition, "zone_1").convertGet(centre.endpoint, "zone_1", {} as Tz.Meta)).rejects.toThrow(
                /no route/,
            );
        });

        it("zone_1 to zone_8 are text exposes that are read and requested", () => {
            const raw = rawDefinition("KL08RF");
            const wiringCentreExposes = raw.exposes as exposes.Base[];
            const zones = wiringCentreExposes.filter((expose) => expose.property?.startsWith("zone_"));
            expect(zones.map((expose) => expose.property)).toStrictEqual(ZONE_KEYS);
            for (const zone of zones) {
                expect(zone.type).toBe("text");
                expect(zone.access).toBe(access.STATE_GET);
                expect(zone.description).toMatch(
                    /^IEEE address of the thermostat in zone [1-8], its short address while no device has it, null while the zone is free$/,
                );
            }
            const exposed = wiringCentreExposes.filter((expose) => expose.access & (access.SET | access.GET)).map((expose) => expose.property);
            expect(raw.toZigbee.flatMap((converter) => converter.key).toSorted()).toStrictEqual(exposed.toSorted());
            const gettable = wiringCentreExposes.filter((expose) => expose.access & access.GET).map((expose) => expose.property);
            expect(raw.toZigbee.filter((converter) => converter.convertGet).flatMap((converter) => converter.key)).toStrictEqual(gettable);
        });

        describe("zone pairing", () => {
            it("wiring_centre_zones sends the B47 of the captured pairing and is done when the zone table shows the thermostat in the zone", async () => {
                const centre = await greetedWiringCentre();
                const device = new Thermostat();
                let done = false;
                const pairing = device.set("wiring_centre_zones", "8").then((result) => {
                    done = true;
                    return result;
                });
                await settled();
                // The B47 for the wiring centre 0x5678 and zone 8, as captured from a real pairing (PROTOCOL.md section 7.1).
                expect(device.frames).toStrictEqual(["423437001101007856fe0000000000000000010000000000000000000000000000000000"]);
                expect(device.frames[0]).toBe(pairFrame([8]));
                expect(done).toBe(false);
                await received(centre, "commandEcho", zoneTable(zonesWith(0x1201, [8])));
                expect(await pairing).toBeUndefined();
            });

            it("wiring_centre_zones waits for every zone, and for the thermostat's own short address in it", async () => {
                const centre = await greetedWiringCentre();
                const device = new Thermostat();
                let done = false;
                const pairing = device.set("wiring_centre_zones", "1,4").then(() => {
                    done = true;
                });
                await settled();
                expect(device.frames).toStrictEqual([pairFrame([1, 4])]);
                for (const table of [zonesWith(0x1201, [1]), [0x1201, null, null, 0x1202, null, null, null, null], zonesWith(0x1202, [1, 4])]) {
                    await received(centre, "commandEcho", zoneTable(table));
                    await settled();
                    expect(done).toBe(false);
                }
                await received(centre, "commandEcho", zoneTable([0x1201, null, null, 0x1201, null, null, null, 0x1203]));
                await pairing;
                expect(done).toBe(true);
            });

            it("wiring_centre_zones takes zone numbers as text or as numbers, in any order, and replace in front of them", async () => {
                const centre = await greetedWiringCentre();
                const cases = [
                    {value: "1,4", zones: [1, 4], replace: 0},
                    {value: "4, 1 4", zones: [1, 4], replace: 0},
                    {value: [1, 4], zones: [1, 4], replace: 0},
                    {value: 8, zones: [8], replace: 0},
                    {value: "replace 1,4", zones: [1, 4], replace: 1},
                    {value: "Replace 8", zones: [8], replace: 1},
                    {value: "replace,2", zones: [2], replace: 1},
                ];
                for (const {value, zones, replace} of cases) {
                    const device = new Thermostat();
                    const pairing = device.set("wiring_centre_zones", value);
                    await settled();
                    expect(device.frames, JSON.stringify(value)).toStrictEqual([...(replace ? [RESET_FRAME] : []), pairFrame(zones, {replace})]);
                    await received(centre, "commandEcho", zoneTable(zonesWith(0x1201, zones)));
                    await pairing;
                }
            });

            it("wiring_centre_zones sends the reset form of B47 and waits for its echo before the pairing form when the value starts with replace", async () => {
                const centre = await greetedWiringCentre();
                const device = new Thermostat();
                device.silent.add("B47:1");
                const pairing = watch(device.set("wiring_centre_zones", "replace 8"));
                await settled();
                expect(device.frames).toStrictEqual([RESET_FRAME]);
                echoOf(device, `01 ${RESET_FRAME}`);
                await settled();
                expect(device.frames).toStrictEqual([RESET_FRAME, pairFrame([8], {replace: 1})]);
                expect(pairing.state).toBe("pending");
                await received(centre, "commandEcho", zoneTable(zonesWith(0x1201, [8])));
                await settle();
                expect(pairing.state).toBe("resolved");
            });

            it("wiring_centre_zones reads the short address of the wiring centre when it is called, so a rejoin is followed", async () => {
                const centre = await greetedWiringCentre();
                centre.endpoint.deviceNetworkAddress = 0x1207;
                const device = new Thermostat();
                const pairing = device.set("wiring_centre_zones", "2");
                await settled();
                expect(device.frames).toStrictEqual([pairFrame([2], {short: "0712"})]);
                await received(centre, "commandEcho", zoneTable(zonesWith(0x1201, [2])));
                await pairing;
            });

            it("wiring_centre_zones refuses what is not zones 1 to 8, with replace in front, before anything is sent", async () => {
                await greetedWiringCentre();
                for (const value of [
                    "",
                    "  ",
                    "replace",
                    "0",
                    "9",
                    "1,x",
                    "1.5",
                    "-1",
                    "01",
                    "1;4",
                    "1,4 replace",
                    "replace replace 1",
                    null,
                    {},
                    true,
                ]) {
                    const device = new Thermostat();
                    await expect(device.set("wiring_centre_zones", value), JSON.stringify(value)).rejects.toThrow(
                        /^wiring_centre_zones must be zone numbers 1 to 8/,
                    );
                    expect(device.frames, JSON.stringify(value)).toStrictEqual([]);
                }
            });

            it("wiring_centre_zones says so when no wiring centre is known, before anything is sent", async () => {
                const device = new Thermostat();
                await expect(device.set("wiring_centre_zones", "1")).rejects.toThrow(/^No wiring centre is known/);
                expect(device.frames).toStrictEqual([]);
            });

            describe("timeouts", () => {
                fakeTimeouts();

                it("wiring_centre_zones fails when the zone table does not show the thermostat in time, as when the wiring centre refuses a taken zone", async () => {
                    const centre = await greetedWiringCentre();
                    const device = new Thermostat();
                    const pairing = device.set("wiring_centre_zones", "1,4");
                    const failed = expect(pairing).rejects.toThrow(
                        /^The zone table of the wiring centre does not show 0x[0-9a-f]+ in zone 1, 4 within 40 s of the B47.*replace/,
                    );
                    await settled();
                    await received(centre, "commandEcho", zoneTable(zonesWith(0x1202, [1, 4])));
                    vi.advanceTimersByTime(39999);
                    await settle();
                    vi.advanceTimersByTime(1);
                    await failed;
                    // A table that comes after the failure changes nothing.
                    await received(centre, "commandEcho", zoneTable(zonesWith(0x1201, [1, 4])));
                });

                it("wiring_centre_zones names each zone once and in order in its failure message, and waits 20 s for each", async () => {
                    await greetedWiringCentre();
                    const device = new Thermostat();
                    const failed = expect(device.set("wiring_centre_zones", "4, 1 4")).rejects.toThrow(/in zone 1, 4 within 40 s of the B47/);
                    await settled();
                    vi.advanceTimersByTime(40000);
                    await failed;
                });

                it("the stop event fails the zone pairing of that thermostat and no other, and clears its timer", async () => {
                    const centre = await greetedWiringCentre();
                    const device = new Thermostat();
                    const other = new Thermostat();
                    other.endpoint.deviceNetworkAddress = 0x1202;
                    const stopped = watch(device.set("wiring_centre_zones", "8"));
                    const kept = watch(other.set("wiring_centre_zones", "1"));
                    await settled();
                    expect(vi.getTimerCount()).toBe(2);
                    await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieee}});
                    await settle();
                    expect(stopped.state).toBe("rejected");
                    expect(stopped.error?.message).toMatch(/stopped/);
                    expect(kept.state).toBe("pending");
                    expect(vi.getTimerCount()).toBe(1);
                    await received(centre, "commandEcho", zoneTable(zonesWith(0x1202, [1])));
                    await settle();
                    expect(kept.state).toBe("resolved");
                    expect(vi.getTimerCount()).toBe(0);
                });

                it("wiring_centre_zones does not send the pairing form when the reset form is not echoed", async () => {
                    await greetedWiringCentre();
                    const device = new Thermostat();
                    device.silent.add("B47");
                    const failed = expect(device.set("wiring_centre_zones", "replace 3")).rejects.toThrow(
                        /No B47 echo from 0x[0-9a-f]+ within 30000 ms/,
                    );
                    await settled();
                    vi.advanceTimersByTime(30000);
                    await failed;
                    expect(device.frames).toStrictEqual([RESET_FRAME]);
                });

                it("wiring_centre_zones does not wait for the zone table when the thermostat does not echo the B47", async () => {
                    await greetedWiringCentre();
                    const device = new Thermostat();
                    device.silent.add("B47");
                    const failed = expect(device.set("wiring_centre_zones", "3")).rejects.toThrow(/No B47 echo from 0x[0-9a-f]+ within 30000 ms/);
                    await settle();
                    vi.advanceTimersByTime(30000);
                    await failed;
                });
            });
        });

        describe("definition lookup", () => {
            it("herdsman picks the wiring centre for a Computime device that reports no modelId, and the thermostat by its modelId", async () => {
                const centre = await findByDevice(lookupDevice({manufacturerName: "Computime"}));
                expect(centre.model).toBe("KL08RF");
                expect(centre.vendor).toBe("Salus Controls");
                expect(centre.ota).toStrictEqual({manufacturerName: "SalusControls"});
                const thermostat = await findByDevice(
                    lookupDevice({manufacturerName: "Computime", modelID: "SQ610RFNH", type: "EndDevice"}, [[9, 0x0104]]),
                );
                expect(thermostat.model).toBe("SQ610RFNH");
                expect(thermostat.ota).toStrictEqual({manufacturerName: "SalusControls"});
                expect(await findByDevice(lookupDevice({manufacturerName: "Somebody else"}))).toBeUndefined();
                expect(await findByDevice(lookupDevice({manufacturerName: "Computime", modelID: "SQ999"}))).toBeUndefined();
            });

            it("a device without a modelId is the wiring centre only as a Computime router with endpoint 8 alone, on the home automation profile", async () => {
                const modelOf = async (args: Parameters<typeof lookupDevice>[0], endpoints?: [number, number][]) =>
                    (await findByDevice(lookupDevice(args, endpoints)))?.model;
                const computime = {manufacturerName: "Computime"};
                expect(await modelOf(computime)).toBe("KL08RF");
                expect(await modelOf({...computime, type: "EndDevice"})).toBeUndefined();
                expect(await modelOf({...computime, type: "Coordinator"})).toBeUndefined();
                expect(await modelOf(computime, [[9, 0x0104]])).toBeUndefined();
                expect(
                    await modelOf(computime, [
                        [8, 0x0104],
                        [9, 0x0104],
                    ]),
                ).toBeUndefined();
                expect(await modelOf(computime, [[8, 0xc05e]])).toBeUndefined();
                expect(await modelOf({manufacturerName: "Somebody else"})).toBeUndefined();
            });
        });
    });
});
