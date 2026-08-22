import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

describe("LightSolutions 42-050", () => {
    const makeDevice = () =>
        mockDevice({
            modelID: "42-050",
            manufacturerName: "LightSolutions Aps",
            endpoints: [
                {
                    inputClusters: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"],
                    attributes: {lightingColorCtrl: {attributes: {colorTempPhysicalMin: 160, colorTempPhysicalMax: 450}}},
                },
            ],
        });

    const convertColorReport = async (data: Record<string, number>) => {
        const device = makeDevice();
        const definition = await findByDevice(device);
        const converter = definition?.fromZigbee?.find((c) => c.cluster === "lightingColorCtrl");
        const endpoint = device.endpoints[0];
        const meta = {state: {}};
        return await converter?.convert(
            definition,
            // @ts-expect-error partial message mock
            {data, endpoint, device, meta, type: "attributeReport", cluster: "lightingColorCtrl", linkquality: 0},
            () => {},
            {},
            // @ts-expect-error partial meta mock
            meta,
        );
    };

    it("matches the dedicated definition, not the generated fallback", async () => {
        const definition = await findByDevice(makeDevice());
        expect(definition?.model).toBe("42-050");
        expect(definition?.vendor).toBe("Light Solutions");
    });

    it("coerces a spurious xy color mode to color_temp and drops the color", async () => {
        const result = await convertColorReport({colorMode: 1, currentX: 20000, currentY: 20000});
        expect(result?.color_mode).toBe("color_temp");
        expect(result?.color).toBeUndefined();
    });

    it("passes a genuine color temperature report through unchanged", async () => {
        const result = await convertColorReport({colorMode: 2, colorTemperature: 300});
        expect(result?.color_mode).toBe("color_temp");
        expect(result?.color_temp).toBe(300);
        expect(result?.color).toBeUndefined();
    });
});
