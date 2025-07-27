import { eventSchema, nonConstantFastHash } from "@vortexjs/cache";
import { smolify, unsmolify } from "@vortexjs/common";
import type { PippinError } from "@vortexjs/pippin";
import { print } from "esrap";
import tsx from "esrap/languages/tsx";
import { type Expression, type Node, parseAsync } from "oxc-parser";
import type { Discovery, DiscoveryProps, DiscoveryTarget } from "./api";
import { resolveName, Scoper } from "./scoper";
import { Transformer } from "./transform";
import { handleAPIFunction } from "./transpile/api";
import { handleRouteFunction } from "./transpile/route";
import { inlineUnwrapCall } from "./transpile/unwrap";

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
	if (module === "@vortexjs/common" && imported === "unwrap") {
		return "unwrap";
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
	target: DiscoveryTarget;
	discoveries: Discovery[];
	clientEligible: boolean;
	serverEligible: boolean;
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

type OutputData = Omit<
	Awaited<ReturnType<typeof discoveryCompile>>,
	`${"client" | "server"}Eligible`
>;

const discoveryTransformSpec = eventSchema("discovery:transform")
	.field<"clientEligible", boolean>("clientEligible")
	.field<"serverEligible", boolean>("serverEligible")
	.field("inputHash")
	.field<"output", OutputData>("output");

export async function discoveryCompile(props: DiscoveryProps): Promise<{
	source: string;
	errors: Omit<PippinError, "path">[];
	discoveries: Discovery[];
}> {
	const inputHash = nonConstantFastHash(
		JSON.stringify({
			jsx: props.jsx,
			ts: props.typescript,
			code: props.source,
		}),
	).toString(36);

	const output = props.cache?.query?.(
		discoveryTransformSpec,
		{
			inputHash,
			clientEligible: props.target === "client" ? true : undefined,
			serverEligible: props.target === "server" ? true : undefined,
		},
		"output",
	);

	if (output) {
		return {
			source: unsmolify(output.source),
			errors: output.errors,
			discoveries: output.discoveries,
		};
	}

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
		target: props.target,
		clientEligible: true,
		serverEligible: true,
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
		} else if (specialImport === "query" || specialImport === "mutation") {
			handleAPIFunction(state, node, specialImport);
		} else if (specialImport === "unwrap") {
			inlineUnwrapCall(state, node);
		}
	});

	state.transformer.transform(parsed);

	const { code, map } = print(parsed, tsx());

	props.cache?.supply?.(discoveryTransformSpec, {
		clientEligible: state.clientEligible,
		serverEligible: state.serverEligible,
		output: {
			source: smolify(code),
			errors: state.errors,
			discoveries: state.discoveries,
		},
		inputHash,
	});

	return {
		errors: state.errors,
		source: code,
		discoveries: state.discoveries,
	};
}
