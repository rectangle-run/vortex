export type MatchStep = FilesystemMatchStep | RewriteMatchStep;
export interface FilesystemMatchStep {
	type: "all-filesystem";
}
export interface RewriteMatchStep {
	type: "route";
	path: string;
	func: string;
	/**
	 * @default false
	 */
	runNext?: boolean;
}
