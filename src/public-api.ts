/** Public API surface of ng-hub-ui-signature. */
export { HubSignatureComponent } from './lib/components/signature/signature.component';
export type { HubSignatureDrawEvent, HubSignaturePoint, HubSignatureStroke } from './lib/models/signature.types';
export {
	HUB_SIGNATURE_CONFIG,
	defaultHubSignatureConfig,
	defaultHubSignatureLabels,
	provideHubSignature
} from './lib/signature-config';
export type {
	HubSignatureConfig,
	HubSignatureConfigOverride,
	HubSignatureLabel,
	HubSignatureLabels,
	HubSignatureLabelSource,
	HubSignatureResolvedLabels
} from './lib/signature-config';
