import type { JSXNode } from "../jsx/jsx-common";
import { Lifetime } from "../lifetime";
import { type Store, effect, getImmediateValue, store } from "../signal";
import { trace, unreachable, unwrap } from "../utils";
import {
	FLElement,
	FLFragment,
	type FLNode,
	FLPortal,
	FLText,
} from "./fragments";

export * as FL from "./fragments";

export interface Renderer<RendererNode, HydrationContext> {
	createNode(type: string, hydration?: HydrationContext): RendererNode;
	setAttribute(node: RendererNode, name: string, value: any): void;
	createTextNode(hydration?: HydrationContext): RendererNode;
	setTextContent(node: RendererNode, text: string): void;
	setChildren(node: RendererNode, children: RendererNode[]): void;
	getHydrationContext(node: RendererNode): HydrationContext;
	addEventListener(
		node: RendererNode,
		name: string,
		event: (event: any) => void,
	): Lifetime;
	bindValue<T>(node: RendererNode, name: string, value: Store<T>): Lifetime;
}

class Reconciler<RendererNode, HydrationContext> {
	constructor(
		private renderer: Renderer<RendererNode, HydrationContext>,
		private root: RendererNode,
	) {}

	render(
		node: JSXNode,
		hydration: HydrationContext | undefined,
		lt: Lifetime,
	): FLNode<RendererNode> {
		if (node === undefined || node === null) {
			return new FLFragment<RendererNode>();
		}

		switch (node.type) {
			case "fragment": {
				const frag = new FLFragment<RendererNode>();
				frag.children = node.children.map((child) =>
					this.render(child, hydration, lt),
				);
				return frag;
			}
			case "text": {
				return new FLText<RendererNode, HydrationContext>(
					node.value,
					this.renderer,
					hydration,
				);
			}
			case "element": {
				const element = new FLElement<RendererNode, HydrationContext>(
					node.name,
					this.renderer,
					hydration,
				);

				const elmHydration = this.renderer.getHydrationContext(
					unwrap(element.rendererNode),
				);

				element.children = node.children.map((child) =>
					this.render(child, elmHydration, lt),
				);

				for (const [name, value] of Object.entries(node.attributes)) {
					value
						.subscribe((next) => {
							element.setAttribute(name, next);
						})
						.cascadesFrom(lt);
				}

				for (const [name, value] of Object.entries(node.bindings)) {
					this.renderer
						.bindValue(unwrap(element.rendererNode), name, value)
						.cascadesFrom(lt);
				}

				for (const [name, handler] of Object.entries(node.eventHandlers)) {
					this.renderer
						.addEventListener(unwrap(element.rendererNode), name, handler)
						.cascadesFrom(lt);
				}

				return element;
			}
			case "component": {
				using _hook = Lifetime.changeHookLifetime(lt);
				using _trace = trace(`Rendering ${node.impl.name}`);

				const result = node.impl(node.props);

				return this.render(result, hydration, lt);
			}
			case "dynamic": {
				const swapContainer = new FLFragment<RendererNode>();

				effect(
					(get, { lifetime }) => {
						const newRender = this.render(get(node.value), hydration, lifetime);

						swapContainer.children = [newRender];
					},
					undefined,
					lt,
				);

				return swapContainer;
			}
			case "list": {
				type ListType = unknown;

				const swapContainer = new FLFragment<RendererNode>();
				const renderMap: Map<
					string,
					{
						node: FLNode<RendererNode>;
						item: Store<ListType>;
						lifetime: Lifetime;
					}
				> = new Map();

				const container = new FLFragment<RendererNode>();
				let lastKeyOrder = "";

				effect((get) => {
					const items = get(node.items);
					const newKeys = items.map((item, idx) => node.getKey(item, idx));

					for (const key of renderMap.keys()) {
						if (!newKeys.includes(key)) {
							const entry = unwrap(renderMap.get(key));
							entry.lifetime.close();
							renderMap.delete(key);
						}
					}

					for (const key of newKeys) {
						if (!renderMap.has(key)) {
							const item = items[newKeys.indexOf(key)];
							const itemStore = store(item);
							const itemLifetime = new Lifetime();
							using _hl = Lifetime.changeHookLifetime(itemLifetime);

							const renderedItem = this.render(
								node.renderItem(item, newKeys.indexOf(key)),
								hydration,
								itemLifetime,
							);

							renderMap.set(key, {
								node: renderedItem,
								item: itemStore,
								lifetime: itemLifetime,
							});
						}
					}

					const newKeyOrder = newKeys.join("|||");

					if (newKeyOrder !== lastKeyOrder) {
						lastKeyOrder = newKeyOrder;
						container.children = newKeys.map(
							(key) => unwrap(renderMap.get(key)).node,
						);
					}
				});

				return container;
			}
			default: {
				console.log(node);
				unreachable(node);
			}
		}
	}
}

export function render<RendererNode, HydrationContext>(
	renderer: Renderer<RendererNode, HydrationContext>,
	root: RendererNode,
	component: JSXNode,
): void {
	using _trace = trace("Initial page render");

	const reconciler = new Reconciler(renderer, root);
	const lt = new Lifetime();

	const flNode = reconciler.render(
		component,
		renderer.getHydrationContext(root),
		lt,
	);

	const portal = new FLPortal(root, renderer);

	portal.children = [flNode];
}
