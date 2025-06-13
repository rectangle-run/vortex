import { watch } from "node:fs";
import { exists } from "node:fs/promises";
import { join } from "node:path";
import { type Signal, useHookLifetime, useState } from "@vortexjs/core";

export async function useFile(
	path: string,
	lt = useHookLifetime(),
): Promise<Signal<Bun.FileBlob | undefined>> {
	const file = useState<Bun.FileBlob | undefined>(undefined);

	if (await exists(path)) {
		file.set(Bun.file(path));
	}

	const watcher = watch(join(path, ".."));

	watcher.on("change", async (_eventType, filename) => {
		if (filename === path) {
			if (await exists(path)) {
				file.set(Bun.file(path));
			} else {
				file.set(undefined);
			}
		}
	});

	lt.onClosed(() => {
		watcher.close();
	});

	return file;
}
