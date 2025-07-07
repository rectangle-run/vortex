export function unreachable(
	_value: never,
	message = "Unreachable state",
): never {
	throw new Error(message);
}

export function unwrap<T>(value: T | undefined | null, message?: string): T {
	if (value === undefined || value === null) {
		throw new Error(message ?? "Value is undefined or null");
	}
	return value;
}

export type Brand<T, B extends string> = T & { __brand: B };
