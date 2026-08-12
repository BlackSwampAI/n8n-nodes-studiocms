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
			{
				name: 'Create',
				value: 'create',
				action: 'Create a page',
				description: 'Create a page and its default content entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a page',
				description: 'Delete a page by ID',
			},
			{ name: 'Get', value: 'get', action: 'Get a page', description: 'Get a page by ID' },
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many pages',
				description: 'Get pages, optionally filtered by Page fields',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a page',
				description: 'Update selected Page fields and optional content',
			},
		],
		default: 'getMany',
	},
];

export const pageFields: INodeProperties[] = [
	{
		displayName:
			'StudioCMS requires a complete Page update. This operation gets the existing Page and preserves fields you do not add below.',
		name: 'updateNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['page'], operation: ['update'] } },
	},
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		required: true,
		default: '',
		description: 'String ID of the page',
		displayOptions: { show: { resource: ['page'], operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['page'], operation: ['update'] } },
		options: [
			{
				displayName: 'Augments',
				name: 'augments',
				type: 'json',
				default: '[]',
				description: 'JSON array of string StudioCMS augment identifiers',
			},
			{
				displayName: 'Category IDs',
				name: 'categories',
				type: 'json',
				default: '[]',
				description: 'JSON array of string Category IDs, for example ["17"]',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				description: 'Replacement content for the selected content entry',
			},
			{
				displayName: 'Content Entry ID',
				name: 'contentEntryId',
				type: 'string',
				default: '',
				description:
					'Existing content entry ID to preserve or update; defaults to the Page default content entry',
			},
			{
				displayName: 'Content Entry Language',
				name: 'contentEntryLang',
				type: 'string',
				default: 'default',
				description: 'Replacement language for the selected content entry',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Hero Image',
				name: 'heroImage',
				type: 'string',
				default: '',
				description: 'Storage identifier or URL, or empty for null',
			},
			{
				displayName: 'Page Content Language',
				name: 'contentLang',
				type: 'string',
				default: 'default',
				description: 'Language used to select the Page default content entry',
			},
			{
				displayName: 'Parent Folder ID',
				name: 'parentFolder',
				type: 'string',
				default: '',
				description: 'String Folder ID, or empty for null',
			},
			{
				displayName: 'Renderer Package',
				name: 'package',
				type: 'string',
				default: 'studiocms/markdown',
				description: 'StudioCMS Page renderer package identifier',
			},
			{
				displayName: 'Show Author',
				name: 'showAuthor',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Show Contributors',
				name: 'showContributors',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Show on Navigation',
				name: 'showOnNav',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Replacement slug; the REST API accepts this value verbatim',
			},
			{
				displayName: 'Tag IDs',
				name: 'tags',
				type: 'json',
				default: '[]',
				description: 'JSON array of string Tag IDs, for example ["23"]',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Renderer Package',
		name: 'package',
		type: 'string',
		required: true,
		default: 'studiocms/markdown',
		description: 'StudioCMS Page renderer package identifier',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		default: '',
		description: 'Leave empty to let StudioCMS derive the slug from the title',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		typeOptions: { rows: 3 },
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Page Content Language',
		name: 'contentLang',
		type: 'string',
		required: true,
		default: 'default',
		description: 'Language used to select the Page default content entry',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Hero Image',
		name: 'heroImage',
		type: 'string',
		default: '',
		description: 'Storage identifier or URL, or empty for null',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Parent Folder ID',
		name: 'parentFolder',
		type: 'string',
		default: '',
		description: 'String Folder ID, or empty for null',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Show on Navigation',
		name: 'showOnNav',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Draft',
		name: 'draft',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Show Author',
		name: 'showAuthor',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Show Contributors',
		name: 'showContributors',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Category IDs',
		name: 'categories',
		type: 'json',
		default: '[]',
		description: 'JSON array of string Category IDs, for example ["17"]',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Tag IDs',
		name: 'tags',
		type: 'json',
		default: '[]',
		description: 'JSON array of string Tag IDs, for example ["23"]',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Augments',
		name: 'augments',
		type: 'json',
		default: '[]',
		description: 'JSON array of string StudioCMS augment identifiers',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Contributor IDs',
		name: 'contributorIds',
		type: 'json',
		default: '[]',
		description: 'JSON array of string user IDs; StudioCMS retains contributors during updates',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
	},
	{
		displayName: 'Content',
		name: 'createContent',
		type: 'string',
		typeOptions: { rows: 8 },
		default: '',
		description:
			'Initial Page content; StudioCMS creates its content ID and uses the Page language',
		displayOptions: { show: { resource: ['page'], operation: ['create'] } },
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
	throw new NodeApiError(
		context.getNode(),
		{},
		{
			itemIndex,
			message: 'StudioCMS returned a malformed response',
			description: 'The response did not match the StudioCMS page schema.',
		},
	);
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

function validateMessage(
	context: IExecuteFunctions,
	value: JsonObject,
	itemIndex: number,
): JsonObject {
	if (typeof value.message !== 'string') return malformedResponse(context, itemIndex);
	return value;
}

function encodedBoolean(value: boolean): number {
	return value ? 1 : 0;
}

function encodedStringArray(
	context: IExecuteFunctions,
	parameterName: string,
	value: unknown,
	itemIndex: number,
): string {
	try {
		const parsed = typeof value === 'string' ? JSON.parse(value) : value;
		if (!isStringArray(parsed)) throw new Error('Expected a string array');
		return JSON.stringify(parsed);
	} catch {
		throw new NodeOperationError(
			context.getNode(),
			`Page ${parameterName} must be a valid JSON array of strings`,
			{ itemIndex },
		);
	}
}

function nullableString(value: string): string | null {
	return value === '' ? null : value;
}

function sharedPageData(context: IExecuteFunctions, itemIndex: number): IDataObject {
	return {
		package: context.getNodeParameter('package', itemIndex) as string,
		title: context.getNodeParameter('title', itemIndex) as string,
		showOnNav: encodedBoolean(context.getNodeParameter('showOnNav', itemIndex) as boolean),
		contentLang: context.getNodeParameter('contentLang', itemIndex) as string,
		heroImage: nullableString(context.getNodeParameter('heroImage', itemIndex, '') as string),
		categories: encodedStringArray(
			context,
			'Category IDs',
			context.getNodeParameter('categories', itemIndex, '[]'),
			itemIndex,
		),
		tags: encodedStringArray(
			context,
			'Tag IDs',
			context.getNodeParameter('tags', itemIndex, '[]'),
			itemIndex,
		),
		showAuthor: encodedBoolean(context.getNodeParameter('showAuthor', itemIndex) as boolean),
		showContributors: encodedBoolean(
			context.getNodeParameter('showContributors', itemIndex) as boolean,
		),
		parentFolder: nullableString(context.getNodeParameter('parentFolder', itemIndex, '') as string),
		draft: encodedBoolean(context.getNodeParameter('draft', itemIndex) as boolean),
		augments: encodedStringArray(
			context,
			'Augments',
			context.getNodeParameter('augments', itemIndex, '[]'),
			itemIndex,
		),
	};
}

function createBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const slug = context.getNodeParameter('slug', itemIndex, '') as string;
	const data: IDataObject = {
		...sharedPageData(context, itemIndex),
		description: context.getNodeParameter('description', itemIndex, '') as string,
		contributorIds: encodedStringArray(
			context,
			'Contributor IDs',
			context.getNodeParameter('contributorIds', itemIndex, '[]'),
			itemIndex,
		),
		...(slug === '' ? {} : { slug }),
	};
	return {
		data,
		content: { content: context.getNodeParameter('createContent', itemIndex, '') as string },
	};
}

function encodedTaxonomyIds(value: unknown): string {
	if (!Array.isArray(value)) return '[]';
	return JSON.stringify(
		value.map((entry) => {
			if (!isRecord(entry) || typeof entry.id !== 'number') {
				throw new Error('Expected validated taxonomy data');
			}
			return entry.id.toString();
		}),
	);
}

function selectedUpdateFields(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const fields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	const mutationKeys = Object.keys(fields).filter((key) => key !== 'contentEntryId');
	if (mutationKeys.length === 0) {
		throw new NodeOperationError(
			context.getNode(),
			'Add at least one Page field or content value to update',
			{ itemIndex },
		);
	}
	return fields;
}

function updateBody(
	context: IExecuteFunctions,
	itemIndex: number,
	page: JsonObject,
	fields: IDataObject,
): IDataObject {
	const pageId = context.getNodeParameter('pageId', itemIndex) as string;
	const contentEntries = page.multiLangContent as JsonObject[];
	const requestedContentId = fields.contentEntryId as string | undefined;
	const selectedContent =
		requestedContentId !== undefined && requestedContentId !== ''
			? contentEntries.find((entry) => entry.id === requestedContentId)
			: ((page.defaultContent as JsonObject | undefined) ?? contentEntries[0]);
	if (selectedContent === undefined) {
		throw new NodeOperationError(
			context.getNode(),
			requestedContentId
				? `No Page content entry exists with ID ${requestedContentId}`
				: 'The Page has no content entry to preserve during update',
			{ itemIndex },
		);
	}

	const data: IDataObject = {
		id: pageId,
		package: page.package as string,
		title: page.title as string,
		description: page.description as string,
		showOnNav: page.showOnNav as number,
		slug: page.slug as string,
		contentLang: page.contentLang as string,
		heroImage: (page.heroImage as string | null | undefined) ?? null,
		categories: encodedTaxonomyIds(page.categories),
		tags: encodedTaxonomyIds(page.tags),
		showAuthor: page.showAuthor as number,
		showContributors: page.showContributors as number,
		parentFolder: (page.parentFolder as string | null | undefined) ?? null,
		draft: page.draft as number,
		augments: page.augments as string,
	};

	if ('package' in fields) data.package = fields.package;
	if ('title' in fields) data.title = fields.title;
	if ('description' in fields) data.description = fields.description;
	if ('showOnNav' in fields) data.showOnNav = encodedBoolean(fields.showOnNav as boolean);
	if ('slug' in fields) data.slug = fields.slug;
	if ('contentLang' in fields) data.contentLang = fields.contentLang;
	if ('heroImage' in fields) data.heroImage = nullableString(fields.heroImage as string);
	if ('categories' in fields) {
		data.categories = encodedStringArray(context, 'Category IDs', fields.categories, itemIndex);
	}
	if ('tags' in fields) {
		data.tags = encodedStringArray(context, 'Tag IDs', fields.tags, itemIndex);
	}
	if ('showAuthor' in fields) {
		data.showAuthor = encodedBoolean(fields.showAuthor as boolean);
	}
	if ('showContributors' in fields) {
		data.showContributors = encodedBoolean(fields.showContributors as boolean);
	}
	if ('parentFolder' in fields) {
		data.parentFolder = nullableString(fields.parentFolder as string);
	}
	if ('draft' in fields) data.draft = encodedBoolean(fields.draft as boolean);
	if ('augments' in fields) {
		data.augments = encodedStringArray(context, 'Augments', fields.augments, itemIndex);
	}

	return {
		data,
		content: {
			id: selectedContent.id as string,
			contentId: pageId,
			contentLang:
				'contentEntryLang' in fields
					? (fields.contentEntryLang as string)
					: (selectedContent.contentLang as string),
			content:
				'content' in fields ? (fields.content as string) : (selectedContent.content as string),
		},
	};
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
	if (
		Object.prototype.hasOwnProperty.call(filters, 'draft') &&
		typeof filters.draft === 'boolean'
	) {
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
	if (operation === 'create') {
		const response = await studioCmsObjectRequest.call(context, {
			method: 'POST',
			path: '/pages',
			itemIndex,
			body: createBody(context, itemIndex),
		});
		return [{ json: validateMessage(context, response, itemIndex) }];
	}

	if (operation === 'delete') {
		// StudioCMS requires the current slug in the DELETE payload. Resolve it from the Page so
		// users only need its ID and cannot accidentally submit a stale slug.
		const existingPage = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: pagePath(context, itemIndex),
			itemIndex,
		});
		const page = validatePage(context, existingPage, itemIndex);
		const response = await studioCmsObjectRequest.call(context, {
			method: 'DELETE',
			path: pagePath(context, itemIndex),
			itemIndex,
			body: { slug: page.slug as string },
		});
		return [{ json: validateMessage(context, response, itemIndex) }];
	}

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

	if (operation === 'update') {
		const fields = selectedUpdateFields(context, itemIndex);
		// StudioCMS PATCH requires complete Page metadata and content. Read the current Page so
		// omitted n8n fields can be preserved instead of forcing users to re-enter every value.
		const existingPage = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: pagePath(context, itemIndex),
			itemIndex,
		});
		const page = validatePage(context, existingPage, itemIndex);
		const response = await studioCmsObjectRequest.call(context, {
			method: 'PATCH',
			path: pagePath(context, itemIndex),
			itemIndex,
			body: updateBody(context, itemIndex, page, fields),
		});
		return [{ json: validateMessage(context, response, itemIndex) }];
	}

	throw new NodeOperationError(context.getNode(), 'Unsupported StudioCMS page operation', {
		itemIndex,
	});
}
