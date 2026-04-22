import {beforeAll, describe, expect, it, vi} from "vitest";
import {definitions as inovelliDeviceDefinitions} from "../src/devices/inovelli";
import {findByDevice} from "../src/index";
import type {Definition, Expose, Fz, KeyValue, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

/** EP2 raw scene buffer: `data[4]` must be `0x00` for scene parsing; `data[5]` / `data[6]` index `buttonLookup` / `clickLookup` in `src/lib/inovelli.ts`. */
function rawInovelliEp2Scene(data4: number, buttonLookupKey: number, clickLookupKey: number): number[] {
    return [0, 0, 0, 0, data4, buttonLookupKey, clickLookupKey];
}

function processFromZigbeeMessage(definition: Definition, cluster: string, type: string, data: KeyValue | number[], endpointID: number) {
    const converters = definition.fromZigbee.filter((c) => {
        const typeMatch = Array.isArray(c.type) ? c.type.includes(type) : c.type === type;
        return c.cluster === cluster && typeMatch;
    });

    let payload: KeyValue = {};
    for (const converter of converters) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        const msg: Fz.Message<any, any, any> = {
            data,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            endpoint: {ID: endpointID} as any,
            device: null,
            meta: null,
            groupID: 0,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            type: type as any,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            cluster: cluster as any,
            linkquality: 0,
        };
        const converted = converter.convert(definition, msg, () => {}, {}, {state: {}, device: null, deviceExposesChanged: () => {}});
        if (converted) {
            payload = {...payload, ...converted};
        }
    }
    return payload;
}

function findTzConverter(definition: Definition, key: string): Tz.Converter {
    const converter = definition.toZigbee.find((c) => c.key.includes(key));
    expect(converter, `toZigbee converter for key "${key}" not found`).toBeDefined();
    return converter as Tz.Converter;
}

function buildMeta(device: ReturnType<typeof mockDevice>, overrides?: Partial<Tz.Meta>): Tz.Meta {
    return {
        state: {},
        device,
        message: {} as KeyValueAny,
        mapped: {} as Definition,
        options: {},
        endpoint_name: undefined,
        ...overrides,
    } as Tz.Meta;
}

