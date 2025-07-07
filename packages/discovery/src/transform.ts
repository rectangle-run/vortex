import { unwrap } from "@vortexjs/common";
import type { ModuleDeclaration, Node } from "oxc-parser";
import { importDeclaration } from "./builders";

export type TransformOperation =
	| {
			type: "insert_before";
			node: Node;
			target: Node;
	  }
	| {
			type: "insert_after";
			node: Node;
			target: Node;
	  }
	| {
			type: "replace";
			node: Node;
			target: Node;
	  }
	| {
			type: "remove";
			target: Node;
	  };

export interface TransformHook<Ty extends Node["type"]> {
	type: Ty;
	callback: (node: Node) => void | Promise<void>;
	when: "in" | "out";
}

export function isNode(node: any): node is Node {
	return node && typeof node === "object" && "type" in node;
}

export class Transformer {
	operations: TransformOperation[] = [];
	hooks: TransformHook<any>[] = [];
	declarationsToAdd: ModuleDeclaration[] = [];
	importIds = new Map<string, string>();
	importCount = 0;
	idCount = 0;

	import(module: string, name: string) {
		const key = `${module}#${name}`;

		if (this.importIds.has(key)) {
			return unwrap(this.importIds.get(key));
		}

		const local = `$i_${(this.importCount++).toString(36)}`;

		this.importIds.set(key, local);

		this.addDeclaration(importDeclaration(module, name, local));

		return local;
	}

	getExportId() {
		return `$d_${(this.idCount++).toString(36)}`;
	}

	addDeclaration(decl: ModuleDeclaration) {
		this.declarationsToAdd.push(decl);
		return this;
	}

	onEnter<Ty extends Node["type"]>(
		type: Ty,
		callback: (node: Node & { type: Ty }) => void | Promise<void>,
	): this {
		this.hooks.push({ type, callback: callback as any, when: "in" });
		return this;
	}

	onExit<Ty extends Node["type"]>(
		type: Ty,
		callback: (node: Node & { type: Ty }) => void | Promise<void>,
	): this {
		this.hooks.push({ type, callback: callback as any, when: "out" });
		return this;
	}

	insertBefore(node: Node, target: Node): this {
		this.operations.push({ type: "insert_before", node, target });
		return this;
	}

	insertAfter(node: Node, target: Node): this {
		this.operations.push({ type: "insert_after", node, target });
		return this;
	}

	replace(node: Node, target: Node): this {
		this.operations.push({ type: "replace", node, target });
		return this;
	}

	remove(target: Node): this {
		this.operations.push({ type: "remove", target });
		return this;
	}

	transform(node: Node) {
		for (const hook of this.hooks) {
			if (node.type === hook.type && hook.when === "in") {
				hook.callback(node);
			}
		}

		for (const key in node) {
			const data = node[key as keyof Node];

			if (Array.isArray(data)) {
				const newArray: any[] = [];

				for (const item of data as any[]) {
					if (isNode(item)) {
						this.transform(item);
					}

					const relevantOperations = this.operations.filter(
						(op) => op.target === item,
					);

					// Insert before
					for (const op of relevantOperations.filter(
						(op) => op.type === "insert_before",
					)) {
						newArray.push(op.node);
					}

					let deleted = false;

					// Process modifications
					for (const op of relevantOperations) {
						if (op.type === "replace") {
							deleted = true;
							newArray.push(op.node);
						} else if (op.type === "remove") {
							deleted = true;
						}
					}

					if (!deleted) {
						newArray.push(item);
					}

					// Insert after
					for (const op of relevantOperations.filter(
						(op) => op.type === "insert_after",
					)) {
						newArray.push(op.node);
					}
				}

				(node as any)[key] = newArray;
			} else if (isNode(data)) {
				this.transform(data);
				for (const op of this.operations) {
					//@ts-expect-error
					if (op.target === data) {
						op.target = node; // Update target to the current node
					}
				}
			}
		}

		for (const hook of this.hooks) {
			if (node.type === hook.type && hook.when === "out") {
				hook.callback(node);
			}
		}

		if (node.type === "Program") {
			for (const declaration of this.declarationsToAdd) {
				node.body.push(declaration);
			}
		}
	}
}
