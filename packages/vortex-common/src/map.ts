export function mapValues<T extends object, U>(
    data: T,
    mapper: (value: T[keyof T], key: keyof T) => U,
): { [K in keyof T]: U } {
    const result: Partial<{ [K in keyof T]: U }> = {};

    for (const key in data) {
        result[key] = mapper(data[key], key as keyof T);
    }

    return result as { [K in keyof T]: U };
}
