import { watch } from "node:fs";
import { exists, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
	Lifetime,
	type Signal,
	type Store,
	getImmediateValue,
	useDerived,
	useState,
} from "@vortexjs/core";
import { type Discovery, compileScript } from "@vortexjs/discovery";
import { addTask } from "./tasks";

const discoveryCompilerCues = ["@vortexjs/wormhole/route"];

export function checkForCues(contents: string): boolean {
	return discoveryCompilerCues.some((cue) => contents.includes(cue));
}

function checkPathValidity(path: string) {
	return !path.includes(".wormhole");
}

export type TaggedDiscovery = Discovery & {
	filePath: string;
};

export interface Index {
	discoveries: Signal<TaggedDiscovery[]>;
}

export function indexDirectory(path: string, lt: Lifetime): Index {
	using _hlt = Lifetime.changeHookLifetime(lt);

	const fileDiscoveries: Store<Record<string, TaggedDiscovery[]>> = useState(
		{},
	);

	async function revalidate(fullPath: string) {
		using _task = addTask({
			name: `Index ${basename(fullPath)}`,
		});

		const contents = await Bun.file(fullPath).text();

		if (!checkForCues(contents)) return;

		const { discoveries } = compileScript(contents, basename(fullPath));

		fileDiscoveries.set({
			...getImmediateValue(fileDiscoveries),
			[fullPath]: discoveries.map((x) => ({
				...x,
				filePath: fullPath,
			})),
		});
	}

	async function firstPassIndex(dir = path) {
		using _task = addTask({
			name: `Index ${basename(dir)}`,
		});

		const entries = await readdir(dir);

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stat = await Bun.file(fullPath).stat();

			if (stat.isDirectory()) {
				firstPassIndex(fullPath); // await intentionally omitted to allow parallel indexing
			}

			if (stat.isFile()) {
				if (checkPathValidity(fullPath)) {
					revalidate(fullPath);
				}
			}
		}
	}

	firstPassIndex();

	const discoveries = useDerived((get) => {
		const fl = get(fileDiscoveries);
		const result: TaggedDiscovery[] = [];

		for (const [_p, discoveries] of Object.entries(fl)) {
			result.push(...discoveries);
		}

		return result;
	});

	const watcher = watch(path, {
		recursive: true,
	});

	watcher.on("change", async (_eventType, fileName) => {
		const absFileName = resolve(path, fileName.toString());

		if (
			checkPathValidity(absFileName) &&
			(await exists(absFileName)) &&
			(await Bun.file(absFileName).stat()).isFile()
		) {
			revalidate(absFileName);
		} else {
			fileDiscoveries.set({
				...getImmediateValue(fileDiscoveries),
				[absFileName]: [],
			});
		}
	});

	return {
		discoveries,
	};
}
