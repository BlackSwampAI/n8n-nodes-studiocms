import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { StudioCms } from '../nodes/StudioCms/StudioCms.node';
import { createExecuteContext } from './helpers';

const pageId = '915c3ed9-78f5-46cf-8f94-b34b3f95dd34';
const folderId = '4f4fe7ce-bd70-43ec-9de9-957fdfd25d5c';

const category = {
	id: 17,
	name: 'Documentation',
	description: 'Documentation pages',
	parent: null,
	slug: 'documentation',
	meta: '{"color":"blue"}',
};

const tag = {
	id: 23,
	name: 'API',
	description: 'API pages',
	slug: 'api',
	meta: '{}',
};

const content = {
	id: 'content-id',
	contentId: pageId,
	contentLang: 'en',
	content: '# StudioCMS API',
};

const author = {
	id: '1a420388-61a8-4c3f-9eb2-b723982b19b7',
	url: null,
	name: 'Editor',
	avatar: 'https://cms.example.com/avatar.png',
	username: 'editor',
	updatedAt: '2026-08-11T20:00:00.000Z',
	createdAt: '2026-01-02T03:04:05.000Z',
	emailVerified: 1,
	notifications: null,
};

const page = {
	id: pageId,
	package: 'studiocms/markdown',
	title: 'StudioCMS API',
	description: 'API reference',
	showOnNav: 1,
	publishedAt: '2026-08-11T22:51:41.258Z',
	updatedAt: '2026-08-11T22:51:41.258Z',
	slug: 'api',
	contentLang: 'en',
	heroImage: null,
	authorId: author.id,
	contributorIds: ['contributor-id'],
	showAuthor: 1,
	showContributors: 0,
	parentFolder: folderId,
	draft: 0,
	augments: '["studiocms/toc"]',
	categories: [category],
	tags: [tag],
	multiLangContent: [content],
	defaultContent: content,
	urlRoute: '/documentation/api',
	authorData: author,
	contributorsData: [{ ...author, id: 'contributor-id', emailVerified: 0 }],
};

async function execute(context: ReturnType<typeof createExecuteContext>) {
	return await new StudioCms().execute.call(context);
}

function pageParameters(operation: string, values: Record<string, unknown> = {}) {
	return { resource: 'page', operation, ...values };
}

const createValues = {
	title: 'StudioCMS API',
	package: 'studiocms/markdown',
	slug: 'api',
	description: 'API reference',
	contentLang: 'en',
	heroImage: 'storage://hero.png',
	parentFolder: folderId,
	showOnNav: true,
	draft: false,
	showAuthor: true,
	showContributors: false,
	categories: ['17'],
	tags: '["23"]',
	augments: ['studiocms/toc'],
	contributorIds: ['contributor-id'],
	createContent: '# StudioCMS API',
};

const updateValues = {
	pageId,
	updateFields: {
		title: 'Updated StudioCMS API',
		package: 'studiocms/markdown',
		slug: 'updated-api',
		description: 'Updated API reference',
		contentLang: 'en',
		heroImage: 'storage://updated-hero.png',
		parentFolder: folderId,
		showOnNav: false,
		draft: true,
		showAuthor: false,
		showContributors: true,
		categories: '["17"]',
		tags: ['23'],
		augments: '["studiocms/toc","plugin/augment"]',
		contentEntryId: content.id,
		contentEntryLang: 'en',
		content: '# Updated StudioCMS API',
	},
};

