import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import {access} from "../src/lib/exposes";
import * as ledvance from "../src/lib/ledvance";
import {mockDevice} from "./utils";

const DIVISOR_ATTRIBUTES = [
    "acPowerDivisor",
    "acPowerMultiplier",
    "acCurrentDivisor",
    "acCurrentMultiplier",
    "acVoltageDivisor",
    "acVoltageMultiplier",
];

const plug = (modelID: string) =>
    mockDevice({
        modelID,
        manufacturerName: "LEDVANCE",
        endpoints: [
            {
                ID: 1,
                inputClusters: ["genBasic", "genIdentify", "genGroups", "genScenes", "genOnOff", "haElectricalMeasurement", "seMetering"],
                attributes: {
                    haElectricalMeasurement: {
                        attributes: {
                            acPowerDivisor: 10,
                            acPowerMultiplier: 1,
                            acCurrentDivisor: 1000,
                            acCurrentMultiplier: 1,
                            acVoltageDivisor: 1,
                            acVoltageMultiplier: 1,
                        },
                    },
                    seMetering: {attributes: {divisor: 100, multiplier: 1}},
                },
            },
        ],
    });

type ReportItem = {attribute: string; minimumReportInterval: number; maximumReportInterval: number; reportableChange: number};

// Every attribute handed to configureReporting for the given cluster, flattened across the chunked calls.
function reportedAttributes(endpoint: ReturnType<typeof plug>["endpoints"][0], cluster = "haElectricalMeasurement"): ReportItem[] {
    return vi
        .mocked(endpoint.configureReporting)
        .mock.calls.filter((call: unknown[]) => call[0] === cluster)
        .flatMap((call: unknown[]) => call[1] as ReportItem[]);
}

async function configured(modelID: string) {
    const device = plug(modelID);
    const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
    const definition = await findByDevice(device);
    return {device, coordinator, definition, endpoint: device.getEndpoint(1)};
}

describe.each(["PLUG EU EM T", "PLUG COMPACT EU EM T"])("LEDVANCE energy meter plug (%s)", (modelID) => {
    it("silences all six divisor/multiplier constants", async () => {
        const {device, coordinator, definition, endpoint} = await configured(modelID);

        await definition.configure?.(device, coordinator, definition);

        const silenced = reportedAttributes(endpoint)
            .filter((a) => a.maximumReportInterval === 0xffff)
            .map((a) => a.attribute)
            .sort();
        expect(silenced).toStrictEqual([...DIVISOR_ATTRIBUTES].sort());
    });

    // The regression this guard exists for: silencing is an optimization, the base electricityMeter
    // reporting is the fix. A delivery failure while silencing must not take the measurement
    // reporting down with it.
    it("still configures the measurements when silencing fails", async () => {
        const {device, coordinator, definition, endpoint} = await configured(modelID);

        vi.mocked(endpoint.configureReporting).mockImplementation((_cluster: unknown, items: unknown) => {
            const attributes = (items as ReportItem[]).map((i) => i.attribute);
            if (attributes.some((a) => DIVISOR_ATTRIBUTES.includes(a))) {
                return Promise.reject(new Error("Delivery failed"));
            }
            return Promise.resolve();
        });

        await expect(definition.configure?.(device, coordinator, definition)).resolves.not.toThrow();

        expect(reportedAttributes(endpoint).map((a) => a.attribute)).toContain("activePower");
    });
});

