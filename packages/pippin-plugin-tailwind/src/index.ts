// Closely based upon https://github.com/tailwindlabs/tailwindcss/blob/main/packages/%40tailwindcss-vite/src/index.ts

import fs from "node:fs/promises";
import path from "node:path";
import {
	compile,
	Instrumentation,
	optimize,
	toSourceMap,
} from "@tailwindcss/node";
import { clearRequireCache } from "@tailwindcss/node/require-cache";
import { Scanner } from "@tailwindcss/oxide";
import { unwrap } from "@vortexjs/common";
import type {
	PippinFileFormat,
	PippinPlugin,
	PippinTransformer,
} from "@vortexjs/pippin";

// Inlined to make the bundler happy
enum Features {
	None = 0,
	AtApply = 1,
	AtImport = 2,
	JsPluginCompat = 4,
	ThemeFunction = 8,
	Utilities = 16,
	Variants = 32,
}

const DEBUG = process.env.DEBUG === "true";

function getExtension(id: string) {
	const [filename] = id.split("?", 2);
	return path.extname(unwrap(filename, "Could not find filename")).slice(1);
}

function isPotentialCssRootFile(id: string) {
	// Only handle .css files for now
	const extension = getExtension(id);
	return extension === "css";
}

function idToPath(id: string) {
	return path.resolve(id.replace(/\?.*$/, ""));
}

/**
 * A Map that can generate default values for keys that don't exist.
 * Generated default values are added to the map to avoid recomputation.
 */
class DefaultMap<K, V> extends Map<K, V> {
	constructor(private factory: (key: K, self: DefaultMap<K, V>) => V) {
		super();
	}

	override get(key: K): V {
		let value = super.get(key);

		if (value === undefined) {
			value = this.factory(key, this);
			this.set(key, value);
		}

		return value;
	}
}

class Root {
	private compiler?: Awaited<ReturnType<typeof compile>>;
	private scanner?: Scanner;
	private candidates: Set<string> = new Set();
	private buildDependencies = new Map<string, number | null>();

	constructor(
		private id: string,
		private base: string,
		private enableSourceMaps: boolean,
	) {}

	public async generate(
		content: string,
		I: Instrumentation,
	): Promise<
		| {
				code: string;
				map: string | undefined;
		  }
		| false
	> {
		const inputPath = idToPath(this.id);

		const requiresBuildPromise = this.requiresBuild();
		const inputBase = path.dirname(path.resolve(inputPath));

		if (!this.compiler || !this.scanner || (await requiresBuildPromise)) {
			clearRequireCache(Array.from(this.buildDependencies.keys()));
			this.buildDependencies.clear();

			await this.addBuildDependency(idToPath(inputPath));

			DEBUG && I.start("[pippin-plugin-tailwind] Setup compiler");
			const addBuildDependenciesPromises: Promise<any>[] = [];
			this.compiler = await compile(content, {
				from: this.enableSourceMaps ? this.id : undefined,
				base: inputBase,
				shouldRewriteUrls: true,
				onDependency: (depPath: string) => {
					addBuildDependenciesPromises.push(
						this.addBuildDependency(depPath),
					);
				},
			});
			await Promise.all(addBuildDependenciesPromises);
			DEBUG && I.end("[pippin-plugin-tailwind] Setup compiler");

			const compiler = unwrap(this.compiler);

			DEBUG && I.start("[pippin-plugin-tailwind] Setup scanner");
			const sources = (() => {
				// Disable auto source detection
				if (compiler.root === "none") {
					return [];
				}
				// No root specified, auto-detect based on the `**/*` pattern
				if (compiler.root === null) {
					return [
						{ base: this.base, pattern: "**/*", negated: false },
					];
				}
				// Use the specified root
				return [{ ...compiler.root, negated: false }];
			})().concat(compiler.sources);

			this.scanner = new Scanner({ sources });
			DEBUG && I.end("[pippin-plugin-tailwind] Setup scanner");
		}

		if (
			!(
				unwrap(this.compiler).features &
				(Features.AtApply |
					Features.JsPluginCompat |
					Features.ThemeFunction |
					Features.Utilities)
			)
		) {
			return false;
		}

		if (unwrap(this.compiler).features & Features.Utilities) {
			DEBUG && I.start("[pippin-plugin-tailwind] Scan for candidates");
			for (const candidate of unwrap(this.scanner).scan()) {
				this.candidates.add(candidate);
			}
			DEBUG && I.end("[pippin-plugin-tailwind] Scan for candidates");
		}

		DEBUG && I.start("[pippin-plugin-tailwind] Build CSS");
		const code = unwrap(this.compiler).build([...this.candidates]);
		DEBUG && I.end("[pippin-plugin-tailwind] Build CSS");

		DEBUG && I.start("[pippin-plugin-tailwind] Build Source Map");
		const map = this.enableSourceMaps
			? toSourceMap(unwrap(this.compiler).buildSourceMap()).raw
			: undefined;
		DEBUG && I.end("[pippin-plugin-tailwind] Build Source Map");

		return {
			code,
			map,
		};
	}

	private async addBuildDependency(depPath: string) {
		let mtime: number | null = null;
		try {
			mtime = (await fs.stat(depPath)).mtimeMs;
		} catch {}
		this.buildDependencies.set(depPath, mtime);
	}

	private async requiresBuild(): Promise<boolean> {
		for (const [depPath, mtime] of this.buildDependencies) {
			if (mtime === null) return true;
			try {
				const stat = await fs.stat(depPath);
				if (stat.mtimeMs > mtime) {
					return true;
				}
			} catch {
				return true;
			}
		}
		return false;
	}
}

export interface TailwindPluginOptions {
	/**
	 * Enable CSS source maps.
	 * Defaults to false.
	 */
	sourceMap?: boolean;
	/**
	 * Minify output CSS.
	 * Defaults to true in production.
	 */
	minify?: boolean;
}

export function pippinPluginTailwind(
	options: TailwindPluginOptions = {},
): PippinPlugin {
	const roots = new DefaultMap<string, Root>(
		(id) => new Root(id, process.cwd(), options.sourceMap ?? false),
	);

	const transformer: PippinTransformer = {
		async transform({ source, format, path: filePath }) {
			// Only process CSS files
			if (format.type !== "css" || !isPotentialCssRootFile(filePath)) {
				return;
			}

			const I = new Instrumentation();
			DEBUG && I.start("[pippin-plugin-tailwind] Generate CSS");

			const root = roots.get(filePath);
			const result = await root.generate(source, I);

			if (!result) {
				return;
			}

			let code = result.code;
			const map = result.map;

			if (options.minify ?? process.env.NODE_ENV === "production") {
				DEBUG && I.start("[pippin-plugin-tailwind] Optimize CSS");
				code = optimize(code, {
					minify: true,
					map,
				}).code;
				DEBUG && I.end("[pippin-plugin-tailwind] Optimize CSS");
			}

			DEBUG && I.end("[pippin-plugin-tailwind] Generate CSS");

			return {
				source: code,
				format: { type: "css" } as PippinFileFormat,
			};
		},
	};

	return {
		name: "@vortexjs/pippin-plugin-tailwind",
		description: "Tailwind CSS plugin for Pippin build system",
		transformers: [transformer],
	};
}

export default pippinPluginTailwind;
