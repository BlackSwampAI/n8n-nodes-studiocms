/* eslint-disable @n8n/community-nodes/no-restricted-imports -- asset integrity test */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('StudioCMS icon assets', () => {
	for (const filename of ['studioCms.svg', 'studioCms.dark.svg']) {
		it(`${filename} contains only SVG markup`, () => {
			const icon = readFileSync(resolve('nodes/StudioCms', filename), 'utf8');

			expect(icon).toMatch(/^<svg\b[^]*<\/svg>\n?$/);
		});
	}
});
