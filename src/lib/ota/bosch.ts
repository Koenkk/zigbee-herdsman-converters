import {Zh, Logger, Ota} from '../types';
import * as common from './common';
import * as zigbeeOTA from './zigbeeOTA';
import * as timers from 'timers';
import {adaptationStatus, manufacturerOptions} from '../../devices/bosch';

/**
 * Helper functions
 */

async function valveAdaptationAfterUpdate(device: Zh.Device, logger: Logger) {
    const getThermostatEndpoint = () => {
        return device.endpoints.find((endpoint) => endpoint.supportsOutputCluster('hvacThermostat'));
    };

    const startAdaptationStatusCheck = () => {
        logger.debug('Add valve adaptation status check to timer.');
        return timers.setInterval(checkAdaptationStatus, 10 * 1000);
    };

    const sendValveCalibrationCommand = () => {
        const valveCalibrationCommand =
            thermostatEndpoint.command('hvacThermostat', 'boschCalibrateValve', {}, manufacturerOptions);

        valveCalibrationCommand.then(() => {
            logger.debug('Successfully send valve calibration command.');
        }, (error) => {
            logger.debug(`Error during valve calibration command! Error message: ${error.message}`);
            stopAdaptationStatusCheckOnTimeout();
        });
    };

    const stopAdaptationStatusCheckOnTimeout = () => {
        if (Date.now() >= abortTime) {
            stopAdaptationStatusCheck();
            throw new Error(`Timeout during valve calibration process of device ${device.ieeeAddr}! Please check device!`);
        }
    };

    const stopAdaptationStatusCheck = () => {
        logger.debug('Remove valve adaptation status check from timer.');
        clearInterval(adaptationStatusTimer);
    };

    const checkAdaptationStatus = () => {
        const readAdaptationStatus = thermostatEndpoint.read('hvacThermostat', [0x4022], manufacturerOptions);

        readAdaptationStatus.then((response) => {
            logger.debug(`Valve adaptation status is ${response[0x4022]}`);

            switch (response[0x4022]) {
            case adaptationStatus.ready_to_calibrate:
                sendValveCalibrationCommand();
                break;
            case adaptationStatus.error:
                stopAdaptationStatusCheck();
                throw new Error(`Error during valve adaptation process of device ${device.ieeeAddr}! Please check device!`);
            case adaptationStatus.success:
                stopAdaptationStatusCheck();
                break;
            default:
                stopAdaptationStatusCheckOnTimeout();
                break;
            }
        }, (error) => {
            logger.debug(`Valve adaptation status could not be read. Error message: ${error.message}`);
            stopAdaptationStatusCheckOnTimeout();
        });
    };

    const abortTime = Date.now() + 5 * 60 * 1000;
    logger.debug(`Set timeout for valve adaptation process of device ${device.ieeeAddr} to ${abortTime}.`);

    const thermostatEndpoint = getThermostatEndpoint();
    logger.debug(`Use endpoint number ${thermostatEndpoint.ID} for valve adaptation process.`);

    const adaptationStatusTimer = startAdaptationStatusCheck();
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, zigbeeOTA.getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    const updateProcess = common.updateToLatest(device, logger, onProgress, common.getNewImage, zigbeeOTA.getImageMeta);

    if (device.modelID == 'BTH-RA') {
        updateProcess.then(() => {
            valveAdaptationAfterUpdate(device, logger);
        });
    }

    return updateProcess;
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
