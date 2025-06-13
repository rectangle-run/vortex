import { join } from "node:path";
import process from "node:process";

export function paths() {
	const root = join(process.cwd());
	const wormholeFolder = join(root, ".wormhole");
	const wormholeCache = join(wormholeFolder, "cache");

	return {
		root,
		wormhole: {
			path: wormholeFolder,
			cache: {
				path: wormholeCache,
				namespace(cacheNamespace: string) {
					const namespaceRoot = join(wormholeCache, cacheNamespace);
					const evals = join(namespaceRoot, "evals");
					const blobs = join(namespaceRoot, "blobs");

					return {
						path: namespaceRoot,
						eval(hashedKey: string) {
							return join(evals, hashedKey);
						},
						blob() {
							const id = crypto.randomUUID();
							return {
								id,
								path: join(blobs, id),
							};
						},
					};
				},
			},
		},
	};
}
