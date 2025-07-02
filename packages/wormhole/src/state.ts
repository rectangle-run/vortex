import { unwrap } from "@vortexjs/common";
import {
	type Lifetime,
	type Signal,
	type Store,
	getImmediateValue,
	useDerived,
	useState,
} from "@vortexjs/core";
import { getConfig } from "./compile-time/config";
import { ErrorCollection, type WormholeError } from "./compile-time/errors";
import { indexDirectory } from "./compile-time/indexing";
import { paths } from "./compile-time/paths";
import { developmentServer } from "./compile-time/server";

export function service<T>(initializer: () => T) {
	let instance: T | undefined = undefined;

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
	}

	errors: Signal<WormholeError[]>;

	errorCollections: Store<ErrorCollection[]> = useState([]);

	addErrorCollection(collection: ErrorCollection) {
		this.errorCollections.set(
			getImmediateValue(this.errorCollections).concat(collection),
		);
	}

	server = service(() => developmentServer(this));
	index = service(() => indexDirectory(this.projectDir, this.lt));
	config = service(() => getConfig(this.lt, this.projectDir));

	buildErrors = ErrorCollection.updatable();
	paths: ReturnType<typeof paths>;
}
