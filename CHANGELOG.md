# Changelog

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
