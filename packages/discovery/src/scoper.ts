import { unwrap } from "@vortexjs/common";
import type { Node } from "oxc-parser";
import type { Transformer } from "./transform";

export type ValueDescription =
	| {
			type: "variable";
			value: Node;
	  }
	| {
			type: "import";
			id: string;
			module: string;
	  };

export interface LexicalScope {
	values: Record<string, ValueDescription>;
}

export type NameLike = (Node & { type: "Identifier" | "Literal" }) | string;

export function resolveName(name: NameLike): string {
	if (typeof name === "string") {
		return name;
	}
	if (name.type === "Identifier") {
		return name.name;
	}
	if (name.type === "Literal") {
		if (typeof name.value === "string") {
			return name.value;
		}
		throw new Error("Literal value must be a string");
	}
	throw new Error("Invalid name type");
}

export class Scoper {
	lexicalScopes: LexicalScope[] = [];

	constructor() {
		this.pushScope();
	}

	pushScope(): void {
		this.lexicalScopes.push({ values: {} });
	}

	popScope(): void {
		this.lexicalScopes.pop();
	}

	get top() {
		return unwrap(this.lexicalScopes[this.lexicalScopes.length - 1]);
	}

	store(name: NameLike, description: ValueDescription) {
		this.top.values[resolveName(name)] = description;
	}

	resolve(name: NameLike): ValueDescription | undefined {
		const resolvedName = resolveName(name);

		for (const scope of this.lexicalScopes.toReversed()) {
			if (scope.values[resolvedName]) {
				return scope.values[resolvedName];
			}
		}

		return undefined;
	}

	hook(transformer: Transformer) {
		transformer
			.onEnter("BlockStatement", (_node) => {
				this.pushScope();
			})
			.onExit("BlockStatement", (_node) => {
				this.popScope();
			})
			.onEnter("VariableDeclarator", (node) => {
				if (node.id.type === "Identifier" && node.init) {
					this.store(node.id, {
						type: "variable",
						value: node.init,
					});
				}
			})
			.onEnter("ImportDeclaration", (node) => {
				for (const specifier of node.specifiers) {
					if (specifier.type === "ImportSpecifier") {
						this.store(specifier.local, {
							type: "import",
							id: resolveName(specifier.imported),
							module: node.source.value,
						});
					} else if (specifier.type === "ImportDefaultSpecifier") {
						this.store(specifier.local, {
							type: "import",
							id: "default",
							module: node.source.value,
						});
					}
				}
			});
	}
}
