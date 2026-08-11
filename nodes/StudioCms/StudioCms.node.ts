import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

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
		subtitle: 'StudioCMS REST API',
		description: 'Work with the StudioCMS REST API',
		defaults: {
			name: 'StudioCMS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
