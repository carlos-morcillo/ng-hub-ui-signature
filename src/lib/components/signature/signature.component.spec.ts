import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideHubTranslationAdapter } from 'ng-hub-ui-utils';
import type { HubSignatureDrawEvent } from '../../models/signature.types';
import { HUB_SIGNATURE_CONFIG, type HubSignatureLabels } from '../../signature-config';
import { HubSignatureComponent } from './signature.component';

@Component({
	standalone: true,
	imports: [HubSignatureComponent],
	template: `<hub-signature
		[labels]="signatureLabels()"
		[readonly]="readonlyMode()"
		[strokeColor]="ink()"
		[showValid]="true"
		[validFeedback]="validMessage()"
		(drawStart)="starts.push($event)"
		(drawEnd)="ends.push($event)"
	/>`
})
class HostSignatureComponent {
	readonly signature = viewChild.required(HubSignatureComponent);
	readonly signatureLabels = signal<Partial<HubSignatureLabels>>({});
	readonly readonlyMode = signal(false);
	readonly ink = signal('currentColor');
	readonly validMessage = signal<string | null>(null);
	readonly starts: HubSignatureDrawEvent[] = [];
	readonly ends: HubSignatureDrawEvent[] = [];
}

/** Minimal PointerEvent stand-in: jsdom has no pointer capture. */
function pointerEvent(id = 1): PointerEvent {
	return { pointerId: id, preventDefault: () => {}, clientX: 10, clientY: 10 } as unknown as PointerEvent;
}

