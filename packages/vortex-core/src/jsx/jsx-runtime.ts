import { type Signal, derived, toSignal, useDerived } from "../signal";
import {
	type JSXChildren,
	type JSXNode,
	type JSXRuntimeProps,
	createTextNode,
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
		};
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
