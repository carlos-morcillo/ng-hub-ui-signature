# ng-hub-ui-signature

SVG-backed signature field for Angular forms. It records mouse, touch and pen input through Pointer Events, stores a scalable SVG in the form model and can export the rendered canvas as PNG.

## Install

```bash
npm install ng-hub-ui-signature ng-hub-ui-forms
```

## Usage

```typescript
import { HubSignatureComponent } from 'ng-hub-ui-signature';

@Component({
	standalone: true,
	imports: [HubSignatureComponent],
	template: `<hub-signature formControlName="signature" label="Signature" />`
})
export class ContractFormComponent {}
```

The form control value is an SVG string. Use `toDataUrl('image/png')` for bitmap export, or `clear()`, `undo()` and `redo()` to control the field programmatically.

## Localized actions

The component is translation-framework agnostic. Configure the shared Hub UI adapter once at application bootstrap; it supplies one dictionary to every compatible Hub UI library, including Signature. Use `labels` only for a one-field exception:

```ts
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { provideHubTranslationAdapter } from 'ng-hub-ui-utils';

bootstrapApplication(AppComponent, {
	providers: [
		provideHubTranslationAdapter(() => {
			const transloco = inject(TranslocoService);
			return {
				dictionary: transloco.selectTranslation('HUBUI'),
				namespace: 'HUBUI'
			};
		})
	]
});
```

Add `HUBUI.SIGNATURE.ACTION.CLEAR`, `HUBUI.SIGNATURE.ACTION.UNDO` and `HUBUI.SIGNATURE.ACTION.REDO` to the application's normal language files. The `HUBUI` root prevents collisions with application keys. The adapter updates every Signature field when the service emits a language change; `overrides` can deliberately map an individual action to a different reactive service key. See the Utils documentation for the complete Transloco and ngx-translate setup.

```ts
// One exceptional field can still override a global label.
<hub-signature [labels]="{ clear: 'Erase signature' }" />
```

## Theming

Every field surface is customizable with `--hub-signature-*` variables. The defaults inherit the field contract of `ng-hub-ui-forms` — the drawing surface reads the `--hub-input-*` control tokens, the label reads `--hub-label-*` and the disabled state reads `--hub-form-disabled-opacity` — so theming a form themes its signature field too, with no extra rules.

```scss
@use 'ng-hub-ui-signature/styles' as hub;

.contract-form {
	@include hub.hub-signature-theme($border-radius: 0.75rem);
}
```
