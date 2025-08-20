import type { Cache } from "@vortexjs/cache";

export type DiscoveryTarget = "client" | "server";
export interface DiscoveryPluginProps {
	target: DiscoveryTarget;
}
export interface DiscoveryProps extends DiscoveryPluginProps {
	source: string;
	jsx: boolean;
	typescript: boolean;
	fileName: string;
	cache?: Cache;
}
export type Discovery =
	| {
			type: "route_frame";
			path: string;
			exported: string;
			frameType: "page" | "layout" | "notFound";
	  }
	| {
			type: "api";
			exported: {
				impl: string;
				schema: string;
			};
			endpoint: string;
			method: string;
	  };
