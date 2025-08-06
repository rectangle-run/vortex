import { type Brand, unwrap } from "@vortexjs/common";
import { MessageError, type UpdatableErrorCollection, type WormholeError } from "./errors";
import type { Export } from "~/local/export";

// Parsing
export type RoutePath = RouteSegment[];
export type RouteSegment =
	| { type: "spread"; name: string }
	| { type: "static"; match: string }
	| { type: "slug"; name: string };

export function parseRoute(route: string): RoutePath {
	const segments = route
		.split("/")
		.map((x) => x.trim())
		.filter((x) => x !== "");
	const result: RoutePath = [];

	for (const segment of segments) {
		if (segment.startsWith("[") && segment.endsWith("]")) {
			const body = segment.slice(1, -1);

			if (body.startsWith("...")) {
				result.push({ type: "spread", name: body.slice(3) });
			} else {
				result.push({ type: "slug", name: body });
			}
		} else {
			result.push({
				type: "static",
				match: segment,
			});
		}
	}

	return result;
}

export function printRoutePath(path: RoutePath): string {
	return path
		.map((segment) => {
			if (segment.type === "static") {
				return segment.match;
			} else if (segment.type === "slug") {
				return `[${segment.name}]`;
			} else if (segment.type === "spread") {
				return `[...${segment.name}]`;
			}
		})
		.join("/");
}

// Tree generation
export interface RouterNode {
	cases: Record<string, RouterNode>; // Cases for static segments
	layout?: Export; // Layout page, if any
	page?: Export; // Page to render for this route
	notFoundPage?: Export; // Not found page, if any
	fallbackTransition?: {
		node: RouterNode;
		id: string; // the param key to add the value to
	}; // Epsilon transition, where it doesn't match any special cases
	isSpreadFallback?: boolean;
	sourcePath: string;
};

export interface InputRoute {
	path: string; // The path of the route
	frame: Export; // The frame to render for this route
	frameType: "page" | "layout";
}

function makeBlankNode(source: string): RouterNode {
	return {
		cases: {},
		sourcePath: source,
	}
}

export function RouterNode({ routes, errors }: {
	routes: InputRoute[];
	errors: UpdatableErrorCollection;
}) {
	const tree: RouterNode = makeBlankNode("<root>");
	const errorList: WormholeError[] = [];

	for (const route of routes) {
		const parsed = parseRoute(route.path);
		let currentNode = tree;

		for (const segment of parsed) {
			if (segment.type === "static") {
				// Could be a one-liner, but this is more readable
				const nextNode = currentNode.cases[segment.match] ?? makeBlankNode(route.path);
				currentNode.cases[segment.match] = nextNode;
				currentNode = nextNode;
			} else if (segment.type === "slug") {
				if (!currentNode.fallbackTransition) {
					currentNode.fallbackTransition = {
						node: makeBlankNode(route.path),
						id: segment.name,
					};
				} else {
					if (currentNode.isSpreadFallback) {
						errorList.push(
							MessageError(
								`When I was trying to add the route '${route.path}', I ran into a problem.`,
								`The slug segment '[${segment.name}]' conflicts with a spread segment defined by '${currentNode.fallbackTransition.node.sourcePath}'`
							),
						);
					}
				}
				currentNode = currentNode.fallbackTransition.node;
			} else if (segment.type === "spread") {
				if (!currentNode.fallbackTransition) {
					currentNode.fallbackTransition = {
						node: currentNode,
						id: segment.name,
					};
				} else {
					if (!currentNode.isSpreadFallback) {
						errorList.push(
							MessageError(
								`When I was trying to add the route '${route.path}', I ran into a problem.`,
								`The spread segment '[...${segment.name}]' conflicts with a slug segment defined by '${currentNode.fallbackTransition.node.sourcePath}'`
							),
						);
					}
				}

				currentNode.isSpreadFallback = true;
			}
		}

		if (route.frameType === "page") {
			if (currentNode.page) {
				errorList.push(
					MessageError(
						`There are multiple different definitions of '${route.path}' with conflicting pages. Each path can only have one page.`,
					),
				);
			}

			currentNode.page = route.frame;
		} else if (route.frameType === "layout") {
			if (currentNode.layout) {
				errorList.push(
					MessageError(
						`There are multiple different definitions of '${route.path}' with conflicting layouts. Each path can only have one layout.`,
					),
				);
			}

			currentNode.layout = route.frame;
		}
	}

	errors.update(errorList);

	return tree;
}

// AI DISCLOSURE: This function is almost entirely AI-generated, with minimal human edits.
export function matchPath(matcher: RoutePath, path: string): {
	matched: false
} | {
	matched: true;
	params: Record<string, string>;
	spreads: Record<string, string[]>;
} {
	const pathSegments = path.split("/").map(x => x.trim()).filter(x => x !== "");

	function recursiveMatch(
		matcherIdx: number,
		pathIdx: number,
		params: Record<string, string>,
		spreads: Record<string, string[]>
	): { matched: false } | { matched: true, params: Record<string, string>, spreads: Record<string, string[]> } {
		// Base case: both matcher and path are fully consumed
		if (matcherIdx === matcher.length && pathIdx === pathSegments.length) {
			return { matched: true, params: { ...params }, spreads: { ...spreads } };
		}
		// If matcher is consumed but path is not, or vice versa, fail
		if (matcherIdx === matcher.length || (pathIdx > pathSegments.length)) {
			return { matched: false };
		}

		const segment = unwrap(matcher[matcherIdx]);

		if (segment.type === "static") {
			if (pathIdx >= pathSegments.length || pathSegments[pathIdx] !== segment.match) {
				return { matched: false };
			}
			return recursiveMatch(matcherIdx + 1, pathIdx + 1, params, spreads);
		} else if (segment.type === "slug") {
			if (pathIdx >= pathSegments.length) {
				return { matched: false };
			}
			const newParams = { ...params, [segment.name]: pathSegments[pathIdx] };
			return recursiveMatch(matcherIdx + 1, pathIdx + 1, newParams as Record<string, string>, spreads);
		} else if (segment.type === "spread") {
			// Try all possible splits for the spread segment
			for (let take = 0; take <= pathSegments.length - pathIdx; take++) {
				const newSpreads = { ...spreads, [segment.name]: pathSegments.slice(pathIdx, pathIdx + take) };
				const result = recursiveMatch(matcherIdx + 1, pathIdx + take, params, newSpreads);
				if (result.matched) {
					return result;
				}
			}
			return { matched: false };
		}
		return { matched: false };
	}

	return recursiveMatch(0, 0, {}, {});
}
