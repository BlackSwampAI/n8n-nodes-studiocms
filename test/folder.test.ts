import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { StudioCms } from '../nodes/StudioCms/StudioCms.node';
import { createExecuteContext } from './helpers';

const folder = {
	id: '4f4fe7ce-bd70-43ec-9de9-957fdfd25d5c',
	name: 'Documentation',
	parent: null,
};

async function execute(context: ReturnType<typeof createExecuteContext>) {
	return await new StudioCms().execute.call(context);
}

function folderParameters(operation: string, values: Record<string, unknown> = {}) {
	return { resource: 'folder', operation, ...values };
}

describe('Folder operations', () => {
	it('exposes only the contracted folder operations and filters', () => {
		const properties = new StudioCms().description.properties;
		const resource = properties.find((property) => property.name === 'resource');
		const operation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('folder'),
		);
		const folderId = properties.find(
			(property) =>
				property.name === 'folderId' && property.displayOptions?.show?.resource?.includes('folder'),
		);
		const filters = properties.find(
			(property) =>
				property.name === 'filters' && property.displayOptions?.show?.resource?.includes('folder'),
		);

		expect(resource?.options).toEqual([
			expect.objectContaining({ name: 'Category', value: 'category' }),
			expect.objectContaining({ name: 'Connection', value: 'connection' }),
			expect.objectContaining({ name: 'Folder', value: 'folder' }),
			expect.objectContaining({ name: 'Page', value: 'page' }),
			expect.objectContaining({ name: 'Tag', value: 'tag' }),
		]);
		expect(operation?.options).toEqual([
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
			expect.objectContaining({ value: 'update' }),
		]);
		expect(folderId).toMatchObject({ type: 'string', required: true });
		expect(filters?.options).toEqual([
			expect.objectContaining({ name: 'name', displayName: 'Name' }),
			expect.objectContaining({ name: 'parent', displayName: 'Parent Folder ID' }),
		]);
	});

	it('creates a top-level folder with the StudioCMS 0.4.4 payload and message response', async () => {
		const response = { message: `Folder created successfully with id: ${folder.id}` };
		const httpRequest = vi.fn().mockResolvedValue(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [folderParameters('create', { name: 'Documentation', parent: '' })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: response, pairedItem: { item: 0 } }]);
		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'POST',
			url: 'https://cms.example.com/studiocms_api/rest/v1/folders',
			headers: { Accept: 'application/json' },
			body: { name: 'Documentation', parent: null },
			timeout: 30_000,
			json: true,
		});
	});

	it('creates a child folder with a string parent ID', async () => {
		const response = { message: 'Folder created successfully' };
		const httpRequest = vi.fn().mockResolvedValue(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [folderParameters('create', { name: 'Guides', parent: folder.id })],
		});

		await execute(context);

		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			body: { name: 'Guides', parent: folder.id },
		});
	});

	it('gets a folder by string ID', async () => {
		const httpRequest = vi.fn().mockResolvedValue(folder);
		const context = createExecuteContext({
			httpRequest,
			parameters: [folderParameters('get', { folderId: folder.id })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: folder, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: `https://cms.example.com/studiocms_api/rest/v1/folders/${folder.id}`,
		});
	});

	it('gets filtered folders, applies the requested limit, and pairs every result', async () => {
		const child = { id: 'child-id', name: 'API Documentation', parent: folder.id };
		const httpRequest = vi.fn().mockResolvedValue([folder, child]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				folderParameters('getMany', {
					filters: { name: 'Documentation', parent: folder.id },
					returnAll: false,
					limit: 1,
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: folder, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/folders',
			qs: { name: 'Documentation', parent: folder.id },
		});
	});

	it('sends no unsupported filters when getting all folders', async () => {
		const httpRequest = vi.fn().mockResolvedValue([folder]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [folderParameters('getMany', { filters: {}, returnAll: true })],
		});

		await execute(context);

		expect(httpRequest.mock.calls[0][1]).toMatchObject({ qs: {} });
	});

	it('updates a folder with the required StudioCMS update payload and message response', async () => {
		const response = { message: 'Folder updated successfully' };
		const httpRequest = vi.fn().mockResolvedValue(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				folderParameters('update', {
					folderId: folder.id,
					folderName: 'Reference',
					parentFolder: '',
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: response, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'PATCH',
			url: `https://cms.example.com/studiocms_api/rest/v1/folders/${folder.id}`,
			body: { folderName: 'Reference', parentFolder: null },
		});
	});

	it('deletes a folder and returns the contracted success object', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ success: true });
		const context = createExecuteContext({
			httpRequest,
			parameters: [folderParameters('delete', { folderId: folder.id })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'DELETE',
			url: `https://cms.example.com/studiocms_api/rest/v1/folders/${folder.id}`,
		});
	});

	it('executes multiple folder input items with their own parameters and pairing', async () => {
		const secondFolder = { id: 'second-id', name: 'Guides', parent: folder.id };
		const httpRequest = vi.fn().mockResolvedValueOnce(folder).mockResolvedValueOnce(secondFolder);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				folderParameters('get', { folderId: folder.id }),
				folderParameters('get', { folderId: secondFolder.id }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: folder, pairedItem: { item: 0 } },
			{ json: secondFolder, pairedItem: { item: 1 } },
		]);
		expect(httpRequest.mock.calls.map((call) => call[1].url)).toEqual([
			`https://cms.example.com/studiocms_api/rest/v1/folders/${folder.id}`,
			'https://cms.example.com/studiocms_api/rest/v1/folders/second-id',
		]);
	});

	it.each([
		['create', { name: 'Docs', parent: '' }],
		['delete', { folderId: folder.id }],
		['get', { folderId: folder.id }],
		['getMany', { filters: {}, returnAll: true }],
		['update', { folderId: folder.id, folderName: 'Docs', parentFolder: '' }],
	])(
		'returns a paired sanitized API error for %s when continueOnFail is enabled',
		async (operation, values) => {
			const httpRequest = vi.fn().mockRejectedValue({
				config: { headers: { Authorization: 'Bearer forbidden-token' } },
				response: { status: 400, data: { error: 'Invalid folder request' } },
			});
			const context = createExecuteContext({
				continueOnFail: true,
				httpRequest,
				parameters: [folderParameters(operation, values)],
			});

			const [output] = await execute(context);

			expect(output).toEqual([
				{ json: { error: 'StudioCMS rejected the request' }, pairedItem: { item: 0 } },
			]);
			expect(JSON.stringify(output)).not.toContain('forbidden-token');
		},
	);

	it.each([
		['create', { name: 'Docs', parent: '' }, { success: true }],
		['delete', { folderId: folder.id }, { success: 'yes' }],
		['get', { folderId: folder.id }, { id: folder.id }],
		['getMany', { filters: {}, returnAll: true }, [{ id: folder.id }]],
		['update', { folderId: folder.id, folderName: 'Docs', parentFolder: '' }, { success: true }],
	])('rejects a malformed successful response for %s', async (operation, values, response) => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockResolvedValue(response),
			parameters: [folderParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
		expect((error as NodeApiError).context.itemIndex).toBe(0);
	});

	it('continues with later folder items after an API failure when continueOnFail is enabled', async () => {
		const secondFolder = { id: 'second-id', name: 'Guides', parent: null };
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(secondFolder);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				folderParameters('get', { folderId: folder.id }),
				folderParameters('get', { folderId: secondFolder.id }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS service failure' }, pairedItem: { item: 0 } },
			{ json: secondFolder, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('stops folder execution on the first failure when continueOnFail is disabled', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(folder);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				folderParameters('get', { folderId: folder.id }),
				folderParameters('get', { folderId: 'second-id' }),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS service failure' });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
