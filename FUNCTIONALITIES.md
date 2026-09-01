# Functionalities of Signature Library

This table details the functionalities of the `ng-hub-ui-signature` library and indicates which ones are covered by interactive examples.

## Signature (`hub-signature`)

| Category              | Functionality                                                  | Example Covered |
| :-------------------- | :------------------------------------------------------------- | :-------------: |
| **Capture**           | Pointer input (mouse, touch, pen)                              |       [x]       |
|                       | Keyboard input (arrows carry the pen, Space/Enter, Escape)     |       [x]       |
|                       | Escape discards the stroke in progress                         |       [x]       |
|                       | `pointercancel` discards it too — not demoable in a page       |       [ ]       |
|                       | Pressure-aware stroke width                                    |       [ ]       |
|                       | `readonly` — preserves the signature, refuses new strokes      |       [x]       |
|                       | `height`, `strokeColor`, `strokeWidth`                         |       [ ]       |
|                       | `currentColor` resolved against the surface before capture     |       [ ]       |
| **History**           | `undo()` / `redo()`                                            |       [x]       |
|                       | `clear()`                                                      |       [x]       |
|                       | Built-in action bar (`controls`)                               |       [x]       |
| **Form integration**  | `ControlValueAccessor` (SVG string as the form value)          |       [x]       |
|                       | `writeValue()` repaints without reporting a user change        |       [ ]       |
|                       | `isEmpty()` — validate without parsing the serialized value    |       [x]       |
| **Reading the field** | `toSvg()` — the canonical form value                           |       [ ]       |
|                       | `toDataUrl(type?)` — bitmap export, PNG by default             |       [ ]       |
|                       | `toStrokes()` — the committed strokes as structured geometry   |       [x]       |
|                       | `fromStrokes()` — programmatic repaint from that geometry      |       [x]       |
| **Events**            | `(valueChange)` — the SVG after a user-originated change       |       [ ]       |
|                       | `(drawStart)` / `(drawEnd)` — the drawing lifecycle            |       [x]       |
| **Validation**        | `validFeedback` — success message under the field              |       [x]       |
|                       | `required` derived from the control's validators               |       [x]       |
|                       | Invalid / valid border and ring on the drawing surface         |       [x]       |
|                       | `invalidFeedbackTemplateFn` — per-field error messages         |       [ ]       |
| **Labelling**         | `label`, `formText`                                            |       [x]       |
|                       | `label` is the accessible name, via `aria-labelledby`          |       [x]       |
|                       | Clicking the label focuses the drawing surface                 |       [x]       |
|                       | `ariaLabel` — names a surface with no visible label            |       [ ]       |
|                       | `aria-describedby` keyboard instructions                       |       [ ]       |
|                       | `labelType` — `stacked` and `horizontal`                       |       [ ]       |
|                       | `classlist` on the drawing surface                             |       [ ]       |
| **Localization**      | Shared Hub UI label adapter (Transloco, ngx-translate…)        |       [x]       |
|                       | `labels` — per-field override of the translated actions        |       [ ]       |
|                       | `keyboardHint` — the translated keyboard instructions          |       [ ]       |
|                       | `ariaLabel` — the translated accessible name                   |       [ ]       |
| **Theming**           | The eleven `--hub-signature-*` slots                           |       [x]       |
|                       | `hub-signature-theme()` mixin                                  |       [x]       |
|                       | Inherits the `ng-hub-ui-forms` token family                    |       [ ]       |

Examples live in the documentation site under `src/app/pages/examples/signature/`. Six of them:
basic, keyboard signing, reactive form, draw events, external translations and theming.

The gap worth naming: **no example shows the field inheriting a themed form**, which is the path
most consumers will actually take — theming `--hub-input-*` and `--hub-label-*` once and letting
the signature follow. The theming demo overrides the `--hub-signature-*` slots directly, which is
the exception rather than the rule.
