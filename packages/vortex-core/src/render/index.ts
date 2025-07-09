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

class Reconciler<RendererNode, HydrationContext> {
    constructor(
        private renderer: Renderer<RendererNode, HydrationContext>,
        private root: RendererNode,
    ) { }

    render(
        node: JSXNode,
        hydration: HydrationContext | undefined,
        lt: Lifetime,
        context: ContextScope,
    ): FLNode<RendererNode> {
        if (node === undefined || node === null) {
            return new FLFragment<RendererNode>();
        }

        if (Array.isArray(node)) {
            return this.render({
                type: "fragment",
                children: node
            }, hydration, lt, context);
        }

        switch (node.type) {
            case "fragment": {
                const frag = new FLFragment<RendererNode>();
                frag.children = node.children.map((child) =>
                    this.render(child, hydration, lt, context),
                );
                return frag;
            }
            case "text": {
                return new FLText<RendererNode, HydrationContext>(
                    node.value.toString(),
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
                    this.render(child, elmHydration, lt, context),
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

                for (const [name, handler] of Object.entries(
                    node.eventHandlers,
                )) {
                    this.renderer
                        .addEventListener(
                            unwrap(element.rendererNode),
                            name,
                            handler,
                        )
                        .cascadesFrom(lt);
                }

                for (const [name, value] of Object.entries(node.styles)) {
                    value
                        .subscribe((next) => {
                            this.renderer.setStyle(
                                unwrap(element.rendererNode),
                                name,
                                next,
                            );
                        })
                        .cascadesFrom(lt);
                }

                const users = [node.use].flat() as ((
                    ref: RendererNode,
                ) => void)[];

                for (const user of users) {
                    user(unwrap(element.rendererNode));
                }

                return element;
            }
            case "component": {
                using _hook = Lifetime.changeHookLifetime(lt);
                using _trace = trace(`Rendering ${node.impl.name}`);

                const result = node.impl(node.props);

                return this.render(result, hydration, lt, context);
            }
            case "dynamic": {
                const swapContainer = new FLFragment<RendererNode>();

                effect(
                    (get, { lifetime }) => {
                        const newRender = this.render(
                            get(node.value),
                            hydration,
                            lifetime,
                            context,
                        );

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
                    const newKeys = items.map((item, idx) =>
                        node.getKey(item, idx),
                    );

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
                            using _hl =
                                Lifetime.changeHookLifetime(itemLifetime);

                            const renderedItem = this.render(
                                node.renderItem(item, newKeys.indexOf(key)),
                                hydration,
                                itemLifetime,
                                context,
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
            case "context": {
                const forked = context.fork();
                using _newScope = ContextScope.setCurrent(forked);

                forked.addContext(node.id, node.value);

                return this.render(node.children, hydration, lt, forked);
            }
            default: {
                unreachable(
                    node,
                    `No rendering implementation for ${JSON.stringify(node)}`,
                );
            }
        }
    }
}

export function render<RendererNode, HydrationContext>(
    renderer: Renderer<RendererNode, HydrationContext>,
    root: RendererNode,
    component: JSXNode,
): Lifetime {
    using _trace = trace("Initial page render");

    const reconciler = new Reconciler(renderer, root);
    const lt = new Lifetime();

    const flNode = reconciler.render(
        component,
        renderer.getHydrationContext(root),
        lt,
        ContextScope.current ?? new ContextScope(),
    );

    const portal = new FLPortal(root, renderer);

    portal.children = [flNode];

    return lt;
}
