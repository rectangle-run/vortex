import { SKL, unwrap } from "@vortexjs/common";
import { matchPath, type InputRoute, type RoutePath } from "~/build/router";
import type { HTTPMethod } from "~/shared/http-method";
import type { StandardSchemaV1 } from "~/shared/standard";

interface BaseAPIProps<Input, Output> {
	schema: StandardSchemaV1<unknown, Input>;
	endpoint: string;
	isQuery: boolean;
	method: HTTPMethod;
}

interface ClientAPIProps<Input, Output> extends BaseAPIProps<Input, Output> {
}

interface ServerAPIProps<Input, Output> extends BaseAPIProps<Input, Output> {
	impl(inp: Input): Promise<Output> | Output;
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

		const url = new URL(props.endpoint, window.location.href);

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

		return SKL.parse(await response.text()) as Output;
	}
}

export function INTERNAL_server_api<Input, Output>(props: ServerAPIProps<Input, Output>): (inp: Input) => Promise<Output> {
	return async function (inp) {
		return await props.impl(inp);
	}
}

export async function INTERNAL_tryHandleAPI(
	request: Request,
	apis: {
		matcher: RoutePath;
		impl: number;
		schema: number;
		method: HTTPMethod;
	}[],
	reexporters: (() => Promise<any>)[]
): Promise<Response | undefined> {
	const pathname = new URL(request.url).pathname;
	for (const api of apis) {
		if (!matchPath(api.matcher, pathname).matched) continue;
		if (api.method !== request.method) continue;

		const schemaPromise = unwrap(reexporters[api.schema])();
		const implPromise = unwrap(reexporters[api.impl])();

		const input = request.method === "GET"
			? new URL(request.url).searchParams.get("props") ?? ""
			: await request.text();

		let skl: unknown;

		try {
			skl = SKL.parse(input);
		} catch {
			return new Response([
				"Your API request failed.",
				"Why: The request body is not valid SKL"
			].join("\n"), {
				status: 400,
				statusText: "Invalid SKL"
			});
		}

		const schema = (await schemaPromise) as StandardSchemaV1<any, any>;

		const validation = await schema["~standard"].validate(skl);

		if ("issues" in validation) {
			return new Response([
				"Your API request failed.",
				"Why: The request body did not match the expected schema"
			].join("\n"), {
				status: 400,
				statusText: "Failed to match against schema"
			})
		}

		const value = validation.value;

		const impl = await implPromise;

		const result = await impl(value);

		return new Response(SKL.stringify(result));
	}
}
