import type { ImportHash, ImportNamed } from "../shared/router";
import { hash } from "@vortexjs/common";

export function getLoadKey(named: ImportNamed) {
	return `_${hash(`${named.filePath}@${named.exportId}`).toString(36)}` as ImportHash;
}
