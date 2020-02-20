const common = require('./common');

/**
 * Helper functions
 */

async function isNewImageAvailable(current, logger, device) {
    const metaS = JSON.stringify(current);

    logger.debug(` ++ meta to send '${metaS}'`);

    return false;
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload=null) {
    return common.isUpdateAvailable(device, logger, isNewImageAvailable, requestPayload);
}

async function updateToLatest(device, logger, onProgress) {
    return Promise.resolve();
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
