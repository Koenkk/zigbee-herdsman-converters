async function readColorCapabilities(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorCapabilities']);
}

async function readColorTempMinMax(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
}

function findColorTempRange(entity, logger) {
    let colorTempMin;
    let colorTempMax;
    if (entity.constructor.name === 'Group' && entity.members.length > 0) {
        const minCandidates = entity.members.map(
            (m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin'),
        ).filter((v) => v !== undefined);
        if (minCandidates.length > 0) {
            colorTempMin = Math.max(...minCandidates);
        }
        const maxCandidates = entity.members.map(
            (m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax'),
        ).filter((v) => v !== undefined);
        if (maxCandidates.length > 0) {
            colorTempMax = Math.min(...maxCandidates);
        }
    } else {
        colorTempMin = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin');
        colorTempMax = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax');
    }
    if ((colorTempMin === undefined) || (colorTempMax === undefined)) {
        const entityType = entity.constructor.name.toLowerCase();
        const entityId = (entityType === 'group') ? entity.groupID : entity.deviceIeeeAddress;
        logger.warn(`Missing colorTempPhysicalMin and/or colorTempPhysicalMax for ${entityType} ${entityId}!`);
    }
    return [colorTempMin, colorTempMax];
}

function clampColorTemp(colorTemp, colorTempMin, colorTempMax, logger) {
    if ((colorTempMin !== undefined) && (colorTemp < colorTempMin)) {
        logger.warn(`Requested color_temp ${colorTemp} is lower than minimum supported ${colorTempMin}, using minimum!`);
        return colorTempMin;
    }
    if ((colorTempMax !== undefined) && (colorTemp > colorTempMax)) {
        logger.warn(`Requested color_temp ${colorTemp} is higher than maximum supported ${colorTempMax}, using maximum!`);
        return colorTempMax;
    }
    return colorTemp;
}

module.exports = {
    readColorCapabilities,
    readColorTempMinMax,
    findColorTempRange,
    clampColorTemp,
};
