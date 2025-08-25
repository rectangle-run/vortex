import { useContextScope } from "~/context";
import type { QuerySchema } from "./schema";
import { useHookLifetime } from "~/lifetime";
import type { Signal } from "~/signal";

export interface QueryProps { maxAge?: number }

export function useQuery<Args, Result>(
    schema: QuerySchema<Args, Result>,
    args: Args,
    props?: QueryProps,
): Signal<Result | undefined> {
    const contextScope = useContextScope();
    const lt = useHookLifetime();

    const observation = contextScope.query.createObservation({
        schema,
        args,
        lt,
        maxAge: props?.maxAge,
    });

    return observation.query.data;
}
