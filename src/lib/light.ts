import {logger} from './logger';
import {Zh, Tz} from './types';
import * as utils from './utils';

const NS = 'zhc:light';

async function readColorCapabilities(endpoint: Zh.Endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorCapabilities']);
}

async function readColorTempMinMax(endpoint: Zh.Endpoint) {
    await endpoint.read('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
}

export function readColorAttributes(entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta, additionalAttributes: string[]=[]) {
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

export function findColorTempRange(entity: Zh.Endpoint | Zh.Group) {
    let colorTempMin;
    let colorTempMax;
    if (utils.isGroup(entity)) {
        const minCandidates = entity.members.map((m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin'))
            .filter((v) => v != null).map((v) => Number(v));
        if (minCandidates.length > 0) {
            colorTempMin = Math.max(...minCandidates);
        }
        const maxCandidates = entity.members.map((m) => m.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax'))
            .filter((v) => v != null).map((v) => Number(v));
        if (maxCandidates.length > 0) {
            colorTempMax = Math.min(...maxCandidates);
        }
    } else {
        colorTempMin = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMin') as number;
        colorTempMax = entity.getClusterAttributeValue('lightingColorCtrl', 'colorTempPhysicalMax') as number;
    }
    if ((colorTempMin == null) || (colorTempMax == null)) {
        const entityId = utils.isGroup(entity) ? entity.groupID : entity.deviceIeeeAddress;
        logger.debug(`Missing colorTempPhysicalMin and/or colorTempPhysicalMax for ${utils.isGroup(entity) ? 'group' : 'endpoint'} ${entityId}!`, NS);
    }
    return [colorTempMin, colorTempMax];
}

export function clampColorTemp(colorTemp: number, colorTempMin: number, colorTempMax: number) {
    if ((colorTempMin != null) && (colorTemp < colorTempMin)) {
        logger.debug(`Requested color_temp ${colorTemp} is lower than minimum supported ${colorTempMin}, using minimum!`, NS);
        return colorTempMin;
    }
    if ((colorTempMax != null) && (colorTemp > colorTempMax)) {
        logger.debug(`Requested color_temp ${colorTemp} is higher than maximum supported ${colorTempMax}, using maximum!`, NS);
        return colorTempMax;
    }
    return colorTemp;
}
export async function configure(device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, readColorTempMinMaxAttribute: boolean) {
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

exports.readColorCapabilities = readColorCapabilities;
exports.readColorTempMinMax = readColorTempMinMax;
exports.readColorAttributes = readColorAttributes;
exports.findColorTempRange = findColorTempRange;
exports.clampColorTemp = clampColorTemp;
exports.configure = configure;
