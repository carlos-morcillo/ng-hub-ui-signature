/**
 * The DOM event behind a `drawStart` / `drawEnd`.
 *
 * Drawing is not pointer-exclusive: the same stroke can be produced with the keyboard, so a
 * payload typed `PointerEvent` would encode an assumption the component no longer makes.
 * Narrow with `instanceof` when the input device matters.
 */
export type HubSignatureDrawEvent = PointerEvent | KeyboardEvent;

/** A normalized point sampled from a drawing interaction. */
export interface HubSignaturePoint {
	x: number;
	y: number;
	pressure: number;
}

/** A continuous pen stroke preserving the style active when it was written. */
export interface HubSignatureStroke {
	points: HubSignaturePoint[];
	color: string;
	width: number;
}
