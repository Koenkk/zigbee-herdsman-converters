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
});
