export function setImmediate(callback: (...args: any[]) => void, ...args: any[]): number {
	if ("setImmediate" in globalThis) return setImmediate(callback, ...args) as number;
	return setTimeout(callback, 0, ...args) as unknown as number;
}

export function clearImmediate(
	instance: number
) {
	if ("clearImmediate" in globalThis) {
		clearImmediate(instance);
		return;
	}

	clearTimeout(instance);
}
