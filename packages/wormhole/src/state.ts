import { join } from "node:path";
import { baseCache, type Cache, filesystemCache } from "@vortexjs/cache";
import { type DeepPartial, unwrap } from "@vortexjs/common";
import {
    getImmediateValue,
    type Lifetime,
    type Signal,
    type Store,
    useDerived,
    useState,
} from "@vortexjs/core";
import {
    type ErrorCollection,
    ErrorCollection_updatable,
    type WormholeError,
} from "./build/errors";
import { Indexer } from "./build/indexing";
import { type Config, getConfig } from "./local/config";
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

export class Project implements ErrorCollection {
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
        this.config = await getConfig(this.lt, this.projectDir);
    }

    cache: Cache;

    errors: Signal<WormholeError[]>;

    errorCollections: Store<ErrorCollection[]> = useState([]);

    addErrorCollection(collection: ErrorCollection) {
        this.errorCollections.set(
            getImmediateValue(this.errorCollections).concat(collection),
        );
    }

    index = service(() => Indexer(this));
    config = undefined as unknown as Signal<DeepPartial<Config>>;

    buildErrors = ErrorCollection_updatable();
    routingErrors = ErrorCollection_updatable();
    paths: ReturnType<typeof paths>;
}