async function setupVZM30(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM30-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}, {ID: 4}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM31(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM31-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM32(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM32-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM35(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM35-SN",
        endpoints: [
            {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
            {ID: 2, inputClusters: []},
        ],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM36(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM36",
        endpoints: [
            {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
            {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
        ],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

type MockConfiguredDevice = ReturnType<typeof mockDevice>;

function patchDeviceForConfigure(device: MockConfiguredDevice) {
    vi.spyOn(device, "save").mockImplementation(() => {});
    const defaults: Record<string, number> = {
        acPowerDivisor: 10,
        acPowerMultiplier: 1,
        divisor: 100,
        multiplier: 1,
    };
    for (const ep of device.endpoints) {
        vi.spyOn(ep, "save").mockImplementation(() => {});
        vi.spyOn(ep, "read").mockImplementation((cluster: string, attrs: string[]) => {
            const result: Record<string, number> = {};
            for (const attr of attrs) {
                result[attr] = defaults[attr] ?? 0;
            }
            try {
                ep.saveClusterAttributeKeyValue(cluster, result);
            } catch {
                // Custom clusters (e.g. manuSpecificInovelli) may not be registered in Zcl
            }
            return Promise.resolve(result);
        });
    }
}

function collectReadAttributes(device: MockConfiguredDevice): string[] {
    const allReadKeys: string[] = [];
    for (const ep of device.endpoints) {
        for (const call of (ep.read as ReturnType<typeof vi.fn>).mock.calls) {
            allReadKeys.push(...(call[1] as string[]));
        }
    }
    return allReadKeys;
}

/** Normalize a fromZigbee converter (or a bare fingerprint) to {cluster, sorted type}. */
function fzFingerprint(converter: {cluster: string | number; type: string | string[]}) {
    return {
        cluster: converter.cluster,
        type: Array.isArray(converter.type) ? [...converter.type].sort() : converter.type,
    };
}

type ReportingItemExpectation = {attribute: string; min: number; max: number; change: number | null | "NaN"};
type ReportingCallExpectation = {cluster: string; items: ReportingItemExpectation[]};
/** Expected `endpoint.command(cluster, command, payload, ...)` call during `configure()`. */
type CommandCallExpectation = {cluster: string; command: string; payload: Record<string, unknown>};

interface IntegrationAssertion {
    model: string;
    device: MockConfiguredDevice;
    meta: Record<string, unknown> | undefined;
    fromZigbeeFingerprint: {cluster: string; type: string | string[]}[];
    toZigbeeKeysContain: string[];
    toZigbeeKeysOmit?: string[];
    exposeFingerprints: string[];
    bind: Record<number, string[]>;
    readCount: Record<number, number>;
    readClusters?: Record<number, string[]>;
    writeCount: Record<number, number>;
    configureReporting: Record<number, ReportingCallExpectation[]>;
    /** Optional: assert that specific `endpoint.command(...)` calls were made during `configure()` (e.g. mmWave query_areas). */
    commands?: Record<number, CommandCallExpectation[]>;
}

/** Assert a full Inovelli device definition against its configure-time side effects. */
async function assertInovelliIntegration(e: IntegrationAssertion): Promise<Definition> {
    patchDeviceForConfigure(e.device);
    const definition = await findByDevice(e.device);

    expect(definition.model).toBe(e.model);
    expect(definition.ota).toBe(true);
    expect(definition.meta).toEqual(e.meta);

    expect(definition.fromZigbee.map(fzFingerprint)).toStrictEqual(e.fromZigbeeFingerprint.map(fzFingerprint));

    const allTzKeys = definition.toZigbee.flatMap((c) => c.key);
    for (const key of e.toZigbeeKeysContain) {
        expect(allTzKeys, `toZigbee should contain "${key}"`).toContain(key);
    }
    for (const key of e.toZigbeeKeysOmit ?? []) {
        expect(allTzKeys, `toZigbee should not contain "${key}"`).not.toContain(key);
    }

    const exposes = resolveExposes(definition, e.device);
    const actualFingerprints = exposes
        .map((ex) => ex.property ?? `${ex.type}${ex.endpoint ? `_${ex.endpoint}` : ""}(${ex.features?.map((f) => f.name).join(",")})`)
        .sort();
    expect(actualFingerprints).toStrictEqual([...e.exposeFingerprints].sort());

    await definition.configure(e.device, e.device.getEndpoint(1), definition);

    for (const ep of e.device.endpoints) {
        const bindCalls = (ep.bind as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
        expect(bindCalls, `bind(EP${ep.ID})`).toStrictEqual(e.bind[ep.ID] ?? []);

        const readCalls = (ep.read as ReturnType<typeof vi.fn>).mock.calls;
        expect(readCalls.length, `read count (EP${ep.ID})`).toBe(e.readCount[ep.ID] ?? 0);
        if (e.readClusters?.[ep.ID]) {
            const clustersRead = Array.from(new Set(readCalls.map((c) => c[0] as string))).sort();
            expect(clustersRead, `read clusters (EP${ep.ID})`).toStrictEqual([...e.readClusters[ep.ID]].sort());
        }

        const writeCalls = (ep.write as ReturnType<typeof vi.fn>).mock.calls;
        expect(writeCalls.length, `write count (EP${ep.ID})`).toBe(e.writeCount[ep.ID] ?? 0);

        const reportingCalls = (ep.configureReporting as ReturnType<typeof vi.fn>).mock.calls;
        const expectedReporting = e.configureReporting[ep.ID] ?? [];
        expect(reportingCalls.length, `configureReporting count (EP${ep.ID})`).toBe(expectedReporting.length);
        reportingCalls.forEach((call, callIdx) => {
            const want = expectedReporting[callIdx];
            const items = call[1] as ReportingItem[];
            expect(call[0], `configureReporting[${callIdx}] cluster (EP${ep.ID})`).toBe(want.cluster);
            expect(items.length, `configureReporting[${callIdx}] item count (EP${ep.ID}, cluster=${want.cluster})`).toBe(want.items.length);
            items.forEach((item, itemIdx) => {
                const wantItem = want.items[itemIdx];
                const label = `configureReporting[${callIdx}].items[${itemIdx}] (EP${ep.ID}, cluster=${want.cluster})`;
                expect(item.attribute, `${label} attribute`).toBe(wantItem.attribute);
                expect(item.minimumReportInterval, `${label} min`).toBe(wantItem.min);
                expect(item.maximumReportInterval, `${label} max`).toBe(wantItem.max);
                if (wantItem.change === "NaN") {
                    expect(item.reportableChange, `${label} change`).toBeNaN();
                } else {
                    expect(item.reportableChange, `${label} change`).toBe(wantItem.change);
                }
            });
        });

        for (const want of e.commands?.[ep.ID] ?? []) {
            const match = (ep.command as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === want.cluster && call[1] === want.command);
            expect(match, `command ${want.cluster}.${want.command} (EP${ep.ID})`).toBeDefined();
            expect(match?.[2]).toStrictEqual(want.payload);
        }
    }

    return definition;
}

type ReportingItem = {attribute: string; minimumReportInterval: number; maximumReportInterval: number; reportableChange: number | null | typeof NaN};

async function runInovelliConfigure(device: MockConfiguredDevice): Promise<string[]> {
    const definition = await findByDevice(device);
    patchDeviceForConfigure(device);
    await definition.configure(device, device.getEndpoint(1), definition);
    return collectReadAttributes(device);
}

describe("Inovelli toZigbee converters", () => {
    describe("inovelli_parameters (write + get)", () => {
        it("convertSet for an enum attribute should write mapped numeric value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "switchType");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {switchType: "3-Way Dumb Switch"}});

            const result = await converter.convertSet(endpoint, "switchType", "3-Way Dumb Switch", meta);

            expect(endpoint.write).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                {22: {value: 1, type: expect.any(Number)}},
                {manufacturerCode: 0x122f},
            );
            expect(result).toStrictEqual({state: {switchType: "3-Way Dumb Switch"}});
        });

        it("convertSet for a numeric attribute should write raw numeric value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {dimmingSpeedUpRemote: 50}});

            const result = await converter.convertSet(endpoint, "dimmingSpeedUpRemote", 50, meta);

            expect(endpoint.write).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                {1: {value: 50, type: expect.any(Number)}},
                {manufacturerCode: 0x122f},
            );
            expect(result).toStrictEqual({state: {dimmingSpeedUpRemote: 50}});
        });

        it("convertGet should read from the cluster with manufacturer code", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(endpoint, "dimmingSpeedUpRemote", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificInovelli", ["dimmingSpeedUpRemote"], {manufacturerCode: 0x122f});
        });

        it("convertSet should return undefined for unknown key", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {nonExistentKey: 42}});

            const result = await converter.convertSet(endpoint, "nonExistentKey", 42, meta);
            expect(result).toBeUndefined();
        });
    });

    describe("VZM36 endpoint resolution", () => {
        it("convertSet with suffixed key should write to the correct endpoint", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote_2");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            // biome-ignore lint/style/useNamingConvention: matches device attribute key format
            const meta = buildMeta(device, {mapped: definition, message: {dimmingSpeedUpRemote_2: 25}});

            await converter.convertSet(ep1, "dimmingSpeedUpRemote_2", 25, meta);

            expect(ep2.write).toHaveBeenCalledWith("manuSpecificInovelli", {1: {value: 25, type: expect.any(Number)}}, {manufacturerCode: 0x122f});
            expect(ep1.write).not.toHaveBeenCalled();
        });

        it("convertGet with suffixed key should read from the correct endpoint", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote_2");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "dimmingSpeedUpRemote_2", meta);

            expect(ep2.read).toHaveBeenCalledWith("manuSpecificInovelli", ["dimmingSpeedUpRemote"], {manufacturerCode: 0x122f});
            expect(ep1.read).not.toHaveBeenCalled();
        });
    });

    describe("inovelli_parameters_readOnly", () => {
        it("convertGet should read from cluster with manufacturer code", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "internalTemperature");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(endpoint, "internalTemperature", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificInovelli", ["internalTemperature"], {manufacturerCode: 0x122f});
        });

        it("converter should not have convertSet", async () => {
            const {definition} = await setupVZM31();
            const converter = findTzConverter(definition, "internalTemperature");
            expect(converter.convertSet).toBeUndefined();
        });
    });

    describe("LED effect commands", () => {
        it("inovelli_led_effect should send ledEffect command with correct params", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {effect: "chase", color: 100, level: 80, duration: 30};
            const meta = buildMeta(device, {mapped: definition, message: {led_effect: values}});

            const result = await converter.convertSet(endpoint, "led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "ledEffect",
                {effect: 5, color: 100, level: 80, duration: 30},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {led_effect: values}});
        });

        it("inovelli_led_effect should clamp values", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {effect: "solid", color: 300, level: 200, duration: 999};
            const meta = buildMeta(device, {mapped: definition, message: {led_effect: values}});

            await converter.convertSet(endpoint, "led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "ledEffect",
                {effect: 1, color: 255, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("inovelli_individual_led_effect should convert 1-based to 0-based LED number", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "1", effect: "solid", color: 50, level: 50, duration: 10};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            const result = await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 0, effect: 1, color: 50, level: 50, duration: 10},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {individual_led_effect: values}});
        });

        it("inovelli_individual_led_effect LED 7 -> sent as 6", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "7", effect: "pulse", color: 200, level: 100, duration: 255};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 6, effect: 4, color: 200, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("inovelli_individual_led_effect should clamp values", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "99", effect: "off", color: 500, level: 300, duration: 999};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 6, effect: 0, color: 255, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });

    describe("energy_reset", () => {
        it("should send energyReset command with empty payload", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "energy_reset");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {energy_reset: ""}});

            await converter.convertSet(endpoint, "energy_reset", "", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "energyReset",
                {},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });

    describe("light_onoff_brightness_inovelli", () => {
        it("off with no transition -> delegates to on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "OFF"}, state: {state: "ON"}});

            await converter.convertSet(endpoint, "state", "OFF", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.any(Object));
        });

        it("toggle with no transition -> uses on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "toggle"}, state: {state: "ON"}});

            const result = await converter.convertSet(endpoint, "state", "toggle", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "toggle", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {state: "OFF"}});
        });

        it("on with brightness + no transition -> uses 0xffff transtime", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON", brightness: 128}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                expect.objectContaining({level: 128, transtime: 0xffff}),
                expect.any(Object),
            );
        });

        it("on with explicit transition -> uses that transition value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON", brightness: 200, transition: 2}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                expect.objectContaining({level: 200, transtime: 20}),
                expect.any(Object),
            );
        });

        it("on with no brightness and no transition -> uses on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON"}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", expect.any(String), expect.any(Object), expect.any(Object));
        });
    });

    describe("fan_mode toZigbee (VZM35-SN)", () => {
        // `low`/`medium`/`high` map to the same levels that the fromZigbee path parses back; `transtime=0xffff`
        // signals "no transition" to the firmware. `state: "ON"` is implicitly added to the returned state.
        it.each([
            {fan_mode: "low", level: 2},
            {fan_mode: "medium", level: 86},
            {fan_mode: "high", level: 170},
        ])("sends moveToLevelWithOnOff level=$level for fan_mode=$fan_mode", async ({fan_mode, level}) => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode}, state: {}});

            const result = await converter.convertSet(ep1, "fan_mode", fan_mode, meta);

            expect(ep1.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
            expect(result).toStrictEqual({state: {fan_mode, state: "ON"}});
        });

        it("convertGet should read currentLevel from the correct endpoint", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "fan_mode", meta);

            expect(ep1.read).toHaveBeenCalledWith("genLevelCtrl", ["currentLevel"]);
        });
    });

    describe("fan_mode toZigbee (VZM36 EP2)", () => {
        it("should return fan_state ON when endpointId is 2", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode: "low"}, state: {}});

            const result = await converter.convertSet(ep1, "fan_mode", "low", meta);

            expect(ep2.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level: 2, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
            expect(result).toStrictEqual({state: {fan_mode: "low", fan_state: "ON"}});
        });
    });

    describe("fan_state toZigbee (VZM35-SN)", () => {
        it("should delegate to on_off and remap state to fan_state", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_state: "ON"}, state: {fan_state: "OFF"}});

            const result = await converter.convertSet(ep1, "fan_state", "ON", meta);

            expect(ep1.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {fan_state: "ON"}});
        });

        it("should handle OFF state", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_state: "OFF"}, state: {fan_state: "ON"}});

            const result = await converter.convertSet(ep1, "fan_state", "OFF", meta);

            expect(ep1.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {fan_state: "OFF"}});
        });

        it("convertGet should read onOff", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "fan_state", meta);

            expect(ep1.read).toHaveBeenCalledWith("genOnOff", ["onOff"]);
        });
    });

    describe("breezeMode toZigbee (VZM35-SN)", () => {
        it("should encode full 5-speed config into packed integer", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "breezeMode");
            const ep1 = device.getEndpoint(1);
            const value = {
                speed1: "low",
                time1: 10,
                speed2: "medium",
                time2: 15,
                speed3: "high",
                time3: 20,
                speed4: "low",
                time4: 5,
                speed5: "medium",
                time5: 10,
            };
            const meta = buildMeta(device, {mapped: definition, message: {breezeMode: value}});

            const result = await converter.convertSet(ep1, "breezeMode", value, meta);

            expect(result).toStrictEqual({state: {breezeMode: value}});

            const expectedValue = 1 + 8 + 128 + 768 + 12288 + 65536 + 262144 + 1048576 + 33554432 + 134217728;
            expect(ep1.write).toHaveBeenCalledWith("manuSpecificInovelli", {breezeMode: expectedValue.toString()}, {manufacturerCode: 0x122f});
        });

        it("should terminate early when speed2 is off", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "breezeMode");
            const ep1 = device.getEndpoint(1);
            const value = {
                speed1: "high",
                time1: 5,
                speed2: "off",
                time2: 0,
                speed3: "low",
                time3: 10,
                speed4: "medium",
                time4: 15,
                speed5: "high",
                time5: 20,
            };
            const meta = buildMeta(device, {mapped: definition, message: {breezeMode: value}});

            await converter.convertSet(ep1, "breezeMode", value, meta);

            const expectedValue = 3 + 4;
            expect(ep1.write).toHaveBeenCalledWith("manuSpecificInovelli", {breezeMode: expectedValue.toString()}, {manufacturerCode: 0x122f});
        });
    });

    describe("mmWave toZigbee (VZM32-SN)", () => {
        // mmwave_control_commands maps a string command to a numeric controlID that the firmware accepts.
        it.each([
            {controlID: "reset_mmwave_module", id: 0},
            {controlID: "set_interference", id: 1},
            {controlID: "query_areas", id: 2},
        ])("mmwave_control_commands maps $controlID to controlID $id", async ({controlID, id}) => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_control_commands");
            const endpoint = device.getEndpoint(1);
            const values = {controlID};
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_control_commands: values}});

            const result = await converter.convertSet(endpoint, "mmwave_control_commands", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: id},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {mmwave_control_commands: values}});
        });

        it("mmwave_detection_areas should send setDetectionArea for each area", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_detection_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area1: {width_min: -100, width_max: 100, depth_min: 0, depth_max: 500, height_min: -50, height_max: 200},
                area2: {width_min: -200, width_max: 200, depth_min: 50, depth_max: 600, height_min: 0, height_max: 300},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_detection_areas: values}});

            const result = await converter.convertSet(endpoint, "mmwave_detection_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setDetectionArea",
                {areaId: 0, xMin: -100, xMax: 100, yMin: 0, yMax: 500, zMin: -50, zMax: 200},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setDetectionArea",
                {areaId: 1, xMin: -200, xMax: 200, yMin: 50, yMax: 600, zMin: 0, zMax: 300},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: 2},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {mmwave_detection_areas: {area1: values.area1, area2: values.area2}},
            });
        });

        it("mmwave_interference_areas should send setInterferenceArea", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_interference_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area3: {width_min: -300, width_max: 300, depth_min: 100, depth_max: 700, height_min: 10, height_max: 400},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_interference_areas: values}});

            await converter.convertSet(endpoint, "mmwave_interference_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setInterferenceArea",
                {areaId: 2, xMin: -300, xMax: 300, yMin: 100, yMax: 700, zMin: 10, zMax: 400},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("mmwave_stay_areas should send setStayArea", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_stay_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area4: {width_min: 0, width_max: 150, depth_min: 0, depth_max: 250, height_min: 0, height_max: 100},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_stay_areas: values}});

            await converter.convertSet(endpoint, "mmwave_stay_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setStayArea",
                {areaId: 3, xMin: 0, xMax: 150, yMin: 0, yMax: 250, zMin: 0, zMax: 100},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });
});

