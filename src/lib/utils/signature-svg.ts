import { HubSignatureStroke } from '../models/signature.types';

/**
 * Serializes captured strokes into a scalable and self-contained SVG document.
 *
 * @param strokes - Immutable drawing history to serialize.
 * @param width - Logical canvas width in CSS pixels.
 * @param height - Logical canvas height in CSS pixels.
 * @returns The SVG form value.
 */
export function serializeHubSignature(strokes: HubSignatureStroke[], width: number, height: number): string {
	const paths = strokes
		.filter((stroke) => stroke.points.length > 0)
		.map((stroke) => {
			const [first, ...remaining] = stroke.points;
			const commands = [`M ${first.x} ${first.y}`, ...remaining.map((point) => `L ${point.x} ${point.y}`)].join(' ');
			return `<path d="${commands}" fill="none" stroke="${escapeXml(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />`;
		})
		.join('');

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
}

/**
 * Keeps caller-provided CSS colour strings from altering SVG markup.
 *
 * @param value - Attribute value supplied through a public input.
 * @returns XML-safe attribute value.
 */
function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (character) => {
		switch (character) {
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '&':
				return '&amp;';
			case '"':
				return '&quot;';
			default:
				return '&apos;';
		}
	});
}
