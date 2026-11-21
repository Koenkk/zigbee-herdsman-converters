import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

let deviceCounter = 0;

const setup = async () => {
    const device = mockDevice({
        modelID: "EBF_RGB_Zm",
        manufacturerName: "AwoX",
        // Converter state (fades, last OFF) is stored per entity, so every test needs its own device.
        ieeeAddr: `0x00000000000a${(deviceCounter++).toString(16).padStart(4, "0")}`,
        endpoints: [{ID: 1, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl", "lightingColorCtrl"]}],
    });
    const definition = await findByDevice(device);
    const endpoint = device.getEndpoint(1);
    const converter = definition.toZigbee.find((c) => c.key.includes("state") && c.key.includes("color"));
    if (!endpoint || !converter?.convertSet) throw new Error("EBF_RGB_Zm light converter not found");
    const convertSet = converter.convertSet;

    const run = (message: KeyValue, state: KeyValue = {}) => {
        const [key] = Object.keys(message);
        const meta = {
            message,
            state,
            options: {},
            mapped: definition,
            device,
            endpoint_name: undefined,
            publish: vi.fn(),
            deviceExposesChanged: vi.fn(),
        };
        return convertSet(endpoint, key, message[key], meta as unknown as Tz.Meta);
    };
    const settle = async <T>(promise: Promise<T>) => {
        await vi.runAllTimersAsync();
        return await promise;
    };
    const commands = () =>
        vi.mocked(endpoint.command).mock.calls.map(([cluster, command, payload]) => ({name: `${cluster}.${command}`, payload: payload as KeyValue}));
    const names = () => commands().map((c) => c.name);

    return {definition, endpoint, run, settle, commands, names};
};

const LIT_WHITE = {state: "ON", brightness: 150, color_mode: "color_temp"};
const LIT_RED = {state: "ON", brightness: 150, color_mode: "xy"};
const OFF = {state: "OFF", brightness: 150, color_mode: "color_temp"};

describe("EBF_RGB_Zm light", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("OFF without a transition turns off at once and parks the level afterwards", async () => {
        const {run, settle, commands} = await setup();
        const result = await settle(run({state: "OFF"}, LIT_WHITE));
        expect(result).toEqual({state: {state: "OFF"}});
        expect(commands().map((c) => c.name)).toEqual(["genOnOff.off", "genLevelCtrl.moveToLevel"]);
        expect(commands()[1].payload).toMatchObject({level: 1, transtime: 0});
    });

    it("OFF with a transition ramps down to level 1, waits for it, then turns off", async () => {
        const {run, settle, commands} = await setup();
        await settle(run({state: "OFF", transition: 3}, LIT_WHITE));
        expect(commands().map((c) => c.name)).toEqual(["genLevelCtrl.moveToLevel", "genOnOff.off"]);
        expect(commands()[0].payload).toMatchObject({level: 1, transtime: 30});
    });

    it("ON from off only sets the level with on/off", async () => {
        const {run, settle, commands} = await setup();
        const result = await settle(run({state: "ON", brightness: 100}, OFF));
        expect(result).toEqual({state: {state: "ON", brightness: 100}});
        expect(commands().map((c) => c.name)).toEqual(["genLevelCtrl.moveToLevelWithOnOff"]);
        expect(commands()[0].payload).toMatchObject({level: 100, transtime: 0});
    });

    it("colour temperature from off: the level is already parked, so colour and turn on follow directly", async () => {
        const {run, settle, names} = await setup();
        await settle(run({state: "ON", color_temp: 250, brightness: 120}, OFF));
        expect(names()).toEqual(["lightingColorCtrl.moveToColorTemp", "genLevelCtrl.moveToLevelWithOnOff"]);
    });

    it("a turn on that cuts a quick OFF short parks the level itself before the colour", async () => {
        const {run, settle, names} = await setup();
        const quickOff = run({state: "OFF"}, LIT_WHITE);
        await vi.advanceTimersByTimeAsync(100);
        const turnOn = run({state: "ON", color_temp: 250, brightness: 150}, LIT_WHITE);
        await settle(Promise.all([quickOff, turnOn]));
        expect(names()).toEqual([
            "genOnOff.off",
            "genLevelCtrl.moveToLevel",
            "lightingColorCtrl.moveToColorTemp",
            "genLevelCtrl.moveToLevelWithOnOff",
        ]);
    });

    it("colour from a lit white ring turns off before the colour is set", async () => {
        const {run, settle, names} = await setup();
        await settle(run({state: "ON", color: {x: 0.7006, y: 0.2993}, brightness: 150}, LIT_WHITE));
        const all = names();
        expect(all.indexOf("genOnOff.off")).toBeGreaterThanOrEqual(0);
        expect(all.indexOf("genOnOff.off")).toBeLessThan(all.indexOf("lightingColorCtrl.moveToColor"));
        expect(all.at(-1)).toBe("genLevelCtrl.moveToLevelWithOnOff");
    });

    it("colour temperature on a lit white ring is set in place, without turning off", async () => {
        const {run, settle, names} = await setup();
        await settle(run({state: "ON", color_temp: 300, brightness: 150}, LIT_WHITE));
        expect(names()).toEqual(["lightingColorCtrl.moveToColorTemp", "genLevelCtrl.moveToLevelWithOnOff"]);
    });

    it("ON right after OFF still turns the light on when the brightness is unchanged", async () => {
        const {run, settle, names} = await setup();
        await settle(run({state: "OFF"}, LIT_WHITE));
        // The OFF is done, but meta.state still shows the old ON.
        const before = names().length;
        await settle(run({state: "ON", color_temp: 250, brightness: 150, transition: 1}, LIT_WHITE));
        expect(names().slice(before)).toContain("genLevelCtrl.moveToLevelWithOnOff");
    });

    it("a brightness message that cuts a color change short still applies the color", async () => {
        const {run, settle, names} = await setup();
        // Home Assistant sends the color temperature and the brightness as two messages.
        const colorChange = run({color_temp: 250}, LIT_RED);
        await vi.advanceTimersByTimeAsync(100);
        const brightness = run({state: "ON", brightness: 87}, LIT_RED);
        await settle(Promise.all([colorChange, brightness]));
        const all = names();
        expect(all).toContain("lightingColorCtrl.moveToColorTemp");
        expect(all.indexOf("lightingColorCtrl.moveToColorTemp")).toBeLessThan(all.lastIndexOf("genLevelCtrl.moveToLevelWithOnOff"));
        expect(all.at(-1)).toBe("genLevelCtrl.moveToLevelWithOnOff");
    });

    it("a color message that cuts a turn on short still turns the light on, with the newer color", async () => {
        const {run, settle, commands} = await setup();
        const turnOn = run({state: "ON", color_temp: 250, brightness: 150}, LIT_RED);
        await vi.advanceTimersByTimeAsync(100);
        const colorChange = run({color_temp: 300}, LIT_RED);
        await settle(Promise.all([turnOn, colorChange]));
        const colorCommands = commands().filter((c) => c.name === "lightingColorCtrl.moveToColorTemp");
        expect(colorCommands.map((c) => c.payload.colortemp)).toEqual([300]);
        expect(commands().at(-1)?.name).toBe("genLevelCtrl.moveToLevelWithOnOff");
    });

    it("a finished command leaves nothing for the next one to take over", async () => {
        const {run, settle, names} = await setup();
        await settle(run({state: "ON", color_temp: 250, brightness: 150}, OFF));
        const before = names().length;
        await settle(run({state: "OFF"}, LIT_WHITE));
        expect(names().slice(before)[0]).toBe("genOnOff.off");
        expect(names().slice(before)).not.toContain("lightingColorCtrl.moveToColorTemp");
    });

    it("a newer command cancels a running fade-out, so the OFF is never sent", async () => {
        const {run, settle, names} = await setup();
        const fadeOut = run({state: "OFF", transition: 3}, LIT_WHITE);
        await vi.advanceTimersByTimeAsync(500);
        const turnOn = run({state: "ON", brightness: 200}, LIT_WHITE);
        await settle(Promise.all([fadeOut, turnOn]));
        expect(names()).not.toContain("genOnOff.off");
    });

    it.each([true, false])("the single execute_if_off setting (%s) is written to both clusters", async (enabled) => {
        const {definition, endpoint} = await setup();
        const converter = definition.toZigbee.find((c) => c.key.includes("level_config"));
        const result = await converter?.convertSet?.(endpoint, "level_config", {execute_if_off: enabled}, {
            mapped: definition,
        } as unknown as Tz.Meta);
        expect(result).toEqual({state: {level_config: {execute_if_off: enabled}}});
        expect(endpoint.write).toHaveBeenCalledWith("genLevelCtrl", {options: enabled ? 1 : 0}, expect.anything());
        expect(endpoint.write).toHaveBeenCalledWith("lightingColorCtrl", {options: enabled ? 1 : 0}, expect.anything());
    });

    it("other level_config settings do not touch the colour cluster", async () => {
        const {definition, endpoint} = await setup();
        const converter = definition.toZigbee.find((c) => c.key.includes("level_config"));
        await converter?.convertSet?.(endpoint, "level_config", {current_level_startup: 10}, {mapped: definition} as unknown as Tz.Meta);
        expect(endpoint.write).toHaveBeenCalledWith("genLevelCtrl", {startUpCurrentLevel: 10}, expect.anything());
        expect(endpoint.write).not.toHaveBeenCalledWith("lightingColorCtrl", expect.anything(), expect.anything());
    });

    it("exposes execute_if_off once, as level_config", async () => {
        const {definition} = await setup();
        const exposes = definition.exposes as unknown as {
            type?: string;
            property?: string;
            features?: {property?: string; features?: {name: string}[]}[];
        }[];
        const levelConfig = exposes.find((e) => e.type === "light")?.features?.find((f) => f.property === "level_config");
        expect(levelConfig?.features?.map((f) => f.name)).toContain("execute_if_off");
        expect(exposes.find((e) => e.property === "color_options")).toBeUndefined();
    });
});
