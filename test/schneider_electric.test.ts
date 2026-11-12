import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny, Tz} from "../src/lib/types";
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

describe("Schneider Electric WV704R0A0902", () => {
    it("still configures reporting when a bind fails with TABLE_FULL", async () => {
        const device = mockDevice({
            modelID: "iTRV",
            manufacturerName: "Schneider Electric",
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "hvacThermostat", "hvacUserInterfaceCfg", "haDiagnostic"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        const bind = vi
            .spyOn(endpoint, "bind")
            .mockImplementation((cluster) =>
                cluster === "genPowerCfg" ? Promise.reject(new Error("Bind failed (Status 'TABLE_FULL')")) : Promise.resolve(),
            );

        await definition.configure?.(device, coordinatorEndpoint, definition);

        expect(bind.mock.calls.map((c) => c[0])).toStrictEqual(["hvacThermostat", "genPowerCfg"]);
        const reported = vi
            .mocked(endpoint.configureReporting)
            .mock.calls.flatMap(([cluster, items]) => items.map((i) => `${cluster}.${i.attribute}`));
        expect(reported).toStrictEqual(
            expect.arrayContaining([
                "hvacThermostat.localTemp",
                "hvacThermostat.occupiedHeatingSetpoint",
                "hvacThermostat.pIHeatingDemand",
                "hvacUserInterfaceCfg.keypadLockout",
            ]),
        );
    });
});

describe("Schneider Electric EER51000", () => {
    it("answers the thermostat's setpoint and mode reads from the cache", async () => {
        const device = mockDevice({
            modelID: "EH-ZB-RTS",
            manufacturerName: "Schneider Electric",
            endpoints: [{ID: 11, inputClusters: ["hvacThermostat"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(11);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 1500});
        await definition.onEvent?.({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});
        await definition.toZigbee.find((c) => c.key?.includes("zone_mode"))?.convertSet?.(endpoint, "zone_mode", "schedule", {} as Tz.Meta);
        const readResponse = vi.spyOn(endpoint, "readResponse").mockResolvedValue(undefined);
        const read = (attrId: number) =>
            device.customReadResponse?.(
                Zcl.Frame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, undefined, 1, "read", "hvacThermostat", [{attrId}], {}),
                endpoint,
            );

        // Simulate the reads made when increasing/decreasing the temperature
        expect(read(0x0012)).toBe(true);
        expect(read(0xe010)).toBe(true);
        expect(readResponse.mock.calls).toStrictEqual([
            ["hvacThermostat", 1, {occupiedHeatingSetpoint: 1500}, {srcEndpoint: 11, manufacturerCode: undefined}],
            ["hvacThermostat", 1, {[0xe010]: {value: 2, type: Zcl.DataType.ENUM8}}, {srcEndpoint: 11, manufacturerCode: undefined}],
        ]);
        // Other attributes are left to zigbee-herdsman.
        expect(read(0x0000)).toBe(false);
    });
});

describe("Schneider Electric EER53000", () => {
    it("pushes setpoint and zone mode changes to the valve and answers its reads with them", async () => {
        const device = mockDevice({
            modelID: "EH-ZB-VACT",
            manufacturerName: "Schneider Electric",
            endpoints: [{ID: 11, inputClusters: ["hvacThermostat"]}],
        });
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(11);
        await definition.onEvent?.({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});
        const command = vi.spyOn(endpoint, "command").mockResolvedValue(undefined);
        const readResponse = vi.spyOn(endpoint, "readResponse").mockResolvedValue(undefined);
        const set = (key: string, value: unknown) =>
            definition.toZigbee.find((c) => c.key?.includes(key))?.convertSet?.(endpoint, key, value, {} as Tz.Meta);
        const read = (attrId: number) =>
            device.customReadResponse?.(
                Zcl.Frame.create(Zcl.FrameType.GLOBAL, Zcl.Direction.CLIENT_TO_SERVER, true, undefined, 1, "read", "hvacThermostat", [{attrId}], {}),
                endpoint,
            );

        await set("occupied_heating_setpoint", 21.5);
        await set("zone_mode", "schedule");
        expect(command.mock.calls.map((call) => call.slice(0, 3))).toStrictEqual([
            ["hvacThermostat", "wiserSmartSetSetpoint", {operatingmode: 0, zonemode: 1, setpoint: 2150, reserved: 0xff}],
            ["hvacThermostat", "wiserSmartSetSetpoint", {operatingmode: 0, zonemode: 2, setpoint: 2150, reserved: 0xff}],
        ]);

        // Simulate the reads made after a button press
        expect(read(0x0012)).toBe(true);
        expect(read(0xe010)).toBe(true);
        expect(readResponse.mock.calls).toStrictEqual([
            ["hvacThermostat", 1, {occupiedHeatingSetpoint: 2150}, {srcEndpoint: 11, manufacturerCode: undefined}],
            ["hvacThermostat", 1, {[0xe010]: {value: 2, type: Zcl.DataType.ENUM8}}, {srcEndpoint: 11, manufacturerCode: undefined}],
        ]);
    });
});