describe("Inovelli VZM36 endpoint routing", () => {
    let definition: Definition;

    beforeAll(async () => {
        ({definition} = await setupVZM36());
        expect(definition.model).toBe("VZM36");
    });

    describe("genOnOff from endpoint 2 (fan)", () => {
        it("should set fan_state without affecting light state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 2);
            expect(payload).toStrictEqual({fan_state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 2);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({fan_state: "OFF"});
        });
    });

    describe("genOnOff from endpoint 1 (light)", () => {
        it("should set light state without affecting fan_state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 1);
            expect(payload).toStrictEqual({state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 1);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({state: "OFF"});
        });
    });

    describe("genLevelCtrl from endpoint 2 (fan)", () => {
        it("should set fan_mode without affecting light brightness", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 33}, 2);
            expect(payload).not.toHaveProperty("brightness");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toHaveProperty("fan_mode");
        });
    });

    describe("genLevelCtrl from endpoint 1 (light)", () => {
        it("should set brightness without affecting fan_mode", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
            expect(payload).not.toHaveProperty("fan_mode");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toStrictEqual({brightness: 200});
        });
    });
});

function resolveExposes(definition: Definition, device: ReturnType<typeof mockDevice>): Expose[] {
    if (typeof definition.exposes === "function") {
        return definition.exposes(device, {});
    }
    return definition.exposes as Expose[];
}

function findExpose(exposes: Expose[], name: string): Expose | undefined {
    return exposes.find((exp) => exp.name === name);
}

function assertExpose(exposes: Expose[], name: string): Expose {
    const expose = exposes.find((exp) => exp.name === name);
    expect(expose).toBeDefined();
    return expose as Expose;
}

function getEnumValues(expose: Expose): (string | number)[] {
    expect(expose.type).toBe("enum");
    return (expose as {values: (string | number)[]} & Expose).values;
}

describe("Inovelli baseline exposes", () => {
    it("VZM30-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM30();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "humidity",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "mediumLevelForFanControlMode",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "temperature",
            "voltage",
        ]);
    });

    it("VZM31-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM31();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxDetectionLevel",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingAlgorithm",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "dumbDetectionLevel",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "relayClick",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM32-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM32();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "area1Occupancy",
            "area2Occupancy",
            "area3Occupancy",
            "area4Occupancy",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "illuminance",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "mmWaveDepthMax",
            "mmWaveDepthMin",
            "mmWaveDetectSensitivity",
            "mmWaveDetectTrigger",
            "mmWaveHeightMax",
            "mmWaveHeightMin",
            "mmWaveHoldTime",
            "mmWaveRoomSizePreset",
            "mmWaveStayLife",
            "mmWaveTargetInfoReport",
            "mmWaveVersion",
            "mmWaveWidthMax",
            "mmWaveWidthMin",
            "mmwaveControlWiredDevice",
            "mmwave_control_commands",
            "mmwave_detection_areas",
            "mmwave_interference_areas",
            "mmwave_stay_areas",
            "mmwave_targets",
            "notificationComplete",
            "occupancy",
            "onOffLedMode",
            "otaImageType",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "voltage",
        ]);
    });

    it("VZM35-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM35();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "breeze mode",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "nonNeutralAuxLowGear",
            "nonNeutralAuxMediumGear",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "powerType",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM36 should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM36();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "autoTimerOff_1",
            "autoTimerOff_2",
            "breeze mode",
            "defaultLevelRemote_1",
            "defaultLevelRemote_2",
            "dimmingMode_1",
            "dimmingSpeedDownRemote_1",
            "dimmingSpeedDownRemote_2",
            "dimmingSpeedUpRemote_1",
            "dimmingSpeedUpRemote_2",
            "higherOutputInNonNeutral_1",
            "identify",
            "ledColorWhenOn_1",
            "ledIntensityWhenOn_1",
            "maximumLevel_1",
            "maximumLevel_2",
            "minimumLevel_1",
            "minimumLevel_2",
            "outputMode_1",
            "outputMode_2",
            "quickStartLevel_1",
            "quickStartTime_1",
            "quickStartTime_2",
            "rampRateOffToOnRemote_1",
            "rampRateOffToOnRemote_2",
            "rampRateOnToOffRemote_1",
            "rampRateOnToOffRemote_2",
            "smartBulbMode_1",
            "smartBulbMode_2",
            "stateAfterPowerRestored_1",
            "stateAfterPowerRestored_2",
        ]);
    });
});

describe("Inovelli firmware-gated exposes", () => {
    /**
     * VZM31-SN is the only model whose exposes depend on firmware: `Single-Pole Full Sine Wave` is
     * removed from `switchType` starting at fw 3.0, `Toggle` is added to `fanControlMode` at fw 3.0,
     * `dimmingAlgorithm`/`auxDetectionLevel` appear at fw 3.05, and `dumbDetectionLevel` appears at 3.07.
     * When firmware is unknown (undefined) we expose *everything* so the UI has maximum capabilities.
     */
    describe.each([
        {fw: undefined, singlePoleFullSine: true, fanToggle: true, dimmingAlgo: true, auxDetection: true, dumbDetection: true},
        {fw: "2.18", singlePoleFullSine: true, fanToggle: false, dimmingAlgo: false, auxDetection: false, dumbDetection: false},
        {fw: "3.0", singlePoleFullSine: false, fanToggle: true, dimmingAlgo: false, auxDetection: false, dumbDetection: false},
        {fw: "3.04", singlePoleFullSine: false, fanToggle: true, dimmingAlgo: false, auxDetection: false, dumbDetection: false},
        {fw: "3.05", singlePoleFullSine: false, fanToggle: true, dimmingAlgo: true, auxDetection: true, dumbDetection: false},
        {fw: "3.07", singlePoleFullSine: false, fanToggle: true, dimmingAlgo: true, auxDetection: true, dumbDetection: true},
    ])("VZM31-SN firmware $fw", ({fw, singlePoleFullSine, fanToggle, dimmingAlgo, auxDetection, dumbDetection}) => {
        let exposes: Expose[];

        beforeAll(async () => {
            const {device, definition} = await setupVZM31(fw);
            exposes = resolveExposes(definition, device);
        });

        it(`switchType ${singlePoleFullSine ? "includes" : "excludes"} Single-Pole Full Sine Wave`, () => {
            const values = getEnumValues(assertExpose(exposes, "switchType"));
            if (singlePoleFullSine) {
                expect(values).toContain("Single-Pole Full Sine Wave");
            } else {
                expect(values).not.toContain("Single-Pole Full Sine Wave");
            }
        });

        it(`fanControlMode ${fanToggle ? "includes" : "excludes"} Toggle`, () => {
            const values = getEnumValues(assertExpose(exposes, "fanControlMode"));
            if (fanToggle) {
                expect(values).toContain("Toggle");
            } else {
                expect(values).not.toContain("Toggle");
            }
        });

        it.each([
            {attr: "dimmingAlgorithm", present: dimmingAlgo},
            {attr: "auxDetectionLevel", present: auxDetection},
            {attr: "dumbDetectionLevel", present: dumbDetection},
        ])("$attr is $present", ({attr, present}) => {
            if (present) {
                expect(findExpose(exposes, attr)).toBeDefined();
            } else {
                expect(findExpose(exposes, attr)).toBeUndefined();
            }
        });
    });

    /**
     * VZM30/VZM32/VZM35 all hard-code the non-firmware-gated behavior: `switchType` is always
     * `["Single Pole", "Aux Switch"]`, `fanControlMode` always includes `Toggle`, and the three
     * firmware-gated dimmer attributes (`dimmingAlgorithm`, `auxDetectionLevel`, `dumbDetectionLevel`)
     * are never exposed. Parameterize by (model, firmware) to exercise both low/high firmware paths.
     */
    describe.each([
        {model: "VZM30-SN", setup: setupVZM30, fw: "2.18"},
        {model: "VZM30-SN", setup: setupVZM30, fw: "3.05"},
        {model: "VZM32-SN", setup: setupVZM32, fw: "1.0"},
        {model: "VZM32-SN", setup: setupVZM32, fw: "1.15"},
        {model: "VZM35-SN", setup: setupVZM35, fw: "2.18"},
        {model: "VZM35-SN", setup: setupVZM35, fw: "3.05"},
    ])("$model firmware $fw: model-independent exposes", ({setup, fw}) => {
        let exposes: Expose[];

        beforeAll(async () => {
            const {device, definition} = await setup(fw);
            exposes = resolveExposes(definition, device);
        });

        it("switchType is exactly ['Single Pole', 'Aux Switch']", () => {
            expect(getEnumValues(assertExpose(exposes, "switchType"))).toStrictEqual(["Single Pole", "Aux Switch"]);
        });

        it("fanControlMode includes Toggle", () => {
            expect(getEnumValues(assertExpose(exposes, "fanControlMode"))).toContain("Toggle");
        });

        it.each(["dimmingAlgorithm", "auxDetectionLevel", "dumbDetectionLevel"])("%s is not exposed", (attr) => {
            expect(findExpose(exposes, attr)).toBeUndefined();
        });
    });
});

