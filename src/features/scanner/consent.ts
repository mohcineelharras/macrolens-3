let analysisConsentGranted = false;

export function hasAnalysisConsent(): boolean {
  return analysisConsentGranted;
}

export function grantAnalysisConsent(): void {
  analysisConsentGranted = true;
}

export function declineAnalysisConsent(): void {
  analysisConsentGranted = false;
}
