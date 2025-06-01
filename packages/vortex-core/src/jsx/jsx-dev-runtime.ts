import { type Signal, derived, toSignal, useDerived } from "../signal";
import {
	type JSXChildren,
	type JSXNode,
	type JSXRuntimeProps,
	type JSXSource,
	createTextNode,
	normalizeChildren,
} from "./jsx-common";

import { Fragment } from "./jsx-common";

export { Fragment };

export function jsxDEV(
	type: any,
	props: JSXRuntimeProps | null,
	key?: string | number,
	isStaticChildren?: boolean,
	source?: JSXSource,
	self?: any,
): JSXNode {
	const { children, ...attributes } = props || {};

	// Handle Fragment
	if (type === Fragment) {
		return {
			type: "fragment",
			children: normalizeChildren(children),
			...source,
		};
	}

	// Handle string (HTML elements)
	if (typeof type === "string") {
		// Convert non-JSX children to text nodes
		const normalizedChildren = normalizeChildren(children).map((child) => {
			if (
				typeof child === "string" ||
				typeof child === "number" ||
				typeof child === "boolean"
			) {
				return createTextNode(child, source);
			}
			return child;
		});

		const properAttributes: Record<string, Signal<string | undefined>> = {};

		for (const [key, value] of Object.entries(attributes)) {
			if (value !== undefined) {
				const valsig = toSignal(value);
				properAttributes[key] = useDerived((get) => String(get(valsig)));
			}
		}

		return {
			type: "element",
			name: type,
			attributes: properAttributes,
			children: normalizedChildren,
			...source,
		};
	}

	// Handle function components
	if (typeof type === "function") {
		return {
			type: "component",
			impl: type,
			props: props || {},
			children: normalizeChildren(children),
			...source,
		};
	}

	throw new Error(`Invalid JSX type: ${type}`);
}
