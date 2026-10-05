export function verifyReleaseTag(options?: { repository?: string; env?: NodeJS.ProcessEnv }): {
	expectedRef: string;
	taggedCommit: string;
};
