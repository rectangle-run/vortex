const discoveryCompilerCues = ["@vortexjs/wormhole/route", "unwrap"];

export function checkForCues(contents: string): boolean {
	return discoveryCompilerCues.some((cue) => contents.includes(cue));
}
