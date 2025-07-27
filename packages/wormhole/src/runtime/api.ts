import { SKL } from "@vortexjs/common";
import type { HTTPMethod } from "../shared/http-method";
import type { StandardSchemaV1 } from "../shared/standard";

interface BaseAPIProps<Input, Output> {
    schema: StandardSchemaV1<unknown, Input>;
    endpoint: string;
    isQuery: boolean;
    method: HTTPMethod;
}

interface ClientAPIProps<Input, Output> extends BaseAPIProps<Input, Output> {
}

interface ServerAPIProps<Input, Output> extends BaseAPIProps<Input, Output> {
    impl: () => ((inp: Input) => Promise<Output> | Output);
}

export function INTERNAL_client_api<Input, Output>(props: ClientAPIProps<Input, Output>): (inp: Input) => Promise<Output> {
    // TODO: Add proper query support once Core Query drops
    return async (inp) => {
        // Let's sanity check what we're giving the server for more rapid errors
        const schema = props.schema["~standard"];
        const result = await schema.validate(inp);

        if (!("value" in result)) {
            throw new Error([
                `API Function call failed on client.`,
                "",
                "Why: The data provided didn't match the schema, and we know the server won't allow this anyways",
                `When: When calling ${props.endpoint}`
            ].join("\n"))
        }

        const cleanInput = result.value;

        const isGet = props.method === "GET";

        const url = new URL(props.endpoint);

        if (isGet) {
            url.searchParams.set(
                "props",
                SKL.stringify(cleanInput, { minified: true })
            );
        }

        const response = await fetch(url.toString(), {
            method: props.method,
            body: isGet ? null : SKL.stringify(cleanInput, { minified: true })
        })

        return response as Output;
    }
}

export function INTERNAL_server_api<Input, Output>(props: ServerAPIProps<Input, Output>): (inp: Input) => Promise<Output> {
    return async function (inp) {
        const impl = props.impl();

        return await impl(inp);
    }
}
