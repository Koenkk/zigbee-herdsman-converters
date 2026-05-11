import {describe, expect, it} from "vitest";
import {fromZigbee} from "../src/index";

describe("converters/fromZigbee", () => {
    it("Message with no properties does not error converting battery percentages", () => {
        const payload = fromZigbee.battery.convert(
            // @ts-expect-error mock
            {
                meta: {},
            },
            {data: {}, endpoint: null, device: null, meta: null, groupID: null, type: "attributeReport", cluster: "genPowerCfg", linkquality: 0},
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({});
    });

    it("Device specifying voltageToPercentage ignores reported percentage", () => {
        const payload = fromZigbee.battery.convert(
            // @ts-expect-error mock
            {
                meta: {
                    battery: {
                        voltageToPercentage: "3V_1500_2800",
                    },
                },
            },
            {
                data: {
                    batteryVoltage: 27,
                    batteryPercentageRemaining: 2,
                },
                endpoint: null,
                device: null,
                meta: null,
                groupID: null,
                type: "attributeReport",
                cluster: "genPowerCfg",
                linkquality: 0,
            },
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({
            battery: 98,
            voltage: 2700,
        });
    });

    it("Device uses reported percentage", () => {
        const payload = fromZigbee.battery.convert(
            // @ts-expect-error mock
            {
                meta: {},
            },
            {
                data: {
                    batteryVoltage: 27,
                    batteryPercentageRemaining: 2,
                },
                endpoint: null,
                device: null,
                meta: null,
                groupID: null,
                type: "attributeReport",
                cluster: "genPowerCfg",
                linkquality: 0,
            },
            null,
            {},
            {
                meta: {},
            }.meta,
        );
        expect(payload).toStrictEqual({
            battery: 1,
            voltage: 2700,
        });
    });

    describe("command_step_color_temperature", () => {
        const makeMsg = (stepmode: number, stepsize: number, transtime?: number) => ({
            data: {stepmode, stepsize, ...(transtime !== undefined ? {transtime} : {})},
            endpoint: {ID: 1},
            device: {ieeeAddr: "0x00158d0000000000"},
            meta: {zclTransactionSequenceNumber: 1},
            groupID: null,
            type: "commandStepColorTemp" as const,
            cluster: "lightingColorCtrl" as const,
            linkquality: 0,
        });

        it("emits positive action_color_temperature_delta when stepping up", () => {
            const payload = fromZigbee.command_step_color_temperature.convert(
                // @ts-expect-error mock
                {meta: {publishDuplicateTransaction: true}},
                makeMsg(1, 5, 100),
                null,
                {},
                {meta: {}},
            );
            expect(payload.action).toBe("color_temperature_step_up");
            expect(payload.action_step_size).toBe(5);
            expect(payload.action_color_temperature_delta).toBe(5);
            expect(payload.action_transition_time).toBe(1);
        });

        it("emits negative action_color_temperature_delta when stepping down", () => {
            const payload = fromZigbee.command_step_color_temperature.convert(
                // @ts-expect-error mock
                {meta: {publishDuplicateTransaction: true}},
                makeMsg(0, 10, 50),
                null,
                {},
                {meta: {}},
            );
            expect(payload.action).toBe("color_temperature_step_down");
            expect(payload.action_step_size).toBe(10);
            expect(payload.action_color_temperature_delta).toBe(-10);
            expect(payload.action_transition_time).toBe(0.5);
        });

        it("does not include action_transition_time when transtime is undefined", () => {
            const payload = fromZigbee.command_step_color_temperature.convert(
                // @ts-expect-error mock
                {meta: {publishDuplicateTransaction: true}},
                makeMsg(1, 3),
                null,
                {},
                {meta: {}},
            );
            expect(payload.action_color_temperature_delta).toBe(3);
            expect(payload.action_transition_time).toBeUndefined();
        });
    });
});
