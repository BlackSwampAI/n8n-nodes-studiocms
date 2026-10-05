export function assertRegisteredCredentialsAreWired(nodes: any[], credentials: any[]): void;
export function loadRegistration(packageRoot: string, registration: string, kind: string): any;
export function assertRegistrationIcons(
	packageRoot: string,
	registration: string,
	icon: any,
	owner: string,
): void;
export function runNodeLoadSmoke(packageRoot: string): {
	nodeCount: number;
	credentialCount: number;
};
