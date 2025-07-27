import type { Cache } from "@vortexjs/cache";
import type { BunPlugin } from "bun";
import { pullTheThread } from "./threadpull";

export type PippinFileFormat =
	| {
			type: "ecma";
			typescript: boolean;
			jsx: boolean;
	  }
	| {
			type: "html";
	  }
	| {
			type: "css";
	  };

export function getExtension(format: PippinFileFormat): string {
	switch (format.type) {
		case "ecma": {
			let ext = "js";

			if (format.typescript) {
				ext = "ts";
			}

			if (format.jsx) {
				ext += "x"; // .jsx or .tsx
			}

			return ext;
		}
		case "html":
			return "html";
		case "css":
			return "css";
		default:
			throw new Error("Unknown file format");
	}
}

export function pippinToBunLoader(format: PippinFileFormat): Bun.Loader {
	switch (format.type) {
		case "ecma": {
			if (format.typescript) {
				return format.jsx ? "tsx" : "ts";
			}
			return format.jsx ? "jsx" : "js";
		}
		case "html":
			return "html";
		case "css":
			return "css";
		default:
			throw new Error("Unknown file format");
	}
}

export function bunFormatToPippinFormat(format: Bun.Loader): PippinFileFormat {
	switch (format) {
		case "html":
			return { type: "html" };
		case "css":
			return { type: "css" };
		case "js":
		case "jsx":
		case "ts":
		case "tsx":
			return {
				type: "ecma",
				typescript: format === "ts" || format === "tsx",
				jsx: format === "jsx" || format === "tsx",
			};
		default:
			bunCompatibilityWarning(
				`Bun format ${format} has no equivalent in Pippin`,
			);
	}
}

export interface PippinError {
	from: number;
	to: number;
	message: string;
	hints: {
		from: number;
		to: number;
		message: string;
	}[];
	path: string;
}

export interface PippinTransformer {
	transform(props: {
		source: string;
		format: PippinFileFormat;
		path: string;
		namespace: string;
		logError(props: Omit<PippinError, "path">): Promise<void>;
		cache?: Cache;
	}): Promise<
		| {
				source: string;
				format: PippinFileFormat;
		  }
		| undefined
	>;
	cache?: boolean;
}

export interface PippinPlugin {
	name: string;
	description: string;

	transformers: PippinTransformer[];
}

export interface Pippin extends BunPlugin {
	transform(props: {
		source: string;
		format: PippinFileFormat;
		path: string;
		namespace: string;
	}): Promise<{
		source: string;
		format: PippinFileFormat;
		errors: PippinError[];
	}>;
	errors: PippinError[];

	add(...plugin: PippinPlugin[]): Pippin;
}

class UnsupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnsupportedError";
	}
}

function bunCompatibilityWarning(message: string): never {
	throw new UnsupportedError(message);
}

export function fromBun(plugin: BunPlugin): PippinPlugin {
	const loaders: {
		constraints: Bun.PluginConstraints;
		callback: Bun.OnLoadCallback;
	}[] = [];

	plugin.setup({
		onStart: (_callback): Bun.PluginBuilder => {
			bunCompatibilityWarning(
				"BunPlugin.onStart is not supported in Pippin plugins",
			);
		},
		onBeforeParse: (_constraints, _callback): Bun.PluginBuilder => {
			bunCompatibilityWarning(
				"Native plugin support is current unavailable in Pippin.",
			);
		},
		onLoad: function (constraints, callback): Bun.PluginBuilder {
			loaders.push({ constraints, callback });
			return this;
		},
		onResolve: (_constraints, _callback): Bun.PluginBuilder => {
			bunCompatibilityWarning(
				"BunPlugin.onResolve is not supported in Pippin plugins",
			);
		},
		config: {
			plugins: [],
			get entrypoints() {
				bunCompatibilityWarning(
					"BunPlugin.config.entrypoints is not supported in Pippin plugins. Use Pippin's own configuration system instead.",
				);
				return [];
			},
		},
		module: (
			_specifier: string,
			_callback: () => Bun.OnLoadResult | Promise<Bun.OnLoadResult>,
		): Bun.PluginBuilder => {
			bunCompatibilityWarning(
				"BunPlugin.module is unsupported in Pippin plugins.",
			);
		},
	});

	return {
		name: plugin.name,
		description:
			"Due to Bun's lax restrictions on plugins, this Bun plugin casted to support Pippin has no description",
		transformers: loaders.map((loader) => ({
			async transform(opts) {
				const result = await loader.callback({
					defer() {
						bunCompatibilityWarning(
							"OnLoadArgs.defer is not supported in Pippin plugins",
						);
					},
					loader: pippinToBunLoader(opts.format),
					path: opts.path,
					namespace: opts.namespace,
				});

				if (result?.loader) {
					if (result.loader === "object") {
						bunCompatibilityWarning(
							"BunPlugin.onLoad does not support object loaders in Pippin plugins.",
						);
					}
					const format = bunFormatToPippinFormat(result.loader);

					return {
						source: result.contents.toString() ?? "",
						format,
					};
				}
			},
		})),
	};
}

/**
 * Creates a new Pippin instance, which is a Bun plugin for transforming files.
 *
 * @warning Using this plugin will break compatibility with standard Bun plugins. If this deeply worries you, use the `fromBun` function to map Bun plugins to Pippin plugins.
 * @returns A Pippin instance that can be used to transform files.
 */
export function pippin(opts: { cache?: Cache } = {}): Pippin {
	const plugins: PippinPlugin[] = [];
	const cache = opts.cache;

	const self: Pippin = {
		name: "pippin",
		errors: [],
		transform: async (props) => {
			const state = {
				...props,
				errors: [] as PippinError[],
			};

			for (const plugin of plugins) {
				for (const transformer of plugin.transformers) {
					const result = await transformer.transform({
						...state,
						path: props.path,
						cache,
						async logError(err) {
							const resolve = async (pos: number) => {
								return (
									await pullTheThread({
										position: pos,
										source: state.source,
									})
								).position;
							};

							const error: PippinError = {
								...err,
								path: state.path,
								from: await resolve(err.from),
								to: await resolve(err.to),
								hints: await Promise.all(
									err.hints.map(async (hint) => ({
										...hint,
										from: await resolve(hint.from),
										to: await resolve(hint.to),
									})),
								),
							};

							state.errors.push(error);
						},
					});

					if (result) {
						state.source = result.source;
						state.format = result.format;
					}
				}
			}

			return state;
		},
		setup({ onLoad }) {
			onLoad({ filter: /.*/ }, async (props) => {
				const result = await self.transform({
					source: await Bun.file(props.path).text(),
					path: props.path,
					namespace: props.namespace,
					format: bunFormatToPippinFormat(props.loader),
				});

				self.errors.push(...result.errors);

				return {
					loader: pippinToBunLoader(result.format),
					contents: result.source,
				};
			});
		},
		add(...next) {
			plugins.push(...next);
			return this;
		},
	};

	return self;
}
