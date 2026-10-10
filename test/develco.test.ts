import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/develco";
import {prepareDefinition} from "../src/index";
import type {Numeric} from "../src/lib/exposes";
import * as globalStore from "../src/lib/store";
import type {Definition, Fz, KeyValueAny, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

function getDefinition(model: string): Definition {
    const definition = definitions.find((candidate) => candidate.model === model);
    if (!definition) throw new Error(`Missing Develco definition for ${model}`);
    return prepareDefinition(definition);
}

function mockSiren(model: string) {
    const device = mockDevice({
        modelID: model,
        endpoints: [
            {ID: 1, inputClusters: ["genScenes", "genOnOff"]},
            {ID: 43, inputClusters: ["genBasic", "genIdentify", "genPowerCfg", "genGroups", "ssIasZone", "ssIasWd"]},
        ],
    });
    vi.spyOn(device, "save").mockImplementation(() => {});
    return device;
}

function findTz(definition: Definition, key: string): Tz.Converter {
    const converter = definition.toZigbee.find((candidate) => candidate.key?.includes(key));
    if (!converter?.convertSet) throw new Error(`Missing toZigbee converter for ${key}`);
    return converter;
}

function tzMeta(definition: Definition, device: Zh.Device, state: KeyValueAny = {}, publish = vi.fn()): Tz.Meta {
    return {
        message: {},
        device,
        mapped: definition,
        options: {},
        state,
        endpoint_name: undefined,
        publish,
        deviceExposesChanged: () => {},
    };
}

async function sendWarning(model: string, value: KeyValueAny, state: KeyValueAny = {}) {
    const definition = getDefinition(model);
    const device = mockSiren(model);
    const endpoint = device.getEndpoint(43);
    const publish = vi.fn();
    const result = await findTz(definition, "warning").convertSet(endpoint, "warning", value, tzMeta(definition, device, state, publish));
    return {definition, device, endpoint, publish, result};
}

function startWarningInfo(endpoint: Zh.Endpoint): number {
    const call = vi.mocked(endpoint.command).mock.calls.find((c) => c[0] === "ssIasWd" && c[1] === "startWarning");
    if (!call) throw new Error("startWarning was not sent");
    return (call[2] as KeyValueAny).startwarninginfo;
}

describe("Develco SIRZB-111", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        globalStore.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("startWarning info byte follows the ZCL layout (mode << 4 | strobe << 2 | level)", () => {
        it.each([
            [{mode: "burglar", level: "very_high", strobe: true, duration: 1800}, 0x17],
            [{mode: "burglar", level: "low", strobe: true, duration: 10}, 0x14],
            [{mode: "burglar", level: "high", strobe: true, duration: 3}, 0x16],
            [{mode: "fire", level: "medium", strobe: false, duration: 3}, 0x21],
            [{mode: "emergency_panic", level: "very_high", strobe: false, duration: 3}, 0x63],
            // Home Assistant siren.turn_on without tone/volume
            [{mode: "emergency", level: "medium", duration: 10}, 0x35],
        ])("%j -> %d", async (value, expected) => {
            const {endpoint} = await sendWarning("SIRZB-111", value);
            expect(startWarningInfo(endpoint)).toBe(expected);
        });
    });

    describe("stop always sends an all-zero info byte", () => {
        it.each([
            // Home Assistant siren.turn_off
            [{mode: "stop"}],
            // HowmationFr frient blueprint
            [{mode: "stop", level: "low", strobe: true, duration: 1}],
            [{mode: "stop", level: "very_high", strobe: true, duration: 10}],
        ])("%j", async (value) => {
            const {endpoint} = await sendWarning("SIRZB-111", value);
            expect(startWarningInfo(endpoint)).toBe(0);
        });
    });

    it("exposes the IAS zone bits documented for the siren, and no smoke sensor", () => {
        const device = mockSiren("SIRZB-111");
        const definition = getDefinition("SIRZB-111");
        const exposes = (typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes)
            .map((expose) => expose.property ?? expose.name)
            .sort();
        expect(exposes).toEqual(
            ["ac_status", "battery", "battery_low", "max_duration", "squawk", "tamper", "test", "voltage", "warning", "warning_active"].sort(),
        );
    });

    it("accepts the full max_duration range (1800 s written and read back on firmware 2.0.4)", () => {
        const device = mockSiren("SIRZB-111");
        const definition = getDefinition("SIRZB-111");
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        const maxDuration = exposes.find((expose) => expose.property === "max_duration") as Numeric;
        expect(maxDuration.value_min).toBe(0);
        expect(maxDuration.value_max).toBe(65534);
    });

    it("declares OTA support (the image is in the Zigbee OTA index)", () => {
        expect(getDefinition("SIRZB-111").ota).toBeTruthy();
    });

    describe("warning_active is derived from the warnings sent", () => {
        it("turns on once the device acknowledged the warning and off when the duration expires", async () => {
            const {result, publish, device} = await sendWarning("SIRZB-111", {mode: "burglar", level: "low", strobe: false, duration: 3});
            expect(result).toEqual({state: {warning_active: true}});
            expect(device.meta.warningActiveUntil).toBe(Date.now() + 3000);
            expect(device.save).toHaveBeenCalled();

            vi.advanceTimersByTime(2999);
            expect(publish).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(publish).toHaveBeenCalledWith({warning_active: false});
        });

        it("is capped by max_duration, as the device stops by itself", async () => {
            const {publish} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 1800}, {max_duration: 900});
            vi.advanceTimersByTime(899_999);
            expect(publish).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(publish).toHaveBeenCalledWith({warning_active: false});
        });

        it("turns off on an acknowledged stop and cancels the pending timer", async () => {
            const definition = getDefinition("SIRZB-111");
            const device = mockSiren("SIRZB-111");
            const endpoint = device.getEndpoint(43);
            const publish = vi.fn();
            const converter = findTz(definition, "warning");

            await converter.convertSet(endpoint, "warning", {mode: "burglar", duration: 60}, tzMeta(definition, device, {}, publish));
            const stop = await converter.convertSet(endpoint, "warning", {mode: "stop"}, tzMeta(definition, device, {warning_active: true}, publish));
            expect(stop).toEqual({state: {warning_active: false}});

            vi.advanceTimersByTime(60_000);
            expect(publish).not.toHaveBeenCalled();
        });

        it("does not turn on when the device did not acknowledge the warning", async () => {
            const definition = getDefinition("SIRZB-111");
            const device = mockSiren("SIRZB-111");
            const endpoint = device.getEndpoint(43);
            vi.mocked(endpoint.command).mockRejectedValueOnce(new Error("Timeout"));
            const publish = vi.fn();

            await expect(
                findTz(definition, "warning").convertSet(
                    endpoint,
                    "warning",
                    {mode: "burglar", duration: 3},
                    tzMeta(definition, device, {}, publish),
                ),
            ).rejects.toThrow("Timeout");
            vi.advanceTimersByTime(10_000);
            expect(publish).not.toHaveBeenCalled();
        });

        it("stays on when the stop was not acknowledged", async () => {
            const definition = getDefinition("SIRZB-111");
            const device = mockSiren("SIRZB-111");
            const endpoint = device.getEndpoint(43);
            const publish = vi.fn();
            const converter = findTz(definition, "warning");

            await converter.convertSet(endpoint, "warning", {mode: "burglar", duration: 60}, tzMeta(definition, device, {}, publish));
            vi.mocked(endpoint.command).mockRejectedValueOnce(new Error("Timeout"));
            await expect(
                converter.convertSet(endpoint, "warning", {mode: "stop"}, tzMeta(definition, device, {warning_active: true}, publish)),
            ).rejects.toThrow("Timeout");
            expect(publish).not.toHaveBeenCalled();
        });

        it("a zero duration does not mark the siren active", async () => {
            const {result} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 0});
            expect(result).toEqual({state: {warning_active: false}});
        });

        describe("recovers a stale state after a restart (timer lost) on the next IAS zone status", () => {
            function zoneStatus(device: Zh.Device, state: KeyValueAny): KeyValueAny {
                const definition = getDefinition("SIRZB-111");
                const message = {
                    data: {zonestatus: 0x30, extendedstatus: 0, zoneID: 23, delay: 0},
                    type: "commandStatusChangeNotification",
                    cluster: "ssIasZone",
                    device,
                    endpoint: device.getEndpoint(43),
                } as unknown as Fz.Message;
                const meta = {state, device, deviceExposesChanged: () => {}};
                return definition.fromZigbee
                    .filter((c) => c.cluster === "ssIasZone")
                    .reduce((acc, c) => Object.assign(acc, c.convert(definition, message, () => {}, {}, meta) ?? {}), {});
            }

            it("clears it once the recorded end time has passed", async () => {
                const {device} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 3});
                globalStore.clear(); // Z2M restart: timers are gone, device meta is persisted
                vi.advanceTimersByTime(4000);
                expect(zoneStatus(device, {warning_active: true}).warning_active).toBe(false);
            });

            it("keeps it while the recorded end time has not passed", async () => {
                const {device} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 600});
                globalStore.clear();
                vi.advanceTimersByTime(4000);
                expect(zoneStatus(device, {warning_active: true}).warning_active).toBeUndefined();
            });

            it("clears it when no end time was recorded", () => {
                const device = mockSiren("SIRZB-111");
                expect(zoneStatus(device, {warning_active: true}).warning_active).toBe(false);
            });

            it("initialises an unknown state to off", () => {
                const device = mockSiren("SIRZB-111");
                expect(zoneStatus(device, {}).warning_active).toBe(false);
            });

            it("initialises an unknown state to on while the recorded end time has not passed", async () => {
                const {device} = await sendWarning("SIRZB-111", {mode: "burglar", duration: 600});
                globalStore.clear();
                expect(zoneStatus(device, {}).warning_active).toBe(true);
            });

            it("publishes nothing when the state is already right", () => {
                const device = mockSiren("SIRZB-111");
                expect(zoneStatus(device, {warning_active: false}).warning_active).toBeUndefined();
            });
        });
    });
});

describe("Develco SIRZB-110 is not changed by the SIRZB-111 fix", () => {
    it("still sends the reversed info byte", async () => {
        const {endpoint} = await sendWarning("SIRZB-110", {mode: "burglar", level: "very_high", strobe: true, duration: 3});
        expect(startWarningInfo(endpoint)).toBe(0xd1);
    });
});
