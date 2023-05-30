export function getFromLookup<V>(value: tz.Value, lookup: {[s: string | number]: V}): V {
    if (typeof value !== 'string') throw new Error(`Expected string got: '${value}' (${typeof(value)})`);
    value = value.toLowerCase();
    const result = lookup[value];
    if (!result) throw new Error(`Expected one of: ${Object.keys(lookup).join(', ')}, got: '${value}'`);
    return result;
}
