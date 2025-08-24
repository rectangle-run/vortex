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
        id, impl, getKey(args) {
            return `${id}::${JSON.stringify(args)}`
        }
    };
}
