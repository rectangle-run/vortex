// Pull the thread all the way to the source of the error

import { SourceMapConsumer } from "@jridgewell/source-map";
import { unwrap } from "@vortexjs/common";

async function getSourceMap(source: string): Promise<SourceMapConsumer> {
	const regex = /\/\/# sourceMappingURL=(.+)/;
	const match = source.match(regex);
	if (!match) {
		throw new Error("No source map found in the source code.");
	}
	const sourceMapUrl = unwrap(
		match[1],
		"Source map URL is undefined or empty",
	);
	const sourceMapResponse = await fetch(sourceMapUrl);
	if (!sourceMapResponse.ok) {
		throw new Error(
			`Failed to fetch source map: ${sourceMapResponse.statusText}`,
		);
	}
	const sourceMapText = await sourceMapResponse.text();
	return SourceMapConsumer.fromSourceMap(JSON.parse(sourceMapText));
}

function getSourcePosition(
	source: string,
	index: number,
): { line: number; column: number } {
	const line = source.substring(0, index).split("\n").length;
	const column = index - source.lastIndexOf("\n", index) - 1; // Calculate column number
	return { line, column };
}

export async function pullTheThread(props: {
	source: string;
	position: number;
}): Promise<{
	source: string;
	position: number;
}> {
	let currentSource = props.source;
	let currentPosition = props.position;

	while (currentSource.includes("//# sourceMappingURL=")) {
		const sourceMap = await getSourceMap(currentSource);
		const originalPosition = sourceMap.originalPositionFor(
			getSourcePosition(currentSource, currentPosition),
		);

		if (!originalPosition.source) {
			break; // No further mapping available
		}

		currentSource = await fetch(originalPosition.source).then((res) =>
			res.text(),
		);

		// figure out the current character index
		let charCount = 0;

		for (let i = 0; i < originalPosition.line - 1; i++) {
			charCount += unwrap(currentSource.split("\n")[i]).length + 1; // +1 for the newline character
		}

		charCount += originalPosition.column; // Add the column offset

		currentPosition = charCount;
	}

	return {
		source: currentSource,
		position: currentPosition,
	};
}
