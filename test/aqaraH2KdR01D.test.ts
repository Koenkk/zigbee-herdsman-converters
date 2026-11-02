import {describe, expect, it} from "vitest";
import {lumiModernExtend, numericAttributes2Payload} from "../src/lib/lumi";

const knob = lumiModernExtend.lumiKnobRotation({withButtonState: true, pressedEndpoint: 72});
const knobConverter = knob.fromZigbee?.[0];

async function decodeRotation(endpointId: number, rawAction: number) {
    if (!knobConverter) throw new Error("Aqara knob converter is missing");
    return await knobConverter.convert(
        {model: "KD-R01D"} as never,
        {
            endpoint: {ID: endpointId},
            data: {570: rawAction, 558: 24, 560: 12, 561: 200, 562: 8, 563: 6.67},
        } as never,
        (() => {}) as never,
        {} as never,
        {} as never,
    );
}

describe("Aqara H2 KD-R01D", () => {
    it("reports a released knob on endpoint 71", async () => {
        expect(await decodeRotation(71, 1)).toMatchObject({
            action: "start_rotating",
            action_rotation_button_state: "released",
            action_rotation_angle: 24,
        });
    });

    it("reports a pressed knob on endpoint 72", async () => {
        expect(await decodeRotation(72, 2)).toMatchObject({
            action: "rotation",
            action_rotation_button_state: "pressed",
        });
    });

    it("preserves the 0x80 pressed-state fallback", async () => {
        expect(await decodeRotation(71, 0x80 | 3)).toMatchObject({
            action: "stop_rotating",
            action_rotation_button_state: "pressed",
        });
    });

    it("does not publish button state when it is disabled", async () => {
        const extension = lumiModernExtend.lumiKnobRotation({withButtonState: false});
        const converter = extension.fromZigbee?.[0];
        if (!converter) throw new Error("Aqara knob converter is missing");
        const result = await converter.convert(
            {model: "KD-R01D"} as never,
            {endpoint: {ID: 72}, data: {570: 2}} as never,
            (() => {}) as never,
            {} as never,
            {} as never,
        );
        expect(result).toMatchObject({action: "rotation"});
        expect(result).not.toHaveProperty("action_rotation_button_state");
    });

    it("maps mode 0x0009 to event_mode for KD-R01D", async () => {
        const result = await numericAttributes2Payload({} as never, {} as never, {model: "KD-R01D"} as never, {}, {mode: 1});
        expect(result).toEqual({event_mode: "event"});
    });

    it("preserves the existing operation_mode mapping for other Aqara models", async () => {
        const result = await numericAttributes2Payload({} as never, {} as never, {model: "OTHER-AQARA"} as never, {}, {mode: 0});
        expect(result).toEqual({operation_mode: "command"});
    });
});
