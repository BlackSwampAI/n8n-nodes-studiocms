import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { studioCmsCollectionRequest, studioCmsObjectRequest } from '../transport/request';

export const categoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['category'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a category',
				description: 'Create a category',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a category',
				description: 'Delete a category',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a category',
				description: 'Get a category by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many categories',
				description: 'Get categories, optionally filtered by name or parent ID',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a category',
				description: 'Update a category by ID',
			},
		],
		default: 'getMany',
	},
];

const categoryIdProperty: INodeProperties = {
	displayName: 'Category ID',
	name: 'categoryId',
	type: 'number',
	typeOptions: { minValue: 1, numberPrecision: 0 },
	required: true,
	default: 1,
	description: 'Numeric ID of the category',
	displayOptions: {
		show: { resource: ['category'], operation: ['delete', 'get', 'update'] },
	},
};

const nameProperty: INodeProperties = {
	displayName: 'Name',
	name: 'name',
	type: 'string',
	required: true,
	default: '',
	displayOptions: { show: { resource: ['category'], operation: ['create'] } },
};

const slugProperty: INodeProperties = {
	displayName: 'Slug',
	name: 'slug',
	type: 'string',
	required: true,
	default: '',
	displayOptions: { show: { resource: ['category'], operation: ['create'] } },
};

const descriptionProperty: INodeProperties = {
	displayName: 'Description',
	name: 'description',
	type: 'string',
	required: true,
	default: '',
	typeOptions: { rows: 3 },
	displayOptions: { show: { resource: ['category'], operation: ['create'] } },
};

const parentProperty: INodeProperties = {
	displayName: 'Parent Category ID',
	name: 'parent',
	type: 'number',
	typeOptions: { minValue: 0, numberPrecision: 0 },
	default: 0,
	description: 'Numeric parent category ID, or 0 to create a top-level category',
	displayOptions: { show: { resource: ['category'], operation: ['create'] } },
};

const metaProperty: INodeProperties = {
	displayName: 'Metadata',
	name: 'meta',
	type: 'json',
	required: true,
	default: '{}',
	description: 'JSON object stored as category metadata',
	displayOptions: { show: { resource: ['category'], operation: ['create'] } },
};

export const categoryFields: INodeProperties[] = [
	categoryIdProperty,
	nameProperty,
	slugProperty,
	descriptionProperty,
	parentProperty,
	metaProperty,
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['category'], operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1_000, numberPrecision: 0 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['category'], operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['category'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Return categories whose names contain this value',
			},
			{
				displayName: 'Parent Category ID',
				name: 'parent',
				type: 'number',
				typeOptions: { minValue: 1, numberPrecision: 0 },
				default: 1,
				description: 'Return categories with this numeric parent ID',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['category'], operation: ['update'] } },
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
				description: 'JSON object stored as category metadata',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Parent Category ID',
				name: 'parent',
				type: 'number',
				typeOptions: { minValue: 0, numberPrecision: 0 },
				default: 0,
				description: 'Numeric parent category ID, or 0 to make this a top-level category',
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

function isCategory(value: JsonObject): boolean {
	return (
		typeof value.id === 'number' &&
		(value.parent === undefined || value.parent === null || typeof value.parent === 'number') &&
		typeof value.description === 'string' &&
		typeof value.name === 'string' &&
		typeof value.slug === 'string' &&
		typeof value.meta === 'string'
	);
}

function validateCategory(
	context: IExecuteFunctions,
	value: JsonObject,
	itemIndex: number,
): JsonObject {
	if (!isCategory(value)) {
		return malformedResponse(
			context,
			itemIndex,
			'The response did not match the StudioCMS category schema.',
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
		throw new NodeOperationError(
			context.getNode(),
			'Category Metadata must be a valid JSON object',
			{
				itemIndex,
			},
		);
	}
}

function categoryPath(context: IExecuteFunctions, itemIndex: number): string {
	const categoryId = context.getNodeParameter('categoryId', itemIndex) as number;
	return `/categories/${categoryId}`;
}

function createBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const parent = context.getNodeParameter('parent', itemIndex) as number;
	return {
		name: context.getNodeParameter('name', itemIndex) as string,
		slug: context.getNodeParameter('slug', itemIndex) as string,
		description: context.getNodeParameter('description', itemIndex) as string,
		parent: parent === 0 ? null : parent,
		meta: encodedMetadata(context, context.getNodeParameter('meta', itemIndex), itemIndex),
	};
}

function updateBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const fields = context.getNodeParameter('updateFields', itemIndex, {}) as IDataObject;
	const body: IDataObject = { ...fields };
	if ('parent' in body && body.parent === 0) body.parent = null;
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
	if (typeof filters.parent === 'number') query.parent = filters.parent;
	return query;
}

export async function executeCategory(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const category = await studioCmsObjectRequest.call(context, {
			method: 'POST',
			path: '/categories',
			itemIndex,
			body: createBody(context, itemIndex),
		});
		return [{ json: validateCategory(context, category, itemIndex) }];
	}

	if (operation === 'delete') {
		const response = await studioCmsObjectRequest.call(context, {
			method: 'DELETE',
			path: categoryPath(context, itemIndex),
			itemIndex,
		});
		if (typeof response.success !== 'boolean') {
			return malformedResponse(
				context,
				itemIndex,
				'The response did not match the StudioCMS category deletion schema.',
			);
		}
		return [{ json: response }];
	}

	if (operation === 'get') {
		const category = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: categoryPath(context, itemIndex),
			itemIndex,
		});
		return [{ json: validateCategory(context, category, itemIndex) }];
	}

	if (operation === 'getMany') {
		const categories = await studioCmsCollectionRequest.call(context, {
			method: 'GET',
			path: '/categories',
			itemIndex,
			qs: getManyQuery(context, itemIndex),
		});
		const validated = categories.map((category) => validateCategory(context, category, itemIndex));
		const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;
		const selected = returnAll
			? validated
			: validated.slice(0, context.getNodeParameter('limit', itemIndex, 50) as number);
		return selected.map((json) => ({ json }));
	}

	if (operation === 'update') {
		const category = await studioCmsObjectRequest.call(context, {
			method: 'PATCH',
			path: categoryPath(context, itemIndex),
			itemIndex,
			body: updateBody(context, itemIndex),
		});
		return [{ json: validateCategory(context, category, itemIndex) }];
	}

	throw new NodeOperationError(context.getNode(), 'Unsupported StudioCMS category operation', {
		itemIndex,
	});
}
