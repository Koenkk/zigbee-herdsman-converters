import {describe, expect, it} from "vitest";
import {findByDevice} from "../src";
import type {Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("ADEO HR-C99C-Z-C045", () => {
    const convertStepColorTemperature = async (stepmode: number, sequenceNumber: number) => {
        const device = mockDevice({
            modelID: "LXEK-5",
            manufacturerName: "ADEO",
            ieeeAddr: "0x086bd7fffe1bc3f2",
            endpoints: [{ID: 1, outputClusters: ["lightingColorCtrl"]}],
        });
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find(
            (candidate) => candidate.cluster === "lightingColorCtrl" && candidate.type.includes("commandStepColorTemp"),
        );
        if (!converter) throw new Error("missing color temperature step converter");

        const msg = {
            data: {stepmode, stepsize: 22, transtime: 5, minimum: 153, maximum: 370, optionsMask: 0, optionsOverride: 0},
            endpoint: device.getEndpoint(1),
            device,
            meta: {zclTransactionSequenceNumber: sequenceNumber},
            groupID: null,
            type: "commandStepColorTemp",
            cluster: "lightingColorCtrl",
            linkquality: 25,
        } as unknown as Fz.Message;

        return converter.convert(definition, msg, () => {}, {}, {device} as unknown as Fz.Meta) as KeyValueAny;
    };

    it("maps the captured physical up press to color temperature step up", async () => {
        await expect(convertStepColorTemperature(3, 76)).resolves.toStrictEqual({
            action: "color_temperature_step_up",
            action_step_size: 22,
            action_color_temperature_delta: 22,
            action_transition_time: 0.5,
        });
    });

    it("maps the captured physical down press to color temperature step down", async () => {
        await expect(convertStepColorTemperature(1, 77)).resolves.toStrictEqual({
            action: "color_temperature_step_down",
            action_step_size: 22,
            action_color_temperature_delta: -22,
            action_transition_time: 0.5,
        });
    });
});
