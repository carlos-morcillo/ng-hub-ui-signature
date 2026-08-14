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