const osramBulb = () =>
    mockDevice({
        modelID: "Classic A60 W clear - LIGHTIFY",
        manufacturerName: "OSRAM",
        endpoints: [{ID: 3, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl"]}],
    });

const mockMeta = {mapped: undefined, options: null, state: {}, device: null, message: null, publish: null, endpoint_name: null} as never;

const setPowerOnState = (endpoint: ReturnType<typeof osramBulb>["endpoints"][0], value: string) =>
    ledvance.ledvanceTz.ledvance_power_on_behavior.convertSet(endpoint, "power_on_behavior", value, mockMeta);

const expectSetMode = (endpoint: ReturnType<typeof osramBulb>["endpoints"][0], mode: number) =>
    expect(endpoint.command).toHaveBeenCalledWith("manuSpecificOsram", "setPowerOnState", {mode}, {manufacturerCode: 0x110c});

describe("ledvance power_on_behavior (manuSpecificOsram 0x0C)", () => {
    it("off maps to mode 0x01 on the manufacturer cluster", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await setPowerOnState(endpoint, "off");
        expectSetMode(endpoint, 0x01);
    });

    it("on maps to mode 0x03", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        const result = await setPowerOnState(endpoint, "ON");
        expectSetMode(endpoint, 0x03);
        expect(result?.state).toEqual({power_on_behavior: "on"});
    });

    it("previous/toggle are rejected: the firmware has no such power-on mode", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await expect(setPowerOnState(endpoint, "previous")).rejects.toThrow();
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it("null payload is rejected with a proper Error, not a TypeError", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await expect(setPowerOnState(endpoint, null as never)).rejects.toThrow("is not a string");
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it("numeric payloads are rejected without any radio write", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await expect(setPowerOnState(endpoint, 1 as never)).rejects.toThrow();
        expect(endpoint.command).not.toHaveBeenCalled();
    });
});

describe("ledvanceLight power_on_behavior opt-in", () => {
    it("a model without osramPowerOnState gains no power_on_behavior expose or converter", async () => {
        const device = mockDevice({
            modelID: "Ceiling TW OSRAM",
            manufacturerName: "OSRAM",
            endpoints: [{ID: 3, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl"]}],
        });
        const definition = await findByDevice(device);
        expect(definition.exposes?.find((x) => x.property === "power_on_behavior")).toBeUndefined();
        expect(definition.toZigbee?.flatMap((c) => c.key)).not.toContain("power_on_behavior");
    });

    it("the expose allows STATE and SET: state comes from the echoed last-set value, not a device read", async () => {
        const device = osramBulb();
        const definition = await findByDevice(device);
        const expose = definition.exposes?.find((x) => x.property === "power_on_behavior");
        expect(expose?.access).toBe(access.STATE | access.SET);
    });

    it("with both osramPowerOnState and powerOnBehavior the standard converter wins", () => {
        const extend = ledvance.ledvanceLight({osramPowerOnState: true, powerOnBehavior: true});
        const ours = extend.toZigbee?.find((c) => c.key.includes("power_on_behavior"));
        expect(ours).not.toBe(ledvance.ledvanceTz.ledvance_power_on_behavior);
        expect(extend.exposes?.filter((x) => x.property === "power_on_behavior")).toHaveLength(1);
    });
});

describe("ledvanceLight power_on_behavior with endpointNames", () => {
    it("creates per-endpoint exposes and an endpoint-scoped converter", () => {
        const extend = ledvance.ledvanceLight({osramPowerOnState: true, endpointNames: ["l1", "l2"]});
        const properties = extend.exposes?.filter((x) => x.property?.startsWith("power_on_behavior")).map((x) => x.property);
        expect(properties).toEqual(["power_on_behavior_l1", "power_on_behavior_l2"]);
        const converter = extend.toZigbee?.find((c) => c.key.includes("power_on_behavior"));
        expect(converter?.endpoints).toEqual(["l1", "l2"]);
    });

    it("an explicitly passed powerOnBehavior: undefined does not re-enable the standard converter", () => {
        const extend = ledvance.ledvanceLight({osramPowerOnState: true, powerOnBehavior: undefined});
        const powerOnKeys = extend.toZigbee?.filter((c) => c.key.includes("power_on_behavior")) ?? [];
        expect(powerOnKeys).toHaveLength(1);
        expect(powerOnKeys[0]).toBe(ledvance.ledvanceTz.ledvance_power_on_behavior);
        expect(extend.exposes?.filter((x) => x.property?.startsWith("power_on_behavior"))).toHaveLength(1);
    });
});

describe("ledvanceLight exposes power_on_behavior off/on", () => {
    it("the extend exposes exactly off and on", async () => {
        const device = osramBulb();
        const definition = await findByDevice(device);
        const expose = definition.exposes?.find((x) => x.property === "power_on_behavior");
        expect(expose?.values).toEqual(["off", "on"]);
        const keys = definition.toZigbee?.flatMap((c) => c.key);
        expect(keys).toContain("power_on_behavior");
        // must be the manufacturer-cluster converter, not the shared genOnOff one:
        // these bulbs do not implement startUpOnOff and a silent genOnOff write would fail.
        const converter = definition.toZigbee?.find((c) => c.key.includes("power_on_behavior"));
        expect(converter).toBe(ledvance.ledvanceTz.ledvance_power_on_behavior);
    });
});

describe("ledvance remember_state (deprecated osram_ keys)", () => {
    it("non-boolean payloads are rejected with a proper Error before any radio write", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await expect(ledvance.ledvanceTz.ledvance_commands.convertSet(endpoint, "remember_state", "true", mockMeta)).rejects.toThrow(
            "'remember_state' is not a boolean",
        );
        expect(endpoint.command).not.toHaveBeenCalled();
    });

    it("boolean true sends saveStartupParams on the manufacturer cluster", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await ledvance.ledvanceTz.ledvance_commands.convertSet(endpoint, "remember_state", true, mockMeta);
        expect(endpoint.command).toHaveBeenCalledWith("manuSpecificOsram", "saveStartupParams", {}, {manufacturerCode: 0x110c});
    });

    it("boolean false sends resetStartupParams", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        await ledvance.ledvanceTz.ledvance_commands.convertSet(endpoint, "remember_state", false, mockMeta);
        expect(endpoint.command).toHaveBeenCalledWith("manuSpecificOsram", "resetStartupParams", {}, {manufacturerCode: 0x110c});
    });
});

describe("manufacturer command options", () => {
    it("definition-level options (e.g. disableDefaultResponse) are merged into the manufacturer command", async () => {
        const device = osramBulb();
        const endpoint = device.getEndpoint(3);
        const meta = {...mockMeta, mapped: {meta: {disableDefaultResponse: true}} as never} as never;
        await ledvance.ledvanceTz.ledvance_power_on_behavior.convertSet(endpoint, "power_on_behavior", "off", meta);
        expect(endpoint.command).toHaveBeenCalledWith(
            "manuSpecificOsram",
            "setPowerOnState",
            {mode: 0x01},
            {
                manufacturerCode: 0x110c,
                disableDefaultResponse: true,
            },
        );
    });
});

describe("AB32840 (Classic B40 TW)", () => {
    it("exposes power_on_behavior alongside color_temp, with the manufacturer converter", async () => {
        const device = mockDevice({
            modelID: "Classic B40 TW - LIGHTIFY",
            manufacturerName: "OSRAM",
            endpoints: [{ID: 3, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl", "lightingColorCtrl"]}],
        });
        const definition = await findByDevice(device);
        expect(definition.exposes?.find((x) => x.property === "power_on_behavior")?.values).toEqual(["off", "on"]);
        // color_temp lives inside the composite light expose built by m.light
        const light = definition.exposes?.find((x) => x.type === "light");
        expect(light?.features?.some((f) => f.name === "color_temp")).toBe(true);
        expect(definition.toZigbee?.find((c) => c.key.includes("power_on_behavior"))).toBe(ledvance.ledvanceTz.ledvance_power_on_behavior);
    });
});
