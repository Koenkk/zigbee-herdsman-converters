import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, DefinitionExposesFunction, Expose, Fz, KeyValue, KeyValueAny, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

async function setupSIN4220(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "SIN-4-2-20",
        manufacturerName: "NodOn",
        endpoints: [
            {ID: 1, inputClusters: ["genBasic", "genIdentify", "genOnOff"]},
            {ID: 2, inputClusters: ["genOnOff"]},
        ],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

function exposesFor(definition: Definition, device: Zh.Device): Expose[] {
    return typeof definition.exposes === "function" ? (definition.exposes as DefinitionExposesFunction)(device, {}) : definition.exposes;
}

function fromZigbee(definition: Definition, cluster: string, type: string, data: KeyValue, device: Zh.Device, endpointID: number) {
    let payload: KeyValue = {};
    for (const converter of definition.fromZigbee.filter(
        (c) => c.cluster === cluster && (Array.isArray(c.type) ? c.type.includes(type) : c.type === type),
    )) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        const msg: Fz.Message<any, any, any> = {
            data,
            endpoint: device.getEndpoint(endpointID),
            device,
            meta: null,
            groupID: 0,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            type: type as any,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            cluster: cluster as any,
            linkquality: 0,
        };
        const converted = converter.convert(definition, msg, () => {}, {}, {state: {}, device, deviceExposesChanged: () => {}});
        if (converted) payload = {...payload, ...converted};
    }
    return payload;
}

describe("SIN-4-2-20", () => {
    it("exposes the auto-off (impulse mode) duration per endpoint on recent firmware", async () => {
        const {device, definition} = await setupSIN4220("3.5.0");
        const properties = exposesFor(definition, device).map((expose) => expose.property);

        expect(properties).toContain("impulse_mode_configuration_l1");
        expect(properties).toContain("impulse_mode_configuration_l2");
        expect(properties).toContain("switch_type_on_off_l1");
        expect(properties).toContain("switch_type_on_off_l2");
        // The un-suffixed variants would never be published nor settable per endpoint.
        expect(properties).not.toContain("impulse_mode_configuration");
        expect(properties).not.toContain("switch_type_on_off");
    });

    it.each([undefined, "3.4.0"])("hides the configuration attributes on firmware %s", async (softwareBuildID) => {
        const {device, definition} = await setupSIN4220(softwareBuildID);
        const properties = exposesFor(definition, device).map((expose) => expose.property);

        expect(properties).not.toContain("impulse_mode_configuration_l1");
        expect(properties).not.toContain("impulse_mode_configuration_l2");
    });

    it("publishes the auto-off duration reported by each endpoint", async () => {
        const {device, definition} = await setupSIN4220("3.5.0");

        expect(fromZigbee(definition, "genOnOff", "readResponse", {1: 500}, device, 1)).toStrictEqual({impulse_mode_configuration_l1: 500});
        expect(fromZigbee(definition, "genOnOff", "readResponse", {1: 0}, device, 2)).toStrictEqual({impulse_mode_configuration_l2: 0});
    });

    it("writes the auto-off duration to the NodOn specific attribute of the addressed endpoint", async () => {
        const {device, definition} = await setupSIN4220("3.5.0");
        const converter = definition.toZigbee.find((c) => c.key.includes("impulse_mode_configuration"));
        expect(converter).toBeDefined();

        const endpoint = device.getEndpoint(2);
        const meta = {
            state: {},
            device,
            message: {} as KeyValueAny,
            mapped: definition,
            options: {},
            endpoint_name: "l2",
        } as Tz.Meta;

        await converter?.convertSet?.(endpoint, "impulse_mode_configuration_l2", 2000, meta);

        expect(endpoint.write).toHaveBeenCalledWith("genOnOff", {1: {value: 2000, type: 0x21}}, {manufacturerCode: 0x128b});
    });
});
