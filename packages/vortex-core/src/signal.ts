import { Lifetime } from "./lifetime";
import { Component, useComponent } from "./render/component";
import { unwrap } from "./utils";

export type Informant = ((signal: Signal<unknown>) => void) | null;

export const SignalGetter = "@vortex-get-internal" as const;

export function equals<T>(a: T, b: T): boolean {
	if (a === b) return true;

	if (
		typeof a === "object" &&
		typeof b === "object" &&
		a !== null &&
		b !== null
	) {
		const keysA = new Set(Object.keys(a));
		const keysB = new Set(Object.keys(b));

		if (keysA.intersection(keysB).isSupersetOf(keysA)) {
			for (const key of keysA) {
				//@ts-ignore It's fine, this is dynamic code, of course there's no type safety here :^)
				if (!equals(a[key], b[key])) {
					return false;
				}
			}
			return true;
		}
	}

	return false;
}

export interface Signal<T> {
	[SignalGetter](): T;
	subscribe(callback: (value: T) => void): Lifetime;
}

export interface Store<T> extends Signal<T> {
	set(value: T): void;
}

export interface DerivedSignal<T> extends Signal<T> {
	lifetime: Lifetime;
}

export function store<T>(initialValue: T): Store<T> {
	let value = initialValue;
	const subscribers: ((value: T) => void)[] = [];

	return {
		[SignalGetter]() {
			return value;
		},
		subscribe(callback: (value: T) => void): Lifetime {
			subscribers.push(callback);
			callback(value);

			return new Lifetime().onClosed(() => {
				subscribers.splice(subscribers.indexOf(callback), 1);
			});
		},
		set(newValue: T) {
			if (!equals(value, newValue)) {
				value = newValue;
				for (const subscriber of subscribers) {
					subscriber(value);
				}
			}
		},
	};
}

export function getImmediateValue<T>(signal: Signal<T>): T {
	return signal[SignalGetter]();
}

export type DerivedGetter = <T>(signal: Signal<T>) => T;

export function derived<T>(
	compute: (get: DerivedGetter) => T,
	props?: {
		dynamic?: boolean;
	},
): DerivedSignal<T> {
	const dynamic = props?.dynamic ?? false;

	const signalLifetime = new Lifetime();

	const dependencies: Signal<unknown>[] = [];

	const innerSignal = store(
		compute((signal) => {
			dependencies.push(signal);
			return signal[SignalGetter]();
		}),
	);

	function invalidate() {
		if (dynamic) {
			const newDependencies = new Set(dependencies);

			innerSignal.set(
				compute((signal) => {
					newDependencies.add(signal);
					return signal[SignalGetter]();
				}),
			);

			const currentDependencies = new Set(dependencies);

			const toRemove = currentDependencies.difference(newDependencies);

			for (const dep of toRemove) {
				const index = dependencies.indexOf(dep);

				if (index !== -1) {
					dependencies.splice(index, 1);
					subscriptions[index]?.close();
					subscriptions.splice(index, 1);
				}
			}

			const toAdd = newDependencies.difference(currentDependencies);

			for (const dep of toAdd) {
				const subscription = dep.subscribe(() => {
					invalidate();
				});
				dependencies.push(dep);
				subscriptions.push(subscription);
			}
		} else {
			innerSignal.set(compute(getImmediateValue));
		}
	}

	const subscriptions = dependencies.map((dep) => {
		return dep
			.subscribe(() => {
				invalidate();
			})
			.cascadesFrom(signalLifetime);
	});

	return {
		...innerSignal,
		lifetime: signalLifetime,
	};
}

export function effect(
	compute: (
		get: DerivedGetter,
		rest: {
			lifetime: Lifetime;
		},
	) => void,
	props?: {
		dynamic?: boolean;
	},
): Lifetime {
	const dynamic = props?.dynamic ?? false;

	const dependencies: Signal<unknown>[] = [];

	const outerLifetime = new Lifetime();

	let latestLifetime = new Lifetime();

	compute(
		(signal) => {
			dependencies.push(signal);
			return signal[SignalGetter]();
		},
		{
			lifetime: latestLifetime,
		},
	);

	function invalidate() {
		if (dynamic) {
			const newDependencies = new Set(dependencies);

			latestLifetime.close();

			latestLifetime = new Lifetime().cascadesFrom(outerLifetime);

			compute(
				(signal) => {
					newDependencies.add(signal);
					return signal[SignalGetter]();
				},
				{
					lifetime: latestLifetime,
				},
			);

			const currentDependencies = new Set(dependencies);

			const toRemove = currentDependencies.difference(newDependencies);

			for (const dep of toRemove) {
				const index = dependencies.indexOf(dep);

				if (index !== -1) {
					dependencies.splice(index, 1);
					subscriptions[index]?.close();
					subscriptions.splice(index, 1);
				}
			}

			const toAdd = newDependencies.difference(currentDependencies);

			for (const dep of toAdd) {
				const subscription = dep.subscribe(() => {
					invalidate();
				});
				dependencies.push(dep);
				subscriptions.push(subscription);
			}
		} else {
			latestLifetime.close();

			latestLifetime = new Lifetime().cascadesFrom(outerLifetime);

			compute(getImmediateValue, {
				lifetime: latestLifetime,
			});
		}
	}

	const subscriptions = dependencies.map((dep) => {
		return dep
			.subscribe(() => {
				invalidate();
			})
			.cascadesFrom(outerLifetime);
	});

	return outerLifetime;
}

export function isSignal(value: unknown): value is Signal<unknown> {
	return typeof value === "object" && value !== null && SignalGetter in value;
}

export function toSignal<T>(value: T | Signal<T>): Signal<T> {
	if (isSignal(value)) {
		return value;
	}
	return store(value);
}

export const useState = store; // Store is automatically garbage collected, because it doesn't have any dependencies that indirectly reference it via their callbacks.

export function useDerived<T>(
	compute: (get: DerivedGetter) => T,
	props?: {
		dynamic?: boolean;
	},
): DerivedSignal<T> {
	const result = derived(compute, props);

	result.lifetime.cascadesFrom(useComponent().lifetime); // We don't want callbacks to reference the signal forever and cause a memory leak.

	return result;
}
