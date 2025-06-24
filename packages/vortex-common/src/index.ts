import { join, parse, sep } from "node:path";

export type EvaluateType<T> = T extends object
	? {
			[key in keyof T]: EvaluateType<T[key]>;
		}
	: T;

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? DeepPartial<U>[]
		: T[P] extends object
			? DeepPartial<T[P]>
			: T[P];
};

export function TODO(whatToDo: string): never {
	throw new Error(`TODO: Support for ${whatToDo} is not implemented`);
}

export function trace(message: string) {
	console.time(message);

	return {
		[Symbol.dispose]() {
			console.timeEnd(message);
		},
	};
}

export * from "./ultraglobal";
export * from "./type-hints";

export async function findTopLevelProject(cwd: string): Promise<string> {
	// Find the first parent directory that contains a package.json file, preferring files closer to root, example: /home/user/project/package.json over /home/user/project/packages/abc/package.json
	const parts = cwd.split(sep);
	let currentPath = parse(cwd).root;

	for (const part of parts.slice(1)) {
		currentPath = join(currentPath, part);
		const packageJsonPath = join(currentPath, "package.json");

		if (await Bun.file(packageJsonPath).exists()) {
			return currentPath;
		}
	}

	throw new Error("No package.json found in any parent directory.");
}
