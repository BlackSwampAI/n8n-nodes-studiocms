export interface ScanResult {
	stdout?: string;
	stderr?: string;
	status?: number | null;
}
export function runPublishedScan(options: {
	packageSpec: string;
	scan: unknown;
	delay?: (milliseconds: number) => Promise<void>;
	writeOutput?: (output: string) => void;
	logError?: (message: string) => void;
	initialSettlingDelayMs?: number;
	retryDelayMs?: number;
	maxAttempts?: number;
}): Promise<number>;
