export function unreachable(value: never): never {
	throw new Error("Unreachable state.");
}

export function unwrap<T>(value: T | undefined | null, message?: string): T {
	if (value === undefined || value === null) {
		throw new Error(message ?? "Value is undefined or null");
	}
	return value;
}

export type Brand<T, B extends string> = T & { __brand: B };
