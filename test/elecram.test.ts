import {describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/custom_devices_diy";

const definition = definitions.find((device) => device.model === "Ramses_esp32c6");
if (!definition) throw new Error("ELECRAM RAMSES bridge definition is missing");

describe("ELECRAM OTA", () => {
    it("registers named clusters and commands for current herdsman decoders", async () => {
        const addCustomCluster = vi.fn();
        for (const extension of definition.extend ?? []) {
            for (const configure of extension.configure ?? []) {
                await (configure as (device: unknown) => Promise<void>)({addCustomCluster});
            }
        }
        expect(addCustomCluster).toHaveBeenCalledTimes(2);
        for (const [name, cluster] of addCustomCluster.mock.calls) {
            expect(cluster.name).toBe(name);
            for (const commands of [cluster.commands, cluster.commandsResponse]) {
                for (const [commandName, command] of Object.entries(commands)) {
                    expect((command as {name: string}).name).toBe(commandName);
                }
            }
        }
    });

    it("enables native reception only for OTA-capable firmware", async () => {
        expect(definition.ota).toBe(true);
        const command = vi.fn().mockResolvedValue(undefined);
        const endpoint = {command, supportsOutputCluster: vi.fn().mockReturnValue(false)};
        const device = {getEndpoint: vi.fn().mockReturnValue(endpoint)};
        const configure = definition.configure as (device: unknown) => Promise<void>;
        await configure(device);
        expect(command).not.toHaveBeenCalled();
        endpoint.supportsOutputCluster.mockReturnValue(true);
        await configure(device);
        expect(command).toHaveBeenCalledWith("ramsesTxCluster", "nativeMode", {enabled: true}, {disableDefaultResponse: true});
    });
});
