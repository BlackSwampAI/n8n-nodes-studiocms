import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { STUDIOCMS_API_CREDENTIAL } from '../transport/constants';
import {
	normalizeSiteUrl,
	studioCmsCollectionRequest,
	studioCmsObjectRequest,
} from '../transport/request';

// StudioCMS 0.4.4 does not invalidate Tag GET caches after PATCH. Keep successful writes
// for the same five-minute window as the upstream SDK cache so later reads remain consistent.
const STUDIOCMS_TAG_CACHE_TTL_MS = 5 * 60_000;

interface CachedTagUpdate {
	expiresAt: number;
	tag: JsonObject;
}

const cachedTagUpdates = new Map<string, Map<number, CachedTagUpdate>>();

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['tag'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a tag',
				description: 'Create a tag',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a tag',
				description: 'Delete a tag',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a tag',
				description: 'Get a tag by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many tags',
				description: 'Get tags, optionally filtered by name',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a tag',
				description: 'Update a tag by ID',
			},
		],
		default: 'getMany',
	},
];

const tagIdProperty: INodeProperties = {
	displayName: 'Tag ID',
	name: 'tagId',
	type: 'number',
	typeOptions: { minValue: 1, numberPrecision: 0 },
	required: true,
	default: 1,
	description: 'Numeric ID of the tag',
	displayOptions: {
		show: { resource: ['tag'], operation: ['delete', 'get', 'update'] },
	},
};

const nameProperty: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	required: true,
	default: '',
	displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
};

const slugProperty: INodeProperties = {
	displayName: 'Slug',
	name: 'slug',
	type: 'string',
	required: true,
	default: '',
	displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
};

const descriptionProperty: INodeProperties = {
	displayName: 'Description',
	name: 'description',
	type: 'string',
	required: true,
	default: '',
	typeOptions: { rows: 3 },
	displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
};

const metaProperty: INodeProperties = {
	displayName: 'Metadata',
	name: 'meta',
	type: 'json',
	required: true,
	default: '{}',
	description: 'JSON object stored as tag metadata',
	displayOptions: { show: { resource: ['tag'], operation: ['create'] } },
};

export const tagFields: INodeProperties[] = [
	tagIdProperty,
	nameProperty,
	slugProperty,
	descriptionProperty,
	metaProperty,
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['tag'], operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1_000, numberPrecision: 0 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['tag'], operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['tag'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Return tags whose names contain this value',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['tag'], operation: ['update'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				typeOptions: { rows: 3 },
			},
			{
				displayName: 'Metadata',
				name: 'meta',
				type: 'json',
				default: '{}',
				description: 'JSON object stored as tag metadata',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
			},
		],
	},
];

function malformedResponse(
	context: IExecuteFunctions,
	itemIndex: number,
	description: string,
): never {
	throw new NodeApiError(
		context.getNode(),
		{},
		{
			itemIndex,
			message: 'StudioCMS returned a malformed response',
			description,
		},
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTag(value: JsonObject): boolean {
	return (
		typeof value.id === 'number' &&
		typeof value.description === 'string' &&
		typeof value.name === 'string' &&
		typeof value.slug === 'string' &&
		typeof value.meta === 'string'
	);
}

function validateTag(context: IExecuteFunctions, value: JsonObject, itemIndex: number): JsonObject {
	if (!isTag(value)) {
		return malformedResponse(
			context,
			itemIndex,
			'The response did not match the StudioCMS tag schema.',
		);
	}
	return value;
}

function encodedMetadata(context: IExecuteFunctions, value: unknown, itemIndex: number): string {
	try {
		const parsed = typeof value === 'string' ? JSON.parse(value) : value;
		if (!isRecord(parsed)) throw new Error('Metadata must be an object');
		return JSON.stringify(parsed);
	} catch {
		throw new NodeOperationError(context.getNode(), 'Tag Metadata must be a valid JSON object', {
			itemIndex,
		});
	}
}

function tagPath(context: IExecuteFunctions, itemIndex: number): string {
	const tagId = context.getNodeParameter('tagId', itemIndex) as number;
	return `/tags/${tagId}`;
}

function createBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	return {
		name: context.getNodeParameter('name', itemIndex) as string,
		slug: context.getNodeParameter('slug', itemIndex) as string,
		description: context.getNodeParameter('description', itemIndex) as string,
		meta: encodedMetadata(context, context.getNodeParameter('meta', itemIndex), itemIndex),
	};
}

function updateBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const fields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	const body: IDataObject = { ...fields };
	if ('meta' in body) body.meta = encodedMetadata(context, body.meta, itemIndex);
	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(context.getNode(), 'Add at least one field to update', {
			itemIndex,
		});
	}
	return body;
}

