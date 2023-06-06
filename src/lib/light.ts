import * as utils from './utils';

async function readColorCapabilities(endpoint: zh.Endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorCapabilities']);
}

async function readColorTempMinMax(endpoint: zh.Endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
}

function readColorAttributes(entity: zh.Endpoint | zh.Group, meta: tz.Meta, additionalAttributes: string[]=[]) {
    /**
      * Not all bulbs support the same features, we need to take care we read what is supported.
      * `supportsHueAndSaturation` indicates support for currentHue and currentSaturation
      * `supportsEnhancedHue` indicates support for enhancedCurrentHue
      *
      * e.g. IKEA Tådfri LED1624G9 only supports XY (https://github.com/Koenkk/zigbee-herdsman-converters/issues/1340)
      *
      * Additionally when we get a "get payload", only request the fields included.
     */
    const attributes = ['colorMode'];
    if (meta && meta.message) {
        if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('x'))) {
            attributes.push('currentX');
        }
        if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('y'))) {
            attributes.push('currentY');
        }

        if (utils.getMetaValue(entity, meta.mapped, 'supportsHueAndSaturation', 'allEqual', true)) {
            if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('hue'))) {
                if (utils.getMetaValue(entity, meta.mapped, 'supportsEnhancedHue', 'allEqual', true)) {
                    attributes.push('enhancedCurrentHue');
                } else {
                    attributes.push('currentHue');
                }
            }
            if (!meta.message.color || (typeof meta.message.color === 'object' && meta.message.color.hasOwnProperty('saturation'))) {
                attributes.push('currentSaturation');
            }
        }
    }

    return [...attributes, ...additionalAttributes];
}

export function findColorTempRange(entity: zh.Endpoint | zh.Group, logger: Logger) {
    let colorTempMin;
    let colorTempMax;
    if (utils.isGroup(entity)) {
        const minCandidates = entity.members.map(
            (m) => Number(m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin')),
        ).filter((v) => v != null);
        if (minCandidates.length > 0) {
            colorTempMin = Math.max(...minCandidates);
        }
        const maxCandidates = entity.members.map(
            (m) => Number(m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax')),
        ).filter((v) => v != null);
        if (maxCandidates.length > 0) {
            colorTempMax = Math.min(...maxCandidates);
        }
    } else {
        colorTempMin = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin') as number;
        colorTempMax = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax') as number;
    }
    if ((colorTempMin == null) || (colorTempMax == null)) {
        const entityId = utils.isGroup(entity) ? entity.groupID : entity.deviceIeeeAddress;
        logger.debug(`Missing colorTempPhysicalMin and/or colorTempPhysicalMax for ${utils.isGroup(entity) ? 'group' : 'endpoint'} ${entityId}!`);
    }
    return [colorTempMin, colorTempMax];
}

export function clampColorTemp(colorTemp: number, colorTempMin: number, colorTempMax: number, logger: Logger) {
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
export async function configure(device: zh.Device, coordinatorEndpoint: zh.Endpoint, logger: Logger, readColorTempMinMaxAttribute: boolean) {
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
