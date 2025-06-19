import type { ImportHash, ImportNamed } from "../shared/router";

export function getLoadKey(named: ImportNamed) {
	return `_${Bun.hash(`${named.filePath}@${named.exportId}`).toString(36)}` as ImportHash;
}
