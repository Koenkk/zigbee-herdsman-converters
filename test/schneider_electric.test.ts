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
    const setup = async () => {
        const device = mockDevice(
            {modelID: "iTRV", manufacturerName: "Schneider Electric", endpoints: [{ID: 1, inputClusters: ["hvacThermostat"]}]},
            "EndDevice",
        );
        const definition = await findByDevice(device);
        await definition.onEvent?.({type: "start", data: {device, deviceExposesChanged: () => {}, state: {}, options: {}}});
        const endpoint = device.getEndpoint(1);
        const readResponse = vi.spyOn(endpoint, "readResponse").mockResolvedValue(undefined);
        // The valve's poll: occupiedHeatingSetpoint, localTemp, pIHeatingDemand, systemMode
        const poll = (attrIds = [0x0012, 0x0000, 0x0008, 0x001c]) => {
            const frame = {
                isCluster: (name: string) => name === "hvacThermostat",
                cluster: Zcl.Utils.getCluster("hvacThermostat", undefined, {}),
                payload: attrIds.map((attrId) => ({attrId})),
                header: {transactionSequenceNumber: 1},
            };
            // biome-ignore lint/suspicious/noExplicitAny: minimal ZCL frame stand-in
            return device.customReadResponse?.(frame as any, endpoint) ? readResponse.mock.lastCall?.[2] : undefined;
        };
        const setSetpoint = (value: number) =>
            definition.toZigbee
                .find((c) => c.key.includes("occupied_heating_setpoint"))
                ?.convertSet?.(endpoint, "occupied_heating_setpoint", value, {device} as unknown as Tz.Meta);
        return {endpoint, poll, setSetpoint};
    };

    it("leaves the poll to zigbee-herdsman until a setpoint is known", async () => {
        const {endpoint, poll} = await setup();
        expect(poll()).toBeUndefined();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: -32768});
        expect(poll()).toBeUndefined();
    });

    it("answers the poll like a Wiser hub", async () => {
        const {endpoint, poll, setSetpoint} = await setup();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2000});
        expect(poll()).toStrictEqual({occupiedHeatingSetpoint: 2000, localTemp: -32768, pIHeatingDemand: 0, systemMode: 4});
        await setSetpoint(19);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1890});
        expect(poll()).toStrictEqual({occupiedHeatingSetpoint: 1900, localTemp: -32768, pIHeatingDemand: 0, systemMode: 4});
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1840});
        expect(poll()?.pIHeatingDemand).toStrictEqual(30);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1500});
        expect(poll()?.pIHeatingDemand).toStrictEqual(100);
    });

    it("leaves reads for other attributes to zigbee-herdsman", async () => {
        const {endpoint, poll} = await setup();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2000});
        expect(poll([0x0012, 0x0029])).toBeUndefined();
    });
});
