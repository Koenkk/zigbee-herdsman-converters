const utils = require('./utils');

async function readColorCapabilities(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorCapabilities']);
}

async function readColorTempMinMax(endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
}

function readColorAttributes(entity, meta, additionalAttributes=[]) {
    /**
      * Not all bulbs suport the same features, we need to take care we read what is supported.
      * `supportsHueAndSaturation` indicates support for currentHue and currentSaturation
      * `enhancedHue` indicates support for enhancedCurrentHue
      *
      * e.g. IKEA Tådfri LED1624G9 only supports XY (https://github.com/Koenkk/zigbee-herdsman-converters/issues/1340)
      *
      * Additionally when we get a get payload, only request the fields included.
     */
    const attributes = ['colorMode'];

    if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('x'))) {
        attributes.push('currentX');
    }
    if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('y'))) {
        attributes.push('currentY');
    }

    if (utils.getMetaValue(entity, meta.mapped, 'supportsHueAndSaturation', 'allEqual', true)) {
        if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('hue'))) {
            if (utils.getMetaValue(entity, meta.mapped, 'enhancedHue', 'allEqual', true)) {
                attributes.push('enhancedCurrentHue');
            } else {
                attributes.push('currentHue');
            }
        }
        if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('saturation'))) {
            attributes.push('currentSaturation');
        }
    }

    return [...attributes, ...additionalAttributes];
}

function findColorTempRange(entity, logger) {
    let colorTempMin;
    let colorTempMax;
    if (entity.constructor.name === 'Group') {
        const minCandidates = entity.members.map(
            (m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin'),
        ).filter((v) => v != null);
        if (minCandidates.length > 0) {
            colorTempMin = Math.max(...minCandidates);
        }
        const maxCandidates = entity.members.map(
            (m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax'),
        ).filter((v) => v != null);
        if (maxCandidates.length > 0) {
            colorTempMax = Math.min(...maxCandidates);
        }
    } else {
        colorTempMin = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin');
        colorTempMax = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax');
    }
    if ((colorTempMin == null) || (colorTempMax == null)) {
        const entityType = entity.constructor.name.toLowerCase();
        const entityId = (entityType === 'group') ? entity.groupID : entity.deviceIeeeAddress;
        logger.debug(`Missing colorTempPhysicalMin and/or colorTempPhysicalMax for ${entityType} ${entityId}!`);
    }
    return [colorTempMin, colorTempMax];
}

function clampColorTemp(colorTemp, colorTempMin, colorTempMax, logger) {
    if ((colorTempMin != null) && (colorTemp < colorTempMin)) {
        logger.debug(`Requested color_temp ${colorTemp} is lower than minimum supported ${colorTempMin}, using minimum!`);
        return colorTempMin;
    }
    if ((colorTempMax != null) && (colorTemp > colorTempMax)) {
        logger.debug(`Requested color_temp ${colorTemp} is higher than maximum supported ${colorTempMax}, using maximum!`);
        return colorTempMax;
    }
    return colorTemp;
}

async function configure(device, coordinatorEndpoint, logger, readColorTempMinMaxAttribute) {
    if (device.powerSource === 'Unknown') {
        device.powerSource = 'Mains (single phase)';
        device.save();
    }

    for (const endpoint of device.endpoints.filter((e) => e.supportsInputCluster('lightingColorCtrl'))) {
        try {
            await readColorCapabilities(endpoint);

            if (readColorTempMinMaxAttribute) {
                await readColorTempMinMax(endpoint);
            }
        } catch (e) {/* Fails for some, e.g. https://github.com/Koenkk/zigbee2mqtt/issues/5717 */}
    }
}

module.exports = {
    readColorCapabilities,
    readColorTempMinMax,
    readColorAttributes,
    findColorTempRange,
    clampColorTemp,
    configure,
};
