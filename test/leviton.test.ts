import {beforeEach, describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Expose, Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

function buildDevice() {
    return mockDevice({
        modelID: "DG3HL",
        manufacturerName: "Leviton",
        endpoints: [
            {
                ID: 1,
                inputClusters: ["genBasic", "genIdentify", "genGroups", "genScenes", "genOnOff", "genLevelCtrl", "lightingBallastCfg"],
                outputClusters: ["genOta"],
            },
        ],
    });
}

function getExposeNames(expose: Expose): string[] {
    return [expose.name, ...(expose.features?.flatMap(getExposeNames) ?? [])].filter((name): name is string => name !== undefined);
}

describe("Leviton DG3HL-1BW", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = buildDevice();
        definition = await findByDevice(device);
        await definition.configure?.(device, device.getEndpoint(1), definition);
    });

    it("exposes only the supported level and ballast configuration", () => {
        const exposes = definition.exposes as Expose[];
        const names = exposes.flatMap(getExposeNames);

        expect(names).toContain("on_transition_time");
        expect(names).toContain("off_transition_time");
        expect(names).toContain("on_level");
        expect(names).toContain("execute_if_off");
        expect(names).toContain("ballast_minimum_level");
        expect(names).toContain("ballast_maximum_level");
        expect(names).toContain("ballast_power_on_level");
        expect(names).toContain("identify");
        expect(names).not.toContain("power_on_behavior");
        expect(names).not.toContain("ballast_status_non_operational");
        expect(names).not.toContain("ballast_status_lamp_failure");
    });

    it("allows the tested power-on level value 255", async () => {
        expect(device.customClusters.lightingBallastCfg.attributes.powerOnLevel).toMatchObject({
            ID: 0x0012,
            type: Zcl.DataType.UINT8,
            max: 0xff,
        });

        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("ballast_power_on_level")) as Tz.Converter;
        await converter.convertSet(device.getEndpoint(1), "ballast_power_on_level", 255, {
            device,
            mapped: definition,
            message: {ballast_power_on_level: 255},
            state: {},
        } as Tz.Meta);

        expect(device.getEndpoint(1).write).toHaveBeenCalledWith("lightingBallastCfg", {powerOnLevel: 255}, undefined);
    });

    it.each([
        {description: "restores a saved true setting on the boot report", sequence: 1, currentLevel: 126, executeIfOff: true, writes: 1},
        {description: "does not override a saved false setting", sequence: 1, currentLevel: 126, executeIfOff: false, writes: 0},
        {description: "ignores later level reports", sequence: 2, currentLevel: 126, executeIfOff: true, writes: 0},
        {description: "ignores unrelated reports", sequence: 1, currentLevel: undefined, executeIfOff: true, writes: 0},
    ])("$description", async ({sequence, currentLevel, executeIfOff, writes}) => {
        const converter = definition.fromZigbee.find(
            (candidate) => candidate.cluster === "genLevelCtrl" && candidate.type.length === 1 && candidate.type[0] === "attributeReport",
        ) as Fz.Converter;
        const endpoint = device.getEndpoint(1);
        endpoint.write.mockClear();

        await converter.convert(
            definition,
            {
                data: currentLevel === undefined ? {} : {currentLevel},
                endpoint,
                device,
                type: "attributeReport",
                meta: {zclTransactionSequenceNumber: sequence},
            } as Fz.Message,
            () => {},
            {},
            {device, state: {level_config: {execute_if_off: executeIfOff}} as KeyValueAny} as Fz.Meta,
        );

        expect(endpoint.write).toHaveBeenCalledTimes(writes);
        if (writes === 1) expect(endpoint.write).toHaveBeenCalledWith("genLevelCtrl", {options: 1});
    });
});
