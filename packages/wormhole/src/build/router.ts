import { type Brand, unwrap } from "@vortexjs/common";
import { getLoadKey } from "~/build/load-key";
import { createMessageError, type UpdatableErrorCollection, type WormholeError } from "./errors";

// Parsing
export type ParsedRoute = RouteSegment[];
export type RouteSegment =
	| { type: "spread"; name: string }
	| { type: "static"; match: string }
	| { type: "slug"; name: string };

export function parseRoute(route: string): ParsedRoute {
	const segments = route
		.split("/")
		.map((x) => x.trim())
		.filter((x) => x !== "");
	const result: ParsedRoute = [];

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

// Tree generation
export type RouterNode<Specifier extends ImportHash | ImportNamed> = {
	cases: Record<string, RouterNode<Specifier>>; // Cases for static segments
	layout?: Specifier; // Layout page, if any
	page?: Specifier; // Page to render for this route
	notFoundPage?: Specifier; // Not found page, if any
	fallbackTransition?: {
		node: RouterNode<Specifier>;
		id: string; // the param key to add the value to
	}; // Epsilon transition, where it doesn't match any special cases
	arrayEpsilon?: boolean;
	sourcePath: string;
};

export type ImportHash = Brand<string, "importHash">;

export type ImportNamed = {
	filePath: string;
	exportId: string;
};

export interface InputRoute {
	path: string; // The path of the route
	frame: ImportNamed; // The frame to render for this route
	frameType: "page" | "layout";
}

function makeBlankNode(source: string): RouterNode<any> {
	return {
		cases: {},
		sourcePath: source,
	}
}

export function generateRouterTree({ routes, errors }: {
	routes: InputRoute[];
	errors: UpdatableErrorCollection;
}) {
	const tree: RouterNode<ImportNamed> = makeBlankNode("<root>");
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
					if (currentNode.arrayEpsilon) {
						errorList.push(
							createMessageError(
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
					if (!currentNode.arrayEpsilon) {
						errorList.push(
							createMessageError(
								`When I was trying to add the route '${route.path}', I ran into a problem.`,
								`The spread segment '[...${segment.name}]' conflicts with a slug segment defined by '${currentNode.fallbackTransition.node.sourcePath}'`
							),
						);
					}
				}

				currentNode.arrayEpsilon = true;
			}
		}

		if (route.frameType === "page") {
			if (currentNode.page) {
				errorList.push(
					createMessageError(
						`There are multiple different definitions of '${route.path}' with conflicting pages. Each path can only have one page.`,
					),
				);
			}

			currentNode.page = route.frame;
		} else if (route.frameType === "layout") {
			if (currentNode.layout) {
				errorList.push(
					createMessageError(
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

export type RouteMatch<Specifier extends ImportNamed | ImportHash> = {
	frames: Specifier[];
	slugs: Record<string, string>;
	spreads: Record<string, string[]>;
	notFound: boolean;
};
const routeDebugging = false;

export function matchRoute<Specifier extends ImportNamed | ImportHash>(
	route: string,
	tree: RouterNode<Specifier>,
): RouteMatch<Specifier> {
	const currentFrames: Specifier[] = [];
	const currentSlugs: Record<string, string> = {};
	const currentSpreads: Record<string, string[]> = {};
	let notFoundMatch: RouteMatch<Specifier> = {
		frames: [],
		slugs: {},
		spreads: {},
		notFound: true,
	};

	const segments = route
		.split("/")
		.map((x) => x.trim())
		.filter((x) => x !== "");

	if (routeDebugging) {
		console.log("Route matching started:", { route, segments, tree });
	}

	let currentNode: RouterNode<Specifier> = tree;

	if (currentNode.layout) {
		currentFrames.push(currentNode.layout);
		if (routeDebugging) {
			console.log("Added root layout to frames");
		}
	}

	if (currentNode.notFoundPage) {
		notFoundMatch = {
			frames: [...currentFrames, currentNode.notFoundPage],
			slugs: { ...currentSlugs },
			spreads: { ...currentSpreads },
			notFound: true,
		};
		if (routeDebugging) {
			console.log("Set initial notFoundMatch");
		}
	}

	for (const seg of segments) {
		if (routeDebugging) {
			console.log("Processing segment:", seg);
		}

		if (seg in currentNode.cases) {
			currentNode = unwrap(currentNode.cases[seg]);
			if (routeDebugging) {
				console.log("Matched static segment:", seg);
			}

			if (currentNode.layout) {
				currentFrames.push(currentNode.layout);
				if (routeDebugging) {
					console.log("Added layout to frames for static segment");
				}
			}

			if (currentNode.notFoundPage) {
				notFoundMatch = {
					frames: [...currentFrames, currentNode.notFoundPage],
					slugs: { ...currentSlugs },
					spreads: { ...currentSpreads },
					notFound: true,
				};
				if (routeDebugging) {
					console.log("Updated notFoundMatch for static segment");
				}
			}
		} else if (currentNode.fallbackTransition) {
			const epsilon = unwrap(currentNode.fallbackTransition);

			currentNode = epsilon.node;

			if (currentNode.arrayEpsilon) {
				// biome-ignore lint/suspicious/noAssignInExpressions: it's more concise this way
				(currentSpreads[epsilon.id] ??= []).push(seg);
				if (routeDebugging) {
					console.log("Matched spread segment:", {
						id: epsilon.id,
						segment: seg,
					});
				}
			} else {
				currentSlugs[epsilon.id] = seg;
				if (routeDebugging) {
					console.log("Matched slug segment:", {
						id: epsilon.id,
						segment: seg,
					});
				}
			}

			if (currentNode.layout) {
				currentFrames.push(currentNode.layout);
				if (routeDebugging) {
					console.log(
						"Added layout to frames for epsilon transition",
					);
				}
			}

			if (currentNode.notFoundPage) {
				notFoundMatch = {
					frames: [...currentFrames, currentNode.notFoundPage],
					slugs: { ...currentSlugs },
					spreads: { ...currentSpreads },
					notFound: true,
				};
				if (routeDebugging) {
					console.log("Updated notFoundMatch for epsilon transition");
				}
			}
		} else {
			if (routeDebugging) {
				console.log(
					"No match found for segment, returning notFoundMatch:",
					seg,
				);
			}
			return notFoundMatch;
		}
	}

	if (!currentNode.page) {
		if (routeDebugging) {
			console.log("No page found at final node, returning notFoundMatch");
		}
		return notFoundMatch;
	}

	const result = {
		frames: [...currentFrames, currentNode.page],
		slugs: { ...currentSlugs },
		spreads: { ...currentSpreads },
		notFound: false,
	};

	if (routeDebugging) {
		console.log("Route match successful:", result);
	}

	return result;
}

export function hashImports(
	node: RouterNode<ImportNamed>,
): RouterNode<ImportHash> {
	const newNode: RouterNode<ImportHash> = {
		cases: {},
		layout: node.layout ? getLoadKey(node.layout) : undefined,
		page: node.page ? getLoadKey(node.page) : undefined,
		notFoundPage: node.notFoundPage
			? getLoadKey(node.notFoundPage)
			: undefined,
		fallbackTransition: node.fallbackTransition
			? {
				node: hashImports(node.fallbackTransition.node),
				id: node.fallbackTransition.id,
			}
			: undefined,
		arrayEpsilon: node.arrayEpsilon,
		sourcePath: node.sourcePath,
	};

	for (const [key, child] of Object.entries(node.cases)) {
		newNode.cases[key] = hashImports(child);
	}

	return newNode;
}
