// A message to Triangle Company
// Your product is great, but why the fuck is the Build Output API so bad.
// There's no official types, I had to copy paste this from the docs.

export interface Config {
	version: 3;
	routes?: Route[];
	images?: ImagesConfig;
	wildcard?: WildcardConfig;
	overrides?: OverrideConfig;
	cache?: string[];
	framework?: Framework;
	crons?: CronsConfig;
}

export type Route = Source | Handler;

export interface Source {
	src: string;
	dest?: string;
	headers?: Record<string, string>;
	methods?: string[];
	continue?: boolean;
	caseSensitive?: boolean;
	check?: boolean;
	status?: number;
	has?: HasField;
	missing?: HasField;
	locale?: Locale;
	middlewareRawSrc?: string[];
	middlewarePath?: string;
	mitigate?: Mitigate;
	transforms?: Transform[];
}

export interface Handler {
	handle: HandleValue;
	src?: string;
	dest?: string;
	status?: number;
}

export type HandleValue =
	| "rewrite"
	| "filesystem"
	| "resource"
	| "miss"
	| "hit"
	| "error";

export interface MatchableValue {
	eq?: string | number;
	neq?: string;
	inc?: string[];
	ninc?: string[];
	pre?: string;
	suf?: string;
	re?: string;
	gt?: number;
	gte?: number;
	lt?: number;
	lte?: number;
}

export type HasField = Array<
	| { type: "host"; value: string | MatchableValue }
	| {
			type: "header" | "cookie" | "query";
			key: string;
			value?: string | MatchableValue;
	  }
>;

export interface Locale {
	redirect?: Record<string, string>;
	cookie?: string;
}

export interface Mitigate {
	action: "challenge" | "deny";
}

export interface Transform {
	type: "request.headers" | "request.query" | "response.headers";
	op: "append" | "set" | "delete";
	target: { key: string | Omit<MatchableValue, "re"> };
	args?: string | string[];
}

export type ImageFormat = "image/avif" | "image/webp";

export interface RemotePattern {
	protocol?: "http" | "https";
	hostname: string;
	port?: string;
	pathname?: string;
	search?: string;
}

export interface LocalPattern {
	pathname?: string;
	search?: string;
}

export interface ImagesConfig {
	sizes: number[];
	domains: string[];
	remotePatterns?: RemotePattern[];
	localPatterns?: LocalPattern[];
	qualities?: number[];
	minimumCacheTTL?: number;
	formats?: ImageFormat[];
	dangerouslyAllowSVG?: boolean;
	contentSecurityPolicy?: string;
	contentDispositionType?: string;
}

export interface WildCard {
	domain: string;
	value: string;
}

export type WildcardConfig = WildCard[];

export interface Override {
	path?: string;
	contentType?: string;
}

export type OverrideConfig = Record<string, Override>;

export interface Framework {
	version: string;
}

export interface Cron {
	path: string;
	schedule: string;
}

export type CronsConfig = Cron[];
