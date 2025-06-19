import { exists } from "node:fs/promises";
import { join } from "node:path";
import type { DeepPartial } from "@vortexjs/common";
import { type Lifetime, useEffect, useState } from "@vortexjs/core";
import { TOML } from "bun";
import { cached } from "./cached";
import { useFile } from "./contents";

export type Config = DeepPartial<{
	dev: {
		port: number;
	};
}>;

export const getConfig = cached(async (lt: Lifetime, projectPath: string) => {
	const configPath = join(projectPath, "wormhole.toml");
	const configFile = await useFile(configPath, lt);
	const config = useState<Config>({});

	if (await exists(configPath)) {
		config.set(TOML.parse(await Bun.file(configPath).text()));
	}

	useEffect(
		async (get) => {
			const file = get(configFile);

			if (file === undefined) {
				config.set({});
			} else {
				config.set(TOML.parse(await file.text()));
			}
		},
		undefined,
		lt,
	);

	return config;
});
