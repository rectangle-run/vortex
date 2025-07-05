import type { PippinPlugin } from "@vortexjs/pippin";
import type { DiscoveryPluginProps, DiscoveryTarget } from "./api";
import { discoveryCompile } from "./compiler";

export { discoveryCompile } from "./compiler";
export * from "./api";

export function pippinPluginDiscovery(
	props: DiscoveryPluginProps,
): PippinPlugin {
	return {
		name: "Discovery",
		description: "Compiler to power ergonomic framework APIs",
		transformers: [
			{
				async transform(props) {
					if (props.format.type !== "ecma") {
						return;
					}

					const { source, errors } = await discoveryCompile({
						...props,
						target: props.namespace as DiscoveryTarget,
						jsx: props.format.jsx,
						typescript: props.format.typescript,
						fileName: props.path,
					});

					for (const error of errors) {
						await props.logError(error);
					}

					return {
						source,
						format: props.format,
					};
				},
			},
		],
	};
}
