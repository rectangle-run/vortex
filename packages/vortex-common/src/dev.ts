export function TODO(whatToDo: string): never {
	throw new Error(`TODO: ${whatToDo}`);
}

export function trace(message: string) {
	console.time(message);

	return {
		[Symbol.dispose]() {
			console.timeEnd(message);
		},
	};
}

/**
 * @justification This is in the `dev` module as it evaluates to an effectively identical type, but it makes it prettier when hovering.
 */
export type EvaluateType<T> = T extends object
	? {
			[key in keyof T]: EvaluateType<T[key]>;
		}
	: T;
