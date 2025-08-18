import type { JSXChildren } from "@vortexjs/core";
import type { StandardSchemaV1 } from "~/shared/standard";
import type { HTTPMethod } from "~/shared/http-method";

export type RouteFunction = <Path extends string>(
    path: Path,
    params: RouteParams<Path>,
) => void;

export type RouteParams<Path extends string> = {
    page?: (props: PageProps<Path>) => void;
    layout?: (props: LayoutProps<Path>) => void;
    notFound?: (props: LayoutProps<Path>) => void;
};

export type APIFunction = <Input, Output>(
    endpoint: string,
    props: {
        schema: StandardSchemaV1<unknown, Input>;
        impl(props: Input): Promise<Output> | Output;
        method?: HTTPMethod;
    }
) => (inp: Input) => Promise<Output>;

export type BaseProps<Path extends string> = ParsePath<Path>;

type ParsePath<Path extends string> =
    Path extends `${infer Before}[...${infer Param}]${infer After}`
    ? ParsePath<Before> & ParsePath<After> & { [K in Param]: string[] }
    : Path extends `${infer Before}[${infer Param}]${infer After}`
    ? ParsePath<Before> & ParsePath<After> & { [K in Param]: string }
    : // biome-ignore lint/complexity/noBannedTypes: this is a valid use of {}
    {};

export type PageProps<Path extends string> = BaseProps<Path>;

export type LayoutProps<Path extends string> = BaseProps<Path> & {
    children: JSXChildren;
};

const routeFn = ((_path, _params) => {
    throw new Error(
        "You somehow managed to call route without it being eliminated by the compiler. I don't know how you would fix this, the compiler is deeply ingrained in wormhole.",
    );
}) as RouteFunction;

export default routeFn;
export const route = routeFn;

const apiFn = ((_props) => {
    throw new Error(
        "You somehow managed to call query/mutation without it being eliminated by the compiler. I don't know how you would fix this, the compiler is deeply ingrained in wormhole.",
    );
}) as APIFunction;

export const query = apiFn;
export const mutation = apiFn;
