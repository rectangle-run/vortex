import { join } from "node:path";
import { baseCache, type Cache, filesystemCache } from "@vortexjs/cache";
import { unwrap } from "@vortexjs/common";
import {
	getImmediateValue,
	type Lifetime,
	type Signal,
	type Store,
	useDerived,
	useState,
} from "@vortexjs/core";
import { ErrorCollection, type WormholeError } from "./build/errors";
import { indexDirectory } from "./build/indexing";
import { developmentServer } from "./dev/server";
import { getConfig } from "./local/config";
import { paths } from "./local/paths";

export function service<T>(initializer: () => T) {
	let instance: T | undefined;

	return {
		get instance() {
			if (instance === undefined) {
				instance = initializer();
			}
			return unwrap(instance);
		},
	};
}

export class State implements ErrorCollection {
	constructor(
		public projectDir: string,
		public lt: Lifetime,
	) {
		this.paths = paths(this.projectDir);
		this.errors = useDerived(
			(get) => {
				let errors: WormholeError[] = [];
				for (const collection of get(this.errorCollections)) {
					errors = errors.concat(get(collection.errors));
				}
				return errors;
			},
			{ dynamic: true },
			this.lt,
		);
		this.addErrorCollection(this.buildErrors);
		this.addErrorCollection(this.routingErrors);
		this.cache = baseCache();
	}

	async init() {
		this.cache = await filesystemCache(
			join(this.paths.wormhole.cache.path, "rebuild-cache.skl"),
		);

		console.log(`when initing cache, ${this.cache.entries.length} entries`);
	}

	cache: Cache;

	errors: Signal<WormholeError[]>;

	errorCollections: Store<ErrorCollection[]> = useState([]);

	addErrorCollection(collection: ErrorCollection) {
		this.errorCollections.set(
			getImmediateValue(this.errorCollections).concat(collection),
		);
	}

	server = service(() => developmentServer(this));
	index = service(() => indexDirectory(this));
	config = service(() => getConfig(this.lt, this.projectDir));

	buildErrors = ErrorCollection.updatable();
	routingErrors = ErrorCollection.updatable();
	paths: ReturnType<typeof paths>;
}