describe("Inovelli configure attribute filtering", () => {
    /**
     * Firmware gating of the VZM31-SN parameter-read list mirrors the expose gating: below 3.05 the
     * device doesn't implement `dimmingAlgorithm`/`auxDetectionLevel`, and `dumbDetectionLevel` arrives
     * at 3.07. Crucially, when firmware is unknown (undefined) we read *all* parameters so the UI has
     * the freshest possible state even if the exposes list under-specifies. VZM30/VZM32 hard-code the
     * gating to "never" since those models never implement those parameters at any firmware.
     */
    const VZM31_ENDPOINTS = [
        {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering"]},
        {ID: 2, inputClusters: []},
        {ID: 3, inputClusters: []},
    ];
    const VZM32_ENDPOINTS = [
        {
            ID: 1,
            inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering", "msIlluminanceMeasurement", "msOccupancySensing"],
        },
        {ID: 2, inputClusters: []},
        {ID: 3, inputClusters: []},
    ];
    const VZM30_ENDPOINTS = [
        {
            ID: 1,
            inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering", "msTemperatureMeasurement", "msRelativeHumidity"],
        },
        {ID: 2, inputClusters: []},
        {ID: 3, inputClusters: []},
        {ID: 4, inputClusters: []},
    ];

    describe.each([
        // VZM31: firmware-gated
        {model: "VZM31-SN", endpoints: VZM31_ENDPOINTS, fw: "3.0", dimmingAlgo: false, auxDetection: false, dumbDetection: false},
        {model: "VZM31-SN", endpoints: VZM31_ENDPOINTS, fw: "3.05", dimmingAlgo: true, auxDetection: true, dumbDetection: false},
        {model: "VZM31-SN", endpoints: VZM31_ENDPOINTS, fw: "3.07", dimmingAlgo: true, auxDetection: true, dumbDetection: true},
        {model: "VZM31-SN", endpoints: VZM31_ENDPOINTS, fw: undefined, dimmingAlgo: true, auxDetection: true, dumbDetection: true},
        // VZM32 and VZM30: never
        {model: "VZM32-SN", endpoints: VZM32_ENDPOINTS, fw: "3.05", dimmingAlgo: false, auxDetection: false, dumbDetection: false},
        {model: "VZM30-SN", endpoints: VZM30_ENDPOINTS, fw: "3.05", dimmingAlgo: false, auxDetection: false, dumbDetection: false},
    ])("$model configure (firmware $fw)", ({model, endpoints, fw, dimmingAlgo, auxDetection, dumbDetection}) => {
        let readKeys: string[];

        beforeAll(async () => {
            readKeys = await runInovelliConfigure(mockDevice({modelID: model, endpoints, softwareBuildID: fw}));
        });

        it("reads common attributes switchType and fanControlMode", () => {
            expect(readKeys).toContain("switchType");
            expect(readKeys).toContain("fanControlMode");
        });

        it.each([
            {attr: "dimmingAlgorithm", read: dimmingAlgo},
            {attr: "auxDetectionLevel", read: auxDetection},
            {attr: "dumbDetectionLevel", read: dumbDetection},
        ])("$attr is $read", ({attr, read}) => {
            if (read) {
                expect(readKeys).toContain(attr);
            } else {
                expect(readKeys).not.toContain(attr);
            }
        });
    });
});

// Fine-grained bind/read/configureReporting assertions for VZM35-SN and VZM36 live in their
// `assertInovelliIntegration` blocks at the bottom of this file; here we just aggregate the OTA check
// across all 5 Inovelli definitions, which the per-model integration tests don't exercise together.
describe("Inovelli OTA", () => {
    it("should set ota: true on every Inovelli device definition", () => {
        expect(inovelliDeviceDefinitions).toHaveLength(5);
        expect(inovelliDeviceDefinitions.every((d) => d.ota === true)).toBe(true);
    });
});

describe("Inovelli fromZigbee converters", () => {
    describe("VZM31-SN", () => {
        let definition: Definition;

        beforeAll(async () => {
            ({definition} = await setupVZM31());
            expect(definition.model).toBe("VZM31-SN");
        });

        describe("button scene actions (raw EP2)", () => {
            // The raw frame layout is `[_, _, button, tap, _, marker, _...]`: button index (1=down,2=up,3=config,
            // 4-6=aux_*) and tap (0=single..6=quintuple). Only fires when endpoint=2 AND marker (data[4])=0x00.
            it.each([
                {button: 1, tap: 0, expected: "down_single"},
                {button: 2, tap: 3, expected: "up_double"},
                {button: 3, tap: 2, expected: "config_held"},
                {button: 4, tap: 6, expected: "aux_down_quintuple"},
                {button: 5, tap: 1, expected: "aux_up_release"},
                {button: 6, tap: 4, expected: "aux_config_triple"},
            ])("parses button=$button tap=$tap as $expected on EP2", ({button, tap, expected}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", rawInovelliEp2Scene(0x00, button, tap), 2);
                expect(payload).toHaveProperty("action", expected);
            });

            it.each([
                {label: "wrong endpoint (EP1)", marker: 0x00, endpoint: 1},
                {label: "wrong marker (data[4]=0x01)", marker: 0x01, endpoint: 2},
            ])("does not fire on $label", ({marker, endpoint}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", rawInovelliEp2Scene(marker, 1, 0), endpoint);
                expect(payload).not.toHaveProperty("action");
            });
        });

        describe("custom cluster attribute reports with enum lookup", () => {
            // Enum-valued attributes get reverse-looked up to human-readable strings; numeric attributes pass through
            // unchanged. `attributeReport` and `readResponse` must be treated identically by the converter.
            it.each([
                {label: "switchType=0 -> 'Single Pole'", type: "attributeReport", attrs: {switchType: 0}, expected: {switchType: "Single Pole"}},
                {
                    label: "switchType=2 -> '3-Way Aux Switch' (via readResponse)",
                    type: "readResponse",
                    attrs: {switchType: 2},
                    expected: {switchType: "3-Way Aux Switch"},
                },
                {label: "outputMode=1 -> 'On/Off'", type: "attributeReport", attrs: {outputMode: 1}, expected: {outputMode: "On/Off"}},
                {label: "numeric pass-through", type: "attributeReport", attrs: {dimmingSpeedUpRemote: 50}, expected: {dimmingSpeedUpRemote: 50}},
                {
                    label: "readResponse numeric pass-through",
                    type: "readResponse",
                    attrs: {dimmingSpeedUpRemote: 25},
                    expected: {dimmingSpeedUpRemote: 25},
                },
                {
                    label: "mixed enum + numeric in one message",
                    type: "attributeReport",
                    attrs: {switchType: 1, dimmingSpeedUpRemote: 42},
                    expected: {switchType: "3-Way Dumb Switch", dimmingSpeedUpRemote: 42},
                },
            ])("$label", ({type, attrs, expected}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", type, attrs, 1);
                for (const [key, value] of Object.entries(expected)) {
                    expect(payload).toHaveProperty(key, value);
                }
            });
        });

        describe("LED effect complete", () => {
            // notificationType 0..6 -> LED_1..LED_7 (1-indexed), 16 -> ALL_LEDS, -1 -> CONFIG_BUTTON_DOUBLE_PRESS,
            // any other value -> "Unknown" fallback to keep the pipeline resilient.
            it.each([
                {notificationType: 0, expected: "LED_1"},
                {notificationType: 3, expected: "LED_4"},
                {notificationType: 6, expected: "LED_7"},
                {notificationType: 16, expected: "ALL_LEDS"},
                {notificationType: -1, expected: "CONFIG_BUTTON_DOUBLE_PRESS"},
                {notificationType: 99, expected: "Unknown"},
            ])("maps notificationType=$notificationType to $expected", ({notificationType, expected}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType}, 1);
                expect(payload).toStrictEqual({notificationComplete: expected});
            });
        });

        describe("brightness (EP1 only)", () => {
            it("should return brightness for EP1", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
                expect(payload).toHaveProperty("brightness", 200);
            });

            it("should not return brightness for EP2", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 2);
                expect(payload).not.toHaveProperty("brightness");
            });
        });
    });

    describe("VZM35-SN fan converters", () => {
        let definition: Definition;

        beforeAll(async () => {
            ({definition} = await setupVZM35());
            expect(definition.model).toBe("VZM35-SN");
        });

        describe("fan_mode", () => {
            // Fan level boundaries (from fzLocal.fan_mode): <=85 low, <=170 medium, else high. Smart (4) is
            // a sentinel value, and 0 falls back to 1 => low via the `|| 1` guard in the converter.
            it.each([
                {currentLevel: 2, expected: "low"},
                {currentLevel: 86, expected: "medium"},
                {currentLevel: 170, expected: "high"},
                {currentLevel: 255, expected: "high"},
                {currentLevel: 4, expected: "smart"},
                {currentLevel: 0, expected: "low"},
            ])("maps currentLevel=$currentLevel to $expected on EP1", ({currentLevel, expected}) => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel}, 1);
                expect(payload).toHaveProperty("fan_mode", expected);
            });

            it("does not fire on wrong endpoint", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 86}, 2);
                expect(payload).not.toHaveProperty("fan_mode");
            });
        });

        describe("fan_state", () => {
            it.each([
                {onOff: 1, expected: "ON"},
                {onOff: 0, expected: "OFF"},
            ])("returns fan_state=$expected for onOff=$onOff on EP1", ({onOff, expected}) => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff}, 1);
                expect(payload).toHaveProperty("fan_state", expected);
            });

            it.each([
                {label: "wrong endpoint", msg: {onOff: 1}, endpoint: 2},
                {label: "missing onOff attribute", msg: {}, endpoint: 1},
            ])("does not fire on $label", ({msg, endpoint}) => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", msg, endpoint);
                expect(payload).not.toHaveProperty("fan_state");
            });
        });

        describe("breeze mode decoding", () => {
            it("should decode a known packed integer", () => {
                // Encoded: speed1=low(1) dur1=10s, speed2=medium(2) dur2=15s, speed3=high(3) dur3=20s,
                //          speed4=low(1) dur4=25s, speed5=off(0) dur5=0s
                const raw = 1 | (2 << 2) | (2 << 6) | (3 << 8) | (3 << 12) | (4 << 14) | (1 << 18) | (5 << 20);
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: raw}, 1);
                expect(payload).toHaveProperty("breeze_mode");
                expect(payload.breeze_mode).toStrictEqual({
                    speed1: "low",
                    duration1: 10,
                    speed2: "medium",
                    duration2: 15,
                    speed3: "high",
                    duration3: 20,
                    speed4: "low",
                    duration4: 25,
                    speed5: "off",
                    duration5: 0,
                });
            });

            it("should decode value 0 as all off", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: 0}, 1);
                expect(payload).toHaveProperty("breeze_mode");
                expect(payload.breeze_mode).toStrictEqual({
                    speed1: "off",
                    duration1: 0,
                    speed2: "off",
                    duration2: 0,
                    speed3: "off",
                    duration3: 0,
                    speed4: "off",
                    duration4: 0,
                    speed5: "off",
                    duration5: 0,
                });
            });

            it("should not fire on wrong endpoint", () => {
                const raw = 1 | (2 << 2) | (2 << 6) | (3 << 8);
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: raw}, 2);
                expect(payload).not.toHaveProperty("breeze_mode");
            });
        });
    });

    describe("VZM36 split endpoint attribute reports", () => {
        let definition: Definition;

        beforeAll(async () => {
            ({definition} = await setupVZM36());
            expect(definition.model).toBe("VZM36");
        });

        // Split-by-endpoint attributes get an `_1`/`_2` suffix based on endpoint, and enum values can
        // diverge per endpoint (EP1 dimmer is "Dimmer", EP2 fan is "Exhaust Fan (On/Off)" for the same value).
        it.each<{label: string; endpoint: number; attr: Record<string, unknown>; expectedKey: string; expectedValue: unknown}>([
            {label: "EP1 enum (dimmer)", endpoint: 1, attr: {outputMode: 0}, expectedKey: "outputMode_1", expectedValue: "Dimmer"},
            {label: "EP2 enum (fan variant)", endpoint: 2, attr: {outputMode: 1}, expectedKey: "outputMode_2", expectedValue: "Exhaust Fan (On/Off)"},
            {label: "EP1 numeric", endpoint: 1, attr: {dimmingSpeedUpRemote: 42}, expectedKey: "dimmingSpeedUpRemote_1", expectedValue: 42},
            {label: "EP2 numeric", endpoint: 2, attr: {dimmingSpeedUpRemote: 99}, expectedKey: "dimmingSpeedUpRemote_2", expectedValue: 99},
        ])("suffixes $label with the right endpoint id", ({endpoint, attr, expectedKey, expectedValue}) => {
            const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", attr, endpoint);
            expect(payload).toHaveProperty(expectedKey, expectedValue);
        });
    });

    describe("VZM32-SN mmWave converters", () => {
        let definition: Definition;

        beforeAll(async () => {
            ({definition} = await setupVZM32());
            expect(definition.model).toBe("VZM32-SN");
        });

        describe("report_target_info", () => {
            it("should parse a single target from buffer", () => {
                const buf = Buffer.alloc(10);
                buf.writeInt16LE(100, 0);
                buf.writeInt16LE(-50, 2);
                buf.writeInt16LE(200, 4);
                buf.writeInt16LE(10, 6);
                buf.writeInt16LE(1, 8);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 1, targets: buf},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_targets: [{id: 1, x: 100, y: -50, z: 200, dop: 10}],
                });
            });

            it("should parse two targets from buffer", () => {
                const buf = Buffer.alloc(20);
                buf.writeInt16LE(100, 0);
                buf.writeInt16LE(-50, 2);
                buf.writeInt16LE(200, 4);
                buf.writeInt16LE(10, 6);
                buf.writeInt16LE(1, 8);
                buf.writeInt16LE(-100, 10);
                buf.writeInt16LE(50, 12);
                buf.writeInt16LE(-200, 14);
                buf.writeInt16LE(20, 16);
                buf.writeInt16LE(2, 18);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 2, targets: buf},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_targets: [
                        {id: 1, x: 100, y: -50, z: 200, dop: 10},
                        {id: 2, x: -100, y: 50, z: -200, dop: 20},
                    ],
                });
            });

            it("should limit targets to buffer capacity when targetNum exceeds it", () => {
                const buf = Buffer.alloc(10);
                buf.writeInt16LE(50, 0);
                buf.writeInt16LE(60, 2);
                buf.writeInt16LE(70, 4);
                buf.writeInt16LE(80, 6);
                buf.writeInt16LE(3, 8);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 5, targets: buf},
                    1,
                );
                expect(payload.mmwave_targets).toHaveLength(1);
            });
        });

        describe("report_areas", () => {
            const areaData = {
                xMin1: -100,
                xMax1: 100,
                yMin1: -200,
                yMax1: 200,
                zMin1: 0,
                zMax1: 300,
                xMin2: -50,
                xMax2: 50,
                yMin2: -100,
                yMax2: 100,
                zMin2: 10,
                zMax2: 150,
                xMin3: 0,
                xMax3: 75,
                yMin3: 0,
                yMax3: 75,
                zMin3: 5,
                zMax3: 100,
                xMin4: -25,
                xMax4: 25,
                yMin4: -50,
                yMax4: 50,
                zMin4: 0,
                zMax4: 50,
            };

            const expectedAreas = {
                area1: {width_min: -100, width_max: 100, depth_min: -200, depth_max: 200, height_min: 0, height_max: 300},
                area2: {width_min: -50, width_max: 50, depth_min: -100, depth_max: 100, height_min: 10, height_max: 150},
                area3: {width_min: 0, width_max: 75, depth_min: 0, depth_max: 75, height_min: 5, height_max: 100},
                area4: {width_min: -25, width_max: 25, depth_min: -50, depth_max: 50, height_min: 0, height_max: 50},
            };

            // Three separate commands share identical area-packing semantics but publish to different payload keys.
            it.each([
                {command: "commandReportDetectionArea", payloadKey: "mmwave_detection_areas"},
                {command: "commandReportInterferenceArea", payloadKey: "mmwave_interference_areas"},
                {command: "commandReportStayArea", payloadKey: "mmwave_stay_areas"},
            ])("$command maps to $payloadKey", ({command, payloadKey}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelliMMWave", command, areaData, 1);
                expect(payload).toStrictEqual({[payloadKey]: expectedAreas});
            });
        });

        describe("anyone_in_reporting_area", () => {
            // Each area's occupancy flag (0/1) is normalized to a boolean on `mmwave_areaN_occupancy`.
            it.each([
                {label: "mixed", input: {area1: 1, area2: 0, area3: 1, area4: 0}, expected: [true, false, true, false]},
                {label: "all occupied", input: {area1: 1, area2: 1, area3: 1, area4: 1}, expected: [true, true, true, true]},
                {label: "all unoccupied", input: {area1: 0, area2: 0, area3: 0, area4: 0}, expected: [false, false, false, false]},
            ])("$label area occupancy", ({input, expected}) => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelliMMWave", "commandAnyoneInReportingArea", input, 1);
                expect(payload).toStrictEqual({
                    mmwave_area1_occupancy: expected[0],
                    mmwave_area2_occupancy: expected[1],
                    mmwave_area3_occupancy: expected[2],
                    mmwave_area4_occupancy: expected[3],
                });
            });
        });
    });
});

