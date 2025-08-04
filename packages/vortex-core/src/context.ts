import { unwrap } from "@vortexjs/common";
import type { JSXNode } from "./jsx/jsx-common";
import { type Signal, type SignalOrValue, toSignal } from "./signal";

export interface Context<T> {
	(props: { value: SignalOrValue<T>; children: JSXNode }): JSXNode;
	use(): Signal<T>;
}

export function createContext<T>(name = "Unnamed"): Context<T> {
	const id = crypto.randomUUID();

	const result = (props: {
		value: SignalOrValue<T>;
		children: JSXNode;
	}): JSXNode => {
		return {
			type: "context",
			id,
			value: toSignal(props.value),
			children: props.children,
		};
	};

	result.use = () => {
		return unwrap(
			useContextScope().contexts[id],
			`Context "${name}" not found, you may have forgotten to wrap your component in the context provider.`,
		);
	};

	return result;
}

export class StreamingContext {
	private updateCallbackImmediate = 0;
	private updateCallbacks = new Set<() => void>();
	private loadingCounter = 0;
	private onDoneLoadingCallback = () => {};
	onDoneLoading: Promise<void>;

	constructor() {
		this.onDoneLoading = new Promise((resolve) => {
			this.onDoneLoadingCallback = resolve;
		});
	}

	onUpdate(callback: () => void): () => void {
		this.updateCallbacks.add(callback);

		return () => {
			this.updateCallbacks.delete(callback);
		};
	}

	markLoading() {
		const self = this;

		this.loadingCounter++;

		return {
			[Symbol.dispose]() {
				self.updated();
				self.loadingCounter--;
			},
		};
	}

	updated() {
		if (this.updateCallbackImmediate) {
			return;
		}

		this.updateCallbackImmediate = setImmediate(() => {
			this.updateCallbackImmediate = 0;

			for (const callback of this.updateCallbacks) {
				callback();
			}

			if (this.loadingCounter === 0) {
				this.onDoneLoadingCallback();
			}
		}) as unknown as number;
	}
}

export class ContextScope {
	contexts: Record<string, Signal<any>> = {};
	streaming: StreamingContext = new StreamingContext();

	fork() {
		const newScope = new ContextScope();
		newScope.contexts = { ...this.contexts };
		return newScope;
	}

	addContext<T>(id: string, value: Signal<T>): void {
		this.contexts[id] = value;
	}

	static current: ContextScope | null = null;

	static setCurrent(scope: ContextScope | null) {
		const previous = ContextScope.current;

		ContextScope.current = scope;

		return {
			[Symbol.dispose]() {
				ContextScope.current = previous;
			},
		};
	}
}

export function useContextScope(): ContextScope {
	const scope = ContextScope.current;
	if (!scope) {
		throw new Error(
			"No context scope found, you should have one if you're rendering a component.",
		);
	}
	return scope;
}

export function useStreaming(): StreamingContext {
	return useContextScope().streaming;
}
