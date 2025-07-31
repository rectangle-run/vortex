import { exists } from "node:fs/promises";
import { join } from "node:path";
import type { DeepPartial } from "@vortexjs/common";
import { type Lifetime, useEffect, useState } from "@vortexjs/core";
import { useFile } from "~/local/contents";

export type Config = DeepPartial<{
	dev: {
		port: number;
	};
	tailwind: {
		enabled: boolean;
	}
}>;

export const getConfig = async (lt: Lifetime, projectPath: string) => {
	const configPath = join(projectPath, "wormhole.toml");
	const configFile = await useFile(configPath, lt);
	const config = useState<Config>({});

	if (await exists(configPath)) {
		config.set(Bun.TOML.parse(await Bun.file(configPath).text()));
	}

	useEffect(
		async (get) => {
			const file = get(configFile);

			if (file === undefined) {
				config.set({});
			} else {
				config.set(Bun.TOML.parse(await file.text()));
			}
		},
		undefined,
		lt,
	);

	return config;
};
