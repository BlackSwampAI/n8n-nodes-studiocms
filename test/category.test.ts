import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { StudioCms } from '../nodes/StudioCms/StudioCms.node';
import { createExecuteContext } from './helpers';

const category = {
	id: 123,
	parent: null,
	description: 'News and updates',
	name: 'News',
	slug: 'news',
	meta: '{"featured":true}',
};

async function execute(context: ReturnType<typeof createExecuteContext>) {
	return await new StudioCms().execute.call(context);
}

function categoryParameters(operation: string, values: Record<string, unknown> = {}) {
	return { resource: 'category', operation, ...values };
}

describe('Category operations', () => {
	it('exposes only the contracted category operations', () => {
		const properties = new StudioCms().description.properties;
		const resource = properties.find((property) => property.name === 'resource');
		const operation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('category'),
		);

		expect(resource?.options).toEqual([
			expect.objectContaining({ name: 'Category', value: 'category' }),
			expect.objectContaining({ name: 'Connection', value: 'connection' }),
		]);
		expect(operation?.options).toEqual([
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
			expect.objectContaining({ value: 'update' }),
		]);
	});

	it('creates a category with the StudioCMS 0.4.4 payload shape', async () => {
		const httpRequest = vi.fn().mockResolvedValue(category);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				categoryParameters('create', {
					name: 'News',
					slug: 'news',
					description: 'News and updates',
					parent: 0,
					meta: '{"featured":true}',
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: category, pairedItem: { item: 0 } }]);
		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'POST',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories',
			headers: { Accept: 'application/json' },
			body: {
				name: 'News',
				slug: 'news',
				description: 'News and updates',
				parent: null,
				meta: '{"featured":true}',
			},
			timeout: 30_000,
			json: true,
		});
	});

	it('gets a category by numeric ID', async () => {
		const httpRequest = vi.fn().mockResolvedValue(category);
		const context = createExecuteContext({
			httpRequest,
			parameters: [categoryParameters('get', { categoryId: 123 })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: category, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories/123',
		});
	});

	it('gets filtered categories, applies the requested limit, and pairs every result', async () => {
		const secondCategory = { ...category, id: 456, name: 'Product News' };
		const httpRequest = vi.fn().mockResolvedValue([category, secondCategory]);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }],
			parameters: [
				categoryParameters('getMany', {
					filters: { name: 'News', parent: 999 },
					returnAll: false,
					limit: 1,
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: category, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories',
			qs: { name: 'News', parent: 999 },
		});
	});

	it('updates only selected fields and encodes metadata for StudioCMS', async () => {
		const updated = { ...category, parent: null, name: 'Updates', meta: '{"featured":false}' };
		const httpRequest = vi.fn().mockResolvedValue(updated);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				categoryParameters('update', {
					categoryId: 123,
					updateFields: { name: 'Updates', parent: 0, meta: '{"featured":false}' },
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: updated, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'PATCH',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories/123',
			body: { name: 'Updates', parent: null, meta: '{"featured":false}' },
		});
	});

	it('deletes a category and returns the contracted success object', async () => {
		const httpRequest = vi.fn().mockResolvedValue({ success: true });
		const context = createExecuteContext({
			httpRequest,
			parameters: [categoryParameters('delete', { categoryId: 123 })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: { success: true }, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'DELETE',
			url: 'https://cms.example.com/studiocms_api/rest/v1/categories/123',
		});
	});

	it('executes multiple category input items with their own parameters and pairing', async () => {
		const secondCategory = { ...category, id: 456, name: 'Guides', slug: 'guides' };
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce(category)
			.mockResolvedValueOnce(secondCategory);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				categoryParameters('get', { categoryId: 123 }),
				categoryParameters('get', { categoryId: 456 }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: category, pairedItem: { item: 0 } },
			{ json: secondCategory, pairedItem: { item: 1 } },
		]);
		expect(httpRequest.mock.calls.map((call) => call[1].url)).toEqual([
			'https://cms.example.com/studiocms_api/rest/v1/categories/123',
			'https://cms.example.com/studiocms_api/rest/v1/categories/456',
		]);
	});

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', parent: 0, meta: '{}' }],
		['delete', { categoryId: 123 }],
		['get', { categoryId: 123 }],
		['getMany', { filters: {}, returnAll: true }],
		['update', { categoryId: 123, updateFields: { name: 'Updates' } }],
	])(
		'returns a paired sanitized error for %s when continueOnFail is enabled',
		async (operation, values) => {
			const httpRequest = vi.fn().mockRejectedValue({
				config: { headers: { Authorization: 'Bearer forbidden-token' } },
				response: { status: 404, data: { error: 'Category not found' } },
			});
			const context = createExecuteContext({
				continueOnFail: true,
				httpRequest,
				parameters: [categoryParameters(operation, values)],
			});

			const [output] = await execute(context);

			expect(output).toEqual([
				{ json: { error: 'StudioCMS API endpoint not found' }, pairedItem: { item: 0 } },
			]);
			expect(JSON.stringify(output)).not.toContain('forbidden-token');
		},
	);

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', parent: 0, meta: '{}' }, []],
		['delete', { categoryId: 123 }, { success: 'yes' }],
		['get', { categoryId: 123 }, { id: 123 }],
		['getMany', { filters: {}, returnAll: true }, [{ id: 123 }]],
		['update', { categoryId: 123, updateFields: { name: 'Updates' } }, { id: 123 }],
	])('rejects a malformed successful response for %s', async (operation, values, response) => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockResolvedValue(response),
			parameters: [categoryParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
		expect((error as NodeApiError).context.itemIndex).toBe(0);
	});

	it.each([
		['create', { name: 'News', slug: 'news', description: 'News', parent: 0, meta: '[]' }],
		['update', { categoryId: 123, updateFields: { meta: 'not-json' } }],
	])('rejects invalid metadata for %s before making a request', async (operation, values) => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [categoryParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'Category Metadata must be a valid JSON object' });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('rejects an empty update before making a request', async () => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [categoryParameters('update', { categoryId: 123, updateFields: {} })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: 'Add at least one field to update' });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('stops category execution on the first failure when continueOnFail is disabled', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(category);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				categoryParameters('get', { categoryId: 123 }),
				categoryParameters('get', { categoryId: 456 }),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS service failure' });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
