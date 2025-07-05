import { unwrap } from "@vortexjs/common";
import type { PippinError } from "@vortexjs/pippin";
import { print } from "esrap";
import tsx from "esrap/languages/tsx";
import {
	type CallExpression,
	type Expression,
	type Node,
	parseAsync,
} from "oxc-parser";
import type { Discovery, DiscoveryProps } from "./api";
import { exportNode } from "./builders";
import { Scoper, resolveName } from "./scoper";
import { Transformer } from "./transform";

export function getSpecialImport(module: string, imported: string) {
	if (
		module === "@vortexjs/wormhole/route" &&
		(imported === "route" || imported === "default")
	) {
		return "route";
	}
	if (module === "@vortexjs/wormhole/route" && imported === "query") {
		return "query";
	}
	if (module === "@vortexjs/wormhole/route" && imported === "mutation") {
		return "mutation";
	}
}

export type SpecialImport = Exclude<
	ReturnType<typeof getSpecialImport>,
	undefined
>;

export interface CompilerState {
	transformer: Transformer;
	scoper: Scoper;
	errors: Omit<PippinError, "path">[];
	discoveries: Discovery[];
}

export function getObjectKeys(state: CompilerState, node: Node) {
	if (node.type !== "ObjectExpression") {
		state.errors.push({
			from: node.start,
			to: node.end,
			message: `expected an object, got ${node.type}`,
			hints: [],
		});
		return;
	}

	const result: Record<string, Expression> = {};

	for (const prop of node.properties) {
		if (prop.type !== "Property") {
			state.errors.push({
				from: prop.start,
				to: prop.end,
				message: `expected a property, got ${prop.type}`,
				hints: [],
			});
			continue;
		}

		if (prop.key.type !== "Identifier" && prop.key.type !== "Literal") {
			state.errors.push({
				from: prop.key.start,
				to: prop.key.end,
				message: `expected an identifier or string key, got ${prop.key.type}`,
				hints: [],
			});
			continue;
		}

		result[resolveName(prop.key)] = prop.value;
	}

	return result;
}

export function getStringLiteralValue(state: CompilerState, node: Node) {
	if (node.type === "Literal") {
		if (typeof node.value === "string") {
			return node.value;
		}
		state.errors.push({
			from: node.start,
			to: node.end,
			message: `expected a string literal, got ${node.type} with value ${node.value}`,
			hints: [],
		});
		return undefined;
	}
	if (node.type === "TemplateLiteral") {
		if (node.expressions.length > 0) {
			state.errors.push({
				from: node.start,
				to: node.end,
				message:
					"expected a string literal, got a template literal with expressions",
				hints: [],
			});
			return undefined;
		}
		return node.quasis.map((q) => q.value.cooked).join("");
	}
	state.errors.push({
		from: node.start,
		to: node.end,
		message: `expected a string literal, got ${node.type}`,
		hints: [],
	});
	return undefined;
}

export function handleRouteFunction(
	state: CompilerState,
	node: CallExpression,
) {
	state.transformer.remove(node);

	if (node.arguments.length !== 2) {
		state.errors.push({
			from: node.start,
			to: node.end,
			message: `expected 2 arguments, got ${node.arguments.length}`,
			hints: [],
		});
		return;
	}

	const options = getObjectKeys(state, unwrap(node.arguments[1]));
	const path = getStringLiteralValue(state, unwrap(node.arguments[0]));

	if (!options) return;
	if (!path) return;

	const keys = Object.keys(options);

	if (keys.length === 0) {
		state.errors.push({
			from: node.start,
			to: node.end,
			message: "expected options object to have at least one property",
			hints: [],
		});
		return;
	}

	const validKeys = ["page", "layout"] as const;

	for (const key of keys) {
		if (!validKeys.includes(key as any)) {
			state.errors.push({
				from: node.start,
				to: node.end,
				message: `invalid option key "${key}", expected one of ${validKeys.join(", ")}`,
				hints: [],
			});
		}
	}

	for (const key of validKeys) {
		const value = options[key];

		if (!value) continue;

		const exported = exportNode(state, value);

		state.discoveries.push({
			type: "route_frame",
			exported: exported,
			frameType: key,
			path,
		});
	}
}

export async function discoveryCompile(props: DiscoveryProps): Promise<{
	source: string;
	errors: Omit<PippinError, "path">[];
	discoveries: Discovery[];
}> {
	const parsed = (
		await parseAsync(props.fileName, props.source, {
			lang: props.typescript
				? props.jsx
					? "tsx"
					: "ts"
				: props.jsx
					? "jsx"
					: "js",
		})
	).program;

	const state: CompilerState = {
		transformer: new Transformer(),
		scoper: new Scoper(),
		errors: [],
		discoveries: [],
	};

	state.scoper.hook(state.transformer);

	state.transformer.onEnter("CallExpression", (node) => {
		const callee = node.callee;

		if (callee.type !== "Identifier") return;

		const identifier = callee.name;

		const value = state.scoper.resolve(identifier);

		if (!value || value.type !== "import") return;

		const specialImport = getSpecialImport(value.module, value.id);

		if (!specialImport) return;

		if (specialImport === "route") {
			handleRouteFunction(state, node);
		}
	});

	state.transformer.transform(parsed);

	const { code, map } = print(parsed, tsx());

	return {
		errors: state.errors,
		source: code,
		discoveries: state.discoveries,
	};
}
