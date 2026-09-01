# Breaking Changes

This file documents breaking changes and migration steps for `ng-hub-ui-signature`.

> The major version of this library tracks the Angular major it targets, not semver's verdict on
> compatibility. A breaking change therefore ships as a **minor**, and this file is the only warning
> you get — read it before upgrading within a major line.

## [22.3.0]

### `(drawStart)` and `(drawEnd)` emit `HubSignatureDrawEvent`, not `PointerEvent`

**What changed.** Both outputs are now typed `output<HubSignatureDrawEvent>`, where:

```ts
export type HubSignatureDrawEvent = PointerEvent | KeyboardEvent;
```

**Why.** This release adds a keyboard path to sign, and it emits the same two outputs — a stroke is
a stroke however it was written. A payload typed `PointerEvent` would have left two bad options:
lie about the event, or emit nothing on the keyboard path and leave hosts unable to tell that a
signature was being drawn at all. The type now says what the outputs actually carry.

The union was chosen over a wrapper object (`{ source, originalEvent }`) deliberately: the wrapper
would be a larger break for the same information, and `instanceof` is the idiomatic way to ask.

**What you have to do.** Nothing, if your handler ignores its argument or takes `any` — which
covers most uses, since these outputs are usually consumed as "drawing started" / "drawing
finished" notifications. If you typed the parameter, widen it:

```ts
// Before
drawComplete(event: PointerEvent): void { … }

// After
drawComplete(event: HubSignatureDrawEvent): void { … }
```

If you read pointer-specific members, narrow first:

```ts
import type { HubSignatureDrawEvent } from 'ng-hub-ui-signature';

drawStart(event: HubSignatureDrawEvent): void {
  if (event instanceof PointerEvent) {
    console.log(event.pointerType); // 'mouse' | 'pen' | 'touch'
  }
}
```

**If you do nothing.** The compiler catches it: a template binding to a handler declaring
`PointerEvent` fails type-check under `strictTemplates`. There is no silent-failure path here.

### `(drawEnd)` no longer fires on `pointercancel`

**What changed.** A cancelled pointer used to be treated as a pen-up: the partial stroke was
committed, the form value updated and `(drawEnd)` emitted. It is now discarded, and neither
`(drawEnd)` nor `(valueChange)` fires. Losing focus mid-stroke behaves the same way.

**Why.** `pointercancel` means the interaction did not happen — an OS gesture took over, a scroll
claimed the pointer, palm rejection fired on a tablet. Committing it saved marks the user never
intended to make, and satisfied a `Validators.required` signature gate with them.

**What you have to do.** Nothing, unless you relied on `(drawEnd)` as a "the pointer went away"
signal rather than as "a stroke was committed". If you counted strokes by counting `drawEnd`
emissions, the count is now correct where it used to over-count.

**If you do nothing.** Nothing breaks at compile time. A tablet flow that quietly accumulated
palm-contact strokes stops doing so.

### `HubSignatureLabels` gained a required `keyboardHint`

**What changed.** `HubSignatureLabels` and `HubSignatureResolvedLabels` now declare a fourth
member, `keyboardHint`, holding the instructions read out to assistive technology.

**Why.** The keyboard interaction has to be announced, and that text is user-facing, so it belongs
in the same localizable surface as the action buttons rather than hardcoded in the template. Its
dictionary key is `HUBUI.SIGNATURE.KEYBOARD_HINT`.

**What you have to do.** Nothing for overrides: `provideHubSignature({ labels: … })` and the
`[labels]` input both take `Partial<HubSignatureLabels>`, so passing a subset still compiles. Only
code that annotates a complete object breaks:

```ts
// Before — now missing a member
const labels: HubSignatureLabels = { clear: '…', undo: '…', redo: '…' };

// After — either add the key, or type it as a partial, which is what the library consumes
const labels: Partial<HubSignatureLabels> = { clear: '…', undo: '…', redo: '…' };
```

Applications that localize through `provideHubTranslationAdapter()` should add
`HUBUI.SIGNATURE.KEYBOARD_HINT` to every language file. Omitting it is safe — the English default
is used — but then a keyboard user is told how to sign in the wrong language.

**If you do nothing.** Overrides keep working. A fully-annotated label object fails to compile.

## [22.0.0]

Initial release. No breaking changes.

The major version starts at `22` to match the rest of the `ng-hub-ui` family, whose
major always tracks the targeted Angular major — it does not imply twenty-one earlier
releases of this library.