describe("Inovelli VZM31-SN definition integration", () => {
    it("matches expected integration shape for firmware 3.07 (all firmware-gated attributes enabled)", async () => {
        const device = mockDevice({
            modelID: "VZM31-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering"]},
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID: "3.07",
        });

        await assertInovelliIntegration({
            model: "VZM31-SN",
            device,
            meta: {multiEndpoint: true, multiEndpointSkip: ["state", "power", "energy", "brightness"]},
            // 8 converters: light (on_off EP1 + brightness + level_config + power_on_behavior), device (led_effect_complete + main),
            // electricityMeter (electrical_measurement + metering).
            fromZigbeeFingerprint: [
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["commandLedEffectComplete"]},
                {cluster: "manuSpecificInovelli", type: ["raw", "readResponse", "attributeReport"]},
                {cluster: "haElectricalMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "seMetering", type: ["attributeReport", "readResponse"]},
            ],
            toZigbeeKeysContain: [
                // light() extend
                "state",
                "brightness",
                "brightness_percent",
                "transition",
                "power_on_behavior",
                "level_config",
                "brightness_move",
                "brightness_step",
                // device() extend: LED effect commands and parameter writes
                "led_effect",
                "individual_led_effect",
                "switchType",
                "dimmingSpeedUpRemote",
                "dimmingAlgorithm",
                "auxDetectionLevel",
                "dumbDetectionLevel",
                "internalTemperature",
                "deviceBindNumber",
                // identify + energyReset extends
                "identify",
                "energy_reset",
                // electricityMeter extend
                "power",
                "energy",
            ],
            // electricityMeter is configured with current:false, voltage:false so those props are dropped from exposes.
            toZigbeeKeysOmit: [],
            exposeFingerprints: [
                "action",
                "activeEnergyReports",
                "activePowerReports",
                "autoTimerOff",
                "auxDetectionLevel",
                "auxSwitchUniqueScenes",
                "bindingOffToOnSyncLevel",
                "brightnessLevelForDoubleTapDown",
                "brightnessLevelForDoubleTapUp",
                "buttonDelay",
                "defaultLed1ColorWhenOff",
                "defaultLed1ColorWhenOn",
                "defaultLed1IntensityWhenOff",
                "defaultLed1IntensityWhenOn",
                "defaultLed2ColorWhenOff",
                "defaultLed2ColorWhenOn",
                "defaultLed2IntensityWhenOff",
                "defaultLed2IntensityWhenOn",
                "defaultLed3ColorWhenOff",
                "defaultLed3ColorWhenOn",
                "defaultLed3IntensityWhenOff",
                "defaultLed3IntensityWhenOn",
                "defaultLed4ColorWhenOff",
                "defaultLed4ColorWhenOn",
                "defaultLed4IntensityWhenOff",
                "defaultLed4IntensityWhenOn",
                "defaultLed5ColorWhenOff",
                "defaultLed5ColorWhenOn",
                "defaultLed5IntensityWhenOff",
                "defaultLed5IntensityWhenOn",
                "defaultLed6ColorWhenOff",
                "defaultLed6ColorWhenOn",
                "defaultLed6IntensityWhenOff",
                "defaultLed6IntensityWhenOn",
                "defaultLed7ColorWhenOff",
                "defaultLed7ColorWhenOn",
                "defaultLed7IntensityWhenOff",
                "defaultLed7IntensityWhenOn",
                "defaultLevelLocal",
                "defaultLevelRemote",
                "deviceBindNumber",
                "dimmingAlgorithm",
                "dimmingMode",
                "dimmingSpeedDownLocal",
                "dimmingSpeedDownRemote",
                "dimmingSpeedUpLocal",
                "dimmingSpeedUpRemote",
                "doubleTapClearNotifications",
                "doubleTapDownToParam56",
                "doubleTapUpToParam55",
                "dumbDetectionLevel",
                "energy",
                "energy_reset",
                "fanControlMode",
                "fanLedLevelType",
                "firmwareUpdateInProgressIndicator",
                "highLevelForFanControlMode",
                "higherOutputInNonNeutral",
                "identify",
                "individual_led_effect",
                "internalTemperature",
                "invertSwitch",
                "ledBarScaling",
                "ledColorForFanControlMode",
                "ledColorWhenOff",
                "ledColorWhenOn",
                "ledIntensityWhenOff",
                "ledIntensityWhenOn",
                "led_effect",
                "light(state,brightness)",
                "loadLevelIndicatorTimeout",
                "localProtection",
                "lowLevelForFanControlMode",
                "maximumLevel",
                "mediumLevelForFanControlMode",
                "minimumLevel",
                "notificationComplete",
                "onOffLedMode",
                "outputMode",
                "overheat",
                "periodicPowerAndEnergyReports",
                "power",
                "powerType",
                "quickStartLevel",
                "quickStartTime",
                "rampRateOffToOnLocal",
                "rampRateOffToOnRemote",
                "rampRateOnToOffLocal",
                "rampRateOnToOffRemote",
                "relayClick",
                "remoteProtection",
                "singleTapBehavior",
                "smartBulbMode",
                "stateAfterPowerRestored",
                "switchType",
            ],
            bind: {
                1: ["genOnOff", "genLevelCtrl", "manuSpecificInovelli", "haElectricalMeasurement", "seMetering"],
                2: ["manuSpecificInovelli"],
                3: [],
            },
            // EP1 reads: 9 batched manuSpecificInovelli reads (all firmware-gated attrs included at 3.07)
            // + haElectricalMeasurement (divisor/multiplier + activePower) + seMetering (divisor/multiplier + currentSummDelivered).
            readCount: {
                1: 13,
                2: 0,
                3: 0,
            },
            readClusters: {
                1: ["haElectricalMeasurement", "manuSpecificInovelli", "seMetering"],
                2: [],
                3: [],
            },
            writeCount: {1: 0, 2: 0, 3: 0},
            configureReporting: {
                1: [
                    {cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]},
                    {cluster: "haElectricalMeasurement", items: [{attribute: "activePower", min: 15, max: 3600, change: 1}]},
                    {cluster: "seMetering", items: [{attribute: "currentSummDelivered", min: 15, max: 3600, change: 0}]},
                ],
                2: [],
                3: [],
            },
        });
    });

    it("drops firmware-gated attributes on older firmware (2.18)", async () => {
        const device = mockDevice({
            modelID: "VZM31-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering"]},
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID: "2.18",
        });
        patchDeviceForConfigure(device);
        const definition = await findByDevice(device);
        await definition.configure(device, device.getEndpoint(1), definition);

        const ep1ReadAttrs = (device.getEndpoint(1).read as ReturnType<typeof vi.fn>).mock.calls.flatMap((c) => c[1] as string[]);
        expect(ep1ReadAttrs).not.toContain("dimmingAlgorithm");
        expect(ep1ReadAttrs).not.toContain("auxDetectionLevel");
        expect(ep1ReadAttrs).not.toContain("dumbDetectionLevel");
        // Common attributes still present
        expect(ep1ReadAttrs).toContain("switchType");
        expect(ep1ReadAttrs).toContain("fanControlMode");
    });
});

