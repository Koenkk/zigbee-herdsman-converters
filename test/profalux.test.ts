import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("Profalux MAI-ZTP20F", () => {
    const device = mockDevice({modelID: "MAI-ZTP20F", manufacturerName: "Profalux", endpoints: []}, "EndDevice");

    const makeMsg = (type: string, data: Record<string, unknown>, seq: number) => ({
        data,
        endpoint: {ID: 1},
        device: {ieeeAddr: "0x12345678"},
        meta: {zclTransactionSequenceNumber: seq},
        groupID: 39419,
        type,
        cluster: "genLevelCtrl",
        linkquality: 255,
    });

    it("exposes up/down/stop actions", async () => {
        const definition = await findByDevice(device);
        expect(definition.model).toBe("MAI-ZTP20F");
        expect(definition.exposes).toBeDefined();
    });

    it("maps genLevelCtrl commands to up/down/stop actions", async () => {
        const definition = await findByDevice(device);
        const converters = definition.fromZigbee.filter((c) => c.cluster === "genLevelCtrl");
        const moveConverter = converters.find((c) => c.type.includes("commandMoveWithOnOff"));
        const stopConverter = converters.find((c) => c.type.includes("commandStop"));
        expect(moveConverter).toBeDefined();
        expect(stopConverter).toBeDefined();

        const up = moveConverter.convert(definition, makeMsg("commandMoveWithOnOff", {movemode: 0, rate: null}, 1), null, {}, null);
        expect(up).toStrictEqual({action: "up"});

        const stop = stopConverter.convert(definition, makeMsg("commandStop", {optionsMask: 0, optionsOverride: 0}, 2), null, {}, null);
        expect(stop).toStrictEqual({action: "stop"});

        const down = moveConverter.convert(definition, makeMsg("commandMoveWithOnOff", {movemode: 1, rate: null}, 3), null, {}, null);
        expect(down).toStrictEqual({action: "down"});
    });
});