function getManyQuery(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const query: IDataObject = {};
	if (typeof filters.name === 'string' && filters.name !== '') query.name = filters.name;
	return query;
}

async function tagSite(context: IExecuteFunctions, itemIndex: number): Promise<string> {
	const credentials = await context.getCredentials(STUDIOCMS_API_CREDENTIAL, itemIndex);
	return normalizeSiteUrl(credentials.siteUrl, context.getNode(), itemIndex);
}

function currentTagUpdates(site: string): Map<number, CachedTagUpdate> {
	const updates = cachedTagUpdates.get(site) ?? new Map<number, CachedTagUpdate>();
	const now = Date.now();
	for (const [id, update] of updates) {
		if (update.expiresAt <= now) updates.delete(id);
	}
	if (updates.size === 0) cachedTagUpdates.delete(site);
	return updates;
}

function rememberTagUpdate(site: string, tag: JsonObject): void {
	const updates = currentTagUpdates(site);
	updates.set(tag.id as number, {
		expiresAt: Date.now() + STUDIOCMS_TAG_CACHE_TTL_MS,
		tag,
	});
	cachedTagUpdates.set(site, updates);
}

function forgetTagUpdate(site: string, tagId: number): void {
	const updates = currentTagUpdates(site);
	updates.delete(tagId);
	if (updates.size === 0) cachedTagUpdates.delete(site);
}

function reconcileTag(site: string, tag: JsonObject): JsonObject {
	return currentTagUpdates(site).get(tag.id as number)?.tag ?? tag;
}

function reconcileTags(site: string, tags: JsonObject[], nameFilter?: string): JsonObject[] {
	const updates = currentTagUpdates(site);
	const reconciled = tags.map((tag) => updates.get(tag.id as number)?.tag ?? tag);
	for (const { tag } of updates.values()) {
		if (!reconciled.some((candidate) => candidate.id === tag.id)) reconciled.push(tag);
	}
	if (nameFilter === undefined) return reconciled;
	return reconciled.filter((tag) => (tag.name as string).includes(nameFilter));
}

export async function executeTag(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const tag = await studioCmsObjectRequest.call(context, {
			method: 'POST',
			path: '/tags',
			itemIndex,
			body: createBody(context, itemIndex),
		});
		return [{ json: validateTag(context, tag, itemIndex) }];
	}

	if (operation === 'delete') {
		const site = await tagSite(context, itemIndex);
		const tagId = context.getNodeParameter('tagId', itemIndex) as number;
		const response = await studioCmsObjectRequest.call(context, {
			method: 'DELETE',
			path: tagPath(context, itemIndex),
			itemIndex,
		});
		if (typeof response.success !== 'boolean') {
			return malformedResponse(
				context,
				itemIndex,
				'The response did not match the StudioCMS tag deletion schema.',
			);
		}
		forgetTagUpdate(site, tagId);
		return [{ json: response }];
	}

	if (operation === 'get') {
		const site = await tagSite(context, itemIndex);
		const tag = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: tagPath(context, itemIndex),
			itemIndex,
		});
		const validated = validateTag(context, tag, itemIndex);
		return [{ json: reconcileTag(site, validated) }];
	}

	if (operation === 'getMany') {
		const site = await tagSite(context, itemIndex);
		const query = getManyQuery(context, itemIndex);
		const tags = await studioCmsCollectionRequest.call(context, {
			method: 'GET',
			path: '/tags',
			itemIndex,
			qs: query,
		});
		const validated = tags.map((tag) => validateTag(context, tag, itemIndex));
		const reconciled = reconcileTags(
			site,
			validated,
			typeof query.name === 'string' ? query.name : undefined,
		);
		const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;
		const selected = returnAll
			? reconciled
			: reconciled.slice(0, context.getNodeParameter('limit', itemIndex, 50) as number);
		return selected.map((json) => ({ json }));
	}

	if (operation === 'update') {
		const site = await tagSite(context, itemIndex);
		const tag = await studioCmsObjectRequest.call(context, {
			method: 'PATCH',
			path: tagPath(context, itemIndex),
			itemIndex,
			body: updateBody(context, itemIndex),
		});
		const validated = validateTag(context, tag, itemIndex);
		rememberTagUpdate(site, validated);
		return [{ json: validated }];
	}

	throw new NodeOperationError(context.getNode(), 'Unsupported StudioCMS tag operation', {
		itemIndex,
	});
}
