import { compileScript } from "@vortexjs/discovery";
import type { PippinPlugin } from "@vortexjs/pippin";
import { checkForCues } from "./indexing";

export const discoveryPlugin: PippinPlugin = {
	name: "Discovery",
	description: "Plugin to transpile discovery syntax into standard syntax",
	transformers: [
		{
			async transform(props) {
				if (props.format.type !== "ecma") {
					return;
				}

				if (!checkForCues(props.source)) return;

				const result = compileScript(props.source, props.path);

				return {
					source: result.source,
					format: props.format,
				};
			},
		},
	],
};
