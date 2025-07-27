export function INTERNAL_unhappyUnwrap(message = "Value is undefined or null"): never {
    throw new Error(message);
}

export function unwrap<T>(value: T | undefined | null, message?: string): T {
    return value ?? INTERNAL_unhappyUnwrap(message);
}
