import { unwrap } from "@vortexjs/common";
import {
	Lifetime,
	type Renderer,
	type Store,
	getImmediateValue,
} from "@vortexjs/core";

export interface HTMLHydrationContext {
	unclaimedNodes: Node[];
}

export function jsAttributeToHTMLAttribute(name: string) {
	const substitutions: Record<string, string> = {
		htmlFor: "for",
		className: "class",
		tabIndex: "tabindex",
		ariaDescribedBy: "aria-describedby",
	};

	if (name in substitutions) {
		return unwrap(substitutions[name]);
	}

	const chunks = name.split(/(?=[A-Z])/);

	return chunks.map((chunk) => chunk.toLowerCase()).join("-");
}

export function html(): Renderer<Node, HTMLHydrationContext> {
	function tryClaimNode<T extends Node>(
		context: HTMLHydrationContext | undefined,
		criteria: (node: Node) => node is T,
		validate?: (node: T) => boolean,
	): T | null {
		if (!context) {
			return null;
		}

		while (context.unclaimedNodes.length > 0) {
			const node = context.unclaimedNodes.shift();
			if (node && criteria(node) && (!validate || validate(node))) {
				return node;
			}
		}

		return null;
	}

	return {
		createNode(type: string, hydration?: HTMLHydrationContext): Node {
			const normalType = type.toLowerCase();

			const element =
				tryClaimNode<HTMLElement>(
					hydration,
					(node) => node instanceof HTMLElement,
					(node) => node.tagName.toLowerCase() === normalType,
				) ?? document.createElement(normalType);

			for (let i = 0; i < element.attributes.length; i++) {
				const attr = unwrap(element.attributes[i]);
				element.removeAttribute(attr.name);
			}

			return element;
		},
		setAttribute(node: Node, name: string, value: any): void {
			if (node instanceof HTMLElement) {
				if (value === undefined || value === null) {
					node.removeAttribute(jsAttributeToHTMLAttribute(name));
				} else {
					node.setAttribute(
						jsAttributeToHTMLAttribute(name),
						String(value),
					);
				}
			}
		},
		createTextNode(hydration?: HTMLHydrationContext): Node {
			return (
				tryClaimNode<Text>(hydration, (node) => node instanceof Text) ??
				document.createTextNode("")
			);
		},
		setTextContent(node: Node, text: string): void {
			if (node instanceof Text) {
				node.data = text;
			} else if (node instanceof HTMLElement) {
				node.textContent = text;
			}
		},
		setChildren(node: Node, children: Node[]): void {
			if (node instanceof HTMLElement) {
				node.replaceChildren(...children);
			}
		},
		getHydrationContext(node): HTMLHydrationContext {
			return {
				unclaimedNodes: Array.from(node.childNodes),
			};
		},
		addEventListener(
			node: Node,
			name: string,
			event: (event: any) => void,
		): Lifetime {
			const lt = new Lifetime();

			if (node instanceof HTMLElement) {
				const handler = (e: Event) => {
					event(e);
				};
				node.addEventListener(name, handler);
				lt.onClosed(() => node.removeEventListener(name, handler));
			} else {
				console.warn(
					`Cannot add event listener to non-HTMLElement node: ${node}`,
				);
			}

			return lt;
		},
		bindValue<T>(node: Node, name: string, value: Store<T>): Lifetime {
			const lt = new Lifetime();

			// @ts-ignore: This is all dynamic, so types are not strictly enforced
			node[name] = getImmediateValue(value);

			if (name === "value") {
				function inputHandler() {
					// @ts-ignore: This is all dynamic, so types are not strictly enforced
					value.set(node[name]);
				}

				node.addEventListener("input", inputHandler);

				lt.onClosed(() =>
					node.removeEventListener("input", inputHandler),
				);
			}

			if (name === "checked") {
				function changeHandler() {
					// @ts-ignore: This is all dynamic, so types are not strictly enforced
					value.set(node[name]);
				}

				node.addEventListener("change", changeHandler);

				lt.onClosed(() =>
					node.removeEventListener("change", changeHandler),
				);
			}

			return lt;
		},
		setStyle(node, name, value) {
			if (node instanceof HTMLElement) {
				//@ts-ignore: This is all dynamic, so types are not strictly enforced
				node.style[name] = value;
			}
		},
	};
}

export * from "./std";
export * from "./jsx/intrinsics";
