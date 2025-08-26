import { useOptionalStreaming, useStreaming } from "../context";
import { type Signal, useState } from "../signal";

/**
 * @deprecated This is a very delicate API, it's reccommended that unless you're running exclusively on the client, you use `useAwait` to get a callable await function.
 */
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

export function useAwait(): <T>(value: Promise<T> | T) => Signal<T | undefined> {
    const streaming = useOptionalStreaming();

    return <T>(value: Promise<T> | T) => {
        const result = useState<T | undefined>(undefined);

        if (!(value instanceof Promise)) {
            result.set(value);
            return result;
        }

        if (typeof Bun !== "undefined") {
            const peeked = Bun.peek(value);

            if (!(peeked instanceof Promise)) {
                result.set(peeked);
            }
        }

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
}