describe('Page operations', () => {
	it('exposes Create, Get, Get Many, and selective Update with the official Page filters', () => {
		const properties = new StudioCms().description.properties;
		const resource = properties.find((property) => property.name === 'resource');
		const operation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('page'),
		);
		const id = properties.find(
			(property) =>
				property.name === 'pageId' && property.displayOptions?.show?.resource?.includes('page'),
		);
		const filters = properties.find(
			(property) =>
				property.name === 'filters' && property.displayOptions?.show?.resource?.includes('page'),
		);
		const updateFields = properties.find(
			(property) =>
				property.name === 'updateFields' &&
				property.displayOptions?.show?.resource?.includes('page'),
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
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
			expect.objectContaining({ value: 'update' }),
		]);
		expect(id).toMatchObject({ type: 'string', required: true });
		expect(updateFields?.options).toEqual([
			expect.objectContaining({ name: 'augments' }),
			expect.objectContaining({ name: 'categories' }),
			expect.objectContaining({ name: 'content' }),
			expect.objectContaining({ name: 'contentEntryId' }),
			expect.objectContaining({ name: 'contentEntryLang' }),
			expect.objectContaining({ name: 'description' }),
			expect.objectContaining({ name: 'draft' }),
			expect.objectContaining({ name: 'heroImage' }),
			expect.objectContaining({ name: 'contentLang' }),
			expect.objectContaining({ name: 'parentFolder' }),
			expect.objectContaining({ name: 'package' }),
			expect.objectContaining({ name: 'showAuthor' }),
			expect.objectContaining({ name: 'showContributors' }),
			expect.objectContaining({ name: 'showOnNav' }),
			expect.objectContaining({ name: 'slug' }),
			expect.objectContaining({ name: 'tags' }),
			expect.objectContaining({ name: 'title' }),
		]);
		expect(filters?.options).toEqual([
			expect.objectContaining({ name: 'author', displayName: 'Author ID' }),
			expect.objectContaining({ name: 'draft', displayName: 'Draft' }),
			expect.objectContaining({ name: 'parentFolder', displayName: 'Parent Folder ID' }),
			expect.objectContaining({ name: 'published', displayName: 'Published' }),
			expect.objectContaining({ name: 'slug', displayName: 'Slug' }),
			expect.objectContaining({ name: 'title', displayName: 'Title' }),
		]);
	});

	it('creates a Page with every supported field and exact REST wire encodings', async () => {
		const response = { message: `Page created successfully with id: ${pageId}` };
		const httpRequest = vi.fn().mockResolvedValue(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('create', createValues)],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: response, pairedItem: { item: 0 } }]);
		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'POST',
			url: 'https://cms.example.com/studiocms_api/rest/v1/pages',
			headers: { Accept: 'application/json' },
			body: {
				data: {
					package: 'studiocms/markdown',
					title: 'StudioCMS API',
					showOnNav: 1,
					contentLang: 'en',
					heroImage: 'storage://hero.png',
					categories: '["17"]',
					tags: '["23"]',
					showAuthor: 1,
					showContributors: 0,
					parentFolder: folderId,
					draft: 0,
					augments: '["studiocms/toc"]',
					description: 'API reference',
					contributorIds: '["contributor-id"]',
					slug: 'api',
				},
				content: { content: '# StudioCMS API' },
			},
			timeout: 30_000,
			json: true,
		});
	});

	it('uses nullable fields, empty string arrays, numeric false values, and server slug generation', async () => {
		const response = { message: `Page created successfully with id: ${pageId}` };
		const httpRequest = vi.fn().mockResolvedValue(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('create', {
					...createValues,
					slug: '',
					heroImage: '',
					parentFolder: '',
					showOnNav: false,
					showAuthor: false,
					categories: '[]',
					tags: [],
					augments: '[]',
					contributorIds: [],
					createContent: '',
				}),
			],
		});

		await execute(context);

		expect(httpRequest.mock.calls[0][1].body).toEqual({
			data: expect.objectContaining({
				heroImage: null,
				parentFolder: null,
				showOnNav: 0,
				showAuthor: 0,
				categories: '[]',
				tags: '[]',
				augments: '[]',
				contributorIds: '[]',
			}),
			content: { content: '' },
		});
		expect(httpRequest.mock.calls[0][1].body.data).not.toHaveProperty('slug');
	});

	it.each([
		['Category IDs', { categories: '[17]' }],
		['Tag IDs', { tags: '{"id":"23"}' }],
		['Augments', { augments: 'not-json' }],
		['Contributor IDs', { contributorIds: [42] }],
	])('rejects invalid Page %s locally', async (field, override) => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('create', { ...createValues, ...override })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: `Page ${field} must be a valid JSON array of strings` });
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('gets the current Page and sends every selected field with the exact REST payload', async () => {
		const response = { message: 'Page updated successfully' };
		const httpRequest = vi.fn().mockResolvedValueOnce(page).mockResolvedValueOnce(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: response, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: `https://cms.example.com/studiocms_api/rest/v1/pages/${pageId}`,
		});
		expect(httpRequest.mock.calls[1]).toEqual([
			'studioCmsApi',
			{
				method: 'PATCH',
				url: `https://cms.example.com/studiocms_api/rest/v1/pages/${pageId}`,
				headers: { Accept: 'application/json' },
				body: {
					data: {
						id: pageId,
						package: 'studiocms/markdown',
						title: 'Updated StudioCMS API',
						description: 'Updated API reference',
						showOnNav: 0,
						slug: 'updated-api',
						contentLang: 'en',
						heroImage: 'storage://updated-hero.png',
						categories: '["17"]',
						tags: '["23"]',
						showAuthor: 0,
						showContributors: 1,
						parentFolder: folderId,
						draft: 1,
						augments: '["studiocms/toc","plugin/augment"]',
					},
					content: {
						id: content.id,
						contentId: pageId,
						contentLang: 'en',
						content: '# Updated StudioCMS API',
					},
				},
				timeout: 30_000,
				json: true,
			},
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('updates only title and slug while preserving metadata and default content', async () => {
		const response = { message: 'Page updated successfully' };
		const httpRequest = vi.fn().mockResolvedValueOnce(page).mockResolvedValueOnce(response);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('update', {
					pageId,
					updateFields: { title: 'New title', slug: 'new-slug' },
				}),
			],
		});

		await execute(context);

		expect(httpRequest.mock.calls[1][1].body).toEqual({
			data: {
				id: pageId,
				package: page.package,
				title: 'New title',
				description: page.description,
				showOnNav: page.showOnNav,
				slug: 'new-slug',
				contentLang: page.contentLang,
				heroImage: page.heroImage,
				categories: '["17"]',
				tags: '["23"]',
				showAuthor: page.showAuthor,
				showContributors: page.showContributors,
				parentFolder: page.parentFolder,
				draft: page.draft,
				augments: page.augments,
			},
			content,
		});
	});

	it('supports nullable fields and explicitly selected multilingual content', async () => {
		const translatedContent = {
			id: 'translated-content-id',
			contentId: pageId,
			contentLang: 'fr',
			content: '# API française',
		};
		const multilingualPage = {
			...page,
			multiLangContent: [content, translatedContent],
		};
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce(multilingualPage)
			.mockResolvedValueOnce({ message: 'Page updated successfully' });
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('update', {
					pageId,
					updateFields: {
						heroImage: '',
						parentFolder: '',
						contentLang: 'fr',
						contentEntryId: translatedContent.id,
						contentEntryLang: 'de',
						content: '# Deutsche API',
						categories: [],
						tags: '[]',
						augments: [],
					},
				}),
			],
		});

		await execute(context);

		expect(httpRequest.mock.calls[1][1].body).toMatchObject({
			data: {
				heroImage: null,
				parentFolder: null,
				contentLang: 'fr',
				categories: '[]',
				tags: '[]',
				augments: '[]',
			},
			content: {
				id: translatedContent.id,
				contentLang: 'de',
				content: '# Deutsche API',
			},
		});
	});

	it('rejects an empty Update without sending a no-op PATCH', async () => {
		const httpRequest = vi.fn();
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', { pageId, updateFields: {} })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({
			message: 'Add at least one Page field or content value to update',
		});
		expect(httpRequest).not.toHaveBeenCalled();
	});

	it('rejects a content entry ID that is not present on the Page', async () => {
		const httpRequest = vi.fn().mockResolvedValueOnce(page);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('update', {
					pageId,
					updateFields: { contentEntryId: 'missing-content-id', title: 'New title' },
				}),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({
			message: 'No Page content entry exists with ID missing-content-id',
		});
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it('rejects metadata updates when the Page has no content entry to preserve', async () => {
		const contentlessPage = { ...page, defaultContent: undefined, multiLangContent: [] };
		const httpRequest = vi.fn().mockResolvedValueOnce(contentlessPage);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('update', { pageId, updateFields: { title: 'New title' } }),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({
			message: 'The Page has no content entry to preserve during update',
		});
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it.each([
		['Category IDs', { categories: '[17]' }],
		['Tag IDs', { tags: '{"id":"23"}' }],
		['Augments', { augments: 'not-json' }],
	])('rejects invalid Update %s after the reconciliation read', async (field, updateFields) => {
		const httpRequest = vi.fn().mockResolvedValueOnce(page);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', { pageId, updateFields })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error).toMatchObject({ message: `Page ${field} must be a valid JSON array of strings` });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it('rejects a malformed Page returned by the reconciliation read', async () => {
		const httpRequest = vi.fn().mockResolvedValueOnce({ ...page, defaultContent: null });
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it.each(['create', 'update'])('rejects a malformed %s message response', async (operation) => {
		const httpRequest =
			operation === 'create'
				? vi.fn().mockResolvedValue({ success: true })
				: vi.fn().mockResolvedValueOnce(page).mockResolvedValueOnce({ success: true });
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters(operation, operation === 'create' ? createValues : updateValues),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
	});

	it('maps a missing Page during the reconciliation read', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS page not found', httpCode: '404' });
		expect((error as NodeApiError).description).toBe(`No page exists with ID ${pageId}.`);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('maps a Page deleted between GET and PATCH after the existence check', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce(page)
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([])
			.mockRejectedValueOnce({ response: { status: 500, data: '' } });
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS page not found', httpCode: '404' });
		expect(httpRequest).toHaveBeenCalledTimes(4);
	});

	it('keeps an ambiguous authenticated PATCH failure on an existing Page as an update failure', async () => {
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce(page)
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(page);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS page update failed', httpCode: '500' });
		expect(httpRequest).toHaveBeenCalledTimes(4);
	});

	it('preserves invalid-token classification during the reconciliation read', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockRejectedValueOnce({ response: { status: 500, data: '' } });
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('update', updateValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS authentication failed' });
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('maps an empty Page Create 500 to a sanitized invalid-token failure', async () => {
		const httpRequest = vi.fn().mockRejectedValue({
			config: { headers: { Authorization: 'Bearer create-secret-token' } },
			response: { status: 500, data: '' },
		});
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('create', createValues)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS authentication failed' });
		expect(JSON.stringify(error)).not.toContain('create-secret-token');
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});

	it.each([
		['create', createValues],
		['update', updateValues],
	])('returns a paired sanitized API error for Page %s with continueOnFail', async (operation, values) => {
		const failure = {
			config: { headers: { Authorization: 'Bearer mutation-secret-token' } },
			response: { status: 400, data: { error: 'Invalid Page mutation' } },
		};
		const httpRequest =
			operation === 'create'
				? vi.fn().mockRejectedValue(failure)
				: vi.fn().mockResolvedValueOnce(page).mockRejectedValueOnce(failure);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			parameters: [pageParameters(operation, values)],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS rejected the request' }, pairedItem: { item: 0 } },
		]);
		expect(JSON.stringify(output)).not.toContain('mutation-secret-token');
	});

	it('executes mixed Page Create and Update items with their own payloads and pairing', async () => {
		const createResponse = { message: `Page created successfully with id: ${pageId}` };
		const updateResponse = { message: 'Page updated successfully' };
		const httpRequest = vi
			.fn()
			.mockResolvedValueOnce(createResponse)
			.mockResolvedValueOnce({
				...page,
				id: 'second-page-id',
				defaultContent: { ...content, id: 'second-content-id', contentId: 'second-page-id' },
				multiLangContent: [
					{ ...content, id: 'second-content-id', contentId: 'second-page-id' },
				],
			})
			.mockResolvedValueOnce(updateResponse);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				pageParameters('create', createValues),
				pageParameters('update', {
					pageId: 'second-page-id',
					updateFields: { title: 'Second Page', slug: 'second-page' },
				}),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: createResponse, pairedItem: { item: 0 } },
			{ json: updateResponse, pairedItem: { item: 1 } },
		]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({ method: 'POST' });
		expect(httpRequest.mock.calls[1][1]).toMatchObject({ method: 'GET' });
		expect(httpRequest.mock.calls[2][1]).toMatchObject({
			method: 'PATCH',
			url: 'https://cms.example.com/studiocms_api/rest/v1/pages/second-page-id',
			body: {
				data: expect.objectContaining({ id: 'second-page-id', slug: 'second-page' }),
				content: expect.objectContaining({
					id: 'second-content-id',
					contentId: 'second-page-id',
				}),
			},
		});
	});

	it('continues from a failed Page Create to a later Page Update when enabled', async () => {
		const updateResponse = { message: 'Page updated successfully' };
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Invalid Page' } } })
			.mockResolvedValueOnce(page)
			.mockResolvedValueOnce(updateResponse);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				pageParameters('create', createValues),
				pageParameters('update', updateValues),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS rejected the request' }, pairedItem: { item: 0 } },
			{ json: updateResponse, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(3);
	});

	it('gets a complete Page by its string ID with the exact request shape', async () => {
		const httpRequest = vi.fn().mockResolvedValue(page);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('get', { pageId })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: page, pairedItem: { item: 0 } }]);
		expect(httpRequest).toHaveBeenCalledWith('studioCmsApi', {
			method: 'GET',
			url: `https://cms.example.com/studiocms_api/rest/v1/pages/${pageId}`,
			headers: { Accept: 'application/json' },
			timeout: 30_000,
			json: true,
		});
	});

	it.each([
		['title', 'StudioCMS', { title: 'StudioCMS' }],
		['slug', 'api', { slug: 'api' }],
		['author', author.id, { author: author.id }],
		['parentFolder', folderId, { parentFolder: folderId }],
		['draft', false, { draft: 'false' }],
		['published', true, { published: 'true' }],
	] as const)(
		'sends the supported %s filter with its official query encoding',
		async (name, value, qs) => {
			const httpRequest = vi.fn().mockResolvedValue([page]);
			const context = createExecuteContext({
				httpRequest,
				parameters: [
					pageParameters('getMany', { filters: { [name]: value }, returnAll: true }),
				],
			});

			await execute(context);

			expect(httpRequest.mock.calls[0][1]).toMatchObject({
				method: 'GET',
				url: 'https://cms.example.com/studiocms_api/rest/v1/pages',
				qs,
			});
		},
	);

	it('preserves the StudioCMS 0.4.4 published=false wire behavior', async () => {
		const httpRequest = vi.fn().mockResolvedValue([page]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [
				pageParameters('getMany', {
					filters: { published: false },
					returnAll: true,
				}),
			],
		});

		await execute(context);

		expect(httpRequest.mock.calls[0][1]).toMatchObject({ qs: { published: 'false' } });
	});

	it('sends all filters together and applies Limit after validation', async () => {
		const secondPage = { ...page, id: 'second-page-id', title: 'StudioCMS Guide' };
		const httpRequest = vi.fn().mockResolvedValue([page, secondPage]);
		const filters = {
			title: 'StudioCMS',
			slug: 'api',
			author: author.id,
			parentFolder: folderId,
			draft: false,
			published: true,
		};
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('getMany', { filters, returnAll: false, limit: 1 })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: page, pairedItem: { item: 0 } }]);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({
			qs: {
				title: 'StudioCMS',
				slug: 'api',
				author: author.id,
				parentFolder: folderId,
				draft: 'false',
				published: 'true',
			},
		});
	});

	it('returns all Pages and sends no query filters when none are selected', async () => {
		const secondPage = { ...page, id: 'second-page-id' };
		const httpRequest = vi.fn().mockResolvedValue([page, secondPage]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('getMany', { filters: {}, returnAll: true })],
		});

		const [output] = await execute(context);

		expect(output).toHaveLength(2);
		expect(httpRequest.mock.calls[0][1]).toMatchObject({ qs: {} });
	});

	it('accepts officially optional Page, content, and user fields when absent', async () => {
		const minimalPage = { ...page } as Record<string, unknown>;
		delete minimalPage.heroImage;
		delete minimalPage.parentFolder;
		delete minimalPage.defaultContent;
		delete minimalPage.authorData;
		const httpRequest = vi.fn().mockResolvedValue(minimalPage);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('get', { pageId })],
		});

		const [output] = await execute(context);

		expect(output).toEqual([{ json: minimalPage, pairedItem: { item: 0 } }]);
	});

	it.each([
		['Get', 'get', { pageId }, { ...page, id: 42 }],
		['Get Many', 'getMany', { filters: {}, returnAll: true }, [{ ...page, draft: false }]],
		['nested category', 'get', { pageId }, { ...page, categories: [{ ...category, meta: '[]' }] }],
		['content', 'get', { pageId }, { ...page, defaultContent: { ...content, content: 10 } }],
		['safe author', 'get', { pageId }, { ...page, authorData: { ...author, email: 'hidden' } }],
	])('rejects a malformed %s Page response', async (_label, operation, values, response) => {
		const context = createExecuteContext({
			httpRequest: vi.fn().mockResolvedValue(response),
			parameters: [pageParameters(operation, values)],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS returned a malformed response' });
		expect((error as NodeApiError).context.itemIndex).toBe(0);
	});

	it('maps a missing Page after the authenticated probe', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: '' } })
			.mockResolvedValueOnce([]);
		const context = createExecuteContext({
			httpRequest,
			parameters: [pageParameters('get', { pageId })],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS page not found', httpCode: '404' });
		expect((error as NodeApiError).description).toBe(`No page exists with ID ${pageId}.`);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it.each([
		['get', { pageId }],
		['getMany', { filters: {}, returnAll: true }],
	])(
		'returns a paired sanitized API error for %s with continueOnFail',
		async (operation, values) => {
			const httpRequest = vi.fn().mockRejectedValue({
				config: { headers: { Authorization: 'Bearer forbidden-token' } },
				response: { status: 400, data: { error: 'Invalid Page request' } },
			});
			const context = createExecuteContext({
				continueOnFail: true,
				httpRequest,
				parameters: [pageParameters(operation, values)],
			});

			const [output] = await execute(context);

			expect(output).toEqual([
				{ json: { error: 'StudioCMS rejected the request' }, pairedItem: { item: 0 } },
			]);
			expect(JSON.stringify(output)).not.toContain('forbidden-token');
		},
	);

	it('executes multiple Page items with their own parameters and pairing', async () => {
		const secondPage = { ...page, id: 'second-page-id', title: 'Second Page' };
		const httpRequest = vi.fn().mockResolvedValueOnce(page).mockResolvedValueOnce(secondPage);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				pageParameters('get', { pageId }),
				pageParameters('get', { pageId: secondPage.id }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: page, pairedItem: { item: 0 } },
			{ json: secondPage, pairedItem: { item: 1 } },
		]);
		expect(httpRequest.mock.calls.map((call) => call[1].url)).toEqual([
			`https://cms.example.com/studiocms_api/rest/v1/pages/${pageId}`,
			'https://cms.example.com/studiocms_api/rest/v1/pages/second-page-id',
		]);
	});

	it('continues with later Page items after an API failure when enabled', async () => {
		const secondPage = { ...page, id: 'second-page-id' };
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(secondPage);
		const context = createExecuteContext({
			continueOnFail: true,
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				pageParameters('get', { pageId }),
				pageParameters('get', { pageId: secondPage.id }),
			],
		});

		const [output] = await execute(context);

		expect(output).toEqual([
			{ json: { error: 'StudioCMS service failure' }, pairedItem: { item: 0 } },
			{ json: secondPage, pairedItem: { item: 1 } },
		]);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	it('stops Page execution on the first failure when continueOnFail is disabled', async () => {
		const httpRequest = vi
			.fn()
			.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Database failed' } } })
			.mockResolvedValueOnce(page);
		const context = createExecuteContext({
			httpRequest,
			inputItems: [{ json: { input: 1 } }, { json: { input: 2 } }],
			parameters: [
				pageParameters('get', { pageId }),
				pageParameters('get', { pageId: 'second-page-id' }),
			],
		});

		const error = await execute(context).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({ message: 'StudioCMS service failure' });
		expect(httpRequest).toHaveBeenCalledTimes(1);
	});
});
