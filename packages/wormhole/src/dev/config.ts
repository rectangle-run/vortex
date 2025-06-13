import { exists } from "node:fs/promises";
import { join } from "node:path";
import { type Lifetime, useEffect, useState } from "@vortexjs/core";
import { cached } from "../performance/cached";
import type { DeepPartial } from "../utils";
import { useFile } from "./contents";

export type Config = DeepPartial<{
	dev: {
		port: number;
	};
}>;

export const getConfig = cached(async (lt: Lifetime, projectPath: string) => {
	const configPath = join(projectPath, "wormhole.json");
	const configFile = await useFile(configPath, lt);
	const config = useState<Config>({});

	if (await exists(configPath)) {
		config.set(await Bun.file(configPath).json());
	}

	useEffect(
		async (get) => {
			const file = get(configFile);

			if (file === undefined) {
				config.set({});
			} else {
				config.set(await file.json());
			}
		},
		undefined,
		lt,
	);

	return config;
});
