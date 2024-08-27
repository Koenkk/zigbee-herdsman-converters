import {Logger} from './types';

export let logger: Logger = {
    debug: (message, namespace) => console.debug(`${namespace}: ${message}`),
    info: (message, namespace) => console.info(`${namespace}: ${message}`),
    warning: (message, namespace) => console.warn(`${namespace}: ${message}`),
    error: (message, namespace) => console.error(`${namespace}: ${message}`),
};

export function setLogger(l: Logger): void {
    logger = l;
}