describe("Inovelli VZM30-SN definition integration", () => {
    it("matches expected integration shape for firmware 3.07", async () => {
        const device = mockDevice({
            modelID: "VZM30-SN",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: [
                        "genOnOff",
                        "genLevelCtrl",
                        "haElectricalMeasurement",
                        "seMetering",
                        "msTemperatureMeasurement",
                        "msRelativeHumidity",
                    ],
                },
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
                {ID: 4, inputClusters: []},
            ],
            softwareBuildID: "3.07",
        });

        await assertInovelliIntegration({
            model: "VZM30-SN",
            device,
            meta: {
                multiEndpoint: true,
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "temperature", "humidity"],
            },
            // Same 8 converters as VZM31-SN plus temperature + humidity measurement converters.
            fromZigbeeFingerprint: [
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["commandLedEffectComplete"]},
                {cluster: "manuSpecificInovelli", type: ["raw", "readResponse", "attributeReport"]},
                {cluster: "haElectricalMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "seMetering", type: ["attributeReport", "readResponse"]},
                {cluster: "msTemperatureMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "msRelativeHumidity", type: ["attributeReport", "readResponse"]},
            ],
            toZigbeeKeysContain: [
                // light() extend
                "state",
                "brightness",
                "brightness_percent",
                "transition",
                "power_on_behavior",
                "level_config",
                "brightness_move",
                "brightness_step",
                // device() extend: LED effect commands and parameter writes
                "led_effect",
                "individual_led_effect",
                "switchType",
                "dimmingSpeedUpRemote",
                "internalTemperature",
                "deviceBindNumber",
                // identify + energyReset extends
                "identify",
                "energy_reset",
                // electricityMeter extend (current/voltage exposed for VZM30 unlike VZM31)
                "power",
                "energy",
                "current",
                "voltage",
                // temperature + humidity extends
                "temperature",
                "humidity",
            ],
            // VZM30-SN is a switch (not a dimmer), so dimming-algorithm / aux-detection attributes are not exposed.
            toZigbeeKeysOmit: ["dimmingAlgorithm", "auxDetectionLevel", "dumbDetectionLevel"],
            exposeFingerprints: [
                "action",
                "activeEnergyReports",
                "activePowerReports",
                "autoTimerOff",
                "auxSwitchUniqueScenes",
                "bindingOffToOnSyncLevel",
                "brightnessLevelForDoubleTapDown",
                "brightnessLevelForDoubleTapUp",
                "buttonDelay",
                "current",
                "defaultLed1ColorWhenOff",
                "defaultLed1ColorWhenOn",
                "defaultLed1IntensityWhenOff",
                "defaultLed1IntensityWhenOn",
                "defaultLed2ColorWhenOff",
                "defaultLed2ColorWhenOn",
                "defaultLed2IntensityWhenOff",
                "defaultLed2IntensityWhenOn",
                "defaultLed3ColorWhenOff",
                "defaultLed3ColorWhenOn",
                "defaultLed3IntensityWhenOff",
                "defaultLed3IntensityWhenOn",
                "defaultLed4ColorWhenOff",
                "defaultLed4ColorWhenOn",
                "defaultLed4IntensityWhenOff",
                "defaultLed4IntensityWhenOn",
                "defaultLed5ColorWhenOff",
                "defaultLed5ColorWhenOn",
                "defaultLed5IntensityWhenOff",
                "defaultLed5IntensityWhenOn",
                "defaultLed6ColorWhenOff",
                "defaultLed6ColorWhenOn",
                "defaultLed6IntensityWhenOff",
                "defaultLed6IntensityWhenOn",
                "defaultLed7ColorWhenOff",
                "defaultLed7ColorWhenOn",
                "defaultLed7IntensityWhenOff",
                "defaultLed7IntensityWhenOn",
                "defaultLevelLocal",
                "defaultLevelRemote",
                "deviceBindNumber",
                "dimmingSpeedDownLocal",
                "dimmingSpeedDownRemote",
                "dimmingSpeedUpLocal",
                "dimmingSpeedUpRemote",
                "doubleTapClearNotifications",
                "doubleTapDownToParam56",
                "doubleTapUpToParam55",
                "energy",
                "energy_reset",
                "fanControlMode",
                "fanLedLevelType",
                "fanTimerMode",
                "firmwareUpdateInProgressIndicator",
                "highLevelForFanControlMode",
                "humidity",
                "identify",
                "individual_led_effect",
                "internalTemperature",
                "invertSwitch",
                "ledBarScaling",
                "ledColorForFanControlMode",
                "ledColorWhenOff",
                "ledColorWhenOn",
                "ledIntensityWhenOff",
                "ledIntensityWhenOn",
                "led_effect",
                "light(state,brightness)",
                "loadLevelIndicatorTimeout",
                "localProtection",
                "lowLevelForFanControlMode",
                "mediumLevelForFanControlMode",
                "notificationComplete",
                "onOffLedMode",
                "outputMode",
                "overheat",
                "periodicPowerAndEnergyReports",
                "power",
                "rampRateOffToOnLocal",
                "rampRateOffToOnRemote",
                "rampRateOnToOffLocal",
                "rampRateOnToOffRemote",
                "remoteProtection",
                "singleTapBehavior",
                "smartBulbMode",
                "stateAfterPowerRestored",
                "switchType",
                "temperature",
                "voltage",
            ],
            bind: {
                1: [
                    "genOnOff",
                    "genLevelCtrl",
                    "manuSpecificInovelli",
                    "haElectricalMeasurement",
                    "seMetering",
                    "msTemperatureMeasurement",
                    "msRelativeHumidity",
                ],
                2: ["manuSpecificInovelli"],
                3: [],
                4: [],
            },
            // EP1 reads: 11 batched manuSpecificInovelli reads + haElectricalMeasurement (divisor/multiplier + activePower + rmsCurrent + rmsVoltage)
            // + seMetering (divisor/multiplier + currentSummDelivered) + msTemperatureMeasurement (measuredValue) + msRelativeHumidity (measuredValue).
            readCount: {1: 15, 2: 0, 3: 0, 4: 0},
            readClusters: {
                1: ["haElectricalMeasurement", "manuSpecificInovelli", "msRelativeHumidity", "msTemperatureMeasurement", "seMetering"],
                2: [],
                3: [],
                4: [],
            },
            writeCount: {1: 0, 2: 0, 3: 0, 4: 0},
            configureReporting: {
                1: [
                    {cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]},
                    {
                        cluster: "haElectricalMeasurement",
                        items: [
                            {attribute: "activePower", min: 10, max: 65000, change: 50},
                            {attribute: "rmsCurrent", min: 10, max: 65000, change: "NaN"},
                            {attribute: "rmsVoltage", min: 10, max: 65000, change: "NaN"},
                        ],
                    },
                    {cluster: "seMetering", items: [{attribute: "currentSummDelivered", min: 10, max: 65000, change: 100}]},
                    {cluster: "msTemperatureMeasurement", items: [{attribute: "measuredValue", min: 10, max: 3600, change: 100}]},
                    {cluster: "msRelativeHumidity", items: [{attribute: "measuredValue", min: 10, max: 3600, change: 100}]},
                ],
                2: [],
                3: [],
                4: [],
            },
        });
    });
});

