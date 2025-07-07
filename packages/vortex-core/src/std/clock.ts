import { useHookLifetime } from "../lifetime";
import { getImmediateValue, type Signal, store } from "../signal";

export function useInterval(delay: number, callback: () => void) {
	const lifetime = useHookLifetime();

	const intervalId = setInterval(() => {
		callback();
	}, delay);

	lifetime.onClosed(() => {
		clearInterval(intervalId);
	});
}

export function useTimeout(delay: number, callback: () => void) {
	const lifetime = useHookLifetime();

	const timeoutId = setTimeout(() => {
		callback();
	}, delay);

	lifetime.onClosed(() => {
		clearTimeout(timeoutId);
	});
}

export function useDebouncedFunction<T extends (...args: any[]) => void>(
	func: T,
	delay: number,
	immediate = false,
): (...args: Parameters<T>) => void {
	const lifetime = useHookLifetime();
	let timeoutId: NodeJS.Timeout | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (immediate && !timeoutId) {
			func(...args);
		}

		timeoutId = setTimeout(() => {
			if (!immediate) {
				func(...args);
			}
			timeoutId = null;
		}, delay);

		lifetime.onClosed(() => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		});
	};
}

export function useDebouncedSignal<T>(
	signal: Signal<T>,
	delay: number,
): Signal<T> {
	const lifetime = useHookLifetime();
	const debouncedValue = store(getImmediateValue(signal));

	let timeoutId: NodeJS.Timeout | null = null;

	signal.subscribe((value) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			debouncedValue.set(value);
			timeoutId = null;
		}, delay);
	});

	lifetime.onClosed(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});

	return debouncedValue;
}
