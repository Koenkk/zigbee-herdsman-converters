import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Heiman HS2VTD", () => {
    it("decodes contact and endpoint-specific vibration with modern extends", async () => {
        const device = mockDevice({modelID: "HS2VTD", endpoints: [{ID: 1}, {ID: 2}]});
        const definition = await findByDevice(device);

        const convert = (cluster: string, endpointId: number, type: string, data: KeyValueAny) => {
            const msg = {
                cluster,
                type,
                data,
                endpoint: device.getEndpoint(endpointId),
                device,
            } as unknown as Fz.Message;
            const result: KeyValueAny = {};
            for (const converter of definition.fromZigbee.filter((converter) => converter.cluster === cluster && converter.type.includes(type))) {
                Object.assign(
                    result,
                    converter.convert(definition, msg, () => {}, {}, {} as Fz.Meta),
                );
            }
            return result;
        };

        expect(convert("ssIasZone", 1, "commandStatusChangeNotification", {zonestatus: 0})).toStrictEqual({contact: true, battery_low: false});
        expect(convert("ssIasZone", 1, "commandStatusChangeNotification", {zonestatus: 1})).toStrictEqual({contact: false, battery_low: false});
        expect(convert("ssIasZone", 1, "readResponse", {zoneStatus: 1})).toStrictEqual({contact: false, battery_low: false});
        expect(convert("heimanClusterSpecial", 1, "attributeReport", {55: 96})).toStrictEqual({});
        expect(convert("ssIasZone", 1, "commandStatusChangeNotification", {zonestatus: 8})).toStrictEqual({contact: true, battery_low: true});
        expect(convert("ssIasZone", 1, "commandStatusChangeNotification", {zonestatus: 2})).toStrictEqual({contact: true, battery_low: false});
        expect(convert("ssIasZone", 2, "commandStatusChangeNotification", {zonestatus: 34})).toStrictEqual({vibration: true});
        expect(convert("ssIasZone", 2, "commandStatusChangeNotification", {zonestatus: 32})).toStrictEqual({vibration: false});
    });
});
