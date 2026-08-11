import { describe, expect, it } from 'vitest';

import { StudioCmsApi } from '../credentials/StudioCmsApi.credentials';

describe('StudioCMS API credential', () => {
	it('defines the site URL and secret API token fields', () => {
		const credential = new StudioCmsApi();

		expect(credential.name).toBe('studioCmsApi');
		expect(credential.displayName).toBe('StudioCMS API');
		expect(credential.properties).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'siteUrl', required: true, type: 'string' }),
				expect.objectContaining({
					name: 'apiToken',
					required: true,
					type: 'string',
					typeOptions: { password: true },
				}),
			]),
		);
	});

	it('adds bearer authentication and tests the authenticated REST API v1 endpoint', () => {
		const credential = new StudioCmsApi();

		expect(credential.authenticate).toEqual({
			type: 'generic',
			properties: {
				headers: {
					Accept: 'application/json',
					Authorization: '=Bearer {{$credentials.apiToken}}',
				},
			},
		});
		expect(credential.test).toMatchObject({
			request: {
				method: 'GET',
				json: true,
			},
			rules: [
				{
					type: 'responseCode',
					properties: { value: 401, message: 'The StudioCMS API token is invalid' },
				},
				{
					type: 'responseCode',
					properties: { value: 500, message: 'The StudioCMS API token is invalid' },
				},
			],
		});
		expect(credential.test.request.url).toContain('/studiocms_api/rest/v1/categories');
		expect(credential.test.request.url).toContain('replace(/\\/+$/');
	});
});
