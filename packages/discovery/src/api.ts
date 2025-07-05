export type DiscoveryTarget = "client" | "server";
export interface DiscoveryPluginProps {
	target: DiscoveryTarget;
}
export interface DiscoveryProps extends DiscoveryPluginProps {
	source: string;
	jsx: boolean;
	typescript: boolean;
	fileName: string;
}
export type Discovery = {
	type: "route_frame";
	path: string;
	exported: string;
	frameType: "page" | "layout";
};
