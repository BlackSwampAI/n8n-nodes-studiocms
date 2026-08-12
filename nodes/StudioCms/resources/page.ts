import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { studioCmsCollectionRequest, studioCmsObjectRequest } from '../transport/request';

export const pageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['page'] } },
		options: [
			{ name: 'Get', value: 'get', action: 'Get a page', description: 'Get a page by ID' },
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many pages',
				description: 'Get pages, optionally filtered by Page fields',
			},
		],
		default: 'getMany',
	},
];

export const pageFields: INodeProperties[] = [
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		description: 'String ID of the page',
		displayOptions: { show: { resource: ['page'], operation: ['get'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['page'], operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1_000, numberPrecision: 0 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['page'], operation: ['getMany'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['page'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Author ID',
				name: 'author',
				type: 'string',
				default: '',
				description: 'Return pages with this string author ID',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: true,
				description: 'Whether to return draft or non-draft pages',
			},
			{
				displayName: 'Parent Folder ID',
				name: 'parentFolder',
				type: 'string',
				default: '',
				description: 'Return pages with this string parent folder ID',
			},
			{
				displayName: 'Published',
				name: 'published',
				type: 'boolean',
				default: true,
				description:
					'Whether to request published pages; StudioCMS 0.4.4 excludes drafts whenever this filter is present',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Return pages whose slug exactly matches this value',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Return pages whose titles contain this value',
			},
		],
	},
];

function malformedResponse(context: IExecuteFunctions, itemIndex: number): never {
	throw new NodeApiError(context.getNode(), {}, {
		itemIndex,
		message: 'StudioCMS returned a malformed response',
		description: 'The response did not match the StudioCMS page schema.',
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
	return value === undefined || value === null || typeof value === 'string';
}

function isDateString(value: unknown): boolean {
	if (typeof value !== 'string' || value === '') return false;
	try {
		return new Date(value).toISOString() === value;
	} catch {
		return false;
	}
}

function isEncodedBoolean(value: unknown): boolean {
	return value === 0 || value === 1;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isEncodedStringArray(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	try {
		return isStringArray(JSON.parse(value));
	} catch {
		return false;
	}
}

function isTaxonomyMetadata(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	try {
		return isRecord(JSON.parse(value));
	} catch {
		return false;
	}
}

function isCategory(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'number' &&
		typeof value.name === 'string' &&
		typeof value.description === 'string' &&
		typeof value.slug === 'string' &&
		(value.parent === undefined || value.parent === null || typeof value.parent === 'number') &&
		isTaxonomyMetadata(value.meta)
	);
}

function isTag(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'number' &&
		typeof value.name === 'string' &&
		typeof value.description === 'string' &&
		typeof value.slug === 'string' &&
		isTaxonomyMetadata(value.meta)
	);
}

function isPageContent(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.contentId === 'string' &&
		typeof value.contentLang === 'string' &&
		typeof value.content === 'string'
	);
}

function isSafeUser(value: unknown): boolean {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		isOptionalString(value.url) &&
		typeof value.name === 'string' &&
		isOptionalString(value.avatar) &&
		typeof value.username === 'string' &&
		isDateString(value.updatedAt) &&
		isDateString(value.createdAt) &&
		isEncodedBoolean(value.emailVerified) &&
		isOptionalString(value.notifications) &&
		value.email === undefined &&
		value.password === undefined
	);
}

function isPage(value: JsonObject): boolean {
	return (
		typeof value.id === 'string' &&
		typeof value.package === 'string' &&
		typeof value.title === 'string' &&
		typeof value.description === 'string' &&
		isEncodedBoolean(value.showOnNav) &&
		isDateString(value.publishedAt) &&
		isDateString(value.updatedAt) &&
		typeof value.slug === 'string' &&
		typeof value.contentLang === 'string' &&
		isOptionalString(value.heroImage) &&
		typeof value.authorId === 'string' &&
		isStringArray(value.contributorIds) &&
		isEncodedBoolean(value.showAuthor) &&
		isEncodedBoolean(value.showContributors) &&
		isOptionalString(value.parentFolder) &&
		isEncodedBoolean(value.draft) &&
		isEncodedStringArray(value.augments) &&
		Array.isArray(value.categories) &&
		value.categories.every(isCategory) &&
		Array.isArray(value.tags) &&
		value.tags.every(isTag) &&
		Array.isArray(value.multiLangContent) &&
		value.multiLangContent.every(isPageContent) &&
		(value.defaultContent === undefined || isPageContent(value.defaultContent)) &&
		typeof value.urlRoute === 'string' &&
		(value.authorData === undefined || isSafeUser(value.authorData)) &&
		Array.isArray(value.contributorsData) &&
		value.contributorsData.every(isSafeUser)
	);
}

function validatePage(
	context: IExecuteFunctions,
	value: JsonObject,
	itemIndex: number,
): JsonObject {
	if (!isPage(value)) return malformedResponse(context, itemIndex);
	return value;
}

function pagePath(context: IExecuteFunctions, itemIndex: number): string {
	const pageId = context.getNodeParameter('pageId', itemIndex) as string;
	return `/pages/${encodeURIComponent(pageId)}`;
}

function getManyQuery(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const query: IDataObject = {};
	if (typeof filters.title === 'string' && filters.title !== '') query.title = filters.title;
	if (typeof filters.slug === 'string' && filters.slug !== '') query.slug = filters.slug;
	if (typeof filters.author === 'string' && filters.author !== '') query.author = filters.author;
	if (typeof filters.parentFolder === 'string' && filters.parentFolder !== '') {
		query.parentFolder = filters.parentFolder;
	}
	if (Object.prototype.hasOwnProperty.call(filters, 'draft') && typeof filters.draft === 'boolean') {
		query.draft = filters.draft.toString();
	}
	if (
		Object.prototype.hasOwnProperty.call(filters, 'published') &&
		typeof filters.published === 'boolean'
	) {
		query.published = filters.published.toString();
	}
	return query;
}

export async function executePage(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'get') {
		const page = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: pagePath(context, itemIndex),
			itemIndex,
		});
		return [{ json: validatePage(context, page, itemIndex) }];
	}

	if (operation === 'getMany') {
		const pages = await studioCmsCollectionRequest.call(context, {
			method: 'GET',
			path: '/pages',
			itemIndex,
			qs: getManyQuery(context, itemIndex),
		});
		const validated = pages.map((page) => validatePage(context, page, itemIndex));
		const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;
		const selected = returnAll
			? validated
			: validated.slice(0, context.getNodeParameter('limit', itemIndex, 50) as number);
		return selected.map((json) => ({ json }));
	}

	throw new NodeOperationError(context.getNode(), 'Unsupported StudioCMS page operation', {
		itemIndex,
	});
}
