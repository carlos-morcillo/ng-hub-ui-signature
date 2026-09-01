# Functionalities of Signature Library

This table details the functionalities of the `ng-hub-ui-signature` library and indicates which ones are covered by interactive examples.

## Signature (`hub-signature`)

| Category              | Functionality                                                  | Example Covered |
| :-------------------- | :------------------------------------------------------------- | :-------------: |
| **Capture**           | Pointer input (mouse, touch, pen)                              |       [x]       |
|                       | Keyboard input (arrows carry the pen, Space/Enter, Escape)     |       [ ]       |
|                       | A cancelled pointer or Escape discards the stroke in progress  |       [ ]       |
|                       | Pressure-aware stroke width                                    |       [ ]       |
|                       | `readonly` — preserves the signature, refuses new strokes      |       [x]       |
|                       | `height`, `strokeColor`, `strokeWidth`                         |       [ ]       |
|                       | `currentColor` resolved against the surface before capture     |       [ ]       |
| **History**           | `undo()` / `redo()`                                            |       [x]       |
|                       | `clear()`                                                      |       [x]       |
|                       | Built-in action bar (`controls`)                               |       [x]       |
| **Form integration**  | `ControlValueAccessor` (SVG string as the form value)          |       [ ]       |
|                       | `writeValue()` repaints without reporting a user change        |       [ ]       |
|                       | `isEmpty()` — validate without parsing the serialized value    |       [x]       |
| **Reading the field** | `toSvg()` — the canonical form value                           |       [ ]       |
|                       | `toDataUrl(type?)` — bitmap export, PNG by default             |       [ ]       |
|                       | `toStrokes()` — the committed strokes as structured geometry   |       [x]       |
|                       | `fromStrokes()` — programmatic repaint from that geometry      |       [x]       |
| **Events**            | `(valueChange)` — the SVG after a user-originated change       |       [ ]       |
|                       | `(drawStart)` / `(drawEnd)` — the drawing lifecycle            |       [x]       |
| **Validation**        | `validFeedback` — success message under the field              |       [ ]       |
|                       | `invalidFeedbackTemplateFn` — per-field error messages         |       [ ]       |
| **Labelling**         | `label`, `formText`                                            |       [x]       |
|                       | `ariaLabel`                                                    |       [ ]       |
|                       | `aria-describedby` keyboard instructions                       |       [ ]       |
|                       | `labelType` — from the shared forms vocabulary                 |       [ ]       |
|                       | `classlist` on the drawing surface                             |       [ ]       |
| **Localization**      | Shared Hub UI label adapter (Transloco, ngx-translate…)        |       [x]       |
|                       | `labels` — per-field override of the translated actions        |       [ ]       |
|                       | `keyboardHint` — the translated keyboard instructions          |       [ ]       |
| **Theming**           | The eleven `--hub-signature-*` slots                           |       [ ]       |
|                       | `hub-signature-theme()` mixin                                  |       [ ]       |
|                       | Inherits the `ng-hub-ui-forms` token family                    |       [ ]       |

Examples live in the documentation site under `src/app/pages/examples/signature/`.

The gap worth naming: **no example binds a form control**, though the SVG-as-form-value contract
is the library's primary integration. The three demos drive the field directly.
