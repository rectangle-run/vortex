import {
	type JSXNode,
	type JSXRuntimeProps,
	createElementInternal,
	normalizeChildren,
} from "./jsx-common";

import { Fragment } from "./jsx-common";

export { Fragment };

export function jsx(type: any, props: JSXRuntimeProps | null): JSXNode {
	const { children, ...attributes } = props || {};

	// Handle Fragment
	if (type === Fragment) {
		return {
			type: "fragment",
			children: normalizeChildren(children),
		};
	}

	// Handle string (HTML elements)
	if (typeof type === "string") {
		// Convert non-JSX children to text nodes
		return createElementInternal(type, attributes, children);
	}

	// Handle function components
	if (typeof type === "function") {
		return {
			type: "component",
			impl: type,
			props: props || {},
			children: normalizeChildren(children),
		};
	}

	throw new Error(`Invalid JSX type: ${type}`);
}

export const jsxs = jsx;
