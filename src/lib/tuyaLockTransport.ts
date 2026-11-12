import type {Zh} from "./types";

interface EncryptedLockCluster {
    attributes: never;
    commands: Record<string, {payload: Buffer}>;
    commandResponses: never;
}

export interface EncryptedLockPacket {
    command: string;
    payload: Buffer;
    /** Same monotonic clock as herdsman's sendDeadline, never a wall-clock timestamp. */
    expiresAt?: number;
}

/**
 * Tuya encrypted replies have independent ZCL transaction IDs. Correlate their
 * inner sequence in the lock controller, while asking the radio for APS ACKs.
 * Requires herdsman's timed APS unicast API; never fall back to an unguarded send.
 */
export async function sendEncryptedLockPackets(endpoint: Zh.Endpoint, clusterName: string, packets: readonly EncryptedLockPacket[]): Promise<void> {
    for (const packet of packets) {
        if (packet.expiresAt !== undefined) {
            if (!Number.isFinite(packet.expiresAt)) throw new Error("Invalid Tuya lock packet deadline");
            if (performance.now() >= packet.expiresAt) throw new Error("Tuya lock packet expired before transmission");
        }
        await endpoint.command<string, string, EncryptedLockCluster>(
            clusterName,
            packet.command,
            {payload: packet.payload},
            {
                disableDefaultResponse: true,
                disableResponse: true,
                disableRecovery: true,
                sendPolicy: "immediate",
                timeout: 5000,
                requestApsAck: true,
                sendDeadline: packet.expiresAt,
            },
        );
    }
}
