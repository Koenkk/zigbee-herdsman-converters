import {describe, expect, it} from "vitest";
import {definitions as develcoDefinitions} from "../src/devices/develco";
import {fromZigbee} from "../src/index";
import {mockDevice} from "./utils";

describe("converters/fromZigbee", () => {
    const zhemi101Definition = develcoDefinitions.find((definition) => definition.model === "ZHEMI101");
    const zhemi101MeteringConverter = zhemi101Definition?.fromZigbee?.find((converter) => converter.cluster === "seMetering");

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

    it("ZHEMI101 converts electricity instantaneous demand to W", () => {
        const device = mockDevice({
            modelID: "ZHEMI101",
            endpoints: [
                {
                    ID: 2,
                    attributes: {seMetering: {attributes: {unitOfMeasure: 0, multiplier: 1, divisor: 1000, meteringDeviceType: 0}}},
                },
            ],
        });
        const endpoint = device.getEndpoint(2);

        const payload = zhemi101MeteringConverter?.convert(
            // @ts-expect-error minimal model
            zhemi101Definition,
            {
                data: {instantaneousDemand: 280},
                endpoint,
                device,
                meta: {rawData: Buffer.from([])},
                groupID: 0,
                type: "attributeReport",
                cluster: "seMetering",
                linkquality: 0,
            },
            null,
            {},
            {state: {interface_mode: "electricity", unit_of_measure: 0, metering_device_type: 0, multiplier: 1, divisor: 1000}},
        );

        expect(payload).toStrictEqual({power: 280});
    });

    it("ZHEMI101 republishes missing metering metadata from stale null state", () => {
        const device = mockDevice({
            ieeeAddr: "0x0000000000000003",
            modelID: "ZHEMI101",
            endpoints: [
                {
                    ID: 2,
                    attributes: {seMetering: {attributes: {unitOfMeasure: 0, multiplier: 1, divisor: 1000, meteringDeviceType: 0}}},
                },
            ],
        });
        const endpoint = device.getEndpoint(2);

        const payload = zhemi101MeteringConverter?.convert(
            // @ts-expect-error minimal model
            zhemi101Definition,
            {
                data: {instantaneousDemand: 280},
                endpoint,
                device,
                meta: {rawData: Buffer.from([])},
                groupID: 0,
                type: "attributeReport",
                cluster: "seMetering",
                linkquality: 0,
            },
            null,
            {},
            {
                state: {
                    interface_mode: "electricity",
                    unit_of_measure: null,
                    metering_device_type: null,
                    multiplier: null,
                    divisor: null,
                },
            },
        );

        expect(payload).toStrictEqual({
            divisor: 1000,
            metering_device_type: 0,
            multiplier: 1,
            power: 280,
            unit_of_measure: 0,
        });
    });

    it("ZHEMI101 keeps gas and water instantaneous demand in m3/h", () => {
        for (const [interfaceMode, property] of [
            ["gas", "flow"],
            ["water", "flow"],
        ] as const) {
            const device = mockDevice({
                ieeeAddr: interfaceMode === "gas" ? "0x0000000000000001" : "0x0000000000000002",
                modelID: "ZHEMI101",
                endpoints: [
                    {
                        ID: 2,
                        attributes: {
                            seMetering: {
                                attributes: {unitOfMeasure: 1, multiplier: 1, divisor: 1000, meteringDeviceType: interfaceMode === "gas" ? 1 : 2},
                            },
                        },
                    },
                ],
            });
            const endpoint = device.getEndpoint(2);

            const payload = zhemi101MeteringConverter?.convert(
                // @ts-expect-error minimal model
                zhemi101Definition,
                {
                    data: {instantaneousDemand: 280},
                    endpoint,
                    device,
                    meta: {rawData: Buffer.from([])},
                    groupID: 0,
                    type: "attributeReport",
                    cluster: "seMetering",
                    linkquality: 0,
                },
                null,
                {},
                {
                    state: {
                        interface_mode: interfaceMode,
                        unit_of_measure: 1,
                        metering_device_type: interfaceMode === "gas" ? 1 : 2,
                        multiplier: 1,
                        divisor: 1000,
                    },
                },
            );

            expect(payload).toStrictEqual({[property]: 0.28});
        }
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
