# Changelog

## [22.6.1] - 2026-09-03

### Fixed

- **Server-side rendering no longer throws.** `writeValue()` repaints the canvas, and it runs
  whenever a reactive form binds a value — including during prerendering, where the server DOM
  shim *throws* `NotYetImplemented` from `canvas.getContext('2d')` instead of returning null, so
  the existing null check never got the chance to run. Measured on the documentation site, this
  produced 16 errors per full prerender. `redraw()` now returns early outside the browser.

    Nothing is lost by skipping it: the canvas has no pixels on the server, and the existing
  `afterNextRender` hook already repaints as soon as it does. No API, type or style changes.

## [22.6.0] - 2026-09-02

### Added

- **`formTextType="tooltip"` works here too.** `ng-hub-ui-forms` 22.31.0 moved `formText` and
  `formTextType` onto `HubFieldControl`, the base class this component extends, so the input
  arrived here for free — and did nothing, because the template rendered the helper block
  unconditionally and drew no question mark. The compiler accepted `formTextType="tooltip"` on a
  `<hub-signature>` and the page ignored it, which is the worst shape a gap can take.

  The mark now sits in a `.hub-field__label-row` beside the label rather than inside it. That is
  not decoration: clicking this label focuses the drawing surface, so a button nested in it would
  open the tooltip and put the pen in the reader's hand at once.

### Fixed

- **The component compiles against `ng-hub-ui-forms` 22.31.0.** It declared its own `formText`,
  which the base class now declares too, and TypeScript refuses the redeclaration without an
  `override` modifier (TS4114). The local declaration is deleted rather than annotated — the base
  one is identical, and two declarations of one input is how they drift.

## [22.5.0] - 2026-09-01

### Fixed

- **`[labelType]` is read.** It was declared, compiled, type-checked and never looked at: the template toggled only `--readonly`, `--disabled`, `--invalid` and `--valid`, so a team migrating a horizontal form bound the input, saw a stacked label, and went hunting through `ng-hub-ui-forms` for a bug that was not there. `horizontal` now places the label in a first grid column beside the drawing surface — capped and ellipsized at `--hub-form-label-horizontal-max-width` — with the action row, helper text and validation feedback stacked in the second, which is the shape the sibling fields produce.

  The layout lives in this component's own stylesheet under `.hub-signature--horizontal` rather than borrowing `.hub-field--horizontal` from the forms sheet. That grid places `> .hub-field__label` and `> .hub-field__body`, neither of which this template has, and both sheets would then set `gap` on the same element at identical specificity — a race decided by stylesheet injection order, which is not stable between the dev server and a production build. The same `--hub-form-*` tokens are honoured, so the result lines up with the fields around it.

  **`floating` still falls back to `stacked`, deliberately.** A floating label reuses the space an empty text control's value would occupy and is driven by `:placeholder-shown`; a canvas has neither, and a label parked inside the box would sit on top of the ink the moment anyone signed. The family's other non-text fields — `hub-slider`, `hub-segmented`, `hub-otp-input` — take the same position while still accepting the shared `HubLabelType`.

- **The validation state shows on the drawing surface.** `.hub-signature--invalid` and `.hub-signature--valid` were bound on the root and styled by nothing, so a required-but-empty signature printed an error message under a canvas that looked exactly like a valid one. Every other field of the family turns red; this one did not, and on a long form the message scrolls out of view leaving a submit button that refuses to work for no visible reason. The canvas now takes the danger border and ring when touched and invalid, and the success pair when `[showValid]` is on and the field is touched and valid.

  The colours come from the shared `--hub-form-invalid-*` / `--hub-form-valid-*` contract rather than new `--hub-signature-*` slots, because that is where the family keeps validation — `_field.scss` styles `.hub-field__control--invalid` from exactly these tokens, and a signature-only slot would fragment a decision that belongs to the form.

  **If you wrote the workaround the migration guide used to recommend, delete it.** Your rule and the component's now have identical specificity, so which wins is decided by injection order: a customised colour can silently stop applying in a production build while still working in the dev server. Set `--hub-form-invalid-border-color` instead.

### Added

- **A live theming demo on the library page**, exercising all eleven `--hub-signature-*` slots through `hub-signature-theme()`. The mixin had shipped since 22.0.0 with nothing to look at, so its six newest parameters could only be read about.

  Building it surfaced a trap now documented in `MIGRATION.md`: **setting the tokens on a wrapper element does nothing.** The component declares all eleven slots on the field element itself through `:where(.hub-signature)`, and a value declared on an element always beats one inherited from an ancestor — specificity never enters into it, because they are different elements. This is precisely why the mixin emits `<your scope> :where(.hub-signature)` rather than relying on inheritance, and it also means a rule written inside a component with emulated view encapsulation never matches, since Angular rewrites it with an `_ngcontent` attribute the field's DOM does not carry.

## [22.4.0] - 2026-09-01

### Fixed

