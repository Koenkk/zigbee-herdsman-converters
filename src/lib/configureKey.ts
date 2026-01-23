import type {Definition} from "./types";

export function getConfigureKey(definition: Definition) {
    if (!definition.configure) {
        throw new Error(`'${definition.model}' has no configure`);
    }

    return definition.configureKey ?? 0;
}