describe("Inovelli VZM32-SN definition integration", () => {
    it("matches expected integration shape (mmWave dimmer with dual custom clusters)", async () => {
        const device = mockDevice({
            modelID: "VZM32-SN",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: [
                        "genOnOff",
                        "genLevelCtrl",
                        "haElectricalMeasurement",
                        "seMetering",
                        "msIlluminanceMeasurement",
                        "msOccupancySensing",
                    ],
                },
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID: "1.15",
        });

        await assertInovelliIntegration({
            model: "VZM32-SN",
            device,
            meta: {
                multiEndpoint: true,
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "illuminance", "occupancy"],
            },
            // 15 converters: light (on_off EP1 + brightness + level_config + power_on_behavior), device (led_effect_complete + main),
            // mmWave (main attr report + 3 command converters: anyone_in_reporting_area, report_areas, report_target_info),
            // electricityMeter (electrical_measurement + metering), illuminance (measured + raw), occupancy.
            fromZigbeeFingerprint: [
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["commandLedEffectComplete"]},
                {cluster: "manuSpecificInovelli", type: ["raw", "readResponse", "attributeReport"]},
                {cluster: "manuSpecificInovelliMMWave", type: ["raw", "readResponse", "attributeReport"]},
                {cluster: "manuSpecificInovelliMMWave", type: ["commandAnyoneInReportingArea"]},
                {
                    cluster: "manuSpecificInovelliMMWave",
                    type: ["commandReportInterferenceArea", "commandReportDetectionArea", "commandReportStayArea"],
                },
                {cluster: "manuSpecificInovelliMMWave", type: ["commandReportTargetInfo"]},
                {cluster: "haElectricalMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "seMetering", type: ["attributeReport", "readResponse"]},
                {cluster: "msIlluminanceMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "msIlluminanceMeasurement", type: ["attributeReport", "readResponse"]},
                {cluster: "msOccupancySensing", type: ["attributeReport", "readResponse"]},
            ],
            toZigbeeKeysContain: [
                // light() extend
                "state",
                "brightness",
                "brightness_percent",
                "transition",
                "power_on_behavior",
                "level_config",
                "brightness_move",
                "brightness_step",
                // device() extend: LED effect commands, main-cluster parameter writes, and mmWave-cluster parameter writes.
                "led_effect",
                "individual_led_effect",
                "switchType",
                "dimmingSpeedUpRemote",
                "otaImageType",
                "mmwaveControlWiredDevice",
                "mmWaveRoomSizePreset",
                "mmWaveHoldTime",
                "mmWaveDetectSensitivity",
                "mmWaveDetectTrigger",
                "mmWaveTargetInfoReport",
                "mmWaveStayLife",
                "mmWaveVersion",
                "mmWaveHeightMin",
                "mmWaveHeightMax",
                "mmWaveWidthMin",
                "mmWaveWidthMax",
                "mmWaveDepthMin",
                "mmWaveDepthMax",
                "internalTemperature",
                "deviceBindNumber",
                // mmWave() extend: control commands and area setters
                "mmwave_control_commands",
                "mmwave_detection_areas",
                "mmwave_interference_areas",
                "mmwave_stay_areas",
                // identify + energyReset extends
                "identify",
                "energy_reset",
                // electricityMeter extend
                "power",
                "energy",
                "current",
                "voltage",
                // illuminance + occupancy extends
                "illuminance",
                "occupancy",
            ],
            // VZM32-SN exposes omit dimmingAlgorithm/auxDetectionLevel/dumbDetectionLevel (firmware-gated off for this model),
            // but the underlying attributes stay in the toZigbee key list since they're shared with the dimmer attribute set.
            toZigbeeKeysOmit: [],
            exposeFingerprints: [
                "action",
                "activeEnergyReports",
                "activePowerReports",
                "autoTimerOff",
                "auxSwitchUniqueScenes",
                "bindingOffToOnSyncLevel",
                "brightnessLevelForDoubleTapDown",
                "brightnessLevelForDoubleTapUp",
                "buttonDelay",
                "current",
                "defaultLed1ColorWhenOff",
                "defaultLed1ColorWhenOn",
                "defaultLed1IntensityWhenOff",
                "defaultLed1IntensityWhenOn",
                "defaultLed2ColorWhenOff",
                "defaultLed2ColorWhenOn",
                "defaultLed2IntensityWhenOff",
                "defaultLed2IntensityWhenOn",
                "defaultLed3ColorWhenOff",
                "defaultLed3ColorWhenOn",
                "defaultLed3IntensityWhenOff",
                "defaultLed3IntensityWhenOn",
                "defaultLed4ColorWhenOff",
                "defaultLed4ColorWhenOn",
                "defaultLed4IntensityWhenOff",
                "defaultLed4IntensityWhenOn",
                "defaultLed5ColorWhenOff",
                "defaultLed5ColorWhenOn",
                "defaultLed5IntensityWhenOff",
                "defaultLed5IntensityWhenOn",
                "defaultLed6ColorWhenOff",
                "defaultLed6ColorWhenOn",
                "defaultLed6IntensityWhenOff",
                "defaultLed6IntensityWhenOn",
                "defaultLed7ColorWhenOff",
                "defaultLed7ColorWhenOn",
                "defaultLed7IntensityWhenOff",
                "defaultLed7IntensityWhenOn",
                "defaultLevelLocal",
                "defaultLevelRemote",
                "deviceBindNumber",
                "dimmingMode",
                "dimmingSpeedDownLocal",
                "dimmingSpeedDownRemote",
                "dimmingSpeedUpLocal",
                "dimmingSpeedUpRemote",
                "doubleTapClearNotifications",
                "doubleTapDownToParam56",
                "doubleTapUpToParam55",
                "energy",
                "energy_reset",
                "fanControlMode",
                "fanLedLevelType",
                "fanTimerMode",
                "firmwareUpdateInProgressIndicator",
                "highLevelForFanControlMode",
                "higherOutputInNonNeutral",
                "identify",
                "illuminance",
                "individual_led_effect",
                "internalTemperature",
                "invertSwitch",
                "ledBarScaling",
                "ledColorForFanControlMode",
                "ledColorWhenOff",
                "ledColorWhenOn",
                "ledIntensityWhenOff",
                "ledIntensityWhenOn",
                "led_effect",
                "light(state,brightness)",
                "loadLevelIndicatorTimeout",
                "localProtection",
                "lowLevelForFanControlMode",
                "maximumLevel",
                "mediumLevelForFanControlMode",
                "minimumLevel",
                "mmWaveDepthMax",
                "mmWaveDepthMin",
                "mmWaveDetectSensitivity",
                "mmWaveDetectTrigger",
                "mmWaveHeightMax",
                "mmWaveHeightMin",
                "mmWaveHoldTime",
                "mmWaveRoomSizePreset",
                "mmWaveStayLife",
                "mmWaveTargetInfoReport",
                "mmWaveVersion",
                "mmWaveWidthMax",
                "mmWaveWidthMin",
                "mmwaveControlWiredDevice",
                "mmwave_area1_occupancy",
                "mmwave_area2_occupancy",
                "mmwave_area3_occupancy",
                "mmwave_area4_occupancy",
                "mmwave_control_commands",
                "mmwave_detection_areas",
                "mmwave_interference_areas",
                "mmwave_stay_areas",
                "mmwave_targets",
                "notificationComplete",
                "occupancy",
                "onOffLedMode",
                "otaImageType",
                "outputMode",
                "overheat",
                "periodicPowerAndEnergyReports",
                "power",
                "powerType",
                "quickStartLevel",
                "quickStartTime",
                "rampRateOffToOnLocal",
                "rampRateOffToOnRemote",
                "rampRateOnToOffLocal",
                "rampRateOnToOffRemote",
                "remoteProtection",
                "singleTapBehavior",
                "smartBulbMode",
                "stateAfterPowerRestored",
                "switchType",
                "voltage",
            ],
            bind: {
                1: [
                    "genOnOff",
                    "genLevelCtrl",
                    "manuSpecificInovelli",
                    "manuSpecificInovelliMMWave",
                    "haElectricalMeasurement",
                    "seMetering",
                    "msIlluminanceMeasurement",
                    "msOccupancySensing",
                ],
                2: ["manuSpecificInovelli"],
                3: [],
            },
            // EP1 reads: batched manuSpecificInovelli chunks + batched manuSpecificInovelliMMWave chunks
            // + haElectricalMeasurement (divisor/multiplier + activePower + rmsCurrent + rmsVoltage)
            // + seMetering (divisor/multiplier + currentSummDelivered)
            // + msIlluminanceMeasurement (measuredValue) + msOccupancySensing (occupancy).
            readCount: {1: 18, 2: 0, 3: 0},
            readClusters: {
                1: [
                    "haElectricalMeasurement",
                    "manuSpecificInovelli",
                    "manuSpecificInovelliMMWave",
                    "msIlluminanceMeasurement",
                    "msOccupancySensing",
                    "seMetering",
                ],
                2: [],
                3: [],
            },
            writeCount: {1: 0, 2: 0, 3: 0},
            configureReporting: {
                1: [
                    {cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]},
                    {
                        cluster: "haElectricalMeasurement",
                        items: [
                            {attribute: "activePower", min: 10, max: 65000, change: 50},
                            {attribute: "rmsCurrent", min: 10, max: 65000, change: "NaN"},
                            {attribute: "rmsVoltage", min: 10, max: 65000, change: "NaN"},
                        ],
                    },
                    {cluster: "seMetering", items: [{attribute: "currentSummDelivered", min: 10, max: 65000, change: 100}]},
                    {cluster: "msIlluminanceMeasurement", items: [{attribute: "measuredValue", min: 10, max: 3600, change: 5}]},
                    {cluster: "msOccupancySensing", items: [{attribute: "occupancy", min: 0, max: 3600, change: 0}]},
                ],
                2: [],
                3: [],
            },
            // The mmWave() extend issues a `query_areas` command on EP1 during configure so the device
            // reports back its current detection/interference/stay area configuration at startup.
            // controlID 2 corresponds to `query_areas` in `mmWaveControlCommands`.
            commands: {
                1: [{cluster: "manuSpecificInovelliMMWave", command: "mmWaveControl", payload: {controlID: 2}}],
            },
        });
    });

    it("never exposes dimmingAlgorithm / auxDetectionLevel / dumbDetectionLevel regardless of firmware", async () => {
        // Unlike VZM31-SN, the VZM32-SN dimmer's firmware-gated aux/dumb-wire detection attributes are
        // disabled by the model config, so they should neither appear in exposes nor be read at configure-time
        // even on the newest firmware. The baseline dimmer attributes must still be present.
        const device = mockDevice({
            modelID: "VZM32-SN",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: [
                        "genOnOff",
                        "genLevelCtrl",
                        "haElectricalMeasurement",
                        "seMetering",
                        "msIlluminanceMeasurement",
                        "msOccupancySensing",
                    ],
                },
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID: "1.15",
        });
        patchDeviceForConfigure(device);
        const definition = await findByDevice(device);

        const exposeProps = resolveExposes(definition, device)
            .map((ex) => ex.property)
            .filter(Boolean);
        expect(exposeProps).not.toContain("dimmingAlgorithm");
        expect(exposeProps).not.toContain("auxDetectionLevel");
        expect(exposeProps).not.toContain("dumbDetectionLevel");
        expect(exposeProps).toContain("switchType");
        expect(exposeProps).toContain("dimmingSpeedUpRemote");

        await definition.configure(device, device.getEndpoint(1), definition);
        const ep1ReadAttrs = (device.getEndpoint(1).read as ReturnType<typeof vi.fn>).mock.calls.flatMap((c) => c[1] as string[]);
        expect(ep1ReadAttrs).not.toContain("dimmingAlgorithm");
        expect(ep1ReadAttrs).not.toContain("auxDetectionLevel");
        expect(ep1ReadAttrs).not.toContain("dumbDetectionLevel");
    });
});

