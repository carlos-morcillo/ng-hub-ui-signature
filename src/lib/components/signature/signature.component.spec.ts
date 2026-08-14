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
	template: `<hub-signature [labels]="signatureLabels()" />`
})
class HostSignatureComponent {
	readonly signature = viewChild.required(HubSignatureComponent);
	readonly signatureLabels = signal<Partial<HubSignatureLabels>>({});
}

describe('HubSignatureComponent', () => {
	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [HostSignatureComponent] });
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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
});
