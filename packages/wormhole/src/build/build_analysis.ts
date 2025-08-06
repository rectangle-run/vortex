import { getImmediateValue } from "@vortexjs/core";
import type { Build } from "./build";
import { parseRoute, RouterNode, type RoutePath } from "./router";
import type { Export } from "~/local/export";
import { SKL } from "@vortexjs/common";
import type { HTTPMethod } from "~/shared/http-method";

export async function Build_analyze(this: Build) {
	await this.project.index.instance.ready;

	// P1 Routes: API routes
	const apiDiscoveries = getImmediateValue(this.project.index.instance.discoveries).filter(x => x.type === "api");

	for (const discovery of apiDiscoveries) {
		this.routes.push({
			type: "api",
			impl: {
				name: discovery.exported.impl,
				file: discovery.filePath,
			},
			schema: {
				name: discovery.exported.schema,
				file: discovery.filePath,
			},
			matcher: parseRoute(discovery.endpoint),
			method: discovery.method as HTTPMethod,
		})
	}

	// P2 Routes: Page routes
	// Page routes are more complex, as they can have multiple frames and layouts, additionally, we convert from a complex tree to a flat list of matchers
	const pageDiscoveries = getImmediateValue(this.project.index.instance.discoveries).filter(x => x.type === "route_frame");

	const routeTree = RouterNode({
		routes: pageDiscoveries.map(x => ({
			path: x.path,
			frame: {
				name: x.exported,
				file: x.filePath,
			},
			frameType: x.frameType
		})),
		errors: this.project.routingErrors,
	});

	flattenNode({
		build: this,
		node: routeTree,
		path: [],
		layouts: [],
	});
}

function flattenNode(
	{
		build,
		node,
		path,
		layouts
	}: {
		build: Build,
		node: RouterNode,
		path: RoutePath,
		layouts: Export[],
	}
) {
	if (node.fallbackTransition && node.isSpreadFallback) {
		path.push({ type: "spread", name: node.fallbackTransition.id });
	}

	if (node.page) {
		build.routes.push({
			type: "route",
			matcher: path,
			frames: [...layouts, node.page],
		});
	}

	if (node.layout) {
		layouts.push(node.layout);
	}

	for (const [key, child] of Object.entries(node.cases)) {
		flattenNode({
			build,
			node: child,
			path: [...path, { type: "static", match: key }],
			layouts: [...layouts],
		});
	}

	if (node.fallbackTransition && !node.isSpreadFallback) {
		flattenNode({
			build,
			node: node.fallbackTransition.node,
			path: [...path, { type: "slug", name: node.fallbackTransition.id }],
			layouts: [...layouts],
		})
	}

	if (node.notFoundPage) {
		build.routes.push({
			type: "route",
			matcher: [...path, { type: "spread", name: "404" }],
			frames: [...layouts, node.notFoundPage],
		});
	}
}