- **The visible label now names the drawing surface.** The template rendered `<label for>` pointing at the canvas, and `for` associates only with labelable elements — `button`, `input`, `meter`, `output`, `progress`, `select`, `textarea`. A `<canvas>` is none of them, so the attribute was inert: no association existed, clicking the label did nothing, and the accessible name came entirely from `[ariaLabel]`. The surface is now named with `aria-labelledby`, the only mechanism that works on a non-labelable element and the only one unaffected by `role="application"`.

  The `for` attribute is gone rather than left beside the new wiring, because an attribute that claims an association the browser never makes is worse than no attribute at all. Clicking the label focuses the surface instead, which is the half of the label contract that was actually missing.

  `aria-labelledby` and `aria-label` are now mutually exclusive on the canvas. They are not additive: `aria-labelledby` outranks `aria-label` outright in the accessible-name computation, so emitting both would leave one of them permanently unreachable and mislead anyone reading the DOM. A field with a `[label]` carries only `aria-labelledby`; a field without one carries only `aria-label`. The required asterisk stays `aria-hidden` and out of the computed name.

- **`[ariaLabel]` goes through the translation dictionary.** It was an `input<string>('Signature')` with a hardcoded English literal and no `HUBUI.SIGNATURE.*` key behind it, so an application that localized every button through the shared adapter still had its drawing surface announce itself in English. It now resolves like every other piece of text the component owns: the explicit input first, then `[labels]` / `provideHubSignature()`, then `HUBUI.SIGNATURE.ARIA_LABEL`, then the English fallback.

  Its default changed from `'Signature'` to `''` so that "not set" is distinguishable from "set to the old default"; the resolved name is still `Signature` when nothing else supplies one.

### Changed

- **The accessible name comes from `[label]` when there is one, and `[ariaLabel]` is the fallback for a bare surface.** This is the part that actually closes WCAG 2.5.3 (Label in Name): translating `[ariaLabel]` would merely have made it *possible* to keep the visible label and the announced name in agreement, still requiring every consumer to pass the same string twice on every field and to remember it forever. Deriving the name from the label makes disagreement impossible — they are the same node. `[ariaLabel]` is now consulted only where there is genuinely nothing to point at: a surface with no visible label, in a layout that labels it some other way.

  **Binding `[ariaLabel]` on a field that also has a `[label]` no longer does anything.** Remove those bindings rather than leaving a setting that looks live and is not.

- **`HubSignatureLabels` and `HubSignatureResolvedLabels` gained a required `ariaLabel` member.** Everything the library accepts takes a `Partial<…>`, so overrides are unaffected; only a fully annotated label object has to change. **Breaking**; see `BREAKING_CHANGES.md`.

## [22.3.0] - 2026-09-01

### Added

- **A keyboard path to sign.** The canvas has carried `tabindex="0"` since 22.0.0 and bound nothing but pointer events, so the field was focusable and unusable: a required control no keyboard-only user could satisfy, under a package description promising an accessible signature field. Arrow keys now carry a visible pen across the surface — Shift for a coarser step — Space or Enter lower and lift it, and Escape abandons the stroke in progress. It is not a second class of stroke: the keyboard goes through the same internal begin/commit pair the pointer does, so it yields the same `HubSignatureStroke`, the same `toSvg()` output and the same reported value.

  The interaction is modal — put the pen down, move, lift — rather than hold-a-key-to-draw, because key repeat is throttled by the operating system (points would be sampled at a rate the library does not control) and holding one key while pressing another is beyond many of the motor abilities this path exists to serve.

  The surface now carries `role="application"`, and that is load-bearing rather than decorative. A canvas with `tabindex` is not a form control, so NVDA and JAWS stay in browse mode over it and consume the arrow keys for document navigation; without the role the whole path would work in code and never reach the people it is for. How to sign is announced through `aria-describedby` from the new `keyboardHint` label, so the instructions travel through the same dictionary as the action buttons, under `HUBUI.SIGNATURE.KEYBOARD_HINT`.

- **`[validFeedback]` is rendered.** The input has existed on `HubFieldControl` all along, so it compiled and type-checked on `<hub-signature>` and then did nothing at all. It now renders the same `.hub-field__feedback--valid` block as every other field of the family, under the same `showsValid` condition. An input that is accepted and ignored is worse than one that does not exist: it sends someone hunting through `ng-hub-ui-forms` for a bug that is not there.

- **`hub-signature-theme()` reaches all eleven tokens.** It accepted five parameters against the eleven `--hub-signature-*` custom properties the component declares, so border width, focus shadow, font size, label colour, label font size and action gap could only be written by hand. The six missing parameters are appended after the original five rather than slotted in where they belong by meaning, so that existing positional includes keep resolving to the same tokens. An argument-less include still emits nothing — every declaration is guarded — but it now says so with a `@warn` instead of leaving a developer to debug a build that is behaving as designed.

### Fixed

- **`pointercancel` no longer commits the partial stroke.** It was wired to the same handler as `pointerup`, so a cancelled pointer — an OS gesture taking over, a scroll claiming the pointer, palm rejection on a tablet — was treated as a deliberate pen-up: the half-drawn stroke was pushed onto the history, reported to the form and announced through `(drawEnd)`. `pointercancel` means the interaction did not happen, so the stroke is now discarded: no value change, no `(drawEnd)`. Losing focus mid-stroke takes the same path, because a stroke you can no longer reach cannot be finished.

