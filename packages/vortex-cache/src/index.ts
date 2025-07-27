import { hash, SKL } from "@vortexjs/common";

type EmptyObject = Record<never, never>;

export interface EventDefinition<Data extends EmptyObject> {
	id: string;
	field<Key extends string, Value = string>(
		key: Key,
	): EventDefinition<Data & Record<Key, Value>>;
}

export interface CacheEvent {
	id: string;
	data: Record<string, any>;
}

export interface Cache {
	supply<Data extends EmptyObject>(
		event: EventDefinition<Data>,
		data: Partial<Data>,
	): void;
	query<Data extends EmptyObject, Key extends keyof Data & string>(
		event: EventDefinition<Data>,
		filter: Partial<
			Data & {
				$(data: Data): boolean;
			}
		>,
		key: Key,
	): Data[Key] | undefined;
	isDirty: boolean;
	entries: CacheEvent[];
}

export function baseCache(): Cache {
	return {
		entries: [],
		isDirty: false,
		supply(spec, data) {
			this.entries.push({
				id: spec.id,
				data: data,
			});
			this.isDirty = true;

			while (this.entries.length > 2000) {
				this.entries.shift();
			}
		},
		query(event, filter, key) {
			const firstEligible = this.entries.find((entry) => {
				if (entry.id !== event.id) return false;

				if (!(key in entry.data)) {
					return false;
				}

				for (const key in filter) {
					const expected = (filter as any)[key];

					if (
						key !== "$" &&
						(expected ?? undefined) !== undefined &&
						(entry.data as any)[key] !== expected
					) {
						return false;
					}
				}

				if (filter.$) {
					if (!filter.$(entry.data as any)) {
						return false;
					}
				}

				return true;
			});

			return firstEligible?.data?.[key];
		},
	};
}

export async function filesystemCache(path: string) {
	const cache = baseCache();

	try {
		const text = await Bun.file(path).text();
		cache.entries = SKL.parse(text) as CacheEvent[];
	} catch (_) {}

	setInterval(async () => {
		if (cache.isDirty) {
			await Bun.write(path, SKL.stringify(cache.entries));
			cache.isDirty = false;
		}
	}, 1000);

	return cache;
}

export function eventSchema(id: string): EventDefinition<EmptyObject> {
	return {
		id,
		field(_key) {
			return this as any;
		},
	};
}

export const nonConstantFastHash = globalThis.Bun?.hash?.wyhash ?? hash;
