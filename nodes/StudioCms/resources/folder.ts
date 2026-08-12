import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { studioCmsCollectionRequest, studioCmsObjectRequest } from '../transport/request';

export const folderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['folder'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a folder',
				description: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a folder',
				description: 'Delete a folder',
			},
			{ name: 'Get', value: 'get', action: 'Get a folder', description: 'Get a folder by ID' },
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many folders',
				description: 'Get folders, optionally filtered by name or parent ID',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a folder',
				description: 'Update a folder by ID',
			},
		],
		default: 'getMany',
	},
];

export const folderFields: INodeProperties[] = [
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		default: '',
		description: 'String ID of the folder',
		displayOptions: { show: { resource: ['folder'], operation: ['delete', 'get', 'update'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['folder'], operation: ['create'] } },
	},
	{
		displayName: 'Parent Folder ID',
		name: 'parent',
		type: 'string',
		default: '',
		description: 'String parent folder ID, or empty for a top-level folder',
		displayOptions: { show: { resource: ['folder'], operation: ['create'] } },
	},
	{
		displayName: 'Folder Name',
		name: 'folderName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['folder'], operation: ['update'] } },
	},
	{
		displayName: 'Parent Folder ID',
		name: 'parentFolder',
		type: 'string',
		required: true,
		default: '',
		description: 'String parent folder ID, or empty to make this a top-level folder',
		displayOptions: { show: { resource: ['folder'], operation: ['update'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['folder'], operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 1_000, numberPrecision: 0 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['folder'], operation: ['getMany'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['folder'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Return folders whose names contain this value',
			},
			{
				displayName: 'Parent Folder ID',
				name: 'parent',
				type: 'string',
				default: '',
				description: 'Return folders with this string parent ID',
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

function validateFolder(
	context: IExecuteFunctions,
	value: JsonObject,
	itemIndex: number,
): JsonObject {
	if (
		typeof value.id !== 'string' ||
		typeof value.name !== 'string' ||
		!(value.parent === undefined || value.parent === null || typeof value.parent === 'string')
	) {
		return malformedResponse(
			context,
			itemIndex,
			'The response did not match the StudioCMS folder schema.',
		);
	}
	return value;
}

function validateMessage(
	context: IExecuteFunctions,
	value: JsonObject,
	itemIndex: number,
): JsonObject {
	if (typeof value.message !== 'string') {
		return malformedResponse(
			context,
			itemIndex,
			'The response did not match the StudioCMS folder message schema.',
		);
	}
	return value;
}

function folderPath(context: IExecuteFunctions, itemIndex: number): string {
	const folderId = context.getNodeParameter('folderId', itemIndex) as string;
	return `/folders/${encodeURIComponent(folderId)}`;
}

function createBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const parent = context.getNodeParameter('parent', itemIndex, '') as string;
	return {
		name: context.getNodeParameter('name', itemIndex) as string,
		parent: parent === '' ? null : parent,
	};
}

function updateBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const parentFolder = context.getNodeParameter('parentFolder', itemIndex) as string;
	return {
		folderName: context.getNodeParameter('folderName', itemIndex) as string,
		parentFolder: parentFolder === '' ? null : parentFolder,
	};
}

function getManyQuery(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const query: IDataObject = {};
	if (typeof filters.name === 'string' && filters.name !== '') query.name = filters.name;
	if (typeof filters.parent === 'string' && filters.parent !== '') query.parent = filters.parent;
	return query;
}

export async function executeFolder(
	context: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	if (operation === 'create') {
		const response = await studioCmsObjectRequest.call(context, {
			method: 'POST',
			path: '/folders',
			itemIndex,
			body: createBody(context, itemIndex),
		});
		return [{ json: validateMessage(context, response, itemIndex) }];
	}

	if (operation === 'delete') {
		const response = await studioCmsObjectRequest.call(context, {
			method: 'DELETE',
			path: folderPath(context, itemIndex),
			itemIndex,
		});
		if (typeof response.success !== 'boolean') {
			return malformedResponse(
				context,
				itemIndex,
				'The response did not match the StudioCMS folder deletion schema.',
			);
		}
		return [{ json: response }];
	}

	if (operation === 'get') {
		const folder = await studioCmsObjectRequest.call(context, {
			method: 'GET',
			path: folderPath(context, itemIndex),
			itemIndex,
		});
		return [{ json: validateFolder(context, folder, itemIndex) }];
	}

	if (operation === 'getMany') {
		const folders = await studioCmsCollectionRequest.call(context, {
			method: 'GET',
			path: '/folders',
			itemIndex,
			qs: getManyQuery(context, itemIndex),
		});
		const validated = folders.map((folder) => validateFolder(context, folder, itemIndex));
		const returnAll = context.getNodeParameter('returnAll', itemIndex, true) as boolean;
		const selected = returnAll
			? validated
			: validated.slice(0, context.getNodeParameter('limit', itemIndex, 50) as number);
		return selected.map((json) => ({ json }));
	}

	if (operation === 'update') {
		const response = await studioCmsObjectRequest.call(context, {
			method: 'PATCH',
			path: folderPath(context, itemIndex),
			itemIndex,
			body: updateBody(context, itemIndex),
		});
		return [{ json: validateMessage(context, response, itemIndex) }];
	}

	throw new NodeOperationError(context.getNode(), 'Unsupported StudioCMS folder operation', {
		itemIndex,
	});
}
