import { join } from "node:path";

export function paths(root: string) {
	const wormholeFolder = join(root, ".wormhole");
	const wormholeCache = join(wormholeFolder, "cache");
	const buildBox = join(wormholeFolder, "build-box");

	return {
		root,
		wormhole: {
			path: wormholeFolder,
			buildBox: {
				path: buildBox,
				output: {
					path: join(buildBox, "output"),
				},
				codegenned: {
					path: join(buildBox, "codegenned"),
				},
			},
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
