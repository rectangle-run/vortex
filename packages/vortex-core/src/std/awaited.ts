import { type Signal, useState } from "../signal";

export function awaited<T>(value: T | Promise<T>): Signal<T | undefined> {
	const result = useState<T | undefined>(undefined);

	async function fetchValue() {
		result.set(await value);
	}

	fetchValue();

	return result;
}
