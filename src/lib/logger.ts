import {Logger} from './types';

export let logger: Logger = {
    debug: (messageOrLambda, namespace) =>
        console.debug(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
    info: (messageOrLambda, namespace) =>
        console.info(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
    warning: (messageOrLambda, namespace) =>
        console.warn(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
    error: (messageOrLambda, namespace) =>
        console.error(`${namespace}: ${typeof messageOrLambda === 'function' ? messageOrLambda() : messageOrLambda}`),
};

export function setLogger(l: Logger): void {
    logger = l;
}
