import { type JSXNode, render } from "@vortexjs/core";
import { Direction, Edge, type Node } from "yoga-layout";
import { cli } from "./corebind";
import { Canvas, Renderer } from "./render";
import symbols from "./tokens/symbols";
import colors from "./tokens/tailwind-colors";
import { Box } from "./tree";

function printYogaNode(node: Node) {
	console.group("Yoga Node");

	console.log("X:", node.getComputedLeft());
	console.log("Y:", node.getComputedTop());
	console.log("Width:", node.getComputedWidth());
	console.log("Height:", node.getComputedHeight());
	console.log("PaddingTop", node.getPadding(Edge.Top));
	console.log("PaddingRight", node.getPadding(Edge.Right));
	console.log("PaddingBottom", node.getPadding(Edge.Bottom));
	console.log("PaddingLeft", node.getPadding(Edge.Left));

	for (let i = 0; i < node.getChildCount(); i++) {
		const child = node.getChild(i);
		printYogaNode(child);
	}

	console.groupEnd();
}

export function cliApp(root: JSXNode) {
	const renderer = new Renderer();
	const internalRoot = new Box();

	function paint() {
		const width = process.stdout.columns;
		const height = process.stdout.rows;

		internalRoot.yoga.setWidth(width);
		internalRoot.yoga.setHeight(height);

		internalRoot.yoga.calculateLayout(undefined, undefined, Direction.LTR);

		const canvas = new Canvas(width, height);

		internalRoot.render(canvas);

		renderer.render(canvas);
	}

	let paintImmediate = 0;

	function queuePaint() {
		if (paintImmediate !== 0) return;
		paintImmediate = setTimeout(() => {
			paint();
			paintImmediate = 0;
		}, 10) as unknown as number;
	}

	render({
		root: internalRoot,
		renderer: cli({
			onUpdate() {
				queuePaint();
			},
		}),
		component: root,
	});

	process.stdout.on("resize", () => {
		queuePaint();
	});

	queuePaint();

	setInterval(() => {
		//@ts-expect-error bun hack
		process.stdout._refreshSize();
	}, 500);
}

export { symbols, colors };
