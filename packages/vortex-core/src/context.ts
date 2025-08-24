import { unwrap } from "@vortexjs/common";
import type { JSXNode } from "./jsx/jsx-common";
import { clearImmediate, setImmediate } from "./setImmediate.polyfill";
import { type Signal, type SignalOrValue, toSignal } from "./signal";

export interface Context<T> {
	(props: { value: SignalOrValue<T>; children: JSXNode }): JSXNode;
	use(): Signal<T>;
	useOptional(): Signal<T> | undefined;
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

	result.useOptional = () => {
		return useContextScope().contexts[id];
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
		console.log("markLoading", this.loadingCounter);

		return {
			[Symbol.dispose]() {
				self.loadingCounter--;
				console.log("unmarkLoading", self.loadingCounter);
				self.updated();
			},
		};
	}

	updated() {
		if (this.updateCallbackImmediate) {
			clearImmediate(this.updateCallbackImmediate);
		}

		// biome-ignore lint/complexity/noUselessThisAlias: without it, shit breaks
		const self = this;

		this.updateCallbackImmediate = setImmediate(() => {
			self.updateCallbackImmediate = 0;

			for (const callback of self.updateCallbacks) {
				callback();
			}

			if (self.loadingCounter === 0) {
				console.log("done loading");
				self.onDoneLoadingCallback();
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

export function useOptionalContextScope(): ContextScope | null {
	const scope = ContextScope.current;
	if (!scope) {
		return null;
	}
	return scope;
}

export function useOptionalStreaming(): StreamingContext | null {
	const scope = useOptionalContextScope();
	if (!scope) {
		return null;
	}
	return scope.streaming;
}
