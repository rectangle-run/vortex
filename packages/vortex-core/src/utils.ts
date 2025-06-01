export function unwrap<T>(value: T | undefined | null, message?: string): T {
	if (value === undefined || value === null) {
		throw new Error(message ?? "Value is undefined or null");
	}
	return value;
}

export type EvaluateType<T> = T extends object
	? {
			[key in keyof T]: EvaluateType<T[key]>;
		}
	: T;

export function unreachable(value: never, message?: string): never {
	throw new Error(message ?? `Unreachable code reached with value: ${value}`);
}

export function trace(name: string) {
	const start = performance.now();
	console.time(name);

	return {
		[Symbol.dispose]() {
			console.timeEnd(name);
			performance.mark(name, {
				startTime: start,
			});
		},
	};
}
