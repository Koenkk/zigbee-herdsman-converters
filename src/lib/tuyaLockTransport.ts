import type {Zh} from "./types";

interface EncryptedLockCluster {
    attributes: never;
    commands: Record<string, {payload: Buffer}>;
    commandResponses: never;
}

export interface EncryptedLockPacket {
    command: string;
    payload: Buffer;
    /** Monotonic expiration checked immediately before calling the public command API. */
    expiresAt?: number;
}

/**
 * Tuya encrypted replies have independent ZCL transaction IDs. Correlate their
 * inner sequence in the lock controller without a ZCL response waiter.
 * Stock Ember clears APS RETRY in this mode; the tested IFR7001 still replies.
 * Expiration is checked before invoking the public API. The current API cannot
 * cancel an already queued/submitted packet; a timeout means uncertain delivery.
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
            },
        );
    }
}
