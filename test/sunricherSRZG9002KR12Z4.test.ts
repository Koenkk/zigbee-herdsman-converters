import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/sunricher";
import type {KeyValue} from "../src/lib/types";

const definition = definitions.find((d) => d.model === "SR-ZG9002KR12-Z4");
if (!definition || !("fromZigbee" in definition) || !definition.fromZigbee) {
    throw new Error("SR-ZG9002KR12-Z4 definition or converters are missing");
}
const converters = definition.fromZigbee;

function message(ieeeAddr: string, endpointID: number, seq: number, groupID: number, type: string, cluster: string, data: KeyValue = {}) {
    return {
        device: {ieeeAddr},
        endpoint: {ID: endpointID},
        meta: {zclTransactionSequenceNumber: seq},
        groupID,
        type,
        cluster,
        data,
    };
}

function feed(published: KeyValue[], msg: ReturnType<typeof message>) {
    const converter = converters.find((c) => {
        if (c.cluster !== msg.cluster) return false;
        return Array.isArray(c.type) ? c.type.includes(msg.type) : c.type === msg.type;
    });
    if (!converter) throw new Error(`No converter for ${msg.cluster}/${msg.type}`);
    const result = converter.convert(
        definition as never,
        msg as never,
        ((payload: KeyValue) => published.push(payload)) as never,
        {} as never,
        {} as never,
    );
    if (result) published.push(result);
}

describe("Sunricher SR-ZG9002KR12-Z4 group-aware commands", () => {
    let published: KeyValue[];

    beforeEach(() => {
        vi.useFakeTimers();
        published = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("publishes a rotary step once with the group when groupID 0 arrives first", () => {
        const data = {stepmode: 0, stepsize: 4, transtime: 2};
        feed(published, message("0xSTEP1", 2, 101, 0, "commandStep", "genLevelCtrl", data));
        expect(published).toHaveLength(0);
        feed(published, message("0xSTEP1", 2, 101, 353, "commandStep", "genLevelCtrl", data));
        vi.advanceTimersByTime(100);

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({
            action: "brightness_step_up",
            action_step_size: 4,
            action_transition_time: 0.2,
            action_group: 353,
        });
    });

    it("publishes a rotary step once when the group copy arrives first", () => {
        const data = {stepmode: 1, stepsize: 8, transtime: 2};
        feed(published, message("0xSTEP2", 2, 102, 354, "commandStep", "genLevelCtrl", data));
        feed(published, message("0xSTEP2", 2, 102, 0, "commandStep", "genLevelCtrl", data));
        vi.advanceTimersByTime(100);

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({action: "brightness_step_down", action_group: 354});
    });

    it("keeps the group on colour-temperature steps", () => {
        feed(published, message("0xCT1", 2, 103, 355, "commandStepColorTemp", "lightingColorCtrl", {stepmode: 1, stepsize: 3, transtime: 5}));
        vi.advanceTimersByTime(100);

        expect(published).toHaveLength(1);
        expect(published[0]).toMatchObject({action: "color_temperature_step_down", action_group: 355});
    });

    it("reports the power button once from its four-endpoint burst", () => {
        for (const [endpoint, group] of [
            [1, 353],
            [2, 354],
            [3, 355],
            [4, 356],
        ] as const) {
            feed(published, message("0xPOWER1", endpoint, 200 + endpoint, group, "commandOff", "genOnOff"));
            feed(published, message("0xPOWER1", endpoint, 200 + endpoint, 0, "commandOff", "genOnOff"));
        }
        vi.advanceTimersByTime(100);

        expect(published).toHaveLength(1);
        expect(published[0]).toStrictEqual({action: "power_off"});
    });

    it("reports a group button once with the active group", () => {
        feed(published, message("0xGROUP1", 3, 210, 0, "commandOn", "genOnOff"));
        feed(published, message("0xGROUP1", 3, 210, 355, "commandOn", "genOnOff"));
        vi.advanceTimersByTime(100);

        expect(published).toHaveLength(1);
        expect(published[0]).toStrictEqual({action: "on_3", action_group: 355});
    });
});
