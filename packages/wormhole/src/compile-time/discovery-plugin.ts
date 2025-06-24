import discovery from "@vortexjs/discovery";
import type { BunPlugin } from "bun";

export const discoveryPlugin: BunPlugin = {
	name: "Discovery",
	setup(plugin) {
		plugin.onBeforeParse(
			{ filter: /.*/ },
			{
				symbol: "replace_discovery_imports",
				napiModule: discovery,
			},
		);
	},
};