/** Drives the real template binding rather than the handler, so the wiring is under test too. */
function keydown(canvas: HTMLCanvasElement, key: string, init: KeyboardEventInit = {}): void {
	canvas.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

/** Focuses the surface and returns it, which is where every keyboard interaction begins. */
function focusedCanvas(fixture: { nativeElement: HTMLElement }): HTMLCanvasElement {
	const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
	canvas.focus();
	return canvas;
}

describe('HubSignatureComponent', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HostSignatureComponent] });
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
		// jsdom implements none of the pointer-capture methods.
		HTMLCanvasElement.prototype.setPointerCapture = () => {};
		HTMLCanvasElement.prototype.releasePointerCapture = () => {};
		HTMLCanvasElement.prototype.hasPointerCapture = () => true;
	});

	it('restores a form SVG value as drawable signature data', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();

		fixture.componentInstance
			.signature()
			.writeValue(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><path d="M 12 16 L 42 34" fill="none" stroke="#123456" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>'
			);

		expect(fixture.componentInstance.signature().toSvg()).toContain('d="M 12 16 L 42 34"');
	});

	it('does not report a model write as a user form change', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		const onChange = vi.fn();
		fixture.detectChanges();
		fixture.componentInstance.signature().registerOnChange(onChange);

		fixture.componentInstance
			.signature()
			.writeValue(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><path d="M 12 16 L 42 34" fill="none" stroke="#123456" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>'
			);

		expect(onChange).not.toHaveBeenCalled();
	});

	it('propagates undo and redo as the current SVG value', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		const onChange = vi.fn();
		fixture.detectChanges();
		fixture.componentInstance.signature().registerOnChange(onChange);
		fixture.componentInstance
			.signature()
			.writeValue(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><path d="M 12 16 L 42 34" fill="none" stroke="#123456" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>'
			);

		fixture.componentInstance.signature().undo();
		fixture.componentInstance.signature().redo();

		expect(onChange).toHaveBeenNthCalledWith(1, '');
		expect(onChange).toHaveBeenNthCalledWith(2, expect.stringContaining('d="M 12 16 L 42 34"'));
	});

	it('merges per-instance action labels over the default label set', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();

		fixture.componentInstance.signatureLabels.set({ clear: 'Borrar firma' });
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelectorAll('button')[0].textContent.trim()).toBe('Borrar firma');
		expect(fixture.nativeElement.querySelectorAll('button')[1].textContent.trim()).toBe('Undo stroke');
	});

	it('uses application-wide action labels supplied through the configuration token', () => {
		TestBed.overrideProvider(HUB_SIGNATURE_CONFIG, {
			useValue: { labels: { clear: 'Borrar firma', undo: 'Deshacer trazo', redo: 'Rehacer trazo' } }
		});
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();

		expect(
			Array.from(fixture.nativeElement.querySelectorAll('button'), (button: HTMLButtonElement) =>
				button.textContent.trim()
			)
		).toEqual(['Borrar firma', 'Deshacer trazo', 'Rehacer trazo']);
	});

	it('updates buttons from a reactive translation source', () => {
		const clear = new BehaviorSubject('Clear signature');
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.componentInstance.signatureLabels.set({ clear });
		fixture.detectChanges();

		clear.next('Borrar firma');
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelectorAll('button')[0].textContent.trim()).toBe('Borrar firma');
	});

	it('updates every field from the shared application translation adapter', () => {
		const translations = new BehaviorSubject<Record<string, unknown>>({
			HUBUI: { SIGNATURE: { ACTION: { CLEAR: 'Clear signature' } } }
		});
		TestBed.configureTestingModule({ providers: [provideHubTranslationAdapter(() => translations)] });
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();

		translations.next({ HUBUI: { SIGNATURE: { ACTION: { CLEAR: 'Borrar firma' } } } });
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelectorAll('button')[0].textContent.trim()).toBe('Borrar firma');
	});

	it('reports emptiness so a form can validate the field', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();

		expect(signature.isEmpty()).toBe(true);

		signature.writeValue(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><path d="M 12 16 L 42 34" fill="none" stroke="#123456" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>'
		);

		expect(signature.isEmpty()).toBe(false);
	});

	it('round-trips signature data through toStrokes and fromStrokes', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();

		signature.fromStrokes([
			{
				points: [
					{ x: 1, y: 2, pressure: 0.5 },
					{ x: 3, y: 4, pressure: 0.5 }
				],
				color: '#abcdef',
				width: 4
			}
		]);

		expect(signature.toStrokes()).toEqual([
			{
				points: [
					{ x: 1, y: 2, pressure: 0.5 },
					{ x: 3, y: 4, pressure: 0.5 }
				],
				color: '#abcdef',
				width: 4
			}
		]);
		expect(signature.isEmpty()).toBe(false);
	});

	it('does not report a fromStrokes write as a user form change', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		const onChange = vi.fn();
		fixture.detectChanges();
		fixture.componentInstance.signature().registerOnChange(onChange);

		fixture.componentInstance
			.signature()
			.fromStrokes([{ points: [{ x: 1, y: 2, pressure: 0.5 }], color: '#000', width: 2 }]);

		expect(onChange).not.toHaveBeenCalled();
	});

	it('emits drawStart and drawEnd around a stroke', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const host = fixture.componentInstance;
		host.signature().startStroke(pointerEvent());
		expect(host.starts).toHaveLength(1);
		expect(host.ends).toHaveLength(0);

		host.signature().finishStroke(pointerEvent());
		expect(host.ends).toHaveLength(1);
	});

	it('does not emit drawStart while readonly', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.componentInstance.readonlyMode.set(true);
		fixture.detectChanges();

		fixture.componentInstance.signature().startStroke(pointerEvent());

		expect(fixture.componentInstance.starts).toHaveLength(0);
	});

	it('draws a committed stroke from the keyboard alone', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const canvas = focusedCanvas(fixture);
		const signature = fixture.componentInstance.signature();

		keydown(canvas, ' ');
		keydown(canvas, 'ArrowRight');
		keydown(canvas, 'ArrowDown');
		keydown(canvas, ' ');

		const [stroke, ...rest] = signature.toStrokes();
		expect(rest).toHaveLength(0);
		expect(stroke.points).toHaveLength(3);
		// Same shape a pointer stroke produces: 0.5 is the pressure fallback of getPoint().
		expect(stroke.points.every((point) => point.pressure === 0.5)).toBe(true);
		expect(signature.toSvg()).toContain('<path d="M ');
		expect(signature.isEmpty()).toBe(false);
	});

	it('emits drawStart and drawEnd around a keyboard stroke', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const canvas = focusedCanvas(fixture);
		const host = fixture.componentInstance;

		keydown(canvas, 'Enter');
		expect(host.starts).toHaveLength(1);
		expect(host.starts[0]).toBeInstanceOf(KeyboardEvent);
		expect(host.ends).toHaveLength(0);

		keydown(canvas, 'Enter');
		expect(host.ends).toHaveLength(1);
		expect(host.ends[0]).toBeInstanceOf(KeyboardEvent);
	});

	it('refuses the keyboard drawing path while readonly', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.componentInstance.readonlyMode.set(true);
		fixture.detectChanges();
		const canvas = focusedCanvas(fixture);

		keydown(canvas, ' ');
		keydown(canvas, 'ArrowRight');
		keydown(canvas, ' ');

		expect(fixture.componentInstance.starts).toHaveLength(0);
		expect(fixture.componentInstance.signature().isEmpty()).toBe(true);
	});

	it('describes the keyboard interaction through aria-describedby', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

		const describedBy = canvas.getAttribute('aria-describedby');
		const hint = fixture.nativeElement.querySelector(`[id="${describedBy}"]`) as HTMLElement | null;

		expect(describedBy).toBeTruthy();
		expect(hint?.textContent).toMatch(/arrow keys/i);
	});

	it('shows the keyboard pen once the surface is focused', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();

		focusedCanvas(fixture);
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.hub-signature__caret')).not.toBeNull();
	});

	it('discards the keyboard stroke in progress when Escape is pressed', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		const onChange = vi.fn();
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();
		signature.registerOnChange(onChange);
		const canvas = focusedCanvas(fixture);

		keydown(canvas, ' ');
		keydown(canvas, 'ArrowRight');
		keydown(canvas, 'Escape');

		// The stroke really began, so an empty field proves it was discarded and not merely never started.
		expect(fixture.componentInstance.starts).toHaveLength(1);
		expect(signature.isEmpty()).toBe(true);
		expect(fixture.componentInstance.ends).toHaveLength(0);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('discards the stroke in progress when the pointer is cancelled', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		const onChange = vi.fn();
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();
		signature.registerOnChange(onChange);
		const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;

		signature.startStroke(pointerEvent());
		canvas.dispatchEvent(new Event('pointercancel'));

		expect(signature.isEmpty()).toBe(true);
		expect(fixture.componentInstance.ends).toHaveLength(0);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('resolves the default currentColor ink before storing it', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();

		signature.startStroke(pointerEvent());
		signature.finishStroke(pointerEvent());

		expect(signature.toStrokes()[0].color).not.toBe('currentColor');
		expect(signature.toSvg()).not.toContain('currentColor');
	});

	it('stores an explicitly bound stroke colour verbatim', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.componentInstance.ink.set('#123456');
		fixture.detectChanges();
		const signature = fixture.componentInstance.signature();

		signature.startStroke(pointerEvent());
		signature.finishStroke(pointerEvent());

		expect(signature.toStrokes()[0].color).toBe('#123456');
	});

	it('renders the success feedback once the field is touched and valid', () => {
		const fixture = TestBed.createComponent(HostSignatureComponent);
		fixture.componentInstance.validMessage.set('Signature captured');
		fixture.detectChanges();

		fixture.componentInstance.signature().handleBlur();
		fixture.detectChanges();

		expect(fixture.nativeElement.querySelector('.hub-field__feedback--valid')?.textContent.trim()).toBe(
			'Signature captured'
		);
	});
});
