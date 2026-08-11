import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
} from 'n8n-workflow';
import { vi } from 'vitest';

export function createExecuteContext(options: {
	continueOnFail?: boolean;
	httpRequest?: ReturnType<typeof vi.fn>;
	inputItems?: INodeExecutionData[];
	siteUrls?: string[];
} = {}): IExecuteFunctions {
	const inputItems = options.inputItems ?? [{ json: { input: 0 } }];
	const siteUrls = options.siteUrls ?? inputItems.map(() => 'https://cms.example.com');
	const httpRequest = options.httpRequest ?? vi.fn();
	const node = {
		id: 'studiocms-node-id',
		name: 'StudioCMS',
		type: 'studioCms',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {} as INodeParameters,
	};

	return {
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async (_type: string, itemIndex: number) => ({
			siteUrl: siteUrls[itemIndex] ?? siteUrls[0] ?? '',
			apiToken: 'test-token',
		}),
		getInputData: () => inputItems,
		getNode: () => node,
		getNodeParameter: (name: string, _itemIndex: number, fallbackValue?: unknown) => {
			if (name === 'resource') return 'connection';
			if (name === 'operation') return 'check';
			return fallbackValue;
		},
		helpers: {
			httpRequestWithAuthentication: httpRequest,
		},
	} as unknown as IExecuteFunctions;
}
