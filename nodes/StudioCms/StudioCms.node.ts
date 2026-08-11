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
		group: ['transform'],
		version: 1,
		description: 'Work with the StudioCMS REST API',
		defaults: {
			name: 'StudioCMS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}

