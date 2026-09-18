import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {definitions} from "../src/devices/adurosmart";
import {prepareDefinition} from "../src/index";
import type {Definition, Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice, reportingItem} from "./utils";

function getDefinition(model: string): Definition {
    const definition = definitions.find((candidate) => candidate.model === model);
    if (!definition) throw new Error(`Missing AduroSmart definition for ${model}`);
    return prepareDefinition(definition);
}

function convert(model: string, cluster: string, type: string, data: KeyValueAny): KeyValueAny | undefined {
    const definition = getDefinition(model);
    const converter = definition.fromZigbee.find((candidate) => candidate.cluster === cluster && candidate.type.includes(type));
    if (!converter) throw new Error(`Missing ${cluster}/${type} converter for ${model}`);

    return converter.convert(definition, {data, type, cluster} as unknown as Fz.Message, () => {}, {}, {} as Fz.Meta) as KeyValueAny | undefined;
}

describe("AduroSmart ERIA definitions", () => {
    it("covers the complete AduroSmart ERIA product inventory", () => {
        const supported = new Set(
            definitions.flatMap((definition) => [
                ...(definition.zigbeeModel ?? []),
                ...(definition.fingerprint ?? []).flatMap((fingerprint) => (fingerprint.modelID ? [fingerprint.modelID] : [])),
            ]),
        );
        const expected = [
            "CSW_ADUROLIGHT",
            "AD-CTW123001",
            "AD-CTW143001",
            "AD-ColorTemperature3001",
            "AD-E1XCTW3001",
            "AD-E1XCT3001",
            "AD-DL4CT3001",
            "AD-DL4CTW3001",
            "AD-DL6CT3001",
            "AD-DL6CTW3001",
            "AD-DimmableLight3001",
            "BDP3001",
            "BDP3",
            "Adurolight_NCC",
            "AD-Dimmer",
            "AD-FLMCT3001",
            "DimmerM3002",
            "ONOFF_METER_RELAY",
            "VMS_ADUROLIGHT",
            "CSW_81909",
            "BPU3",
            "AD-SmartPlug3001",
            "ONOFFRELAY",
            "AD-RGBW3001",
            "AD-RGBWH3001",
            "AD-BR3RGBW3001",
            "AD-E14RGBW3001",
            "AD-DL4RGBW3001",
            "AD-DL6RGBW3001",
            "Extended Color WS Strip V1.0",
            "AD-GU10RGB3001",
            "AD-GU10RGBW3001",
            "Extended Color LED Strip V1.0",
            "ADUROLIGHT_CSC",
            "Smart Siren",
        ];

        expect(definitions).toHaveLength(30);
        expect([...supported].sort()).toEqual(expected.sort());
        expect(definitions.every((definition) => !definition.zigbeeModel && !definition.whiteLabel)).toBe(true);
        expect(
            definitions.flatMap((definition) => definition.fingerprint ?? []).some((fingerprint) => fingerprint.manufacturerName === "HEIMAN"),
        ).toBe(false);
    });

    it("decodes and binds the manufacturer-specific dimmer and scene remote commands", async () => {
        expect(convert("81825", "remoteKey", "commandReportKey", {key1Value: 0, key2Value: 1, keyMode: 0})).toEqual({
            action: "up",
        });
        expect(convert("15090054", "remoteKey", "commandReportKey", {key1Value: 0, key2Value: 3, keyMode: 0})).toEqual({
            action: "button_3",
        });

        const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        for (const [modelID, model] of [
            ["Adurolight_NCC", "81825"],
            ["ADUROLIGHT_CSC", "15090054"],
        ] as const) {
            const remote = mockDevice(
                {
                    modelID,
                    manufacturerName: "AduroSmart ERIA",
                    powerSource: "Battery",
                    endpoints: [{ID: 1, inputClusterIDs: [0xfccc]}],
                },
                "EndDevice",
            );
            const definition = getDefinition(model);
            await definition.configure?.(remote, coordinator, definition);
            expect(remote.getEndpoint(1).bind).toHaveBeenCalledWith("remoteKey", coordinator);
        }
    });

    it("decodes all three axes from the 5-in-1 contact sensor", () => {
        expect(
            convert("81910", "accelerometerMeasurement", "commandReportAccelerometer", {
                accelerometerXValue: 4096,
                accelerometerYValue: -4096,
                accelerometerZValue: 0,
            }),
        ).toEqual({x_axis: 1001, y_axis: -1000, z_axis: 1});
    });

    it("configures the expected reporting intervals for both multi sensors", async () => {
        const coordinator = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        const multiContact = mockDevice(
            {
                modelID: "CSW_81909",
                manufacturerName: "AduroSmart ERIA",
                powerSource: "Battery",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: ["genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "ssIasZone"],
                        inputClusterIDs: [0xfcc1],
                    },
                ],
            },
            "EndDevice",
        );
        const multiMotion = mockDevice(
            {
                modelID: "VMS_ADUROLIGHT",
                manufacturerName: "AduroSmart ERIA",
                powerSource: "Battery",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: [
                            "genPowerCfg",
                            "msOccupancySensing",
                            "msTemperatureMeasurement",
                            "msRelativeHumidity",
                            "msIlluminanceMeasurement",
                        ],
                    },
                ],
            },
            "EndDevice",
        );

        const contactDefinition = getDefinition("81910");
        await contactDefinition.configure?.(multiContact, coordinator, contactDefinition);
        const contactEndpoint = multiContact.getEndpoint(1);
        expect(contactEndpoint.bind).toHaveBeenCalledWith("accelerometerMeasurement", coordinator);
        expect(contactEndpoint.bind).toHaveBeenCalledWith("ssIasZone", coordinator);

        const accelerometerPayload = {
            attr0Enum: 0,
            attr0ValueType: 0x29,
            accelerometerXValue: 4096,
            attr1Enum: 1,
            attr1ValueType: 0x29,
            accelerometerYValue: -4096,
            attr2Enum: 2,
            attr2ValueType: 0x29,
            accelerometerZValue: 0,
        };
        const frame = Zcl.Frame.create(
            Zcl.FrameType.SPECIFIC,
            Zcl.Direction.SERVER_TO_CLIENT,
            true,
            4653,
            1,
            "reportAccelerometer",
            "accelerometerMeasurement",
            accelerometerPayload,
            multiContact.customClusters,
        );
        const frameBuffer = frame.toBuffer();
        const parsedFrame = Zcl.Frame.fromBuffer(0xfcc1, Zcl.Header.fromBuffer(frameBuffer), frameBuffer, multiContact.customClusters);
        expect(parsedFrame.command.name).toBe("reportAccelerometer");
        expect(parsedFrame.payload).toEqual(accelerometerPayload);
        expect(vi.mocked(contactEndpoint.configureReporting).mock.calls).toEqual([
            ["genPowerCfg", [reportingItem("batteryPercentageRemaining", 3600, 65000, 2)]],
            ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, 3600, 100)]],
            ["msRelativeHumidity", [reportingItem("measuredValue", 10, 3600, 100)]],
        ]);

        const motionDefinition = getDefinition("81915");
        await motionDefinition.configure?.(multiMotion, coordinator, motionDefinition);
        expect(vi.mocked(multiMotion.getEndpoint(1).configureReporting).mock.calls).toEqual([
            ["genPowerCfg", [reportingItem("batteryPercentageRemaining", 3600, 65000, 2)]],
            ["msOccupancySensing", [reportingItem("occupancy", 1, 3600, 0)]],
            ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, 3600, 100)]],
            ["msRelativeHumidity", [reportingItem("measuredValue", 10, 3600, 100)]],
            ["msIlluminanceMeasurement", [reportingItem("measuredValue", 5, 3600, 100)]],
        ]);
    });
});
