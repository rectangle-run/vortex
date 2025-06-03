import {
	Lifetime,
	type Renderer,
	type Signal,
	type Store,
	getImmediateValue,
} from "@vortexjs/core";
import { unwrap } from "./utils";

export interface HTMLHydrationContext {
	unclaimedNodes: Node[];
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
					node.removeAttribute(name);
				} else {
					node.setAttribute(name, String(value));
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
				for (
					let i = 0;
					i < Math.min(node.children.length, children.length);
					i++
				) {
					const child = unwrap(node.children[i]);
					const newChild = unwrap(children[i]);

					if (child !== newChild) {
						child.replaceWith(newChild);
					}
				}

				const oldChildrenSet = new Set(Array.from(node.childNodes));
				const newChildrenSet = new Set(children);

				for (const child of newChildrenSet.difference(oldChildrenSet)) {
					node.append(child);
				}

				for (const child of oldChildrenSet.difference(newChildrenSet)) {
					child.remove();
				}
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

				lt.onClosed(() => node.removeEventListener("input", inputHandler));
			}

			return lt;
		},
	};
}

export * from "./std";
