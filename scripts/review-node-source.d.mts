export interface SourceFinding {
	path: string;
	reason: string;
}
export function findEmptyPropertyPlaceholders(root?: string): SourceFinding[];
export function reviewNodeSource(root?: string): { reviewedRoot: string; fileCount: number };
