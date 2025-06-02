import {
	type Signal,
	type Store,
	derived,
	isSignal,
	toSignal,
	useDerived,
} from "../signal";

export type JSXNode =
	| JSXElement
	| JSXComponent<unknown>
	| JSXFragment
	| JSXText
	| JSXDynamic
	| undefined;

export interface JSXSource {
	fileName?: string;
	lineNumber?: number;
	columnNumber?: number;
}

export interface JSXElement extends JSXSource {
	type: "element";
	name: string;
	attributes: Record<string, Signal<string | undefined>>;
	bindings: Record<string, Store<any>>;
	eventHandlers: Record<string, (event: any) => void>;
	children: JSXNode[];
}

export interface JSXComponent<Props> extends JSXSource {
	type: "component";
	impl: (props: Props) => JSXNode;
	props: Props;
	children: JSXNode[];
}

export interface JSXFragment extends JSXSource {
	type: "fragment";
	children: JSXNode[];
}

export interface JSXText extends JSXSource {
	type: "text";
	value: string;
}

export interface JSXDynamic extends JSXSource {
	type: "dynamic";
	value: Signal<JSXNode>;
}

export interface JSXRuntimeProps {
	children?: JSXNode | JSXNode[];
	[key: string]: any;
}

export const Fragment = Symbol("Fragment");

export type JSXChildren =
	| (JSXNode | string | number | boolean | undefined)
	| (JSXNode | string | number | boolean | undefined)[]
	| Signal<JSXNode>
	| undefined;

export function normalizeChildren(children: JSXChildren): JSXNode[] {
	if (children === undefined) {
		return [];
	}
	return [children]
		.flat()
		.filter((child) => child !== null && child !== undefined)
		.map((x) =>
			typeof x === "string" || typeof x === "number" || typeof x === "boolean"
				? createTextNode(x)
				: isSignal(x)
					? {
							type: "dynamic",
							value: useDerived((get) => {
								const val = get(x);
								return typeof val === "number" ||
									typeof val === "string" ||
									typeof val === "boolean"
									? createTextNode(val)
									: val;
							}),
						}
					: x,
		);
}

export function createTextNode(value: any, source?: JSXSource): JSXNode {
	return {
		type: "text",
		value,
		...source,
	};
}

export function createElementInternal(
	type: string,
	props: Record<string, any>,
	children: JSXNode | JSXNode[] | undefined,
	source?: JSXSource,
): JSXNode {
	const normalizedChildren = normalizeChildren(children).map((child) => {
		if (
			typeof child === "string" ||
			typeof child === "number" ||
			typeof child === "boolean"
		) {
			return createTextNode(child);
		}
		return child;
	});

	const properAttributes: Record<string, Signal<string | undefined>> = {};
	const bindings: Record<string, Store<any>> = {};
	const eventHandlers: Record<string, (event: any) => void> = {};

	for (const [key, value] of Object.entries(props)) {
		if (value !== undefined) {
			if (key.startsWith("bind:")) {
				const bindingKey = key.slice(5);

				if (!isSignal(value) || !("set" in value)) {
					throw new Error(
						`Binding value for "${bindingKey}" must be a writable store.`,
					);
				}

				bindings[bindingKey] = value as Store<any>;
			} else if (key.startsWith("on:")) {
				const eventKey = key.slice(3);
				if (typeof value !== "function") {
					throw new Error(
						`Event handler for "${eventKey}" must be a function.`,
					);
				}
				eventHandlers[eventKey] = value;
			} else {
				const valsig = toSignal(value);
				properAttributes[key] = useDerived((get) => String(get(valsig)));
			}
		}
	}

	return {
		type: "element",
		name: type,
		attributes: properAttributes,
		children: normalizedChildren,
		bindings,
		eventHandlers,
	};
}
