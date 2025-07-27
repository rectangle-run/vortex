function isPromise(value: unknown): value is Promise<unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as Promise<unknown>).then === "function"
    );
}

export function deepEquals<T>(a: T, b: T): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (isPromise(a) || isPromise(b)) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEquals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    if (
        typeof a === "object" &&
        typeof b === "object" &&
        a !== null &&
        b !== null
    ) {
        if (
            Object.keys(a).toSorted().join(",") ===
            Object.keys(b).toSorted().join(",")
        ) {
            for (const key in a) {
                //@ts-ignore It's fine, this is dynamic code, of course there's no type safety here :^)
                if (!deepEquals(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
    }

    return false;
}
