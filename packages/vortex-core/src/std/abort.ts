import { useHookLifetime } from "../lifetime";

export function useAbortSignal(lt = useHookLifetime()): AbortSignal {
    const controller = new AbortController();

    lt.onClosed(() => controller.abort());

    return controller.signal;
}
