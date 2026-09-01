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

## Asking what the field holds

`toSvg()` is the form value, and for a long time it was also the only way to ask anything about the
field: whether it had been signed at all meant parsing the string for a path. Three additions answer
that directly.

```ts
@ViewChild(HubSignatureComponent) signature!: HubSignatureComponent;

// Validate without parsing the serialized value.
const signed = !this.signature.isEmpty();

// The geometry itself, which the SVG form value does not carry.
const strokes = this.signature.toStrokes(); // HubSignatureStroke[]
this.other.fromStrokes(strokes);            // repaints; reports no user change to Angular forms
```

`toStrokes()` / `fromStrokes()` are deliberately **not** named `toData` / `fromData`, the names
`angular2-signaturepad` uses. That library's `toData()` returns `Array<Array<{x, y, time}>>` and this
one returns `{ points: [{ x, y, pressure }], color, width }[]`. The same name with an incompatible
payload would let a migration compile and then fail silently wherever the value is typed `any`.

## Reacting while the user draws

| Output | Payload | Emitted |
| --- | --- | --- |
| `valueChange` | `string` | After a user-originated change, carrying the SVG |
| `drawStart` | `PointerEvent` | When a stroke begins |
| `drawEnd` | `PointerEvent` | When a stroke is finished and committed |

`drawStart` and `drawEnd` let a host react to drawing activity — pausing an autosave, arming a submit
button — without polling the value. They fire for user drawing only, so a programmatic write never
looks like one.

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
