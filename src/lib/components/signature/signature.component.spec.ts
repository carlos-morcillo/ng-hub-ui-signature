import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideHubTranslationAdapter } from 'ng-hub-ui-utils';
import { HUB_SIGNATURE_CONFIG, type HubSignatureLabels } from '../../signature-config';
import { HubSignatureComponent } from './signature.component';

@Component({
	standalone: true,
	imports: [HubSignatureComponent],
	template: `<hub-signature
		[labels]="signatureLabels()"
		[readonly]="readonlyMode()"
		(drawStart)="starts.push($event)"
		(drawEnd)="ends.push($event)"
	/>`
})
class HostSignatureComponent {
	readonly signature = viewChild.required(HubSignatureComponent);
	readonly signatureLabels = signal<Partial<HubSignatureLabels>>({});
	readonly readonlyMode = signal(false);
	readonly starts: PointerEvent[] = [];
	readonly ends: PointerEvent[] = [];
}

/** Minimal PointerEvent stand-in: jsdom has no pointer capture. */
function pointerEvent(id = 1): PointerEvent {
	return { pointerId: id, preventDefault: () => {}, clientX: 10, clientY: 10 } as unknown as PointerEvent;
}

describe('HubSignatureComponent', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HostSignatureComponent] });
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
		// jsdom implements neither pointer-capture method.
		HTMLCanvasElement.prototype.setPointerCapture = () => {};
		HTMLCanvasElement.prototype.releasePointerCapture = () => {};
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
});