- **The default `currentColor` ink is resolved before it is captured.** `[strokeColor]` defaults to `'currentColor'` and that string was used twice without ever being resolved. The canvas 2D context cannot parse CSS-context keywords, so the assignment was dropped and the ink fell back to black whatever the colour around the field; worse, the same literal was written verbatim into the persisted SVG, leaving an archived signature with no fixed colour at all — invisible ink in a dark-themed viewer, an unexpected colour in a PDF whose preview looked right. The colour is now resolved against the surface with `getComputedStyle()` when the stroke opens, so what is stored is what the signer saw. An explicitly bound colour is stored untouched. This is also what finally makes `hub-signature-theme($color: …)` reach the ink, as its own documentation has claimed since 22.0.0.

### Changed

- **`(drawStart)` and `(drawEnd)` now emit `HubSignatureDrawEvent`**, a `PointerEvent | KeyboardEvent` union exported from the public API. Drawing is no longer pointer-exclusive, and a payload typed `PointerEvent` would encode exactly the assumption this release removes. **Breaking**; see `BREAKING_CHANGES.md`.

- **`HubSignatureLabels` and `HubSignatureResolvedLabels` gained a required `keyboardHint` member.** Every input and provider that accepts them takes a `Partial<…>`, so overriding a subset of labels is unaffected; only code that builds a complete label object has to add the key. **Breaking**; see `BREAKING_CHANGES.md`.

## [22.2.0] - 2026-09-01

### Added

- **`isEmpty()`**, so a form can validate the field without parsing the serialized value. Previously the only way to know whether anything had been drawn was to inspect the SVG string.
- **`toStrokes()` / `fromStrokes()`**, exposing the committed strokes as structured `HubSignatureStroke[]`. `toSvg()` remains the canonical form value — this is for callers that need the geometry itself, such as replaying a signature or migrating from a library that stored point groups. `fromStrokes()` is a programmatic write: like `writeValue()`, it repaints without reporting a user change to Angular forms.

  They are deliberately not called `toData` / `fromData`, the names angular2-signaturepad uses: that library's `toData()` returns `Array<Array<{x, y, time}>>` and this one returns `{points: [{x, y, pressure}], color, width}[]`. Same name with an incompatible payload would let a migration compile and then fail silently wherever the value is typed `any`.
- **`(drawStart)` and `(drawEnd)` outputs**, emitted around a user stroke. They fill the gap left by libraries that exposed `onBeginEvent` / `onEndEvent`, and let a host react to drawing activity — enabling a submit button, pausing an autosave — without polling the value.

### Changed

- **The `hub-signature-theme()` mixin now documents itself where the tooling can read it.** Its header was written as a `/** … */` block, and the documentation generator only parses `//` headers delimited by `scss-docs-start` / `scss-docs-end` markers — so the mixin was skipped outright and the library's page showed no theming section at all, despite the mixin having shipped since 22.0.0. The header is now in the format the generator reads, and the eleven `--hub-signature-*` slots it covers appear on the site. Comment-only: the mixin's parameters, defaults and emitted declarations are byte-identical.

## [22.1.1] - 2026-08-17

### Fixed

- **The published package declared no licence.** An absent `license` field is not neutral — a registry reports it as unlicensed, which legally reads as all rights reserved, the most restrictive state possible rather than the most open. The intent was always MIT; it is now stated in `package.json` and carried in a `LICENSE` file that ships with the package.

## [22.1.0] - 2026-08-14

### Fixed

- **The field now really inherits the `ng-hub-ui-forms` contract.** The `--hub-signature-*` slots defaulted to a `--hub-field-*` family that no library declares and the token spec never documented, so they always fell through to their `sys`/`ref` fallbacks: a form themed with `--hub-input-bg` left its signature field untouched, contrary to what the README promised. The slots now read the canonical tokens of the `.hub-field__*` shell — `--hub-input-*` for the drawing surface, `--hub-label-*` for the label and `--hub-form-disabled-opacity` for the disabled state. Apps that were setting `--hub-field-*` to reach this component must switch to those names; apps theming through `--hub-signature-*` or `hub-signature-theme()` are unaffected.

### Added

- The eleven `--hub-signature-*` tokens are documented in the design-system token spec, so they now appear in the library reference table.

## [22.0.0] - 2026-08-14

### Added

- `HubSignatureComponent`, an SVG-backed freehand signature field with Pointer Events, ControlValueAccessor integration, undo, redo, clear and PNG export.
- Form-field visual tokens and `hub-signature-theme()` Sass mixin aligned with `ng-hub-ui-forms`.
- Localizable action labels under the collision-safe `HUBUI.SIGNATURE.ACTION.*` namespace, supplied through the shared `provideHubTranslationAdapter()` provider from `ng-hub-ui-utils` and optionally mapped with explicit reactive overrides.
