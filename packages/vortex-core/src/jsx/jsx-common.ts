import { type Signal, derived, isSignal, toSignal } from "../signal";

export type JSXNode =
	| JSXElement
	| JSXComponent<unknown>
	| JSXFragment
	| JSXText;

export interface JSXSource {
	fileName?: string;
	lineNumber?: number;
	columnNumber?: number;
}

export interface JSXElement extends JSXSource {
	type: "element";
	name: string;
	attributes: Record<string, Signal<string | undefined>>;
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
	value: Signal<string>;
}

export interface JSXRuntimeProps {
	children?: JSXNode | JSXNode[];
	[key: string]: any;
}

export const Fragment = Symbol("Fragment");

export type JSXChildren =
	| (JSXNode | string | number | boolean | undefined)
	| (JSXNode | string | number | boolean | undefined)[]
	| undefined;

export function normalizeChildren(children: JSXChildren): JSXNode[] {
	if (children === undefined) {
		return [];
	}
	return [children]
		.flat()
		.filter((child) => child !== null && child !== undefined)
		.map((x) =>
			typeof x === "string" ||
			typeof x === "number" ||
			typeof x === "boolean" ||
			isSignal(x)
				? createTextNode(x)
				: x,
		);
}

export function createTextNode(value: any, source?: JSXSource): JSXNode {
	const valSignal = toSignal(value);

	return {
		type: "text",
		value: derived((get) => String(get(valSignal))),
		...source,
	};
}
