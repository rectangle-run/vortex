// notes on convention:
// V prefix indicates virtual DOM for SSR, although it isn't used on the client, so we only have a virtual DOM because we quite literally cannot have a real one.

import { unwrap } from "@vortexjs/common";
import { Lifetime, type Renderer, type Store } from "@vortexjs/core";

export type VElement = {
	tagName: string;
	attributes: Record<string, string>;
	children: VNode[];
	parent?: VElement;
	fixedIdent?: string;
};

export interface VText {
	content: string;
	parent?: VElement;
}

export type VNode = VElement | VText;

function documentBadQuerySelector(
	document: VNode,
	tagName: string
): VElement[] {
	const result: VElement[] = [];

	function traverse(node: VNode) {
		if (!node) return;
		if ("tagName" in node) {
			if (node.tagName === tagName) {
				result.push(node);
			}
			for (const child of node.children) {
				traverse(child);
			}
		}
	}

	traverse(document);

	return result;
}

function getIdent(node: VNode, codegen: CodegenStream): string {
	if (codegen.nodeToQuickIdent.get(node)) {
		return unwrap(codegen.nodeToQuickIdent.get(node));
	}

	let ident: string | undefined;

	if ("fixedIdent" in node && node.fixedIdent) {
		ident ??= node.fixedIdent;
	}

	if ("tagName" in node && node.tagName === "body") {
		ident = "document.body";
	}

	if ("tagName" in node && node.tagName === "head") {
		ident = "document.head";
	}

	if (!ident && "tagName" in node) {
		// Find the index that this node would be in a fake document.querySelector
		const index = documentBadQuerySelector(codegen.document, node.tagName).indexOf(node);

		ident ??= `document[${codegen.getIndexerShorthand("querySelectorAll")}](${codegen.getIndexerShorthand(node.tagName)})[${index}]`;
	}

	if (!ident) {
		if (!node.parent) {
			throw new Error("Node has no parent, cannot generate ident");
		}
		ident ??= `${getIdent(node.parent, codegen)}[${codegen.getIndexerShorthand("childNodes")}][${node.parent.children.indexOf(node)}]`;
	}

	const shortIdent = codegen.getFreshIdent();

	codegen.write(`var ${shortIdent}=${ident};`);
	codegen.nodeToQuickIdent.set(node, shortIdent);

	return shortIdent;
}

function getType(node: VNode): string {
	return "tagName" in node ? node.tagName : "Text";
}

function typeCounts(children: VNode[]): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const child of children) {
		const type = getType(child);

		if (!counts[type]) {
			counts[type] = 0;
		}

		counts[type]++;
	}

	return counts;
}

export type CodegenStream = {
	write(code: string): void;
	getCode(): string;
	getFreshIdent(): string;
	getIndexerShorthand(indexer: string): string;
	nodeToQuickIdent: Map<VNode, string>;
	document: VElement;
};

export function createCodegenStream(document: VElement): CodegenStream {
	let code = "";
	let identCounter = 0;
	const indexerShorthands: Record<string, string> = {};

	return {
		write: (newCode: string) => {
			code += newCode;
		},
		getCode: () => code,
		getFreshIdent: () => {
			const ident = `$${identCounter.toString(36)}`;
			identCounter++;
			return ident;
		},
		getIndexerShorthand(indexer: string) {
			if (!indexerShorthands[indexer]) {
				indexerShorthands[indexer] = this.getFreshIdent();
				this.write(
					`var ${indexerShorthands[indexer]}=${JSON.stringify(indexer)};`,
				);
			}
			return indexerShorthands[indexer];
		},
		nodeToQuickIdent: new Map<VNode, string>(),
		document,
	};
}

type HTMLPrinter = {
	html: string;
	write(code: string): void;
	lastType: string;
};

function createHTMLPrinter(): HTMLPrinter {
	return {
		html: "",
		write(code: string) {
			this.html += code;
		},
		lastType: "",
	};
}

