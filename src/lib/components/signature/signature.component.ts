import {
	afterNextRender,
	booleanAttribute,
	ChangeDetectionStrategy,
	Component,
	effect,
	ElementRef,
	inject,
	input,
	numberAttribute,
	output,
	signal,
	viewChild,
	ViewEncapsulation
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { KeyValuePipe } from '@angular/common';
import { HubLabelType, HubLabelTypes } from 'ng-hub-ui-forms';
import { HubFieldControl } from 'ng-hub-ui-forms';
import { HubTranslationService } from 'ng-hub-ui-utils';
import { HubSignaturePoint, HubSignatureStroke } from '../../models/signature.types';
import { parseHubSignature } from '../../utils/parse-signature-svg';
import { serializeHubSignature } from '../../utils/signature-svg';
import {
	defaultHubSignatureLabels,
	HUB_SIGNATURE_CONFIG,
	HubSignatureLabel,
	HubSignatureLabelSource,
	HubSignatureLabels,
	HubSignatureResolvedLabels
} from '../../signature-config';

/**
 * Freehand-signature form field whose value is a portable SVG document.
 * Pointer coordinates are retained independently from canvas pixels so DPR and
 * responsive resizes never alter the signed stroke geometry.
 */
@Component({
	selector: 'hub-signature',
	standalone: true,
	imports: [KeyValuePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	encapsulation: ViewEncapsulation.None,
	templateUrl: './signature.component.html',
	styleUrl: './signature.component.scss',
	host: { '[class]': 'classlist()', '[class.hub-signature-host]': 'true' }
})
export class HubSignatureComponent extends HubFieldControl {
	protected readonly _labelTypes = HubLabelTypes;
	private readonly config = inject(HUB_SIGNATURE_CONFIG);
	private readonly translationSvc = inject(HubTranslationService, { optional: true });
	private readonly translationSnapshot = this.translationSvc
		? toSignal(this.translationSvc.translationObserver, { initialValue: {} })
		: signal<Record<string, unknown>>({});
	private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
	private readonly strokes = signal<HubSignatureStroke[]>([]);
	private readonly redoStrokes = signal<HubSignatureStroke[]>([]);
	private readonly drawingStroke = signal<HubSignatureStroke | null>(null);
	private logicalWidth = 320;

	/** Label text rendered with the same contract as the other form fields. */
	readonly label = input<string>('');

	/** Label placement shared with the forms library. */
	readonly labelType = input<HubLabelType>(this._labelTypes.Stacked);

	/** Helper text rendered below the field. */
	readonly formText = input<string>('');

	/** Logical drawing height in CSS pixels. */
	readonly height = input(160, { transform: numberAttribute });

	/** Stroke colour saved into each SVG path. */
	readonly strokeColor = input<string>('currentColor');

	/** Base stroke width in CSS pixels. */
	readonly strokeWidth = input(2, { transform: numberAttribute });

	/** Prevents drawing while preserving focusable, readable content. */
	readonly readonly = input(false, { transform: booleanAttribute });

	/** Shows the built-in clear / undo / redo action row. */
	readonly controls = input(true, { transform: booleanAttribute });

	/** Localizable accessible label for the drawing surface. */
	readonly ariaLabel = input<string>('Signature');

	/** Per-instance overrides for the built-in action labels. */
	readonly labels = input<Partial<HubSignatureLabels>>({});

	/** Resolved action text, updated when a reactive translation source emits a new value. */
	protected readonly actionLabels = signal<HubSignatureResolvedLabels>({ ...defaultHubSignatureLabels });

	/** Extra CSS classes applied to the host. */
	readonly classlist = input<string>('');

	/** Emits the canonical SVG after a user-originated change. */
	readonly valueChange = output<string>();

	constructor() {
		super();
		effect((onCleanup) => {
			this.translationSnapshot();
			const labels = { ...this.config.labels, ...this.labels() };
			this.actionLabels.set({
				clear: this.getStaticLabel(labels.clear, 'HUBUI.SIGNATURE.ACTION.CLEAR', defaultHubSignatureLabels.clear),
				undo: this.getStaticLabel(labels.undo, 'HUBUI.SIGNATURE.ACTION.UNDO', defaultHubSignatureLabels.undo),
				redo: this.getStaticLabel(labels.redo, 'HUBUI.SIGNATURE.ACTION.REDO', defaultHubSignatureLabels.redo)
			});

			const subscriptions = (
				Object.entries(labels) as [keyof HubSignatureResolvedLabels, HubSignatureLabel | undefined][]
			)
				.filter(([, value]) => value !== undefined && this.isLabelSource(value))
				.map(([key, source]) =>
					(source as HubSignatureLabelSource).subscribe((value) => {
						this.actionLabels.update((current) => ({ ...current, [key]: value }));
					})
				);
			onCleanup(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
		});
		afterNextRender(() => this.resizeCanvas());
	}

	/** Returns a fallback while a reactive label source waits for its first translation. */
	private getStaticLabel(label: HubSignatureLabel | undefined, key: string, fallback: string): string {
		if (typeof label === 'string') return label;
		const translation = this.translationSvc?.getTranslation(key);
		return typeof translation === 'string' && translation.length > 0 ? translation : fallback;
	}

	/** Identifies translation streams structurally to avoid a dependency on a specific i18n package. */
	private isLabelSource(label: HubSignatureLabel | undefined): label is HubSignatureLabelSource {
		return label !== undefined && typeof label !== 'string' && typeof label.subscribe === 'function';
	}

	/** Restores form state without reporting it as a user change. */
	writeValue(value: string | null): void {
		this.strokes.set(value ? parseHubSignature(value) : []);
		this.redoStrokes.set([]);
		this.redraw();
	}

	/** Starts a stroke for an active pointer. */
	startStroke(event: PointerEvent): void {
		if (this.disabled() || this.readonly()) return;
		event.preventDefault();
		const canvas = this.canvas().nativeElement;
		canvas.setPointerCapture(event.pointerId);
		const point = this.getPoint(event);
		this.drawingStroke.set({ points: [point], color: this.strokeColor(), width: this.strokeWidth() });
		this.redraw();
	}

	/** Extends the active stroke and paints an immediate visual preview. */
	moveStroke(event: PointerEvent): void {
		const stroke = this.drawingStroke();
		if (!stroke) return;
		event.preventDefault();
		this.drawingStroke.set({ ...stroke, points: [...stroke.points, this.getPoint(event)] });
		this.redraw();
	}

	/** Commits the active stroke only when it contains a visible mark. */
	finishStroke(event: PointerEvent): void {
		const stroke = this.drawingStroke();
		if (!stroke) return;
		this.canvas().nativeElement.releasePointerCapture(event.pointerId);
		this.drawingStroke.set(null);
		if (stroke.points.length === 1) {
			stroke.points.push({ ...stroke.points[0], x: stroke.points[0].x + 0.01 });
		}
		this.strokes.update((strokes) => [...strokes, stroke]);
		this.redoStrokes.set([]);
		this.notifyValueChange();
	}

	/** Removes every stroke and propagates the empty form value. */
	clear(): void {
		if (!this.strokes().length) return;
		this.strokes.set([]);
		this.redoStrokes.set([]);
		this.redraw();
		this.notifyValueChange();
	}

	/** Reverts the most recently committed stroke. */
	undo(): void {
		const strokes = this.strokes();
		const stroke = strokes.at(-1);
		if (!stroke) return;
		this.strokes.set(strokes.slice(0, -1));
		this.redoStrokes.update((entries) => [...entries, stroke]);
		this.redraw();
		this.notifyValueChange();
	}

	/** Reapplies the most recently undone stroke. */
	redo(): void {
		const entries = this.redoStrokes();
		const stroke = entries.at(-1);
		if (!stroke) return;
		this.redoStrokes.set(entries.slice(0, -1));
		this.strokes.update((strokes) => [...strokes, stroke]);
		this.redraw();
		this.notifyValueChange();
	}

	/** Returns a lossless, scalable serialization suitable for form persistence. */
	toSvg(): string {
		return serializeHubSignature(this.strokes(), this.logicalWidth, this.height());
	}

	/** Exports the current canvas bitmap in a browser-supported image format. */
	toDataUrl(type = 'image/png'): string {
		return this.canvas().nativeElement.toDataURL(type);
	}

	/** Adjusts the device-pixel canvas without changing logical pointer geometry. */
	resizeCanvas(): void {
		const canvas = this.canvas().nativeElement;
		const rect = canvas.getBoundingClientRect();
		this.logicalWidth = Math.max(1, Math.round(rect.width || this.logicalWidth));
		const scale = globalThis.devicePixelRatio || 1;
		canvas.width = this.logicalWidth * scale;
		canvas.height = this.height() * scale;
		canvas.style.height = `${this.height()}px`;
		this.redraw();
	}

	/** Emits only user changes; model writes must never re-enter Angular forms. */
	private notifyValueChange(): void {
		const value = this.strokes().length ? this.toSvg() : '';
		this.onChange(value);
		this.onTouched();
		this.valueChange.emit(value);
	}

	/** Maps page coordinates onto the canvas logical coordinate system. */
	private getPoint(event: PointerEvent): HubSignaturePoint {
		const rect = this.canvas().nativeElement.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) * this.logicalWidth) / Math.max(1, rect.width),
			y: ((event.clientY - rect.top) * this.height()) / Math.max(1, rect.height),
			pressure: event.pressure || 0.5
		};
	}

	/** Replays retained geometry so rendering is independent from interaction history. */
	private redraw(): void {
		const canvas = this.canvas()?.nativeElement;
		const context = canvas?.getContext('2d');
		if (!canvas || !context) return;
		const scale = globalThis.devicePixelRatio || 1;
		context.setTransform(scale, 0, 0, scale, 0, 0);
		context.clearRect(0, 0, this.logicalWidth, this.height());
		[...this.strokes(), ...(this.drawingStroke() ? [this.drawingStroke()!] : [])].forEach((stroke) => {
			context.beginPath();
			context.strokeStyle = stroke.color;
			context.lineWidth = stroke.width;
			context.lineCap = 'round';
			context.lineJoin = 'round';
			stroke.points.forEach((point, index) =>
				index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)
			);
			context.stroke();
		});
	}
}
