export function assertString(value: unknown, property: string): asserts value is string {
    if (typeof value !== 'string') throw new Error(`'${property}' is not a string, got ${typeof value} (${value.toString()})`);
}

export function assertNumber(value: unknown, property: string): asserts value is number {
    if (typeof value === 'number') throw new Error(`'${property}' is not a number, got ${typeof value} (${value.toString()})`);
}

export function getFromLookup<V>(value: unknown, lookup: {[s: string | number]: V}): V {
    assertString(value, `Expected string got: '${value}' (${typeof(value)})`);
    const result = lookup[value.toLowerCase()];
    if (!result) throw new Error(`Expected one of: ${Object.keys(lookup).join(', ')}, got: '${value}'`);
    return result;
}
