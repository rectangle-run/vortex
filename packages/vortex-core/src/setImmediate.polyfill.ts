export const setImmediate: typeof globalThis.setImmediate =
	globalThis.setImmediate ??
	((callback: (...args: any[]) => void, ...args: any[]): number => {
		return setTimeout(callback, 0, ...args) as unknown as number;
	});

export const clearImmediate: typeof globalThis.clearImmediate =
	globalThis.clearImmediate ??
	((instance: number) => {
		clearTimeout(instance);
	});
