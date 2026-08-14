import { describe, expect, it } from 'vitest';
import { serializeHubSignature } from './signature-svg';

describe('serializeHubSignature', () => {
	it('preserves the viewport and every stroke as scalable SVG paths', () => {
		const svg = serializeHubSignature(
			[
				{
					color: '#123456',
					width: 3,
					points: [
						{ x: 12, y: 16, pressure: 0.5 },
						{ x: 42, y: 34, pressure: 0.5 }
					]
				}
			],
			320,
			120
		);

		expect(svg).toContain('viewBox="0 0 320 120"');
		expect(svg).toContain('stroke="#123456"');
		expect(svg).toContain('stroke-width="3"');
		expect(svg).toContain('d="M 12 16 L 42 34"');
	});

	it('returns an empty SVG document when the user clears every stroke', () => {
		const svg = serializeHubSignature([], 320, 120);

		expect(svg).toContain('viewBox="0 0 320 120"');
		expect(svg).not.toContain('<path');
	});
});
