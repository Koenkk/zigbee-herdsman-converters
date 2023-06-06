export function assertString(value: unknown, property?: string): asserts value is string {
    property = property ? `'${property}'` : 'Value';
    if (typeof value !== 'string') throw new Error(`${property} is not a string, got ${typeof value} (${value.toString()})`);
}

export function assertNumber(value: unknown, property?: string): asserts value is number {
    property = property ? `'${property}'` : 'Value';
    if (typeof value !== 'number') throw new Error(`${property} is not a number, got ${typeof value} (${value.toString()})`);
}

export function getFromLookup<V>(value: unknown, lookup: {[s: number | string]: V}): V {
    let result = undefined;
    if (typeof value === 'string') {
        result = lookup[value.toLowerCase()] ?? lookup[value.toUpperCase()];
    } else if (typeof value === 'number') {
        result = lookup[value];
    }
    if (result === undefined) throw new Error(`Expected one of: ${Object.keys(lookup).join(', ')}, got: '${value}'`);
    return result;
}

export function assertEndpoint(obj: unknown): asserts obj is zh.Endpoint {
    if (obj?.constructor?.name?.toLowerCase() !== 'endpoint') throw new Error('Not an endpoint');
}

export function isEndpoint(obj: zh.Endpoint | zh.Group | zh.Device): obj is zh.Endpoint {
    return obj.constructor.name.toLowerCase() === 'endpoint';
}

export function isDevice(obj: zh.Endpoint | zh.Group | zh.Device): obj is zh.Device {
    return obj.constructor.name.toLowerCase() === 'device';
}

export function isGroup(obj: zh.Endpoint | zh.Group | zh.Device): obj is zh.Group {
    return obj.constructor.name.toLowerCase() === 'group';
}
