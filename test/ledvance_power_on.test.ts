import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import {access} from "../src/lib/exposes";
import {ledvanceLight, ledvancePowerOnBehavior} from "../src/lib/ledvance";
import {mockDevice} from "./utils";

const bulb = () =>
    mockDevice({
        modelID: "Classic A60 W clear - LIGHTIFY",
        manufacturerName: "OSRAM",
        endpoints: [{ID: 3, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl"]}],
    });

const okRsp = {cmdId: 0x0c, statusCode: 0};

const set = (endpoint: ReturnType<typeof bulb>["endpoints"][0], value: string) => {
    vi.mocked(endpoint.command).mockResolvedValue(okRsp as never);
    return ledvancePowerOnBehavior().toZigbee[0].convertSet(endpoint, "power_on_behavior", value, {mapped: undefined} as never);
};

const expectMode = (endpoint: ReturnType<typeof bulb>["endpoints"][0], mode: number) =>
    expect(endpoint.command).toHaveBeenCalledWith("manuSpecificOsram", "setPowerOnState", {mode}, {manufacturerCode: 0x110c});

describe("ledvancePowerOnBehavior", () => {
    it("off and on map to modes 0x01 and 0x03 with a confirmed echo", async () => {
        const endpoint = bulb().getEndpoint(3);
        expect((await set(endpoint, "off"))?.state).toEqual({power_on_behavior: "off"});
        expectMode(endpoint, 0x01);
        expect((await set(endpoint, "ON"))?.state).toEqual({power_on_behavior: "on"});
        expectMode(endpoint, 0x03);
    });

    it.each(["previous", "toggle"])("%s is rejected without any radio write", async (value) => {
        const endpoint = bulb().getEndpoint(3);
        await expect(set(endpoint, value)).rejects.toThrow(`must be 'off' or 'on'`);
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    // "constructor" and "__proto__" resolve through Object.prototype in a plain-object
    // lookup and used to serialize payload 0x00 to the bulb; they must never reach it.
    it.each(["constructor", "__proto__"])("inherited property name %s is rejected without any radio write", async (value) => {
        const endpoint = bulb().getEndpoint(3);
        await expect(set(endpoint, value)).rejects.toThrow();
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it("a firmware rejection (INVALID_VALUE) is surfaced, not echoed as success", async () => {
        const endpoint = bulb().getEndpoint(3);
        vi.mocked(endpoint.command).mockResolvedValue({cmdId: 0x0c, statusCode: 0x87} as never);
        await expect(
            ledvancePowerOnBehavior().toZigbee[0].convertSet(endpoint, "power_on_behavior", "off", {mapped: undefined} as never),
        ).rejects.toThrow("INVALID_VALUE");
    });

    it("the expose is off/on with STATE_SET and the device definition carries it", async () => {
        const extend = ledvancePowerOnBehavior();
        const expose = extend.exposes.find((x) => x.property === "power_on_behavior");
        expect(expose?.values).toEqual(["off", "on"]);
        expect(expose?.access).toBe(access.STATE_SET);
        const definition = await findByDevice(bulb());
        expect(definition.exposes?.find((x) => x.property === "power_on_behavior")?.values).toEqual(["off", "on"]);
        expect(definition.toZigbee?.find((c) => c.key.includes("power_on_behavior"))).toBeDefined();
        // and the light extend still registers the custom cluster both need
        expect(ledvanceLight({}).toZigbee.length).toBeGreaterThan(0);
    });
});
