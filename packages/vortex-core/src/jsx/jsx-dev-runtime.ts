import { type Signal, derived, toSignal, useDerived } from "../signal";
import {
	type JSXChildren,
	type JSXNode,
	type JSXRuntimeProps,
	type JSXSource,
	createElementInternal,
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
		return createElementInternal(type, attributes, children, source);
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
