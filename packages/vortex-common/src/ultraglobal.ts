function getUltraglobalRegistry() {
	const meta = globalThis as any;

	meta.__ultraglobal ??= new Map<string, any>();

	return meta.__ultraglobal as Map<string, any>;
}

export interface UltraglobalKey {
	package: string;
	name: string;
}

function stringifyUltraglobalKey(key: UltraglobalKey): string {
	return `${key.package}:::${key.name}`;
}

/**
 * IMPORTANT: You must *never* change the key of an ultraglobal value, or it will be unlinked from other references.
 *
 * @param key The key to use for the global registry
 * @param value The value to save to the global registry
 */
export function getUltraglobalReference<T>(key: UltraglobalKey, value: T): T {
	const registry = getUltraglobalRegistry();
	const strKey = stringifyUltraglobalKey(key);

	const globalReference = registry.get(strKey);

	if (globalReference) {
		return globalReference as T;
	}

	registry.set(strKey, value);

	return value;
}
