import {describe, expect, it, vi} from "vitest";
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

describe("Schneider Electric WV704R0A0902 hub emulation", () => {
    const setup = async () => {
        const device = mockDevice(
            {
                modelID: "iTRV",
                manufacturerName: "Schneider Electric",
                ieeeAddr: "0x086bd7fffe000001",
                endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "hvacThermostat", "hvacUserInterfaceCfg"]}],
            },
            "EndDevice",
        );
        vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);
        await definition.onEvent?.({type: "start", data: {device, deviceExposesChanged: () => {}, state: {}, options: {}}});
        const endpoint = device.getEndpoint(1);
        const responses: KeyValueAny[] = [];
        const coordinator = {
            readResponse: vi.fn((cluster: string, tsn: number, attributes: KeyValueAny) => {
                responses.push(attributes);
                return Promise.resolve();
            }),
        };
        // The valve's poll: occupiedHeatingSetpoint, localTemp, pIHeatingDemand, systemMode.
        const poll = (attrIds = [0x0012, 0x0000, 0x0008, 0x001c]) => {
            const frame = {
                isCluster: (name: string) => name === "hvacThermostat",
                payload: attrIds.map((attrId) => ({attrId})),
                header: {transactionSequenceNumber: 1},
            };
            // biome-ignore lint/suspicious/noExplicitAny: minimal ZCL frame stand-in
            const handled = device.customReadResponse?.(frame as any, coordinator as any);
            return handled ? responses.at(-1) : undefined;
        };
        const tz = (key: string) => {
            const converter = definition.toZigbee.find((c) => c.key.includes(key));
            if (converter?.convertSet === undefined) throw new Error(`no toZigbee converter for ${key}`);
            return (value: number) => converter.convertSet?.(endpoint, key, value, {device, state: {}, message: {}} as unknown as Tz.Meta);
        };
        const report = async (data: KeyValueAny) => {
            const converter = definition.fromZigbee?.find((c) => c.cluster === "hvacThermostat" && c.type.includes("attributeReport"));
            if (converter === undefined) throw new Error("no hvacThermostat converter on the definition");
            for (const [attribute, value] of Object.entries(data)) endpoint.saveClusterAttributeKeyValue("hvacThermostat", {[attribute]: value});
            const msg = {data, endpoint, device, meta: {zclTransactionSequenceNumber: ++tsn}, type: "attributeReport", cluster: "hvacThermostat"};
            return await converter.convert(definition, msg as unknown as Fz.Message<"hvacThermostat", undefined, "attributeReport">, () => {}, {}, {
                state: {},
                device,
                deviceExposesChanged: () => {},
            } as unknown as Fz.Meta);
        };
        return {device, definition, endpoint, poll, tz, report};
    };
    let tsn = 1000;

    it("leaves the poll to zigbee-herdsman until a setpoint is known", async () => {
        const {poll} = await setup();
        expect(poll()).toBeUndefined();
    });

    it("answers the poll like a Wiser hub with the setpoint set through Z2M", async () => {
        const {poll, tz} = await setup();
        await tz("occupied_heating_setpoint")(18.5);
        expect(poll()).toStrictEqual({occupiedHeatingSetpoint: 1850, localTemp: -32768, pIHeatingDemand: 0, systemMode: 4});
    });

    it("computes a proportional demand from the setpoint and the valve's temperature", async () => {
        const {endpoint, poll, tz} = await setup();
        await tz("occupied_heating_setpoint")(19);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1890});
        expect(poll()?.pIHeatingDemand).toStrictEqual(0); // inside the deadband
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1840});
        expect(poll()?.pIHeatingDemand).toStrictEqual(30);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 1500});
        expect(poll()?.pIHeatingDemand).toStrictEqual(100);
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 2000});
        expect(poll()?.pIHeatingDemand).toStrictEqual(0);
    });

    it("hands a written heating_demand to the valve and falls back after 30 minutes", async () => {
        vi.useFakeTimers();
        try {
            const {endpoint, poll, tz} = await setup();
            await tz("occupied_heating_setpoint")(19);
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {localTemp: 2100});
            expect(await tz("heating_demand")(65)).toStrictEqual({state: {heating_demand: 65}});
            expect(poll()?.pIHeatingDemand).toStrictEqual(65);
            vi.advanceTimersByTime(29 * 60 * 1000);
            expect(poll()?.pIHeatingDemand).toStrictEqual(65);
            vi.advanceTimersByTime(2 * 60 * 1000);
            expect(poll()?.pIHeatingDemand).toStrictEqual(0);
        } finally {
            vi.useRealTimers();
        }
    });

    it("rejects a heating_demand outside 0-100", async () => {
        const {tz} = await setup();
        expect(() => tz("heating_demand")(150)).toThrow("between 0 and 100");
    });

    it("lets zigbee-herdsman answer reads for attributes a hub doesn't serve", async () => {
        const {poll, tz} = await setup();
        await tz("occupied_heating_setpoint")(19);
        expect(poll([0x0012, 0x0029])).toBeUndefined();
    });

    it("adopts the valve's first setpoint and later cap twists, but not a stale report", async () => {
        const {poll, tz, report} = await setup();
        await report({occupiedHeatingSetpoint: -32768}); // right after joining: not a setpoint
        expect(poll()).toBeUndefined();
        await report({occupiedHeatingSetpoint: 2000});
        expect(poll()?.occupiedHeatingSetpoint).toStrictEqual(2000);

        await tz("occupied_heating_setpoint")(17);
        await report({occupiedHeatingSetpoint: 2000}); // the valve's old setpoint, before it polled
        expect(poll()?.occupiedHeatingSetpoint).toStrictEqual(1700);

        await report({occupiedHeatingSetpoint: 2200}); // twisted on the device after the poll
        expect(poll()?.occupiedHeatingSetpoint).toStrictEqual(2200);
    });

    it("publishes pi_heating_demand from ALG only and drops the placeholder setpoint", async () => {
        const {report} = await setup();
        const payload = (await report({pIHeatingDemand: 39, occupiedHeatingSetpoint: -32768, localTemp: 1700})) as KeyValueAny;
        expect(payload.pi_heating_demand).toBeUndefined();
        expect(payload.occupied_heating_setpoint).toBeUndefined();
        expect(payload.local_temperature).toStrictEqual(17);
    });
});
