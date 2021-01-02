async function readColorCapabilities(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorCapabilities']);
}

async function readColorTempMinMax(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
}

module.exports = {
    readColorCapabilities,
    readColorTempMinMax,
};
