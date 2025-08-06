import { watch } from "node:fs";
import { exists, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import {
	getImmediateValue,
	Lifetime,
	type Signal,
	type Store,
	useDerived,
	useState,
} from "@vortexjs/core";
import { checkForCues, type Discovery, discoveryCompile } from "@vortexjs/discovery";
import { addTask } from "~/cli/statusboard";
import type { Project } from "~/state";

function checkPathValidity(path: string) {
	return !path.includes(".wormhole") && !path.includes("node_modules");
}

export type TaggedDiscovery = Discovery & {
	filePath: string;
};

export interface Indexer {
	discoveries: Signal<TaggedDiscovery[]>;
	ready: Promise<void>;
}

export function Indexer(state: Project): Indexer {
	using _hlt = Lifetime.changeHookLifetime(state.lt);

	const fileDiscoveries: Store<Record<string, TaggedDiscovery[]>> = useState(
		{},
	);

	async function revalidate(fullPath: string) {
		using _task = addTask({
			name: `Index ${basename(fullPath)}`,
		});

		const contents = await Bun.file(fullPath).text();

		if (!checkForCues(contents)) return;

		const ext = extname(fullPath);

		const { discoveries, errors } = await discoveryCompile({
			source: contents,
			fileName: basename(fullPath),
			jsx: ext === ".jsx" || ext === ".tsx",
			typescript: ext === ".ts" || ext === ".tsx",
			target: "server",
			cache: state.cache
		});

		if (errors.length > 0) {
			throw errors;
		}

		fileDiscoveries.set({
			...getImmediateValue(fileDiscoveries),
			[fullPath]: discoveries.map((x) => ({
				...x,
				filePath: fullPath,
			})),
		});
	}

	async function firstPassIndex(dir = state.projectDir) {
		using _task = addTask({
			name: `Index ${basename(dir)}`,
		});

		const entries = await readdir(dir);
		const promises: Promise<void>[] = [];

		for (const entry of entries) {
			const fullPath = join(dir, entry);
			const stat = await Bun.file(fullPath).stat();

			if (!checkPathValidity(fullPath)) {
				continue;
			}

			if (stat.isDirectory()) {
				promises.push(firstPassIndex(fullPath)); // await intentionally omitted to allow parallel indexing
			}

			if (stat.isFile()) {
				promises.push(revalidate(fullPath));
			}
		}

		await Promise.all(promises);
	}

	const discoveries = useDerived((get) => {
		const fl = get(fileDiscoveries);
		const result: TaggedDiscovery[] = [];

		for (const [_p, discoveries] of Object.entries(fl)) {
			result.push(...discoveries);
		}

		return result;
	});

	const watcher = watch(join(state.projectDir, "src"), {
		recursive: true,
		persistent: true
	});

	const readyPromises: Promise<void>[] = [];

	watcher.on("change", async (_eventType, fileName) => {
		const absFileName = resolve(state.projectDir, "src", fileName.toString());

		if (
			checkPathValidity(absFileName) &&
			(await exists(absFileName)) &&
			(await Bun.file(absFileName).stat()).isFile()
		) {
			const p = revalidate(absFileName);
			p.then(() => {
				readyPromises.splice(readyPromises.indexOf(p), 1);
			})
			readyPromises.push(p);
		} else {
			fileDiscoveries.set({
				...getImmediateValue(fileDiscoveries),
				[absFileName]: [],
			});
		}
	});

	readyPromises.push(firstPassIndex());

	state.lt.onClosed(() => { watcher.close(); })

	return {
		discoveries,
		get ready() {
			return Promise.all(readyPromises).then(() => void 0);
		}
	};
}
