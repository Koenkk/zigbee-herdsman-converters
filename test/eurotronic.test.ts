import {describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

function buildSpirit() {
    return mockDevice(
        {
            modelID: "SPZB0001",
            manufacturerName: "Eurotronic",
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "genIdentify", "hvacThermostat"]}],
        },
        "EndDevice",
    );
}

describe("Eurotronic SPZB0001", () => {
    it("accepts pIHeatingDemand values above 100 (the Spirit reports 0-255)", async () => {
        const device = buildSpirit();
        const definition = await findByDevice(device);
        await definition.onEvent?.({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});

        const cluster = device.customClusters.hvacThermostat;
        expect(cluster.ID).toBe(Zcl.Clusters.hvacThermostat.ID);
        expect(cluster.attributes.pIHeatingDemand).toMatchObject({ID: 0x0008, type: Zcl.DataType.UINT8, max: 0xff});
        // Standard and Eurotronic-specific attributes are still there
        expect(cluster.attributes.localTemp).toMatchObject({ID: 0x0000});
        expect(cluster.attributes.trvMode).toMatchObject({ID: 0x4000});
        expect(cluster.attributes.hostFlags).toMatchObject({ID: 0x4008});
    });

    it("maps a raw pIHeatingDemand above 100 to percent", async () => {
        const device = buildSpirit();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((c) => c.cluster === "hvacThermostat" && c.type.includes("readResponse"));
        const msg = {data: {pIHeatingDemand: 122}, type: "readResponse", cluster: "hvacThermostat", device} as unknown as Fz.Message;
        const result = converter.convert(definition, msg, () => {}, {}, {device} as unknown as Fz.Meta) as KeyValueAny;
        expect(result.pi_heating_demand).toBe(48);
        expect(result.running_state).toBe("heat");
    });
});
