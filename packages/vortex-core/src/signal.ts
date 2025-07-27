import { deepEquals as equals } from "@vortexjs/common";
import { Lifetime, useHookLifetime } from "./lifetime";

export type Informant = ((signal: Signal<unknown>) => void) | null;

export const SignalGetter = "@vortex-get-internal" as const;

export interface Signal<T> {
	[SignalGetter](): T;
	subscribe(
		callback: (value: T) => void,
		props?: { callInitially?: boolean },
	): Lifetime;
	setId(newId: string): void;
}

export interface Store<T> extends Signal<T> {
	set(value: T): void;
}

export function store<T>(initialValue: T): Store<T> {
	let id: string | undefined;

	let value = initialValue;

	const subscribers: ((value: T) => void)[] = [];

	id && console.log(`[${id}]: initialized with `, value);

	return {
		setId(newId) {
			id = newId;
		},
		[SignalGetter]() {
			return value;
		},
		subscribe(callback: (value: T) => void, props): Lifetime {
			subscribers.push(callback);
			id && console.trace(`[${id}]: subscribed with `, callback);

			if (props?.callInitially !== false) {
				callback(value);
			}

			return new Lifetime().onClosed(() => {
				subscribers.splice(subscribers.indexOf(callback), 1);
				id && console.log(`[${id}]: unsubscribed `, callback);
			});
		},
		set(newValue: T) {
			id &&
				console.log(
					`[${id}]: trying to switch from `,
					value,
					" -> ",
					newValue,
				);

			if (!equals(value, newValue)) {
				value = newValue;
				for (const subscriber of subscribers) {
					subscriber(value);
				}
				id && console.log(`[${id}]: updated`);
			} else {
				id &&
					console.log(`[${id}]: no change, value is still the same`);
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
	signalLifetime: Lifetime = useHookLifetime(),
): Signal<T> {
	const dynamic = props?.dynamic ?? false;

	const dependencies: Signal<unknown>[] = [];

	const innerSignal = store(
		compute((signal) => {
			if (!dependencies.includes(signal)) {
				dependencies.push(signal);
			}
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
				const subscription = dep.subscribe(
					() => {
						invalidate();
					},
					{ callInitially: false },
				);
				dependencies.push(dep);
				subscriptions.push(subscription);
			}
		} else {
			innerSignal.set(compute(getImmediateValue));
		}
	}

	const subscriptions = dependencies.map((dep) => {
		return dep
			.subscribe(
				() => {
					invalidate();
				},
				{ callInitially: false },
			)
			.cascadesFrom(signalLifetime);
	});

	return {
		...innerSignal,
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
		incremental?: boolean;
	},
	outerLifetime: Lifetime = useHookLifetime(),
) {
	const dynamic = props?.dynamic ?? false;

	const dependencies: Signal<unknown>[] = [];

	let latestLifetime = new Lifetime();

	compute(
		(signal) => {
			if (!dependencies.includes(signal)) {
				dependencies.push(signal);
			}
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
				const subscription = dep.subscribe(
					() => {
						invalidate();
					},
					{ callInitially: false },
				);
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
			.subscribe(
				() => {
					invalidate();
				},
				{ callInitially: false },
			)
			.cascadesFrom(outerLifetime);
	});
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

export const useState = store;
export const useDerived = derived;
export const useEffect = effect;

export type SignalOrValue<T> = T | Signal<T>;
export type GetSignal<T> = T extends Signal<infer U> ? U : T;

export type SignalStack<T> = T | Signal<SignalStack<T>>;

export function flatten<T>(
	signal: SignalStack<T>,
	lt: Lifetime = useHookLifetime(),
): Signal<T> {
	return derived(
		(get) => {
			function evaluate<T>(signal: SignalStack<T>): T {
				if (isSignal(signal)) {
					return evaluate(get(signal));
				}
				return signal;
			}

			return evaluate(signal);
		},
		{ dynamic: true },
		lt,
	);
}

export const useFlatten = flatten;
