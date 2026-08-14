import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/** Structural contract implemented by RxJS observables and other reactive translation sources. */
export interface HubSignatureLabelSource {
	/** Subscribes to translated label updates and returns a disposable subscription. */
	subscribe(next: (value: string) => void): { unsubscribe(): void };
}

/** A static label or a reactive source such as Transloco's or ngx-translate's stream. */
export type HubSignatureLabel = string | HubSignatureLabelSource;

/** Localizable labels used by the built-in signature actions. */
export interface HubSignatureLabels {
	clear: HubSignatureLabel;
	undo: HubSignatureLabel;
	redo: HubSignatureLabel;
}

/** Concrete text rendered after resolving reactive labels. */
export interface HubSignatureResolvedLabels {
	clear: string;
	undo: string;
	redo: string;
}

/** Global options shared by every signature field. */
export interface HubSignatureConfig {
	labels: Partial<HubSignatureLabels>;
}

/** Partial configuration accepted when applications override the defaults. */
export interface HubSignatureConfigOverride {
	labels?: Partial<HubSignatureLabels>;
}

/** English fallback labels for applications that do not provide translations. */
export const defaultHubSignatureLabels: HubSignatureLabels & HubSignatureResolvedLabels = {
	clear: 'Clear signature',
	undo: 'Undo stroke',
	redo: 'Redo stroke'
};

/** Default signature configuration. */
export const defaultHubSignatureConfig: HubSignatureConfig = { labels: {} };

/** Injectable configuration token so applications can localize action labels once. */
export const HUB_SIGNATURE_CONFIG = new InjectionToken<HubSignatureConfig>('HUB_SIGNATURE_CONFIG', {
	providedIn: 'root',
	factory: () => defaultHubSignatureConfig
});

/**
 * Configures global static or reactive action-label overrides.
 * For application i18n, use the shared `provideHubTranslationAdapter()` provider from `ng-hub-ui-utils` instead.
 *
 * @param config - Labels to override; omitted values retain the English fallback.
 * @returns Environment providers for the application bootstrap.
 */
export function provideHubSignature(config: HubSignatureConfigOverride = {}): EnvironmentProviders {
	return makeEnvironmentProviders([
		{
			provide: HUB_SIGNATURE_CONFIG,
			useValue: { labels: { ...config.labels } }
		}
	]);
}
