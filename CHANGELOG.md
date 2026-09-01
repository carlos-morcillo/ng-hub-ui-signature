# Changelog

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
