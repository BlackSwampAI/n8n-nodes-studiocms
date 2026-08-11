import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INode,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	STUDIOCMS_API_CREDENTIAL,
	STUDIOCMS_REQUEST_TIMEOUT_MS,
	STUDIOCMS_REST_V1_PATH,
} from './constants';

const MAX_ERROR_TEXT_LENGTH = 1_000;

export interface StudioCmsRequestOptions {
	method: IHttpRequestMethods;
	path: string;
	itemIndex: number;
	body?: IDataObject;
	qs?: IDataObject;
}

interface ErrorDetails {
	statusCode?: number;
	apiMessage?: string;
	originalMessage: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
	return isRecord(value);
}

function statusCode(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599) {
		return value;
	}
	if (typeof value === 'string' && /^\d{3}$/.test(value.trim())) {
		return Number(value);
	}
	return undefined;
}

function safeMessage(value: unknown): string | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	return value
		.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
		.replace(/(authorization|cookie)\s*[:=]\s*[^,;\s]+/gi, '$1=[REDACTED]')
		.slice(0, MAX_ERROR_TEXT_LENGTH);
}

function apiErrorMessage(value: unknown): string | undefined {
	if (!isRecord(value)) return undefined;
	return safeMessage(value.error);
}

function extractErrorDetails(error: unknown): ErrorDetails {
	const record = isRecord(error) ? error : {};
	const response = isRecord(record.response) ? record.response : undefined;
	const responseBody = response?.data ?? response?.body;
	const directBody = record.error ?? record.body;
	const originalMessage =
		safeMessage(error instanceof Error ? error.message : record.message) ??
		'Unknown StudioCMS request error';

	return {
		statusCode:
			statusCode(record.statusCode) ??
			statusCode(record.httpCode) ??
			statusCode(response?.statusCode) ??
			statusCode(response?.status),
		apiMessage: apiErrorMessage(responseBody) ?? apiErrorMessage(directBody),
		originalMessage,
	};
}

function apiErrorResponse(details: ErrorDetails): JsonObject {
	return details.apiMessage === undefined ? {} : { error: details.apiMessage };
}

export function normalizeSiteUrl(value: unknown, node: INode, itemIndex = 0): string {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new NodeOperationError(node, 'StudioCMS Site URL is required', { itemIndex });
	}

	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new NodeOperationError(
			node,
			'StudioCMS Site URL must be a valid HTTP or HTTPS URL',
			{ itemIndex },
		);
	}

	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new NodeOperationError(node, 'StudioCMS Site URL must use HTTP or HTTPS', { itemIndex });
	}
	if (url.username !== '' || url.password !== '') {
		throw new NodeOperationError(
			node,
			'StudioCMS Site URL must not contain a username or password',
			{ itemIndex },
		);
	}
	if (url.search !== '' || url.hash !== '') {
		throw new NodeOperationError(
			node,
			'StudioCMS Site URL must not contain a query string or fragment',
			{ itemIndex },
		);
	}

	return url.href.replace(/\/+$/, '');
}

export function toStudioCmsApiError(
	context: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;

	const details = extractErrorDetails(error);
	const options = { itemIndex, httpCode: details.statusCode?.toString() };
	const malformedJson = /unexpected token|invalid json|json parse|malformed/i.test(
		details.originalMessage,
	);

	if (
		malformedJson &&
		(details.statusCode === undefined || (details.statusCode >= 200 && details.statusCode < 300))
	) {
		return new NodeApiError(context.getNode(), {}, {
			itemIndex,
			message: 'StudioCMS returned a malformed response',
			description: 'The response could not be parsed as JSON.',
		});
	}

	if (details.statusCode === 401) {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS authentication failed',
			description: 'Check the API token and try again.',
		});
	}
	if (details.statusCode === 500 && details.apiMessage === undefined) {
		return new NodeApiError(context.getNode(), {}, {
			...options,
			message: 'StudioCMS authentication failed',
			description: 'Check the API token and try again.',
		});
	}
	if (details.statusCode === 403 || details.apiMessage?.toLowerCase() === 'unauthorized') {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS request forbidden',
			description: 'The authenticated user does not have permission for this request.',
		});
	}
	if (details.statusCode === 404) {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS API endpoint not found',
			description: 'Check the Site URL and confirm StudioCMS REST API v1 is enabled.',
		});
	}
	if (details.statusCode === 429) {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS rate limit exceeded',
			description: 'Wait before retrying the request.',
		});
	}
	if (details.statusCode !== undefined && details.statusCode >= 500) {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS service failure',
			description: details.apiMessage ?? 'StudioCMS could not process the request. Try again later.',
		});
	}
	if (details.statusCode !== undefined) {
		return new NodeApiError(context.getNode(), apiErrorResponse(details), {
			...options,
			message: 'StudioCMS rejected the request',
			description: details.apiMessage ?? `StudioCMS returned HTTP ${details.statusCode}.`,
		});
	}
	return new NodeApiError(context.getNode(), {}, {
		itemIndex,
		message: 'Unable to reach StudioCMS',
		description: 'Check the Site URL and network connection, then try again.',
	});
}

export async function studioCmsApiRequest(
	this: IExecuteFunctions,
	options: StudioCmsRequestOptions,
): Promise<unknown> {
	try {
		const credentials = await this.getCredentials(STUDIOCMS_API_CREDENTIAL, options.itemIndex);
		const siteUrl = normalizeSiteUrl(credentials.siteUrl, this.getNode(), options.itemIndex);

		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			STUDIOCMS_API_CREDENTIAL,
			{
				method: options.method,
				url: `${siteUrl}${STUDIOCMS_REST_V1_PATH}${options.path}`,
				headers: { Accept: 'application/json' },
				...(options.body === undefined ? {} : { body: options.body }),
				...(options.qs === undefined ? {} : { qs: options.qs }),
				timeout: STUDIOCMS_REQUEST_TIMEOUT_MS,
				json: true,
			},
			);
	} catch (error) {
		throw toStudioCmsApiError(this, error, options.itemIndex);
	}
}

export async function studioCmsObjectRequest(
	this: IExecuteFunctions,
	options: StudioCmsRequestOptions,
): Promise<JsonObject> {
	const response = await studioCmsApiRequest.call(this, options);
	if (!isJsonObject(response)) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				itemIndex: options.itemIndex,
				message: 'StudioCMS returned a malformed response',
				description: 'The response was expected to be a JSON object.',
			},
		);
	}
	return response;
}

export async function studioCmsCollectionRequest(
	this: IExecuteFunctions,
	options: StudioCmsRequestOptions,
): Promise<JsonObject[]> {
	const response = await studioCmsApiRequest.call(this, options);
	if (!Array.isArray(response) || !response.every(isJsonObject)) {
		throw new NodeApiError(this.getNode(), {}, {
			itemIndex: options.itemIndex,
			message: 'StudioCMS returned a malformed response',
			description: 'The response was expected to be a JSON array of objects.',
		});
	}
	return response;
}
