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

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? DeepPartial<U>[]
		: T[P] extends object
			? DeepPartial<T[P]>
			: T[P];
};

export function TODO(whatToDo: string): never {
	throw new Error(`TODO: Support for ${whatToDo} is not implemented`);
}
