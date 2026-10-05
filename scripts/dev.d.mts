export const DEV_PORT: string;
export const DEV_USER_FOLDER: string;
export function createDevProcessOptions(
	environment?: NodeJS.ProcessEnv,
	arguments_?: string[],
): { arguments: string[]; environment: NodeJS.ProcessEnv };
export function runDev(): void;
