import { useState, type Store } from "~/signal";
import type { QuerySchema } from "./schema";
import { time } from "@vortexjs/common";
import type { StreamingContext } from "~/context";
import type { Lifetime } from "~/lifetime";

export class QueryObservation<Args, Result> {
    maxAge: number;
    query: Query<Args, Result>;

    constructor(
        props: {
            query: Query<Args, Result>;
            maxAge?: number;
        }
    ) {
        this.query = props.query;
        this.maxAge = props.maxAge ?? time("5m").ms;
    }
}

export class Query<Args, Result> {
    schema: QuerySchema<Args, Result>;
    args: Args;
    data: Store<Result | undefined> = useState(undefined);
    isLoading: boolean;
    updatedAt: number;
    streaming: StreamingContext;

    constructor(props: { schema: QuerySchema<Args, Result>; args: Args, streaming: StreamingContext }) {
        this.schema = props.schema;
        this.args = props.args;
        this.isLoading = false;
        this.updatedAt = 0;
        this.streaming = props.streaming;
    }

    async update() {
        if (this.isLoading) return;

        using _data = this.streaming.markLoading();

        this.isLoading = true;

        try {
            const result = await this.schema.impl(this.args);
            this.data.set(result);
            this.updatedAt = Date.now();
        } catch (e) {
            console.error("Error fetching query:", e);
        } finally {
            this.isLoading = false;
        }
    }
}

export class QueryDataEngine {
    observations: QueryObservation<any, any>[] = [];
    queries = new Map<string, Query<any, any>>();
    streaming: StreamingContext;

    constructor({ streaming, lt }: {
        streaming: StreamingContext,
        lt: Lifetime
    }) {
        this.streaming = streaming;
        const int = setInterval(() => this.tick(), 1000);
        lt.onClosed(() => clearInterval(int));
    }

    tick() {
        const now = Date.now();

        for (const obs of this.observations) {
            if (now - obs.query.updatedAt > obs.maxAge) {
                obs.query.update();
            }
        }
    }

    createObservation<Args, Result>(
        props: {
            maxAge?: number;
            schema: QuerySchema<Args, Result>;
            args: Args;
            lt: Lifetime;
        }
    ): QueryObservation<Args, Result> {
        const key = props.schema.getKey(props.args);

        // Create query if it doesn't exist
        let query = this.queries.get(key);

        if (!query) {
            query = new Query<Args, Result>({ schema: props.schema, args: props.args, streaming: this.streaming });
            this.queries.set(key, query);
            query.update();
        }

        const observation = new QueryObservation<Args, Result>({
            query,
            maxAge: props.maxAge
        });
        this.observations.push(observation);

        props.lt.onClosed(() => {
            const index = this.observations.indexOf(observation);
            if (index !== -1) {
                this.observations.splice(index, 1);
            }
        });

        return observation;
    }
}