function escapeHTML(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function printHTML(node: VNode, printer = createHTMLPrinter()): string {
	const type = getType(node);

	if (type === "Text" && printer.lastType === "Text") {
		printer.write("<!--$-->");
	}

	printer.lastType = type;

	if ("tagName" in node) {
		printer.write("<");
		printer.write(node.tagName);
		for (const [name, value] of Object.entries(node.attributes)) {
			if (value === undefined) continue;
			printer.write(` ${name}="${escapeHTML(value)}"`);
		}
		printer.write(">");
		for (const child of node.children) {
			printHTML(child, printer);
		}
		printer.write("</");
		printer.write(node.tagName);
		printer.write(">");
	}
	if ("content" in node) {
		printer.write(escapeHTML(node.content.toString()));
	}

	return printer.html;
}

export function diffInto(from: VNode, to: VNode, codegen: CodegenStream = createCodegenStream(from as VElement)) {
	if ("tagName" in from && "tagName" in to) {
		// Safety check to ensure both nodes are of the same type
		if (getType(from) !== getType(to)) {
			throw new Error(
				`Cannot diff nodes of different types: ${getType(from)} vs ${getType(to)}`,
			);
		}

		const fromCounts = typeCounts(from.children);
		const toCounts = typeCounts(to.children);

		// Make sure child counts match
		for (const category of new Set([
			...Object.keys(fromCounts),
			...Object.keys(toCounts),
		])) {
			let fromCount = fromCounts[category] ?? 0;
			const toCount = toCounts[category] ?? 0;

			while (fromCount < toCount) {
				if (category === "Text") {
					codegen.write(
						`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("appendChild")}](document[${codegen.getIndexerShorthand("createTextNode")}](""));`,
					);
					from.children.push({ content: "", parent: from } as VText);
				} else {
					codegen.write(
						`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("appendChild")}](document[${codegen.getIndexerShorthand("createElement")}](${JSON.stringify(category)}));`,
					);
					from.children.push({
						tagName: category,
						attributes: {},
						children: [],
						parent: from,
					} as VElement);
				}

				fromCount++;
			}

			while (fromCount > toCount) {
				const toRemove = unwrap(
					from.children.find((child) =>
						category === "Text"
							? "content" in child
							: "tagName" in child && child.tagName === category,
					),
				);

				codegen.write(
					`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("removeChild")}](${getIdent(toRemove, codegen)});`,
				);
				from.children = from.children.filter(
					(child) => child !== toRemove,
				);

				fromCount--;
			}
		}

		// Make sure both have the same child order by type
		for (let pos = 0; pos < from.children.length; pos++) {
			if (
				getType(unwrap(from.children[pos])) ===
				getType(unwrap(to.children[pos]))
			)
				continue;

			const toType = getType(unwrap(to.children[pos]));

			const nextChildWithType = unwrap(
				from.children.find(
					(child) => getType(unwrap(child)) === toType,
					pos + 1,
				),
			);

			codegen.write(
				`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("insertBefore")}](${getIdent(nextChildWithType, codegen)}, ${getIdent(unwrap(from.children[pos]), codegen)});`,
			);

			from.children = from.children.filter(
				(child) => child !== nextChildWithType,
			);
			from.children.splice(pos, 0, nextChildWithType);
		}

		// Diff attributes
		for (const attr of new Set([
			...Object.keys(from.attributes),
			...Object.keys(to.attributes),
		])) {
			const fromValue = from.attributes[attr];
			const toValue = to.attributes[attr];

			if (fromValue === toValue) continue;

			if (toValue === undefined) {
				codegen.write(
					`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("removeAttribute")}](${JSON.stringify(attr)});`,
				);
				delete from.attributes[attr];
			} else {
				codegen.write(
					`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("setAttribute")}](${JSON.stringify(attr)}, ${JSON.stringify(toValue)});`,
				);
				from.attributes[attr] = toValue;
			}
		}

		// Diff children
		for (let i = 0; i < from.children.length; i++) {
			diffInto(unwrap(from.children[i]), unwrap(to.children[i]), codegen);
		}
	} else if ("content" in from && "content" in to) {
		if (from.content !== to.content) {
			codegen.write(
				`${getIdent(from, codegen)}[${codegen.getIndexerShorthand("textContent")}] = ${JSON.stringify(to.content)};`,
			);
			from.content = to.content;
		}
	} else {
		throw new Error(
			`Cannot diff nodes of different types: ${getType(from)} vs ${getType(to)}`,
		);
	}

	return codegen;
}

function camelCaseToKebabCase(name: string): string {
	const tokens = name.split(/(?=[A-Z])/);
	return tokens.map((token) => token.toLowerCase()).join("-");
}

export function ssr(): Renderer<VNode, undefined> {
	return {
		createNode(type: string, _hydration?: undefined): VNode {
			return {
				tagName: type,
				attributes: {},
				children: [],
				parent: undefined,
			};
		},
		setAttribute(node: VNode, name: string, value: any): void {
			if (!("tagName" in node)) {
				throw new Error("Cannot set attribute on a text node");
			}

			node.attributes[name] = value;
		},
		createTextNode(_hydration?: undefined): VNode {
			return {
				content: "",
				parent: undefined,
			};
		},
		setTextContent(node: VNode, text: string): void {
			if (!("content" in node)) {
				throw new Error("Cannot set text content on a non-text node");
			}

			node.content = text;
		},
		setChildren(node: VNode, children: VNode[]): void {
			if (!("children" in node)) {
				throw new Error("Cannot set children on a text node");
			}

			node.children = children;
			for (const child of children) {
				child.parent = node;
			}
		},
		getHydrationContext(_node: VNode): undefined {
			return undefined;
		},
		addEventListener(
			_node: VNode,
			_name: string,
			_event: (event: any) => void,
		): Lifetime {
			return new Lifetime(); // We don't support events in SSR
		},
		bindValue<T>(_node: VNode, _name: string, _value: Store<T>): Lifetime {
			return new Lifetime(); // We don't support binding in SSR
		},
		setStyle(node: VNode, name: string, value: string | undefined): void {
			if (!("attributes" in node)) {
				throw new Error("Cannot set style on a text node");
			}

			let style = node.attributes.style ?? "";

			style += `${camelCaseToKebabCase(name)}: ${value};`;

			node.attributes.style = style;
		},
	};
}

export function createHTMLRoot(): VElement {
	return {
		tagName: "html",
		attributes: {},
		children: [],
		parent: undefined,
		fixedIdent: "document.documentElement",
	};
}
