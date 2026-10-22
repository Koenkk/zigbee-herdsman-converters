import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Schneider Electric S520567", () => {
    const convertReport = async (data: KeyValueAny, type: "attributeReport" | "readResponse" = "attributeReport") => {
        const device = mockDevice({
            modelID: "NHPB/SHUTTER/1",
            manufacturerName: "Schneider Electric",
            endpoints: [
                {ID: 5, inputClusters: ["closuresWindowCovering"]},
                {ID: 21, inputClusters: ["genOnOff"]},
            ],
        });
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee?.find(
            (c) => c.cluster === "closuresWindowCovering" && c.type.includes(type) && c.options !== undefined,
        );
        if (converter === undefined) throw new Error("no closuresWindowCovering position converter on the definition");

        const msg = {
            data,
            endpoint: device.getEndpoint(5),
            device,
            meta: null,
            groupID: null,
            type,
            cluster: "closuresWindowCovering",
            linkquality: 255,
        } as unknown as Fz.Message<"closuresWindowCovering", undefined, "attributeReport" | "readResponse">;

        const meta = {state: {}, device, deviceExposesChanged: () => {}} as unknown as Fz.Meta;
        const payload = await converter.convert(definition, msg, () => {}, {}, meta);
        if (payload === undefined) throw new Error("converter published nothing");

        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;

        return {exposes, payload};
    };

    const convertLiftReport = (currentPositionLiftPercentage: number) => convertReport({currentPositionLiftPercentage});

    it("reports state alongside position for a lift percentage report", async () => {
        expect((await convertLiftReport(50)).payload).toStrictEqual({position: 50, state: "OPEN"});
        expect((await convertLiftReport(0)).payload).toStrictEqual({position: 0, state: "CLOSE"});
        expect((await convertLiftReport(100)).payload).toStrictEqual({position: 100, state: "OPEN"});
    });

    it("reports state on a read response as well as an attribute report", async () => {
        const {payload} = await convertReport({currentPositionLiftPercentage: 30}, "readResponse");
        expect(payload).toStrictEqual({position: 30, state: "OPEN"});
    });

    it("does not derive state from a tilt report", async () => {
        const {payload} = await convertReport({currentPositionTiltPercentage: 100});
        expect(payload).toStrictEqual({tilt: 100});
    });
});

describe("Schneider Electric CCTFR6400", () => {
    let tsn = 0; // shared: the duplicate-transaction filter remembers numbers across tests
    const setup = async () => {
        const device = mockDevice({
            modelID: "Thermostat",
            manufacturerName: "Schneider Electric",
            ieeeAddr: "0x00124b0012345678",
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const uiAction = definition.fromZigbee?.find((c) => c.cluster === "wiserDeviceInfo" && c.type.includes("attributeReport"));
        if (uiAction === undefined) throw new Error("no wiserDeviceInfo converter on the definition");
        const ui = async (event: string) => {
            const msg = {
                data: {deviceInfo: `UI,${event}`},
                endpoint,
                device,
                meta: {zclTransactionSequenceNumber: ++tsn},
                groupID: null,
                type: "attributeReport",
                cluster: "wiserDeviceInfo",
                linkquality: 255,
            } as unknown as Fz.Message<"wiserDeviceInfo", undefined, "attributeReport">;
            const meta = {state: {}, device, deviceExposesChanged: () => {}} as unknown as Fz.Meta;
            return await uiAction.convert(definition, msg, () => {}, {}, meta);
        };
        return {device, definition, endpoint, ui};
    };

    it("emulates +/- presses when the keypad lockout was never read", async () => {
        const {endpoint, ui} = await setup();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2000});
        expect(endpoint.getClusterAttributeValue("hvacUserInterfaceCfg", "keypadLockout")).toBeUndefined();

        await ui("ScreenWake");
        expect(await ui("ButtonPressPlusDown")).toStrictEqual({action: "button_press_plus_down", occupied_heating_setpoint: 20.5});
        expect(await ui("ButtonPressMinusDown")).toStrictEqual({action: "button_press_minus_down", occupied_heating_setpoint: 20});
    });

    it("ignores +/- presses while the keypad is locked", async () => {
        const {endpoint, ui} = await setup();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2000});
        endpoint.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout: 1});

        await ui("ScreenWake");
        expect(await ui("ButtonPressPlusDown")).toStrictEqual({action: "button_press_plus_down"});
    });

    it("seeds the hub emulation cache even when binding fails", async () => {
        const {device, definition, endpoint} = await setup();
        vi.spyOn(endpoint, "bind").mockRejectedValue(new Error("Bind failed (Status 'TABLE_FULL')"));

        await expect(
            definition.configure?.(device, mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1), definition),
        ).rejects.toThrow("TABLE_FULL");
        expect(endpoint.getClusterAttributeValue("hvacUserInterfaceCfg", "keypadLockout")).toStrictEqual(0);
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "systemMode")).toStrictEqual(4);
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "ctrlSeqeOfOper")).toStrictEqual(2);
    });
});
