export function buildDiscordPayload(input: {
	packageName: string;
	version: string;
	repository: string;
	tag: string;
}): { content: string; allowed_mentions: { parse: string[] } };
export function webhookUrlWithWait(webhook: string): URL;
export function notifyDiscord(input: {
	webhook?: string;
	packageName: string;
	version: string;
	repository: string;
	tag: string;
	fetchImpl?: typeof fetch;
}): Promise<{ skipped: boolean }>;
