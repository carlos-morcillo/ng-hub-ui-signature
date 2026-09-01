# Changelog

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
