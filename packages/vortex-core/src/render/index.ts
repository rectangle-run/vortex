import { trace, unreachable, unwrap } from "@vortexjs/common";
import { ContextScope } from "../context";
import type { JSXNode } from "../jsx/jsx-common";
import { Lifetime } from "../lifetime";
import { effect, type Store, store } from "../signal";
import {
	FLElement,
	FLFragment,
	type FLNode,
	FLPortal,
	FLText,
} from "./fragments";
import { Reconciler } from "./reconciler";

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
	setStyle(node: RendererNode, name: string, value: string | undefined): void;
}

export interface RenderProps<RendererNode, HydrationContext> {
	renderer: Renderer<RendererNode, HydrationContext>,
	root: RendererNode,
	component: JSXNode,
};

function internalRender<RendererNode, HydrationContext>({ renderer, root, component }: RenderProps<RendererNode, HydrationContext>): Lifetime {
	using _trace = trace("Initial page render");

	const reconciler = new Reconciler(renderer, root);
	const lt = new Lifetime();

	const flNode = reconciler.render({
		node: component,
		hydration: renderer.getHydrationContext(root),
		lt,
		context: ContextScope.current ?? new ContextScope(),
	});

	const portal = new FLPortal(root, renderer);

	portal.children = [flNode];

	return lt;
}

export function render<RendererNode, HydrationContext>(
	renderer: Renderer<RendererNode, HydrationContext>,
	root: RendererNode,
	component: JSXNode,
): Lifetime;
export function render<RendererNode, HydrationContext>(props: RenderProps<RendererNode, HydrationContext>): Lifetime;
export function render<RendererNode, HydrationContext>(
	propsOrRenderer: Renderer<RendererNode, HydrationContext> | RenderProps<RendererNode, HydrationContext>, root?: RendererNode, component?: JSXNode
) {
	if ("renderer" in propsOrRenderer) {
		return internalRender(propsOrRenderer);
	} else {
		return internalRender({
			renderer: propsOrRenderer,
			root,
			component,
		});
	}
}
