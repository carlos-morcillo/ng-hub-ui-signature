<!-- Verified against ng-hub-ui-signature@22.2.0 and the published angular2-signaturepad tarball on 2026-09-01. Every claim was checked by two independent adversarial reviews; see tasks/guias-migracion/ in the workspace repo for the review record. Revised for 22.3.0, which closed four of the limitations recorded below. -->

Version covered here: `angular2-signaturepad` **4.0.2** (the current `latest`) and `ng-hub-ui-signature` **22.3.0**. Every claim below was checked against the published tarball of the incumbent and the `ng-hub-ui-signature` source tree.

> **If you are pinned to 22.2.0 or earlier**, four things behave differently from what is described
> here: there was no keyboard path to sign, `pointercancel` committed the partial stroke,
> `[strokeColor]`'s `currentColor` default was never resolved, and `[validFeedback]` was accepted
> and never rendered. Each is flagged in place below. 22.3.0 also changes the `(drawStart)` /
> `(drawEnd)` payload type; see the package's `BREAKING_CHANGES.md`.

---

## 1. Why migrate, and when not to

`angular2-signaturepad` is a wrapper around [szimek/signature_pad](https://github.com/szimek/signature_pad), pinned by its peer range to exactly `2.3.2`. Its `latest` release, **4.0.2, was published on 14 February 2022**, and its README opens with the maintainer's own notice: "THIS IS NO LONGER IN USE BY OWNER. PROBLEMS CAN AND DO EXIST. PRs ARE SUPER WELCOME, BUT I CAN NOT IDENTIFY WHAT YOUR ISSUES ARE, NOR WILL I CHANGE THINGS BECAUSE ANGULAR HAS CHANGED IN THE YEARS SINCE I WROTE THIS."

### When not to migrate

If your application is on Angular 8–13 and is staying there, the incumbent keeps working. Its `peerDependencies` declare `^8.0.0 || ^9.0.0 || ^10.0.0 || ^11.0.0 || ^12.0.0 || ^13.0.0` for `@angular/common` and `@angular/core`, so nothing in the package objects to those versions. There is no functional urgency to move.

### When to migrate

The trigger is the Angular floor. The incumbent has published nothing for Angular 14 or later, and the import path its own README documents — `angular2-signaturepad/signature-pad` — no longer resolves in 4.0.2: the package's `exports` map defines only `.` and `./package.json`. If you are moving Angular forward, you need a signature field built for the version you are moving to.

`ng-hub-ui-signature` 22.2.0 is one such field. Before you commit, three costs:

- **It is not a like-for-like replacement.** Package name, selector, component class, registration model, configuration model, event payloads and the two data methods all change. Several capabilities have no counterpart at all — see [What does not migrate](#5-what-does-not-migrate).
- **It requires Angular `>= 21`**, plus `ng-hub-ui-forms >= 22.0.0` and `ng-hub-ui-utils >= 22.8.0`. For most current `angular2-signaturepad` users, the Angular upgrade is the larger half of the work, not the component swap.
- **Signatures you stored as PNG or JPEG data URLs cannot be loaded back for editing.** There is no `fromDataURL()` equivalent under any name. Read [that section](#fromdataurl-no-inbound-path-for-raster-signatures) before planning anything else; it is the gap most likely to break a live feature.

What changes in exchange: a standalone component with no third-party drawing dependency, `ControlValueAccessor` integration so the signature is a form control value, SVG rather than a PNG blob as the canonical serialization, built-in clear/undo/redo, and a label/validation shell shared with `ng-hub-ui-forms`.

---

## 2. Install and setup

### Packages

```bash
npm uninstall angular2-signaturepad signature_pad
npm install ng-hub-ui-signature ng-hub-ui-forms ng-hub-ui-utils
```

`signature_pad` goes away entirely: `ng-hub-ui-signature` captures input itself through Pointer Events on its own `<canvas>`. Anything you know from the `szimek/signature_pad` docs or issue tracker no longer applies.

Peer dependencies declared by `ng-hub-ui-signature@22.2.0`:

| Peer | Range |
| --- | --- |
| `@angular/common`, `@angular/core`, `@angular/forms` | `>= 21.0.0` |
| `ng-hub-ui-forms` | `>= 22.0.0` |
| `ng-hub-ui-utils` | `>= 22.8.0` |

Install all three. The component's module imports `HubTranslationService` from `ng-hub-ui-utils` unconditionally, so the package must resolve at build time even though the service itself is injected with `{ optional: true }`. The package README's shorter install line omits it.

Both extra peers are real libraries with their own token contracts — the field's visual tokens default through `--hub-input-*`, `--hub-label-*` and `--hub-form-disabled-opacity`, and the template renders `.hub-field`, `.hub-field__form-text` and `.hub-field__feedback`, none of which the signature component's own stylesheet defines. You are adopting part of a design system to get a signature field. Budget for that.

### The forms stylesheet is a required setup step

One line in the application's global stylesheet, and it is easy to miss because no install instruction mentions it:

```scss
// styles.scss
@use 'ng-hub-ui-forms/styles';
```

The forms package says so in its own header: "Import this ONCE in your application styles. It provides the canonical design tokens and the shared field chrome consumed by every ng-hub-ui-forms component." The signature template's root element is `class="hub-field hub-signature"` and it renders `.hub-field__form-text` (helper text) and `.hub-field__feedback` (validation messages) — all three defined in the forms package's `_field.scss`, none of them in `signature.component.scss`. Without that import the helper text and the error list render as unstyled default text under a canvas that otherwise looks correct.

`@use 'ng-hub-ui-signature/styles'` does **not** cover this. That entry point forwards exactly one theming mixin and emits no chrome.

### Registration: NgModule to standalone import

**Before** — the component is reachable only through `SignaturePadModule`:

```ts
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SignaturePadModule } from 'angular2-signaturepad';

import { AppComponent } from './app.component';
import { ConsentComponent } from './consent.component';

@NgModule({
  declarations: [AppComponent, ConsentComponent],
  imports: [BrowserModule, SignaturePadModule],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

**After** — no NgModule ships. Import the component class where it is used:

```ts
// consent.component.ts
import { Component } from '@angular/core';
import { HubSignatureComponent } from 'ng-hub-ui-signature';

@Component({
  selector: 'app-consent',
  imports: [HubSignatureComponent],
  template: `<hub-signature label="Signature" ariaLabel="Signature" />`
})
export class ConsentComponent {}
```

If you still have NgModules, a standalone component is also valid in an NgModule's `imports` array.

> **Trap:** `provideHubSignature()` is not the successor to `SignaturePadModule`. It configures the clear/undo/redo action labels and nothing else. Registering it without importing `HubSignatureComponent` leaves `<hub-signature>` an unknown element.

> **Second trap:** if the field is used with `formControlName`, `ReactiveFormsModule` must be imported in the same component. `HubFormControl` declares its own `formControlName = input<string>()`, so Angular does not raise the usual "Can't bind to 'formControlName'" error when the directive is missing. `NgControl` then injects as `null`, no value accessor is registered, and the field silently never syncs with the form.

### Localized action labels

The library's documented path is the shared adapter from `ng-hub-ui-utils`, with the `HUBUI.SIGNATURE.ACTION.*` keys:

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

Add `HUBUI.SIGNATURE.ACTION.CLEAR`, `HUBUI.SIGNATURE.ACTION.UNDO`, `HUBUI.SIGNATURE.ACTION.REDO` and — since 22.3.0 — `HUBUI.SIGNATURE.KEYBOARD_HINT` to your language files. The last one is the instruction read out to screen-reader users on focus, explaining how to sign with the keyboard; leaving it out is safe but announces the instructions in English. Rewrite rather than translate it if your application renames those keys for its users.

That covers the three action buttons and the keyboard instructions, and nothing else. **`[ariaLabel]` is not translated by any of it.** It defaults to the hardcoded English literal `'Signature'`, with no `HUBUI.SIGNATURE.*` key behind it, and it is the accessible name of the drawing surface itself — so in a Spanish or bilingual application every signature field announces itself in English no matter how the adapter is wired. Bind it, on every field, to the same translated text you pass to `[label]`:

```html
<hub-signature [label]="'CONSENT.SIGNATURE' | transloco" [ariaLabel]="'CONSENT.SIGNATURE' | transloco" />
```

`provideHubSignature({ labels: { … } })` and the per-instance `[labels]` input exist, but with plain strings they are for single-language applications or a deliberate one-field exception. See [Static labels outrank the translation dictionary](#static-labels-outrank-the-translation-dictionary) for why — and note that if you pass reactive sources through `[labels]`, the containing object must live in a signal or a class property, never as an inline object literal in the template.

### Theming

The Sass entry point forwards one mixin:

```scss
@use 'ng-hub-ui-signature/styles' as hub;

.contract-form {
  @include hub.hub-signature-theme($border-radius: 0.75rem, $border-color: #ced4da);
}
```

Two mechanics to know.

The mixin emits its own `:where(.hub-signature)` selector internally, so do not nest it under `:root` — that produces a `:root :where(.hub-signature)` descendant rule, not a root token block. And every parameter defaults to `null` with each declaration guarded by `@if`, so an argument-less include emits nothing at all; since 22.3.0 it raises a Sass `@warn` saying so rather than compiling silently. Before 22.3.0 it also reached only 5 of the 11 `--hub-signature-*` tokens — see [Theming, and what it reaches](#theming-and-what-it-reaches).

**The `styles` path is not in the package's `exports` map.** The published `package.json` declares only `.` and `./package.json`; there is no `./styles` subpath. `@use 'ng-hub-ui-signature/styles'` works because Angular resolves Sass through `node_modules` load paths, which ignore `exports` — the file really is at `node_modules/ng-hub-ui-signature/styles/_index.scss`. A toolchain that resolves Sass through `pkg:` URLs, which do honour `exports`, will not find it. Calling it a "Sass entry point" is a convenience, not a package contract.

**Two stylesheets land on the same element with conflicting declarations at identical specificity.** The root div carries both `hub-field` and `hub-signature`: `_field.scss` gives `.hub-field` `display: flex` plus `gap: var(--hub-form-field-gap)`, while `signature.component.scss` gives `.hub-signature` `display: grid` plus `gap: var(--hub-ref-space-2, 0.5rem)`. Both stack children in a column, so the layout survives either way — but which `gap` token wins is decided by stylesheet injection order between the global forms sheet and the component's `ViewEncapsulation.None` styles, and that order is not stable between the dev server and a production build. Worth knowing before someone spends an afternoon on a spacing difference that only appears in the built app. If the gap matters, set it explicitly on your own wrapper class.

---

## 3. API equivalence table

Every exported member of `angular2-signaturepad` 4.0.2, and its status against `ng-hub-ui-signature` 22.2.0.

### Package and registration

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `angular2-signaturepad` (entry point) | `ng-hub-ui-signature` | **Renamed.** One entry point in `exports`, plus a Sass file at `ng-hub-ui-signature/styles` reachable only through `node_modules` load paths. |
| `angular2-signaturepad/signature-pad` (README subpath) | — | **Missing.** Already unresolvable in 4.0.2; no successor path exists. |
| `signature_pad@2.3.2` (peer dependency) | — | **Missing, and not needed.** No third-party drawing dependency. |
| `SignaturePadModule` | — | **Missing.** Import `HubSignatureComponent` directly. |
| — | `provideHubSignature()`, `HUB_SIGNATURE_CONFIG`, `defaultHubSignatureConfig`, `defaultHubSignatureLabels` | New. Action-label configuration only. |

### Component, selector, template

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `SignaturePad` (class and `@ViewChild` token) | `HubSignatureComponent` | **Renamed.** Standalone, `OnPush`, `ViewEncapsulation.None`, extends `HubFieldControl`. |
| `<signature-pad>` | `<hub-signature>` | **Renamed.** |
| Inline template `<canvas></canvas>` | Label, canvas, action row, helper text, validation feedback | **Different semantics.** Set `[controls]="false"` for a bare surface. CSS targeting `signature-pad canvas` must be retargeted to `.hub-signature__canvas` or the `--hub-signature-*` tokens. |
| (content projection) | — | **Missing.** The template contains no `<ng-content>`, so the forms library's projected `hubFormText` and `hubValidationError` templates — queried by the inherited `formTextTmp` / `errorTpts` — are silently dropped. Use `[formText]` and `[invalidFeedbackTemplateFn]` instead. |

### Configuration

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `[options]` (untyped `any` bag) | — | **Missing.** Every setting is a discrete typed signal input. |
| `options.canvasWidth` | — | **Missing.** Width is measured from the DOM; express it in CSS. |
| `options.canvasHeight` | `[height]` (`input(160, numberAttribute)`) | **Different semantics.** Effectively initialisation-only — see below. |
| `options.penColor` | `[strokeColor]` (`input<string>('currentColor')`) | **Different semantics.** Colour is stored per stroke. The `currentColor` default is resolved against the surface when the stroke opens, so a concrete colour reaches the archive — before 22.3.0 the keyword was stored verbatim and painted black. |
| `options.minWidth` / `options.maxWidth` | `[strokeWidth]` (`input(2, numberAttribute)`) | **Different semantics.** Constant width; no velocity-based variation. |
| `options.velocityFilterWeight` | — | **Missing.** |
| `options.dotSize` | — | **Missing.** |
| `options.backgroundColor` | — | **Missing** as a bitmap fill. The element has a CSS background (`--hub-signature-bg`); the bitmap does not. |
| `options.throttle`, `options.minDistance` | — | **Missing.** No point thinning; every `pointermove` is recorded. |
| `options.onBegin` / `options.onEnd` | `(drawStart)` / `(drawEnd)` | **Renamed.** Outputs, not options. In the incumbent these two were overwritten by the wrapper anyway. |
| — | `[label]`, `[formText]`, `[readonly]`, `[controls]`, `[ariaLabel]`, `[labels]`, `[classlist]` | New. `[ariaLabel]` is the field's accessible name and defaults to the untranslated literal `'Signature'`. |
| — | `[labelType]` | **New, accepted and never read.** Declared as `input<HubLabelType>(Stacked)`, but the template never reads it: `Horizontal` and `Floating` are silently ignored and the label is always stacked. See below. |
| — | `[disabled]`, `[required]`, `[formControlName]`, `[showValid]`, `[validFeedback]`, `[invalidFeedbackTemplateFn]` | New, inherited from `HubFieldControl` / `HubFormControl`. `[validFeedback]` renders since 22.3.0 (accepted and ignored before it); `[showValid]` gates that message but still toggles a `--valid` class no stylesheet styles, so the drawing surface itself does not change; `[disabled]` collides with `FormControlName`'s own `disabled` input. |

### Outputs

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `(onBeginEvent)` — `EventEmitter<boolean>`, always `true` | `(drawStart)` — `output<HubSignatureDrawEvent>` | **Renamed, different payload.** Emitted after the first point is captured and painted, whether it came from a pointer or from the keyboard. Suppressed entirely while `readonly` or `disabled`. The payload was `PointerEvent` before 22.3.0. |
| `(onEndEvent)` — `EventEmitter<boolean>`, always `true` | `(drawEnd)` — `output<HubSignatureDrawEvent>` | **Renamed, different payload.** Emitted only when a stroke was committed, after the value has already been reported to the form. Does **not** fire for a stroke that was cancelled — `pointercancel`, Escape, or focus leaving the surface. Before 22.3.0 the payload was `PointerEvent` and `pointercancel` committed the stroke like a pen-up. |
| `onBegin()` (public method) | — | **Missing.** Subscribe to `(drawStart)`. |
| `onEnd()` (public method) | — | **Missing.** Subscribe to `(drawEnd)`. |
| — | `(valueChange)` — `output<string>` | New. Emits the canonical SVG, or `''`, after every user change including clear, undo and redo. |

### Data in and out

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `toDataURL(imageType?, quality?)` | `toDataUrl(type = 'image/png')` | **Renamed and different semantics.** No `quality` argument; different dimensions; different background handling; `'image/svg+xml'` no longer special-cased; and it exports whatever `redraw()` last painted, including an in-progress stroke. |
| `fromDataURL(dataURL, options?)` | — | **Missing.** Nothing accepts a raster data URL. |
| `toData(): Array<PointGroup>` | `toStrokes(): HubSignatureStroke[]` | **Renamed, incompatible payload.** The rename is deliberate — a compile error rather than a silent same-name mismatch. |
| `fromData(points: Array<PointGroup>)` | `fromStrokes(strokes: readonly HubSignatureStroke[]): void` | **Renamed, incompatible argument, different side effects.** |
| — | `toSvg(): string` | New. The canonical serialization and the form control's value. |
| — | `writeValue(value: string \| null): void` | New. `ControlValueAccessor` inbound path; parses this library's own SVG dialect only. |

### Imperative methods

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `clear()` | `clear()` | **Covered, with a difference.** Also resets the redo stack and reports the empty value to the form; returns early when there is nothing to clear. |
| `isEmpty()` | `isEmpty()` | **Covered, with a difference.** Counts committed strokes; a stroke still in progress does not count until pointerup. |
| `resizeCanvas()` | `resizeCanvas()` | **Same name, different semantics.** The incumbent ends with `clear()`; the replacement re-measures and repaints. See below — this is not simply an improvement. |
| `off()` | — | **Missing.** Closest intent: `[readonly]="true"` or `[disabled]="true"`. |
| `on()` | — | **Missing.** Set those inputs back to `false`. |
| `set(option, value)` | — | **Missing.** No runtime option setter; options are template bindings. |
| `queryPad()` | — | **Missing, with nothing to escape to.** No wrapped library exists. |
| — | `undo()`, `redo()` | New. Both return early when there is nothing to undo or redo. |
| — | `startStroke()`, `moveStroke()`, `finishStroke()`, `cancelStroke()` | New. Public because the template binds them; not intended as a host API. `cancelStroke()` (22.3.0) throws away the stroke in progress without reporting it. |
| — | `registerOnChange()`, `registerOnTouched()`, `setDisabledState()`, `handleBlur()`, `getInvalidFeedbackTemplate()`, `isInvalid` / `isValid` / `showsValid` / `errors`, `show()` / `hide()` / `toggle()` / `hidden`, `id`, `onChange` / `onTouched` | New, inherited from the forms base classes. |

### Lifecycle

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `ngAfterContentInit()` — applies `canvasWidth`/`canvasHeight`, constructs the `signature_pad` instance | `ngAfterContentInit()` — inherited; wires validation templates and derives `required` | **Different semantics.** Canvas sizing now happens once in `afterNextRender(() => this.resizeCanvas())` from the constructor, i.e. later than the incumbent's content-init sizing. |
| `ngOnDestroy()` — sets `canvas.width` and `canvas.height` to 0 | `ngOnDestroy()` — inherited; completes the destroy subject | **Covered.** No host action required. |

### Types

| angular2-signaturepad | ng-hub-ui-signature | Status |
| --- | --- | --- |
| `Point` — `{ x, y, time }` (runtime objects also carry `color`) | `HubSignaturePoint` — `{ x, y, pressure }` | **Different.** `time` dropped, `pressure` added, different coordinate frame. `pressure` is captured and then discarded — it never reaches the form value, never survives a round trip, and never affects a pixel. |
| `PointGroup` — `Array<Point>` | `HubSignatureStroke` — `{ points, color, width }` | **Different.** An array becomes an object that carries its own style. |
| — | `HubSignatureConfig`, `HubSignatureConfigOverride`, `HubSignatureLabel`, `HubSignatureLabels`, `HubSignatureLabelSource`, `HubSignatureResolvedLabels` | New. Since 22.3.0 the two label interfaces carry a fourth member, `keyboardHint`; everything the library accepts takes a `Partial<…>`, so only a fully annotated label object has to change. |
| — | `HubSignatureDrawEvent` — `PointerEvent \| KeyboardEvent` | New in 22.3.0. The payload of `(drawStart)` and `(drawEnd)`, now that a stroke can be written with the keyboard. Narrow with `instanceof` when the input device matters. |

All of these are exported with `export type { … }`, not as values — see the note on `verbatimModuleSyntax` in [4.5](#45-converting-stored-todata-output).

---

## 4. Before and after

### 4.1 Template with both callbacks

**Before**

```html
<signature-pad
  [options]="signaturePadOptions"
  (onBeginEvent)="drawStart()"
  (onEndEvent)="drawComplete()">
</signature-pad>
```

**After**

```html
<hub-signature
  label="Signature"
  ariaLabel="Signature"
  [height]="300"
  [strokeWidth]="5"
  [strokeColor]="'#000000'"
  [controls]="false"
  (drawStart)="drawStart($event)"
  (drawEnd)="drawComplete($event)" />
```

`[controls]="false"` reproduces the incumbent's bare surface; leaving it at its default `true` gives a clear/undo/redo row. `[strokeColor]` is bound explicitly on purpose — see [The stroke colour that reaches the archive](#the-stroke-colour-that-reaches-the-archive). `ariaLabel` is bound explicitly too, because it is the accessible name and its default is an untranslated English literal.

### 4.2 Options bag and imperative handle

**Before**

```ts
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { SignaturePad } from 'angular2-signaturepad';

@Component({
  selector: 'app-consent',
  template: `
    <signature-pad
      [options]="signaturePadOptions"
      (onBeginEvent)="drawStart()"
      (onEndEvent)="drawComplete()">
    </signature-pad>
    <button type="button" (click)="clear()">Clear</button>
  `
})
export class ConsentComponent implements AfterViewInit {
  @ViewChild(SignaturePad) signaturePad: SignaturePad;

  signature = '';

  signaturePadOptions: Object = {
    minWidth: 5,
    canvasWidth: 500,
    canvasHeight: 300
  };

  ngAfterViewInit(): void {
    this.signaturePad.set('minWidth', 5);
    this.signaturePad.clear();
  }

  drawStart(): void {
    console.log('begin drawing');
  }

  drawComplete(): void {
    this.signature = this.signaturePad.toDataURL();
  }

  clear(): void {
    this.signaturePad.clear();
  }
}
```

**After**

```ts
import { Component, signal, viewChild } from '@angular/core';
import { HubSignatureComponent, type HubSignatureDrawEvent } from 'ng-hub-ui-signature';

@Component({
  selector: 'app-consent',
  imports: [HubSignatureComponent],
  template: `
    <hub-signature
      class="consent-signature"
      label="Signature"
      ariaLabel="Signature"
      [height]="300"
      [strokeWidth]="5"
      [strokeColor]="'#000000'"
      (drawStart)="drawStart($event)"
      (drawEnd)="drawComplete($event)"
      (valueChange)="signature.set($event)" />
  `,
  styles: `
    /* canvasWidth: 500 has no input counterpart. Width is measured from the
       DOM, so it is expressed here — and fixed, because stored coordinates are
       absolute and only reload faithfully at the same rendered width. */
    .consent-signature { display: block; width: 500px; }
  `
})
export class ConsentComponent {
  /** Imperative handle; the equivalent of @ViewChild(SignaturePad). */
  readonly pad = viewChild.required(HubSignatureComponent);

  /** Canonical value: the SVG serialization, not a PNG data URL. */
  readonly signature = signal('');

  drawStart(event: HubSignatureDrawEvent): void {
    // The payload is PointerEvent | KeyboardEvent since 22.3.0, because the same
    // outputs cover the keyboard signing path. Narrow before reading pointer members.
    console.log('begin drawing', event instanceof PointerEvent ? event.pointerType : 'keyboard');
  }

  drawComplete(event: HubSignatureDrawEvent): void {
    // The stroke is committed and the value already reported at this point,
    // so toSvg() and toStrokes() are safe to read here. A cancelled stroke
    // never reaches this handler.
    console.log(this.pad().toSvg());
  }
}
```

Notes on the diff:

- `set('minWidth', 5)` and the whole options bag become bindings. No runtime setter exists.
- The `clear()` in `ngAfterViewInit` was normalising pad state; a fresh field is already empty, and `clear()` returns early when there is nothing to clear.
- The manual Clear button is redundant unless you set `[controls]="false"`.

### 4.3 The form-control version

The component is a `ControlValueAccessor`, which the incumbent never was:

```ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HubSignatureComponent } from 'ng-hub-ui-signature';

@Component({
  selector: 'app-consent-form',
  imports: [ReactiveFormsModule, HubSignatureComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <hub-signature
        formControlName="signature"
        label="Signature"
        ariaLabel="Signature"
        formText="Sign inside the box using your finger, pen or mouse."
        [strokeColor]="'#000000'"
        [height]="300" />

      <button type="submit" [disabled]="form.invalid">Send</button>
    </form>
  `
})
export class ConsentFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    // The control's value is the SVG string produced by toSvg().
    signature: ['', Validators.required]
  });

  submit(): void {
    // Reloadable through writeValue() only into a field rendered at the same
    // width — the stored coordinates are absolute.
    console.log(this.form.value.signature);
  }
}
```

The required marker is derived from the control's validators, and invalid feedback renders inside the field shell — as text only. There is no error border or ring on the canvas; see [The invalid state never shows on the drawing surface](#the-invalid-state-never-shows-on-the-drawing-surface).

Note also: do **not** disable this field with `[disabled]` while it is bound to `formControlName`. Use `control.disable()` — see [`[disabled]` collides with reactive forms](#disabled-collides-with-reactive-forms).

### 4.4 Capturing an image on pen-up

**Before**

```ts
drawComplete(): void {
  // PNG base64, canvasWidth × canvasHeight, backgroundColor painted in.
  this.save(this.signaturePad.toDataURL());
}
```

**After**

```ts
drawComplete(event: HubSignatureDrawEvent): void {
  // Canonical serialization. Prefer this for storage.
  this.save(this.pad().toSvg());

  // Raster export. No quality argument. The bitmap is
  // logicalWidth × height × devicePixelRatio, with a transparent background
  // and constant-width polyline strokes.
  const png = this.pad().toDataUrl('image/png');
}
```

For value capture, `(valueChange)` is the better target than `(drawEnd)`: it also fires on clear, undo and redo, which `drawEnd` does not. And `(drawEnd)` or `(valueChange)` are the only two points at which `toDataUrl()` is guaranteed to hold a committed bitmap — see [`toDataUrl()` can capture a half-finished stroke](#todataurl-can-capture-a-half-finished-stroke).

### 4.5 Converting stored `toData()` output

If you persisted point groups rather than images, they can be converted. Two things the type declarations do not tell you.

First, stored points carry a `color` field at runtime even though the published `Point` type declares only `x`, `y` and `time`.

Second, the two libraries use different coordinate frames. Both are in CSS pixels relative to the canvas box, but the incumbent's frame is the fixed `canvasWidth` × `canvasHeight`, while the replacement's is `logicalWidth` × `[height]` — and `logicalWidth` is **the width measured at the last `resizeCanvas()` call**, which happens once from `afterNextRender()` in the constructor unless the host calls it again. It is not the width the element happens to have when the user signs. `getPoint()` normalises every point into that stored frame:

```ts
x: ((event.clientX - rect.left) * this.logicalWidth) / Math.max(1, rect.width)
```

So a field first rendered inside a closed modal, where `getBoundingClientRect().width` is 0 and `logicalWidth` falls back to the hardcoded 320, captures into a 320-wide frame however wide it later lays out. That is also why reading the `viewBox` back, as the restore snippet below does, is the right way to learn the frame rather than assuming the CSS width.

```ts
import type { HubSignatureStroke } from 'ng-hub-ui-signature';

/**
 * Runtime shape of a stored signature_pad 2.3.2 payload. `_strokeUpdate` and
 * `_strokeEnd` write `color` on every point; the published `Point` type omits it.
 */
type LegacyPoint = { x: number; y: number; time: number; color?: string };
type LegacyPointGroups = LegacyPoint[][];

/** Source and target coordinate frames, in CSS pixels. */
interface Frame {
  legacyWidth: number;
  legacyHeight: number;
  hubWidth: number;
  hubHeight: number;
}

/**
 * Maps legacy point groups onto hub strokes.
 *
 * `time` has no counterpart and is discarded. `pressure` has no source and is
 * set to the same 0.5 the component itself uses when a device reports none.
 * `width` is not stored per point by signature_pad, so it must be supplied.
 */
export function fromLegacyPointGroups(
  groups: LegacyPointGroups,
  frame: Frame,
  fallbackColor: string,
  width: number
): HubSignatureStroke[] {
  const scaleX = frame.hubWidth / frame.legacyWidth;
  const scaleY = frame.hubHeight / frame.legacyHeight;

  return groups
    .filter((points) => points.length > 0)
    .map((points) => ({
      points: points.map(({ x, y }) => ({
        x: x * scaleX,
        y: y * scaleY,
        pressure: 0.5
      })),
      color: points[0].color ?? fallbackColor,
      width
    }));
}
```

`import type` is not a stylistic choice here. `HubSignatureStroke` is published under `export type { … }` in the package's public API, so a value import of it is a compile error (TS 1484) under `verbatimModuleSyntax` — the default in most Angular 21 setups.

Restoring it:

```ts
// The target frame is not a public property. Read it from an empty field's
// viewBox: toSvg() serializes with the last measured width and the bound height.
const [, , hubWidth, hubHeight] = /viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/
  .exec(this.pad().toSvg())!
  .slice(1)
  .map(Number);

// Guard the hidden-field trap before touching the archive. `logicalWidth` stays
// at the hardcoded 320 fallback until resizeCanvas() has measured a laid-out
// element, so an untouched field in a zero-width layout serializes
// viewBox="0 0 320 160". Converting against that rescales everything into a
// 320-wide frame, silently and permanently.
const canvas = this.host.nativeElement.querySelector('.hub-signature__canvas') as HTMLCanvasElement;
const rendered = Math.round(canvas.getBoundingClientRect().width);
if (!rendered || rendered !== hubWidth) {
  throw new Error(
    `Signature field not measured: viewBox width ${hubWidth}, rendered ${rendered}. Aborting conversion.`
  );
}

const frame = { legacyWidth: 500, legacyHeight: 300, hubWidth, hubHeight };

// fromStrokes() is a programmatic write: it repaints and clears the redo stack
// but reports no user change to Angular forms — asserted by the library's test
// 'does not report a fromStrokes write as a user form change'
// (signature.component.spec.ts:181). Set the control value yourself.
this.pad().fromStrokes(fromLegacyPointGroups(stored, frame, '#000000', 2));
this.form.controls.signature.setValue(this.pad().toSvg());
```

Run this once, at a known and verified field width, and store the resulting SVG — not at every load.

---

## 5. What does not migrate

### `fromDataURL()`: no inbound path for raster signatures

There is no method, input or option in 22.2.0 that accepts a raster data URL. The only inbound path is `writeValue()`, which runs `parseHubSignature()` — a regex reader over this library's own SVG dialect (`<path d="M x y L x y …" stroke="…" stroke-width="…">`). Hand it a PNG or JPEG base64 string and it matches no `<path>`, so it returns an empty stroke list.

**Consequence:** the pad renders empty, nothing throws and nothing warns, while the form control still holds the original data URL — `writeValue()` never calls `onChange`. The raster value is overwritten **only when the user completes a stroke**, at which point `notifyValueChange()` replaces it with SVG. Clear, undo and redo do not overwrite it: with `strokes` empty, all three return early without calling `notifyValueChange()`. So a user who presses Clear — the most likely reaction to a field that renders blank when it should show a signature — changes nothing at all, the buttons give no feedback, and the stale data URL survives in the control.

The sharper consequence runs the other way. A control initialised with `data:image/png;base64,…` and `Validators.required` reports `form.valid === true`, because the value is a non-empty string, while `isEmpty()` returns `true` and the canvas is blank. A "sign here" gate goes green on a field that visibly contains nothing, the user has no way to reset it, and the only path to a clean value is to draw.

**Workaround:** detect a stored value starting with `data:image/` and render it as an `<img>` instead of mounting the editable field; or require re-capture; or dual-store `toSvg()` and `toDataUrl()` through a transition period. If the field must be mounted, add a validator that rejects values which are not this library's SVG, so a raster leftover cannot satisfy `required`. A bitmap cannot be reverse-engineered into strokes, so there is no conversion path.

### `toDataURL('image/svg+xml')` silently returns a PNG

`signature_pad` 2.3.2 special-cases that type: `toDataURL` switches on `'image/svg+xml'` and returns `this._toSVG()`, a `data:image/svg+xml;base64,` document. The replacement's `toDataUrl(type)` passes the argument straight to `canvas.toDataURL`, which ignores unsupported types and returns a PNG. **Consequence:** incumbent code doing `toDataURL('image/svg+xml')` compiles after the casing fix, runs without error, and quietly produces the wrong format. **Workaround:** replace every such call with `toSvg()`, which returns the SVG document as plain text rather than a data URL.

### `toDataURL(imageType, quality)`: the quality argument, the dimensions and the background

Three separate losses in the raster export. The `quality` second argument is gone from the signature, so JPEG and WEBP compression can no longer be tuned. The output size changes from the fixed `canvasWidth × canvasHeight` to `logicalWidth × height × devicePixelRatio`, typically 2–3× larger on current screens. And the background changes: `signature_pad.clear()` paints `backgroundColor` into the bitmap with `fillRect`, whereas the replacement's `redraw()` only calls `clearRect` — the white you see on screen is `background: var(--hub-signature-bg)` on the element, which is not part of the bitmap. **Consequence:** a PDF or email pipeline that expected an opaque, fixed-size PNG now receives a transparent, differently sized one. **Workaround:** composite the exported PNG onto a solid ground yourself, and re-tune any downstream layout that assumed fixed pixel dimensions.

### `toDataUrl()` can capture a half-finished stroke

`toDataUrl()` does not render anything of its own; it reads whatever `redraw()` last painted, and `redraw()` paints the committed strokes **plus the in-progress one** (`drawingStroke()`). **Consequence:** exporting from inside a `pointermove` handler — a live preview, a throttled autosave, a "capture as they draw" thumbnail — yields a bitmap containing a stroke the user has not finished and that is not yet in the form value, so the PNG and the SVG disagree. **Workaround:** export only from `(drawEnd)` or `(valueChange)`; those are the two points at which the stroke history and the bitmap are guaranteed to match.

### `toData()` / `fromData()`: renamed, with an incompatible payload

The methods are `toStrokes(): HubSignatureStroke[]` and `fromStrokes(strokes: readonly HubSignatureStroke[]): void`. The rename is deliberate, and the source says so: reusing `toData` would let a migration compile and fail silently wherever the value is typed `any`. So you get a loud `Property 'toData' does not exist on type 'HubSignatureComponent'` instead of corrupt data. The payload differs in three ways: `Array<Array<{x, y, time}>>` becomes `{ points: [{ x, y, pressure }], color, width }[]`; `time` has no counterpart and is discarded outright; and the coordinate frame changes from the fixed `canvasWidth`/`canvasHeight` to `logicalWidth` and the bound height. **Consequence:** any capability built on `time` — replay at capture speed, signing-duration heuristics, forensic timing — is gone with no substitute, and TypeScript catches the shape mismatch but not the frame mismatch, since both are `number`. **Workaround:** convert once with the rescaling shown in [4.5](#45-converting-stored-todata-output); move timing requirements to a server-side record captured alongside the signature.

Do not read `pressure` as compensation for the lost variable stroke width. It is captured from `PointerEvent.pressure` and then discarded everywhere it would matter: `serializeHubSignature()` emits only `M`/`L` coordinates, `parseHubSignature()` hardcodes `pressure: 0.5` on every point it reads back, and `redraw()` paints with the constant `stroke.width`. Pressure never reaches the form value, never survives a round trip, and never affects a pixel — `toStrokes()` is pressure-bearing only for strokes drawn in that same session.

`fromStrokes()` also differs in side effects: it deep-copies, clears the redo stack and repaints, but never calls `onChange` or `onTouched` and never emits `(valueChange)`. **Consequence:** the pad shows a drawing while the Angular control still holds its previous value. **Workaround:** set the control value yourself after the call, or write an SVG string through the control instead.

### `[options]` and the stroke rendering it controlled

There is no options input under any name; each setting is a discrete typed signal input, and only three have counterparts (`penColor` → `[strokeColor]`, `canvasHeight` → `[height]`, roughly `minWidth`/`maxWidth` → `[strokeWidth]`). Gone entirely: `velocityFilterWeight` and the `minWidth`/`maxWidth` pair that drove velocity-based variable stroke width; `dotSize`; `throttle` and `minDistance`. Bézier smoothing goes with them — the replacement's `redraw()` emits `moveTo`/`lineTo` polylines with round caps and joins, and `serializeHubSignature()` writes only `M` and `L` commands. **Consequence:** signatures will look visibly different from the ones already on file, and with no point thinning, every `pointermove` is recorded at full float precision — real path data reads `L 233.33333333333334 88.66666666666667`, roughly 40 bytes per point, so a few seconds of signing produces tens of KB of SVG. Redraw cost also grows with the signature, because `moveStroke()` repaints the entire committed history on every move. **Workaround:** check the database column type before migrating and any request-size limit on the receiving endpoint; test drawing latency on the worst hardware in the field, not a development laptop; accept the visual change or keep legacy captures as images.

### `options.backgroundColor`

No equivalent as a painted fill. The element does have a background — `.hub-signature__canvas` sets `background: var(--hub-signature-bg)`, resolving through `--hub-input-bg` and `--hub-sys-surface` to `#fff` — so the field is not see-through on screen. What is transparent is the bitmap. **Consequence:** only the `toDataUrl()` export lacks a background. **Workaround:** set `--hub-signature-bg` for the on-screen colour, and composite manually for the exported PNG.

### `options.canvasWidth`, and why stored SVGs are width-bound

There is no width input and no programmatic way to set one. `resizeCanvas()` reads `getBoundingClientRect()` and stores the result as the private `logicalWidth`; the field is fluid and follows CSS layout, so `canvasWidth: 500` becomes a CSS rule. The consequence runs deeper than styling. Stroke coordinates are absolute in that measured frame, `toSvg()` serializes `viewBox="0 0 logicalWidth height"`, and `writeValue()` parses the paths without ever reading the `viewBox` back. **Consequence:** a stored SVG only reloads faithfully into a field of the same rendered width. Load a signature captured at 800px into a field rendered at 340px and it repaints oversized and clipped; the moment the user adds a stroke or presses undo, `toSvg()` re-serializes with a `viewBox` of 340 while the coordinates still run to 800, and the stored signature is permanently inconsistent. Nothing throws. Displaying a stored SVG as an image is unaffected — it scales — the hazard is the editable field. **Workaround:** lock the field's rendered width in CSS across every breakpoint where a signature can be edited, or treat a loaded signature as read-only and require re-capture to change it. Test any responsive editing flow at two widths before shipping.

### `options.canvasHeight` → `[height]` is initialisation-only

`canvas.width`, `canvas.height` and `canvas.style.height` are assigned in exactly one place — `resizeCanvas()` — which is called once, from `afterNextRender()` in the constructor. No effect watches `height()`. **Consequence:** changing `[height]` at runtime resizes nothing, while `toSvg()` reads `this.height()` live and immediately starts emitting a different `viewBox` height for unchanged geometry, distorting the stored signature vertically from that point on. **Workaround:** treat `[height]` as static. If it must change, call `resizeCanvas()` afterwards, and be aware that existing strokes are not rescaled either way.

### `resizeCanvas()`: same name, different behaviour in both directions

The incumbent's `resizeCanvas()` ends with `signaturePad.clear()`, with its own comment explaining why ("otherwise `isEmpty()` might return incorrect value") — it destroys the signature deliberately. The replacement re-measures the element, rewrites `logicalWidth`, rescales the bitmap to logical size × `devicePixelRatio`, and repaints the retained strokes at their raw stored values with no transform. **Consequence:** code that called `resizeCanvas()` as a clear-and-resize now keeps the drawing; and, more dangerously, calling it while a signature exists reframes that signature — the strokes are drawn against a new width they were not captured in, and `toSvg()` then emits a `viewBox` that no longer matches the geometry inside it. Neither library ever registered a window-resize listener of its own; the incumbent's `on()`/`off()` bind and unbind only the canvas mouse and touch handlers plus a document-level `mouseup`. **Workaround:** call `resizeCanvas()` only while the field is empty — after opening a modal, switching to a tab, expanding an accordion — and never bind it to window resize while a signature is on the canvas. Call `clear()` explicitly wherever clearing was the old intent.

Related: a field hidden at first render gets the wrong geometry. `afterNextRender()` runs `resizeCanvas()` once; inside a closed modal or an inactive tab, `getBoundingClientRect().width` is 0, so `logicalWidth` falls back to the hardcoded 320 while the element later lays out at its real width. There is no `ResizeObserver`. Call `resizeCanvas()` yourself when the field becomes visible, while it is still empty.

### `set(option, value)`

No runtime option setter exists. Options are signal inputs and change through template bindings: `[strokeWidth]`, `[strokeColor]`, `[height]`, `[readonly]`. `set('canvasWidth', n)` has no counterpart at all, since width is CSS-driven. **Consequence:** any code path that reconfigured the pad imperatively — from a settings dialog, a theme switch, a pen-size picker — has to move that state into a component property or signal. **Workaround:** bind the inputs to component state. Note that `[strokeColor]` and `[strokeWidth]` are captured into each stroke at `startStroke()`, so existing strokes keep the style they were drawn with permanently — `signature_pad` also stored `color` per point and restored it in `fromData()`, so this part is a match, but `width` was not stored there and now is.

### `on()` and `off()`

No imperative handler binding or unbinding. In intent, `off()` becomes `[readonly]="true"` (`startStroke()` returns early) or `[disabled]="true"`. **Consequence:** it is an input rather than a method call, and it does more than the incumbent did — it changes styling, sets `aria-readonly` / `aria-disabled`, and disables the built-in action buttons. **Workaround:** move the on/off state into a bound signal or property, and check whether the extra visual and ARIA effects are wanted at each call site.

### `queryPad()`

The escape hatch is gone because the thing it escaped to is gone. The replacement wraps no third-party library. **Consequence:** any host code reaching through `queryPad()` into the `signature_pad` instance — assigning `penColor`, reading `_data`, calling `_addPoint` — must be rewritten against the component's own API or deleted. **Workaround:** inventory those call sites before you start; after the Angular upgrade itself, this is usually the largest remaining cost.

### `onBegin()` and `onEnd()` as methods

The public bridge methods are gone. `drawStart` is emitted at the end of `startStroke()` and `drawEnd` at the end of `finishStroke()`; no public method triggers either. **Consequence:** this only affects code that called `pad.onBegin()` / `pad.onEnd()` directly or reassigned them. **Workaround:** subscribe to `(drawStart)` / `(drawEnd)`.

### `SignaturePadModule`

No NgModule ships. **Consequence:** the trap noted in [section 2](#registration-ngmodule-to-standalone-import) — `provideHubSignature()` looks like the successor and is not; it configures action labels only. **Workaround:** import `HubSignatureComponent` in every component that uses the selector.

### `Point` and `PointGroup`

`Point` → `HubSignaturePoint`: both are `{ x, y, … }`, but the third field is a different thing. `time` (epoch milliseconds, used to compute velocity) is dropped; `pressure` (from `PointerEvent.pressure`, defaulting to `0.5`) is added — and, as noted above, never used for anything. `PointGroup` → `HubSignatureStroke`: a `PointGroup` *is* an array; a `HubSignatureStroke` is an object carrying its own `color` and `width`. **Consequence:** `Array<PointGroup>` is not assignable to `HubSignatureStroke[]` in either direction, and a naive structural mapping compiles only after inventing a pressure value while silently losing all timing data. **Workaround:** use an explicit converter like the one in [4.5](#45-converting-stored-todata-output).

### `[labelType]` is accepted and never honoured

The input is declared — `labelType = input<HubLabelType>(this._labelTypes.Stacked)` — so it compiles and type-checks on `<hub-signature>`. But `signature.component.html` never reads it: grep returns zero hits. The template toggles only `--readonly`, `--disabled`, `--invalid` and `--valid`; the sibling fields implement layout by toggling `hub-field--horizontal` (and a Floating branch), and the signature template does neither. Worse, its label carries `class="hub-signature__label"` while the forms grid rules target `> .hub-field__label`, so even the correct modifier class would not lay the label out horizontally. **Consequence:** a team migrating a horizontal or floating-label form binds `[labelType]`, sees a stacked label, and goes hunting through `ng-hub-ui-forms` for a bug that is not there. `Horizontal` and `Floating` are silently ignored. **Workaround:** write the layout in your own CSS around the field, and do not bind `[labelType]` at all, so nobody later reads it as a working setting.

### The keyboard path, and what it costs

**Before 22.3.0 there was none.** The canvas carried `tabindex="0"` and the template bound only pointer events, so the field was focusable and inoperable — a required control that could not satisfy WCAG 2.1.1. The incumbent had the same limitation, binding mouse and touch only.

Since 22.3.0 a stroke can be written with the keyboard: arrow keys carry a visible pen across the surface, Shift takes a coarser step, Space or Enter lower and lift it, and Escape abandons the stroke in progress. The result is a normal stroke — same `HubSignatureStroke`, same `toSvg()` output, same reported value, same `(drawStart)` / `(drawEnd)` — and it obeys `readonly` and `disabled` like the pointer path. The instructions are announced through `aria-describedby`, translated under `HUBUI.SIGNATURE.KEYBOARD_HINT`.

Two things to weigh before you count it as solved.

**The canvas now carries `role="application"`.** It has to: a canvas with `tabindex` is not a form control, so NVDA and JAWS stay in browse mode over it and swallow the arrow keys for document navigation, which would leave the keyboard path unreachable by exactly the users it exists for. The cost is that assistive technology hands the field its keystrokes wholesale while focus is inside, so the screen reader's own navigation commands do not apply there. That is the correct trade for a drawing widget, but it is a trade.

**A keyboard signature does not look like a handwritten one.** It is a polyline of axis-aligned segments, and it will not resemble the signer's hand. Whether that satisfies a legal or evidentiary requirement is a question for whoever owns that requirement, not a question the component can answer. If your signature is a legal gate, decide explicitly whether a keyboard-drawn mark counts, and say so in your accessibility statement either way.

If the accessibility improvements are part of the case for migrating, be precise about which ones. Real: the keyboard drawing path, `aria-required`, `aria-invalid`, `aria-readonly` and `aria-disabled` on the canvas, focus-visible styling, and the validation feedback region with `role="alert"`.

**Label association is not real.** The template renders `<label [for]="id" class="hub-signature__label">` pointing at `<canvas [id]="id">`, and `<canvas>` is not a labelable element in HTML — `for` associates only with `button`, `input`, `meter`, `output`, `progress`, `select` and `textarea`. No programmatic association is created and clicking the label does nothing. The field's accessible name comes solely from `[attr.aria-label]="ariaLabel()"`, which defaults to the hardcoded English literal `'Signature'` and is not routed through the `HUBUI.SIGNATURE.*` dictionary. So a Spanish form shows "Firma del titular" and announces "Signature" — the visible label and the accessible name disagree, which is a WCAG 2.5.3 (Label in Name) problem. This one is not fixed in 22.3.0.

**Workaround:** bind `[ariaLabel]` to the same translated text as `[label]` on every field, and treat the visible label as decorative for assistive technology. Clicking the label will still do nothing; if that matters, put the click target in your own markup and call `focus()` on `.hub-signature__canvas`.

### The invalid state never shows on the drawing surface

`.hub-signature--invalid` and `.hub-signature--valid` are bound on the root div, and neither is styled by anything. `signature.component.scss` defines rules for `--readonly`, `--disabled` and `:focus-visible` only. The forms package's red border and focus ring hang off `.hub-field__control--invalid` (and its `--valid` mirror), a class this template never applies — its canvas is `.hub-signature__canvas`.

**Consequence:** a required-but-empty signature prints an error message under a canvas that looks exactly like a valid one. Every other `ng-hub-ui` field turns red; this one does not. On a long form the message scrolls out of view and the user sees a submit button that refuses to work with no visible reason. `[showValid]` is affected the same way in the other direction: it toggles `hub-signature--valid`, which no stylesheet styles, so the surface never shows the success state — since 22.3.0 you at least get the `[validFeedback]` message below the field, but the canvas itself does not change.

**Workaround:** write the rule yourself, once, in the global stylesheet:

```scss
.hub-signature--invalid .hub-signature__canvas {
  border-color: var(--hub-form-invalid-border-color);
}
.hub-signature--invalid .hub-signature__canvas:focus-visible {
  border-color: var(--hub-form-invalid-border-color);
  box-shadow: 0 0 0 var(--hub-form-focus-ring-width) var(--hub-form-invalid-focus-ring-color);
}
```

### A single tap commits a stroke

`finishStroke()` does not discard one-point strokes; it pads them. A stroke with a single point gets a second point at `x + 0.01` and is pushed onto the history. **Consequence:** an accidental tap, a palm contact or a stray click makes `isEmpty()` return `false`, reports a value to the form and satisfies `Validators.required` with a mark roughly one hundredth of a pixel wide that nobody can see. A required signature can therefore be "signed" by a stray touch, and the form will submit. (Up to 22.2.0 the `pointercancel` behaviour described below widened this considerably; since 22.3.0 a cancelled pointer no longer contributes, but a completed tap still does.) **Workaround:** if the signature is a legal gate, validate it beyond `required` — reject values whose total path length or point count is below a threshold, computed from `toStrokes()` — and keep the visible clear/undo controls so a user can correct a stray mark they may not even see.

### `pointercancel` discards the partial stroke — but only since 22.3.0

Up to 22.2.0 the template wired `(pointercancel)="finishStroke($event)"`, the same handler as `pointerup`, so a cancelled pointer — an OS gesture taking over, a scroll takeover, palm rejection on a tablet — committed whatever had been drawn so far, reported it to the form and emitted `(drawEnd)`. A stray mark could be saved without the user intending it, and it satisfied a `Validators.required` signature gate. The incumbent had no `touchcancel` handling at all.

22.3.0 discards it instead, which is what `pointercancel` means: the interaction did not happen. Nothing is committed, no value is reported and `(drawEnd)` does not fire. Focus leaving the surface mid-stroke takes the same path. **If you are pinned below 22.3.0:** keep the undo control available (`[controls]` defaults to `true`), and test palm rejection explicitly before shipping to tablets.

Related, and unchanged: `touch-action: none` on the canvas means a scroll gesture started over the field draws instead of scrolling. On a mobile form where the box spans the viewport width, leave vertical margin or a scrollable region beside it.

### The stroke colour that reaches the archive

Up to 22.2.0, `[strokeColor]`'s `'currentColor'` default was used twice without ever being resolved. `redraw()` assigns `context.strokeStyle = stroke.color`, and the canvas 2D context cannot parse `currentColor` — an unparseable assignment is ignored per spec, so the on-screen ink was the context default, black, regardless of the CSS `color` around it. More consequentially, `serializeHubSignature()` wrote `stroke="currentColor"` verbatim into the persisted SVG, leaving an archived signature with no fixed ink colour: it rendered with whatever the display context supplied, which can mean invisible ink in a dark-themed viewer or an unexpected colour in a PDF whose preview looked correct.

Since 22.3.0 the keyword is resolved against the surface with `getComputedStyle()` when the stroke opens, so the colour written into the SVG is the one the signer saw, and `hub-signature-theme($color: …)` reaches the ink as its documentation always claimed. An explicitly bound colour is stored untouched, exactly as before.

**Still worth doing:** bind an explicit colour — `[strokeColor]="'#000000'"` — for anything evidentiary, so the archive does not depend on the theme in force on the day it was signed. **And check your existing archive:** signatures captured on 22.2.0 or earlier still contain `stroke="currentColor"`. Nothing rewrites them, `writeValue()` reads them back with that literal colour, and they will keep rendering unpredictably until you re-serialize them with a concrete colour.

### `[validFeedback]` renders since 22.3.0

Up to 22.2.0 the input existed on `HubFieldControl` — so it compiled and type-checked on `<hub-signature>` — while the template rendered only the `@if (isInvalid)` block. A field that previously showed a confirmation message bound the input, showed nothing, and sent someone hunting through the forms library for a bug that was not there.

22.3.0 renders the same `.hub-field__feedback--valid` block as every other field of the family, gated on `showsValid && validFeedback()`. It needs both halves: an opt-in `[showValid]="true"` (or the global `provideHubForms({ showValid: true })`) and a message to show, on a control that is touched and valid.

**Still true:** `[showValid]` also toggles `hub-signature--valid` on the wrapper, and no stylesheet in either package styles that class, so the drawing surface itself does not turn green — you get the message and nothing else. See [the section above](#the-invalid-state-never-shows-on-the-drawing-surface) for the matching gap on the invalid side, and write both rules yourself if you want the state on the canvas.

### `[disabled]` collides with reactive forms

`HubFieldControl` declares `disabled` as a `model(false)`, also written by `setDisabledState()`. Angular's own `FormControlName` directive declares an input named `disabled` too, whose setter logs the familiar dev-mode warning: "It looks like you're using the disabled attribute with a reactive form directive." Both directives sit on the same element, so a binding reaches both. **Consequence:** `[disabled]` on a `formControlName` field works, warns on every dev build, and leaves two sources of truth for the same state — the model input and the control's own disabled status, which can disagree. **Workaround:** drive it from the control (`control.disable()` / `control.enable()`), which routes through `setDisabledState()` and keeps one source of truth. Reserve `[disabled]` for fields not bound to a reactive control.

### Touched state, and the value accessor

`startStroke()` calls `event.preventDefault()` on pointerdown, which suppresses the focus the `tabindex` would otherwise grant. **Consequence:** a mouse or touch user never focuses the field at all, so no `focusout` ever fires and `onTouched()` runs only from `notifyValueChange()` — that is, after a completed stroke. In a pointer flow the field stays untouched until it is signed, `isInvalid` stays `false`, and no error renders until a parent `markAllAsTouched()` on submit. Any "show the error as they leave the field" behaviour you have today will not survive the swap for mouse and touch users.

Keyboard is the case that does work, and it is worth stating precisely because it is the opposite of what the pointer behaviour suggests. `HubFieldControl` declares `host: { '(focusout)': 'handleBlur($event)' }`, and Angular inherits host listeners from a decorated abstract base. The canvas carries `tabindex="0"` and the three action buttons are natively focusable, so a user who tabs into the field and then tabs on fires `focusout` on the host, `handleBlur()` runs `onTouched()`, the bound control is marked touched, `isInvalid` flips, and the `@if (isInvalid)` block renders — the OnPush view updates because `ngAfterContentInit` subscribes to `control.events` and calls `markForCheck()`. Tabbing past is exactly what *does* mark it touched. (The message renders as text only; there is still no border change.)

**Workaround:** call `markAllAsTouched()` at the point your UX expects the error to appear in mouse and touch flows.

Separately, the component provides no `NG_VALUE_ACCESSOR`; `HubFieldControl` self-registers by injecting `NgControl` with `{ self: true }` and assigning `this._control.valueAccessor = this`. **Consequence:** a host that applies another value-accessor directive on `<hub-signature>`, or that had provided its own accessor around `<signature-pad>`, silently loses one of the two. **Workaround:** remove any custom accessor wrapper you were using with the incumbent.

### Server-side rendering is not guarded on the inbound path

`resizeCanvas()` is browser-guarded — it runs from `afterNextRender()`. `writeValue()` is not: it calls `redraw()` unconditionally, and `redraw()` reaches for `canvas.getContext('2d')`. Angular's reactive forms call `writeValue()` on every bound field during server rendering, including one whose value is `''`. **Consequence:** any application on Angular Universal / `@angular/ssr` — likely, given the Angular 21 floor — has to prove this field renders on the server before committing to it, and nothing in the package's documentation gives a reason to look. **Workaround:** render a page containing the field on the server in a spike, before the migration is scheduled. If it fails, defer the field with `@defer (on viewport)` or render a static placeholder server-side and mount the editable field on the client only.

### Theming, and what it reaches

The component declares eleven `--hub-signature-*` custom properties: `bg`, `color`, `border-color`, `border-width`, `border-radius`, `focus-border-color`, `focus-shadow`, `label-color`, `label-font-size`, `font-size` and `actions-gap`. Up to 22.2.0 the `hub-signature-theme()` mixin accepted five parameters and could emit only those five declarations, so border width, focus shadow, label colour, label font size, font size and action gap had to be written as plain custom properties.

22.3.0 takes a parameter for each of the eleven. The six new ones are appended **after** the original five rather than grouped by meaning, so an existing positional include keeps resolving to the same tokens; if you are reading the signature to write a new include, prefer named arguments.

**Still true:** every parameter defaults to `null` behind an `@if` guard, so an argument-less include emits nothing at all. Since 22.3.0 it raises a Sass `@warn` saying so, rather than letting a developer who followed a no-argument snippet start debugging the build. And the mixin emits its own `:where(.hub-signature)` selector, so do not nest it under `:root`. The token defaults inherit `--hub-input-*` and `--hub-label-*`, so theming the surrounding form may already cover most of what you need.

### Static labels outrank the translation dictionary

In the label effect, `getStaticLabel()` returns a plain string immediately and consults `HubTranslationService` only when the label is not a string. **Consequence:** a static override supplied through `provideHubSignature({ labels: { clear: 'Borrar firma' } })` permanently outranks the `HUBUI.SIGNATURE.ACTION.*` dictionary and never updates on a language change. In a bilingual application the buttons stay in the hardcoded language forever, with no error. **Workaround:** use `provideHubTranslationAdapter()` from `ng-hub-ui-utils` with the `HUBUI.SIGNATURE.ACTION.CLEAR` / `.UNDO` / `.REDO` keys, or pass a reactive `HubSignatureLabelSource` rather than a string. Reserve plain-string overrides for single-language applications and deliberate one-field exceptions.

If you do pass reactive sources, mind where the containing object lives. The label effect reads `this.labels()` and rebuilds its subscription list on every run, unsubscribing the previous ones in `onCleanup`. An inline object literal in the template — `[labels]="{ clear: clearStream }"` — is a new object identity on every change-detection cycle, so the signal input reports a change, the effect re-runs, and every reactive label source is torn down and resubscribed, with a signal write inside the effect each time. Hold the object in a signal or a readonly class property, as the library's own spec does:

```ts
readonly signatureLabels = signal<Partial<HubSignatureLabels>>({ clear: this.clear$ });
```

### The stored artifact is now plain text

SVG values are hand-editable; PNG blobs were not, and the `time` field that could corroborate a capture is gone. **Consequence:** if your signatures are evidentiary, anyone with database or API access can retouch a stroke with a text editor and leave no trace in the artifact itself. **Workaround:** hash the value at rest, or apply a server-side signature over the stored document, and keep capture metadata (timestamp, user, IP, user agent) in a separate record.

### Maintenance profile of both packages

The case against the incumbent is that it has published nothing since 4.0.2 on 14 February 2022 and its README states the owner no longer uses or maintains it. The replacement's own `CHANGELOG.md` begins at 22.0.0 on 14 August 2026; it is a single-maintainer package, and its short history already includes a release that shipped with no `license` field (fixed in 22.1.1) and theming tokens that pointed at a `--hub-field-*` family no library declares, so they never resolved (fixed in 22.1.0). That may well be an acceptable trade — an actively maintained young package against an explicitly abandoned mature one — but make it knowingly.

---

## 6. Pre-flight checklist

- [ ] `npm view ng-hub-ui-signature versions` run, and the installed `types/ng-hub-ui-signature.d.ts` read, so the plan is budgeted against what is installable rather than against a changelog.
- [ ] Angular is on `>= 21`, with `ng-hub-ui-forms >= 22.0.0` and `ng-hub-ui-utils >= 22.8.0` installed — all three, not just the first two.
- [ ] `@use 'ng-hub-ui-forms/styles';` present exactly once in the application's global stylesheet, or the helper text and validation feedback render unstyled.
- [ ] The Sass toolchain confirmed to resolve `ng-hub-ui-signature/styles` through `node_modules` load paths — the package's `exports` map has no `./styles` subpath.
- [ ] An `--invalid` rule written by hand for `.hub-signature__canvas`; neither package styles the invalid or valid state on the drawing surface.
- [ ] The field's rendered gap checked in a production build, not only in the dev server — `.hub-field` and `.hub-signature` set conflicting `display`/`gap` at equal specificity.
- [ ] Every stored signature classified: raster data URLs (not editable, no conversion path), `toData()` point groups (convertible with rescaling), or nothing stored.
- [ ] A decision recorded for legacy raster signatures: read-only display, re-capture, or dual-store during a transition — and a validator that stops a leftover data URL from satisfying `required` on a visibly empty field.
- [ ] Any one-shot `toData()` conversion run against a field whose measured width is asserted first (`viewBox` width equal to the rendered width), never against a field inside a closed modal or inactive tab.
- [ ] `HubSignatureStroke` and the other types imported with `import type` — they are published under `export type`.
- [ ] All `queryPad()` call sites inventoried and rewritten or dropped.
- [ ] All `resizeCanvas()` call sites reviewed for the clear-versus-repaint reversal, and none of them left bound to window resize.
- [ ] `resizeCanvas()` called on visibility change for fields inside modals, tabs or accordions — and only while empty.
- [ ] `canvasWidth` converted to a CSS rule, and the field's rendered width locked across every breakpoint where a signature can be edited.
- [ ] `[strokeColor]` bound to a literal colour on every field that captures anything to be stored, and any signature captured on 22.2.0 or earlier checked for a literal `stroke="currentColor"` in the archive.
- [ ] `toDataURL('image/svg+xml')` call sites replaced with `toSvg()`, and `quality` arguments removed.
- [ ] Any raster export moved to `(drawEnd)` / `(valueChange)`; exporting during `pointermove` captures a half-finished stroke.
- [ ] Any PDF or email pipeline updated to composite the transparent PNG and to accept its new dimensions.
- [ ] The database column verified to hold tens of KB, and request-size limits checked on the receiving endpoint.
- [ ] `ReactiveFormsModule` imported wherever `formControlName` is used, and any custom value accessor around the old element removed.
- [ ] Disabling driven by `control.disable()`, not by `[disabled]`, on every reactive field.
- [ ] CSS targeting `signature-pad canvas` retargeted to `.hub-signature__canvas` or the `--hub-signature-*` tokens.
- [ ] `[controls]` set deliberately — it defaults to `true`.
- [ ] `[labelType]` not bound: horizontal and floating layouts are ignored and must be written in your own CSS.
- [ ] Localization wired through `provideHubTranslationAdapter()` if the application has more than one language, with `HUBUI.SIGNATURE.KEYBOARD_HINT` alongside the three action keys, **and** `[ariaLabel]` bound to the translated label text on every field.
- [ ] `[labels]` held in a signal or class property, never as an inline object literal in the template.
- [ ] Server-side rendering proven for a page containing the field, if the application uses `@angular/ssr` — `writeValue()` touches the canvas with no platform guard.
- [ ] The keyboard signing path tested with the screen readers your users actually run, and the missing label association acknowledged with whoever owns accessibility compliance.
- [ ] A decision recorded on whether a keyboard-drawn mark — a polyline, not handwriting — satisfies whatever the signature is evidence of.
- [ ] `(drawStart)` / `(drawEnd)` handlers retyped to `HubSignatureDrawEvent`, and any pointer-specific member read behind an `instanceof PointerEvent` narrowing.
- [ ] A stray-tap policy decided: a single tap commits a stroke and satisfies `required`.
- [ ] Drawing latency and palm rejection tested on the worst hardware the field is actually used on.
- [ ] `signature_pad` removed from `package.json`.

---

## Reporting a problem

- **Issues:** <https://github.com/carlos-morcillo/ng-hub-ui-signature/issues>
- **Documentation:** <https://hubui.dev/en/signature/overview/>

A useful report includes the `ng-hub-ui-signature`, `ng-hub-ui-forms`, `ng-hub-ui-utils` and `@angular/core` versions, the template fragment and component code, and — when the problem concerns stored data — a sample of the value the form control holds. If you are migrating, say so and include the `angular2-signaturepad` code being replaced.

For questions about the incumbent itself, its tracker is at <https://github.com/wulfsolter/angular2-signaturepad/issues>, subject to the maintenance notice quoted above.

<!--
Verification notes for this revision. All 7 corrections and all 15 demanded warnings were
checked against projects/signature/src and projects/forms/src and applied; none was rejected.

Two citations were adjusted while applying them, without changing the substance of the claim:

1. Warning 7 cites the forms red border/ring as living on `.hub-field--invalid` (_field.scss:120-125).
   The rules at those lines are nested under `.hub-field__control` (line 90), i.e. they are
   `.hub-field__control--invalid` / `--valid`; there is no `.hub-field--invalid` rule in the file at all.
   The point stands and is stated in the guide as `.hub-field__control--invalid`, the class the
   signature template never applies.

2. Warning 4 was verified against dist/signature/package.json (built from this source, version 22.2.0),
   whose `exports` map contains exactly `"."` and `"./package.json"`, while ng-package.json copies
   src/lib/styles to a `styles/` asset directory outside that map. This confirms the claim.
-->
