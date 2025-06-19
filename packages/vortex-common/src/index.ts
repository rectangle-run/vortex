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

export function trace(message: string) {
	console.time(message);

	return {
		[Symbol.dispose]() {
			console.timeEnd(message);
		},
	};
}

export * from "./ultraglobal";
export * from "./type-hints";
