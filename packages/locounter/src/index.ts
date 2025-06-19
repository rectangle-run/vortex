#!/usr/bin/env bun

import { readdir } from "node:fs/promises";
import { join, parse, sep } from "node:path";
import { cwd } from "node:process";
import { unwrap } from "@vortexjs/common";

interface LinesOfCode {
	total: number;
	perFile?: Record<string, LinesOfCode>;
}

async function countLinesOfCode(directory: string): Promise<LinesOfCode> {
	const children = await readdir(directory, { withFileTypes: true });
	const childLocs: { name: string; count: Promise<LinesOfCode> }[] = [];

	for (const child of children) {
		const path = join(directory, child.name);

		if (
			child.name.startsWith(".") ||
			child.name === "node_modules" ||
			child.name === "dist" ||
			child.name === "target"
		)
			continue;

		if (child.isDirectory()) {
			childLocs.push({
				name: child.name,
				count: countLinesOfCode(path),
			});
		} else if (child.isFile() && child.name.endsWith(".ts")) {
			childLocs.push({
				name: child.name,
				count: Bun.file(path)
					.text()
					.then((contents) => ({
						total: contents.split("\n").length,
					})),
			});
		}
	}

	const resolvedChildLocs = await Promise.all(childLocs.map((x) => x.count));

	const zippedChildLocs = childLocs.map((x, idx) => ({
		...x,
		count: unwrap(resolvedChildLocs[idx]),
	}));

	const totalLines = zippedChildLocs.reduce(
		(sum, loc) => sum + loc.count.total,
		0,
	);

	return {
		total: totalLines,
		perFile: zippedChildLocs.reduce(
			(acc, loc) => {
				acc[loc.name] = loc.count;
				return acc;
			},
			{} as Record<string, LinesOfCode>,
		),
	};
}

async function findTopLevelProject(cwd: string): Promise<string> {
	// Find the first parent directory that contains a package.json file, preferring files closer to root, example: /home/user/project/package.json over /home/user/project/packages/abc/package.json
	const parts = cwd.split(sep);
	let currentPath = parse(cwd).root;

	for (const part of parts.slice(1)) {
		currentPath = join(currentPath, part);
		const packageJsonPath = join(currentPath, "package.json");

		console.log(packageJsonPath);

		if (await Bun.file(packageJsonPath).exists()) {
			return currentPath;
		}
	}

	throw new Error("No package.json found in any parent directory.");
}

const linesOfCode = await countLinesOfCode(await findTopLevelProject(cwd()));

function printLinesOfCode(loc: LinesOfCode) {
	console.log(`Total lines of code: ${loc.total}`);

	if (loc.perFile) {
		for (const file in loc.perFile) {
			console.group(file);

			printLinesOfCode(unwrap(loc.perFile[file]));

			console.groupEnd();
		}
	}
}

printLinesOfCode(linesOfCode);
