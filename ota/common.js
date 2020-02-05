const upgradeFileIdentifier = Buffer.from([0x1E, 0xF1, 0xEE, 0x0B]);

function parseOtaImage(buffer) {
    console.log(buffer);
    return {
        otaUpgradeFileIdentifier: buffer.subarray(0, 4),
        otaHeaderVersion: buffer.readUInt16LE(2),
    };
}

module.exports = {
    parseOtaImage,
    upgradeFileIdentifier,
};
