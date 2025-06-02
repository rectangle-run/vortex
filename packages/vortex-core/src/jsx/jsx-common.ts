import {
	type Signal,
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
