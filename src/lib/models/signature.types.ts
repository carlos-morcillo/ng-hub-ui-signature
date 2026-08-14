/** A normalized point sampled from a pointer interaction. */
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
