import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
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
