# ng-hub-ui-signature

[English](./README.md) | **Español**

Campo de firma para formularios Angular respaldado por SVG. Registra ratón, táctil y lápiz mediante Pointer Events, guarda un SVG escalable en el modelo del formulario y puede exportar el lienzo a PNG.

## Instalación

```bash
npm install ng-hub-ui-signature ng-hub-ui-forms
```

## Uso

```typescript
import { HubSignatureComponent } from 'ng-hub-ui-signature';

@Component({
	standalone: true,
	imports: [HubSignatureComponent],
	template: `<hub-signature formControlName="signature" label="Firma" />`
})
export class ContractFormComponent {}
```

El valor del control es un string SVG. Usa `toDataUrl('image/png')` para exportación bitmap, o `clear()`, `undo()` y `redo()` para controlar el campo mediante código.

## Preguntar qué contiene el campo

`toSvg()` es el valor del formulario y, durante mucho tiempo, también la única forma de preguntar
cualquier cosa sobre el campo: saber si estaba firmado obligaba a buscar un trazo dentro de la
cadena. Tres añadidos responden a eso directamente.

```ts
@ViewChild(HubSignatureComponent) signature!: HubSignatureComponent;

// Validar sin analizar el valor serializado.
const signed = !this.signature.isEmpty();

// La geometría en sí, que el valor SVG no transporta.
const strokes = this.signature.toStrokes(); // HubSignatureStroke[]
this.other.fromStrokes(strokes);            // repinta; no notifica cambio de usuario a Angular forms
```

`toStrokes()` / `fromStrokes()` **no** se llaman `toData` / `fromData`, los nombres que usa
`angular2-signaturepad`, y es deliberado: el `toData()` de esa biblioteca devuelve
`Array<Array<{x, y, time}>>` y este devuelve `{ points: [{ x, y, pressure }], color, width }[]`. El
mismo nombre con una carga incompatible dejaría compilar una migración para que fallara en silencio
allí donde el valor esté tipado como `any`.

## Reaccionar mientras se dibuja

| Salida | Carga | Se emite |
| --- | --- | --- |
| `valueChange` | `string` | Tras un cambio del usuario, con el SVG |
| `drawStart` | `PointerEvent` | Al empezar un trazo |
| `drawEnd` | `PointerEvent` | Al terminar y consolidar un trazo |

`drawStart` y `drawEnd` permiten al anfitrión reaccionar a la actividad de dibujo —pausar un
autoguardado, armar un botón de envío— sin sondear el valor. Solo se emiten para el dibujo del
usuario, así que una escritura por código nunca parece una.

## Acciones traducibles

El componente no depende de ningún sistema de traducción. Configura una vez el adaptador compartido de Hub UI durante el arranque; entrega el mismo diccionario a todas las bibliotecas compatibles, incluida Signature. Usa `labels` solo para una excepción de un campo:

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

Añade `HUBUI.SIGNATURE.ACTION.CLEAR`, `HUBUI.SIGNATURE.ACTION.UNDO` y `HUBUI.SIGNATURE.ACTION.REDO` a los archivos de idioma habituales de la aplicación. La raíz `HUBUI` evita colisiones con claves de la aplicación. El adaptador actualiza todos los campos Signature cuando el servicio emite un cambio de idioma; `overrides` permite mapear deliberadamente una acción a otra clave reactiva del servicio. Consulta la documentación de Utils para la configuración completa con Transloco y ngx-translate.

```ts
// Una única excepción puede sobrescribir una etiqueta global.
<hub-signature [labels]="{ clear: 'Borrar definitivamente' }" />
```

## Personalización

Cada superficie del campo se personaliza con variables `--hub-signature-*`. Los valores por defecto heredan el contrato de campo de `ng-hub-ui-forms` — la superficie de dibujo lee los tokens de control `--hub-input-*`, la etiqueta lee `--hub-label-*` y el estado deshabilitado lee `--hub-form-disabled-opacity` —, de modo que dar tema a un formulario se lo da también a su campo de firma, sin reglas adicionales.

```scss
@use 'ng-hub-ui-signature/styles' as hub;

.contract-form {
	@include hub.hub-signature-theme($border-radius: 0.75rem);
}
```
