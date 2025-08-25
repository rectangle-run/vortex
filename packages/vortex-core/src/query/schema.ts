import { hash } from "@vortexjs/common";

export interface QuerySchema<Args, Result> {
	id: string;
	impl(args: Args): Promise<Result> | Result;
	getKey(args: Args): string;
}

export function querySchema<Args, Result>({ id, impl }: {
	id: string;
	impl(args: Args): Promise<Result> | Result;
}): QuerySchema<Args, Result> {
	return {
		id,
		impl,
		getKey(args) {
			const base = `${id}::${JSON.stringify(args)}`;
			const short = hash(base).toString(36).slice(0, 5);
			return short;
		}
	};
}
