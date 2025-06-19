// Terminology
//   FL: Fragment Layer

import { unwrap } from "@vortexjs/common";
import type { Renderer } from ".";

export abstract class FLNode<RendererNode> {
	_children: FLNode<RendererNode>[] = [];
	parent: FLNode<RendererNode> | null = null;
	rendererNode: RendererNode | null = null;

	abstract onChildrenChanged(): void;

	get children(): FLNode<RendererNode>[] {
		return this._children;
	}

	set children(next: FLNode<RendererNode>[]) {
		this._children = next;
		for (const child of next) {
			child.parent = this;
		}
		this.onChildrenChanged();
	}

	get flatChildren(): FLNode<RendererNode>[] {
		const flat: FLNode<RendererNode>[] = [];

		function traverse(node: FLNode<RendererNode>) {
			if (node instanceof FLFragment) {
				for (const child of node.children) {
					traverse(child);
				}
			} else {
				flat.push(node);
			}
		}

		for (const child of this.children) {
			traverse(child);
		}

		return flat;
	}
}

export class FLFragment<RendererNode> extends FLNode<RendererNode> {
	onChildrenChanged(): void {
		this.parent?.onChildrenChanged();
	}
}

export class FLText<
	RendererNode,
	HydrationContext,
> extends FLNode<RendererNode> {
	_text: string;

	get text(): string {
		return this._text;
	}

	set text(value: string) {
		this._text = value;
		this.renderer.setTextContent(unwrap(this.rendererNode), value);
	}

	constructor(
		text: string,
		private renderer: Renderer<RendererNode, HydrationContext>,
		hydration?: HydrationContext,
	) {
		super();
		this._text = text;
		this.rendererNode = renderer.createTextNode(hydration);
		renderer.setTextContent(this.rendererNode, text);
	}

	onChildrenChanged(): void {
		this.parent?.onChildrenChanged();
	}
}

export class FLElement<
	RendererNode,
	HydrationContext,
> extends FLNode<RendererNode> {
	setAttribute(name: string, value: any): void {
		this.renderer.setAttribute(unwrap(this.rendererNode), name, value);
	}

	constructor(
		private tag: string,
		private renderer: Renderer<RendererNode, HydrationContext>,
		hydration?: HydrationContext,
	) {
		super();
		this.rendererNode = renderer.createNode(tag, hydration);
	}

	onChildrenChanged(): void {
		const children = this.flatChildren.map((child) =>
			unwrap(child.rendererNode),
		);
		this.renderer.setChildren(unwrap(this.rendererNode), children);
	}
}

export class FLPortal<RendererNode> extends FLNode<RendererNode> {
	constructor(
		private target: RendererNode,
		private renderer: Renderer<RendererNode, any>,
	) {
		super();
	}

	onChildrenChanged(): void {
		this.renderer.setChildren(
			this.target,
			this.flatChildren.map((child) => unwrap(child.rendererNode)),
		);
	}
}
