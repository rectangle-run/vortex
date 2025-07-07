import { unwrap } from "@vortexjs/common";
import type { CallExpression } from "oxc-parser";
import { exportNode } from "../builders";
import {
	type CompilerState,
	getObjectKeys,
	getStringLiteralValue,
} from "../compiler";

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
