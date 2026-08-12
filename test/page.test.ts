import { NodeApiError } from 'n8n-workflow';
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

describe('Page read operations', () => {
	it('exposes only Get and Get Many with the official Page filters', () => {
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

		expect(resource?.options).toEqual([
			expect.objectContaining({ name: 'Category', value: 'category' }),
			expect.objectContaining({ name: 'Connection', value: 'connection' }),
			expect.objectContaining({ name: 'Folder', value: 'folder' }),
			expect.objectContaining({ name: 'Page', value: 'page' }),
			expect.objectContaining({ name: 'Tag', value: 'tag' }),
		]);
		expect(operation?.options).toEqual([
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
		]);
		expect(id).toMatchObject({ type: 'string', required: true });
		expect(filters?.options).toEqual([
			expect.objectContaining({ name: 'author', displayName: 'Author ID' }),
			expect.objectContaining({ name: 'draft', displayName: 'Draft' }),
			expect.objectContaining({ name: 'parentFolder', displayName: 'Parent Folder ID' }),
			expect.objectContaining({ name: 'published', displayName: 'Published' }),
			expect.objectContaining({ name: 'slug', displayName: 'Slug' }),
			expect.objectContaining({ name: 'title', displayName: 'Title' }),
		]);
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
