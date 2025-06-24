#!/usr/bin/env bun

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { findTopLevelProject, unwrap } from "@vortexjs/common";

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
