import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StudioCmsApi implements ICredentialType {
	name = 'studioCmsApi';

	displayName = 'StudioCMS API';

	documentationUrl = 'https://docs.studiocms.dev/en/how-it-works/restapi/';

	icon = {
		light: 'file:../nodes/StudioCms/studioCms.svg',
		dark: 'file:../nodes/StudioCms/studioCms.dark.svg',
	} as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Site URL',
			name: 'siteUrl',
			type: 'string',
			default: '',
			placeholder: 'https://cms.example.com',
			required: true,
			description:
				'The public URL of the StudioCMS site. A trailing slash is optional.',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'An API token created from the API Tokens section of the StudioCMS user profile',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Accept: 'application/json',
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.siteUrl.trim().replace(/\\/+$/, "") + "/studiocms_api/rest/v1/categories"}}',
			method: 'GET',
			json: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message: 'The StudioCMS API token is invalid',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 500,
					message: 'The StudioCMS API token is invalid',
				},
			},
		],
	};
}
