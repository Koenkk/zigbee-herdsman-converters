import {Logger} from './types';

export let logger: Logger = {
    isEnabled: () => true, 
    debug: (messageOrLambda, namespace) => console.debug(`${namespace}: ${(typeof messageOrLambda === "string") ? messageOrLambda : messageOrLambda()}`),
    info: (messageOrLambda, namespace) => console.info(`${namespace}: ${(typeof messageOrLambda === "string") ? messageOrLambda : messageOrLambda()}`),
    warning: (messageOrLambda, namespace) => console.warn(`${namespace}: ${(typeof messageOrLambda === "string") ? messageOrLambda : messageOrLambda()}`),
    error: (messageOrLambda, namespace) => console.error(`${namespace}: ${(typeof messageOrLambda === "string") ? messageOrLambda : messageOrLambda()}`),
};

export function setLogger(l: Logger): void {
    logger = l;
}
