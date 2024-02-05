import {Logger} from './types';

export let logger: Logger = {
    info: (msg) => console.log(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg),
    debug: (msg) => console.debug(msg),
};

export function setLogger(l: Logger) {
    logger = l;
}
