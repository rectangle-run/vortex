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
import { addTask } from "./tasks";
import type { State } from "../state";

function checkPathValidity(path: string) {
    return !path.includes(".wormhole") && !path.includes("node_modules");
}

export type TaggedDiscovery = Discovery & {
    filePath: string;
};

export interface Index {
    discoveries: Signal<TaggedDiscovery[]>;
}

export function indexDirectory(state: State): Index {
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

        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = await Bun.file(fullPath).stat();

            if (!checkPathValidity(fullPath)) {
                continue;
            }

            if (stat.isDirectory()) {
                firstPassIndex(fullPath); // await intentionally omitted to allow parallel indexing
            }

            if (stat.isFile()) {
                revalidate(fullPath);
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

    const watcher = watch(state.projectDir, {
        recursive: true,
    });

    watcher.on("change", async (_eventType, fileName) => {
        const absFileName = resolve(state.projectDir, fileName.toString());

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
