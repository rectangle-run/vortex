import { compileScript } from "@vortexjs/discovery";
import type { BunPlugin, Loader } from "bun";
import { checkForCues } from "./indexing";

export const discoveryPlugin: BunPlugin = {
	name: "Discovery",
	setup(plugin) {
		plugin.onLoad({ filter: /.*/, namespace: "file" }, async (args) => {
			const overrided: Loader[] = ["js", "jsx", "ts", "tsx"];

			if (!overrided.includes(args.loader)) return;

			const contents = await Bun.file(args.path).text();

			if (!checkForCues(contents)) return;

			const { source } = compileScript(contents, args.path);

			return {
				contents: source,
				loader: args.loader,
			};
		});
	},
};
