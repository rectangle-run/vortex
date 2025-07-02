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

				for (const diagnostic of result.diagnostics) {
					if (diagnostic.tier.type !== "Error") continue;

					const related = result.diagnostics.filter(
						(x) =>
							x.tier.type === "Related" &&
							x.tier.field0 === diagnostic.id,
					);

					await props.logError({
						from: diagnostic.span[0],
						to: diagnostic.span[1],
						message: diagnostic.message,
						hints: related.map((x) => ({
							from: x.span[0],
							to: x.span[1],
							message: x.message,
						})),
					});
				}

				return {
					source: result.source,
					format: props.format,
				};
			},
		},
	],
};
