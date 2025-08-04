import { useOptionalStreaming, useStreaming } from "../context";
import { type Signal, useState } from "../signal";

export function awaited<T>(value: Promise<T>): Signal<T | undefined> {
	const result = useState<T | undefined>(undefined);
	const streaming = useOptionalStreaming();

	async function fetchValue() {
		if (streaming) {
			using _loading = streaming.markLoading();
			result.set(await value);
		} else {
			result.set(await value);
		}
	}

	fetchValue();

	return result;
}
