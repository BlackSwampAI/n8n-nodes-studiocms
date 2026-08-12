import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { categoryFields, categoryOperations, executeCategory } from './resources/category';
import { executeFolder, folderFields, folderOperations } from './resources/folder';
import { executePage, pageFields, pageOperations } from './resources/page';
import { executeTag, tagFields, tagOperations } from './resources/tag';
import { STUDIOCMS_CONNECTION_TEST_PATH } from './transport/constants';
import { studioCmsCollectionRequest } from './transport/request';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The StudioCMS operation failed';
}

export class StudioCms implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'StudioCMS',
		name: 'studioCms',
		icon: {
			light: 'file:studioCms.svg',
			dark: 'file:studioCms.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with the StudioCMS REST API',
		defaults: {
			name: 'StudioCMS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'studioCmsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Category',
						value: 'category',
					},
					{
						name: 'Connection',
						value: 'connection',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'Page',
						value: 'page',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
				],
				default: 'connection',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['connection'] } },
				options: [
					{
						name: 'Check',
						value: 'check',
						action: 'Check the connection',
						description:
							'Confirm that the StudioCMS site, REST API, and API token are available',
					},
				],
				default: 'check',
			},
			...categoryOperations,
			...categoryFields,
			...folderOperations,
			...folderFields,
			...pageOperations,
			...pageFields,
			...tagOperations,
			...tagFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputs = this.getInputData();
		const outputs: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < inputs.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex, 'connection');
				const operation = this.getNodeParameter('operation', itemIndex, 'check');
				if (resource === 'category') {
					const results = await executeCategory(this, operation as string, itemIndex);
					outputs.push(
						...results.map((result) => ({ ...result, pairedItem: { item: itemIndex } })),
					);
					continue;
				}
				if (resource === 'folder') {
					const results = await executeFolder(this, operation as string, itemIndex);
					outputs.push(
						...results.map((result) => ({ ...result, pairedItem: { item: itemIndex } })),
					);
					continue;
				}
				if (resource === 'page') {
					const results = await executePage(this, operation as string, itemIndex);
					outputs.push(
						...results.map((result) => ({ ...result, pairedItem: { item: itemIndex } })),
					);
					continue;
				}
				if (resource === 'tag') {
					const results = await executeTag(this, operation as string, itemIndex);
					outputs.push(
						...results.map((result) => ({ ...result, pairedItem: { item: itemIndex } })),
					);
					continue;
				}
				if (resource !== 'connection' || operation !== 'check') {
					throw new NodeOperationError(this.getNode(), 'Unsupported StudioCMS operation', {
						itemIndex,
					});
				}

				await studioCmsCollectionRequest.call(this, {
					method: 'GET',
					path: STUDIOCMS_CONNECTION_TEST_PATH,
					itemIndex,
				});
				outputs.push({ json: { connected: true }, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (!this.continueOnFail()) {
					throw error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), errorMessage(error), { itemIndex });
				}
				outputs.push({
					json: { error: errorMessage(error) },
					pairedItem: { item: itemIndex },
				});
			}
		}

		return [outputs];
	}
}