describe("Inovelli VZM35-SN definition integration", () => {
    it("matches expected integration shape (fan controller with breeze mode, LED effects, and button taps)", async () => {
        const device = mockDevice({
            modelID: "VZM35-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: []},
            ],
            softwareBuildID: "2.18",
        });

        await assertInovelliIntegration({
            model: "VZM35-SN",
            device,
            // VZM35-SN does not use m.deviceEndpoints(), so no multiEndpoint meta is set (definition.meta is undefined).
            meta: undefined,
            // 5 converters: fan (fan_mode + breeze_mode + fan_state), device (led_effect_complete + main).
            // No light/electricityMeter/etc. extends, so the custom cluster is the only "attrs" source.
            fromZigbeeFingerprint: [
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["attributeReport", "readResponse"]},
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["commandLedEffectComplete"]},
                {cluster: "manuSpecificInovelli", type: ["raw", "readResponse", "attributeReport"]},
            ],
            toZigbeeKeysContain: [
                // fan() extend
                "fan_mode",
                "breezeMode",
                "fan_state",
                // device() extend: LED effect commands and parameter writes/reads
                "led_effect",
                "individual_led_effect",
                "switchType",
                "dimmingSpeedUpRemote",
                "internalTemperature",
                "deviceBindNumber",
                // identify extend
                "identify",
            ],
            // VZM35-SN has no dimmer-only or energy-meter attributes at all.
            toZigbeeKeysOmit: [
                "dimmingAlgorithm",
                "auxDetectionLevel",
                "dumbDetectionLevel",
                "power",
                "energy",
                "current",
                "voltage",
                "energy_reset",
                "state",
                "brightness",
            ],
            // VZM35-SN baseline exposes (see "Inovelli baseline exposes > VZM35-SN") with two fingerprint-only
            // entries: "breeze mode" becomes the composite's property ("breezeMode"), and the fan() expose has
            // no name/property so it renders as "fan(state,mode)".
            exposeFingerprints: [
                "action",
                "autoTimerOff",
                "auxSwitchUniqueScenes",
                "bindingOffToOnSyncLevel",
                "breezeMode",
                "brightnessLevelForDoubleTapDown",
                "brightnessLevelForDoubleTapUp",
                "buttonDelay",
                "defaultLed1ColorWhenOff",
                "defaultLed1ColorWhenOn",
                "defaultLed1IntensityWhenOff",
                "defaultLed1IntensityWhenOn",
                "defaultLed2ColorWhenOff",
                "defaultLed2ColorWhenOn",
                "defaultLed2IntensityWhenOff",
                "defaultLed2IntensityWhenOn",
                "defaultLed3ColorWhenOff",
                "defaultLed3ColorWhenOn",
                "defaultLed3IntensityWhenOff",
                "defaultLed3IntensityWhenOn",
                "defaultLed4ColorWhenOff",
                "defaultLed4ColorWhenOn",
                "defaultLed4IntensityWhenOff",
                "defaultLed4IntensityWhenOn",
                "defaultLed5ColorWhenOff",
                "defaultLed5ColorWhenOn",
                "defaultLed5IntensityWhenOff",
                "defaultLed5IntensityWhenOn",
                "defaultLed6ColorWhenOff",
                "defaultLed6ColorWhenOn",
                "defaultLed6IntensityWhenOff",
                "defaultLed6IntensityWhenOn",
                "defaultLed7ColorWhenOff",
                "defaultLed7ColorWhenOn",
                "defaultLed7IntensityWhenOff",
                "defaultLed7IntensityWhenOn",
                "defaultLevelLocal",
                "defaultLevelRemote",
                "deviceBindNumber",
                "dimmingSpeedDownLocal",
                "dimmingSpeedDownRemote",
                "dimmingSpeedUpLocal",
                "dimmingSpeedUpRemote",
                "doubleTapClearNotifications",
                "doubleTapDownToParam56",
                "doubleTapUpToParam55",
                "fan(state,mode)",
                "fanControlMode",
                "fanLedLevelType",
                "fanTimerMode",
                "firmwareUpdateInProgressIndicator",
                "highLevelForFanControlMode",
                "identify",
                "individual_led_effect",
                "internalTemperature",
                "invertSwitch",
                "ledColorForFanControlMode",
                "ledColorWhenOff",
                "ledColorWhenOn",
                "ledIntensityWhenOff",
                "ledIntensityWhenOn",
                "led_effect",
                "loadLevelIndicatorTimeout",
                "localProtection",
                "lowLevelForFanControlMode",
                "maximumLevel",
                "mediumLevelForFanControlMode",
                "minimumLevel",
                "nonNeutralAuxLowGear",
                "nonNeutralAuxMediumGear",
                "notificationComplete",
                "onOffLedMode",
                "outputMode",
                "overheat",
                "powerType",
                "quickStartTime",
                "rampRateOffToOnLocal",
                "rampRateOffToOnRemote",
                "rampRateOnToOffLocal",
                "rampRateOnToOffRemote",
                "remoteProtection",
                "singleTapBehavior",
                "smartBulbMode",
                "stateAfterPowerRestored",
                "switchType",
            ],
            // fan() extend binds genOnOff/genLevelCtrl on EP1. device() extend binds manuSpecificInovelli on
            // EP1 (main) and EP2 (button-event reporting).
            bind: {
                1: ["genOnOff", "genLevelCtrl", "manuSpecificInovelli"],
                2: ["manuSpecificInovelli"],
            },
            // EP1: one batched manuSpecificInovelli read per 10 attributes in VZM35_ATTRIBUTES (chunkedRead).
            // EP2 gets no reads (fan lives on EP1; the EP2 bind is solely for button-event reporting).
            readCount: {1: 8, 2: 0},
            readClusters: {1: ["manuSpecificInovelli"], 2: []},
            writeCount: {1: 0, 2: 0},
            // fan() extend also configures onOff reporting on EP1; no other reporting clusters for VZM35-SN.
            configureReporting: {
                1: [{cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]}],
                2: [],
            },
        });
    });
});

describe("Inovelli VZM36 definition integration", () => {
    it("matches expected integration shape (canopy module: split-endpoint light + fan, no LED effects or button taps)", async () => {
        const device = mockDevice({
            modelID: "VZM36",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
            ],
        });

        await assertInovelliIntegration({
            model: "VZM36",
            device,
            // VZM36 does not use m.deviceEndpoints() either; split behavior is handled by the light/fan/device extends.
            meta: undefined,
            // VZM36 defines `fromZigbee: []` on the definition, so every fz converter comes from extends:
            // 2 from light (on_off_for_endpoint(1) + brightness; no level_config/power_on_behavior in split mode)
            // 3 from fan (fan_mode(2) + breeze_mode(2) + fan_state(2))
            // 1 from device (inovelli -- no led_effect_complete since supportsLedEffects=false)
            fromZigbeeFingerprint: [
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "genLevelCtrl", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["attributeReport", "readResponse"]},
                {cluster: "genOnOff", type: ["attributeReport", "readResponse"]},
                {cluster: "manuSpecificInovelli", type: ["raw", "readResponse", "attributeReport"]},
            ],
            toZigbeeKeysContain: [
                // light() extend (split)
                "state",
                "brightness",
                "power_on_behavior",
                "transition",
                "level_config",
                "brightness_move",
                "brightness_step",
                // fan() extend (split, EP2)
                "fan_mode",
                "breezeMode",
                "fan_state",
                // device() extend: split-endpoint parameter writes use `_1`/`_2`-suffixed keys
                "dimmingSpeedUpRemote_1",
                "dimmingSpeedUpRemote_2",
                "minimumLevel_1",
                "minimumLevel_2",
                // identify extend
                "identify",
            ],
            // VZM36 has no LED effects, no button taps, no energy meter, no standalone parameter reads.
            toZigbeeKeysOmit: [
                "led_effect",
                "individual_led_effect",
                "energy_reset",
                "switchType",
                "dimmingAlgorithm",
                "auxDetectionLevel",
                "dumbDetectionLevel",
                "power",
                "energy",
                "internalTemperature",
                "deviceBindNumber",
            ],
            // VZM36 baseline exposes (see "Inovelli baseline exposes > VZM36") plus "light(state,brightness)" and
            // "fan(state,mode)" (the light/fan exposes have no name/property, so they render via the type fallback).
            exposeFingerprints: [
                "autoTimerOff_1",
                "autoTimerOff_2",
                "breezeMode",
                "defaultLevelRemote_1",
                "defaultLevelRemote_2",
                "dimmingMode_1",
                "dimmingSpeedDownRemote_1",
                "dimmingSpeedDownRemote_2",
                "dimmingSpeedUpRemote_1",
                "dimmingSpeedUpRemote_2",
                "fan(state,mode)",
                "higherOutputInNonNeutral_1",
                "identify",
                "ledColorWhenOn_1",
                "ledIntensityWhenOn_1",
                "light(state,brightness)",
                "maximumLevel_1",
                "maximumLevel_2",
                "minimumLevel_1",
                "minimumLevel_2",
                "outputMode_1",
                "outputMode_2",
                "quickStartLevel_1",
                "quickStartTime_1",
                "quickStartTime_2",
                "rampRateOffToOnRemote_1",
                "rampRateOffToOnRemote_2",
                "rampRateOnToOffRemote_1",
                "rampRateOnToOffRemote_2",
                "smartBulbMode_1",
                "smartBulbMode_2",
                "stateAfterPowerRestored_1",
                "stateAfterPowerRestored_2",
            ],
            // light() binds genOnOff/genLevelCtrl on EP1, fan() binds them on EP2, device() binds
            // manuSpecificInovelli on BOTH endpoints for split attribute reads.
            bind: {
                1: ["genOnOff", "genLevelCtrl", "manuSpecificInovelli"],
                2: ["genOnOff", "genLevelCtrl", "manuSpecificInovelli"],
            },
            // Split-endpoint reads: device() extend issues chunkedRead on EP1 for all `*_1` attrs (stripped of
            // suffix) and on EP2 for all `*_2` attrs. VZM36_ATTRIBUTES has asymmetric keys, so the two endpoints
            // read different attribute counts.
            readCount: {1: 2, 2: 2},
            readClusters: {1: ["manuSpecificInovelli"], 2: ["manuSpecificInovelli"]},
            writeCount: {1: 0, 2: 0},
            // light() configures onOff reporting on EP1; fan() configures onOff reporting on EP2.
            configureReporting: {
                1: [{cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]}],
                2: [{cluster: "genOnOff", items: [{attribute: "onOff", min: 0, max: 3600, change: 0}]}],
            },
        });
    });
});
