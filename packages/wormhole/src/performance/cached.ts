import { paths } from "../paths";
import { unwrap } from "../utils";

export interface Cache<This, Args extends any[], Return> {
	(this: This, ...args: Args): Promise<Return>;
	disk(cacheNamespace: string): Cache<This, Args, Return>;
}

export function cached<This, Args extends any[], Return>(
	target: (this: This, ...args: Args) => Return,
): Cache<This, Args, Return> {
	const cache = new Map<string, Return>();
	let diskNamespace: string | undefined = undefined;

	const result = async function (this: This, ...args: Args): Promise<Return> {
		const key = JSON.stringify(args);

		if (cache.has(key)) {
			return unwrap(cache.get(key));
		}

		// check disk cache
		if (diskNamespace) {
			const hashedKey = Bun.hash(key).toString(16);
			const path = paths()
				.wormhole.cache.namespace(diskNamespace)
				.eval(hashedKey);

			try {
				const contents = (await Bun.file(path).json()) as Return;
				cache.set(key, contents);
				return contents;
			} catch {}
		}

		const result = await target.call(this, ...args);

		cache.set(key, result);

		if (diskNamespace) {
			async function saveToDisk() {
				const hashedKey = Bun.hash(key).toString(16);
				const path = paths()
					.wormhole.cache.namespace(unwrap(diskNamespace))
					.eval(hashedKey);
				await Bun.write(path, JSON.stringify(result, null, "\t"));
			}

			saveToDisk();
		}

		return result;
	} as Cache<This, Args, Return>;

	result.disk = (cacheNamespace: string): Cache<This, Args, Return> => {
		diskNamespace = cacheNamespace;

		return result;
	};

	return result;
}
