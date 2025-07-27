const discoveryCompilerCues = ["@vortexjs/wormhole/route", "@vortexjs/common"];

export function checkForCues(contents: string): boolean {
    return discoveryCompilerCues.some((cue) => contents.includes(cue));
}
