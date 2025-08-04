export const featureFlags = {
  // Phase 1 — Core Spine
  auth: true,
  basicInsightDisplay: true,
  gpsTrackingBasic: true,
  passiveAudioCapture: true,
  aiTaggingPipeline: true,

  // Phase 2 — Core Intelligence Add‑Ons
  relationshipMapping: false,
  attachmentStyleAnalysis: false,
  socialWellnessLayer: false,
  recoveryTimeline: false,

  // Phase 3 — Cognitive Systems
  moodForecastOverlay: false,
  personalityRings: false,
  shadowCognition: false,
  obscuraPatterns: false,

  // Phase 4 — Sensory & Dream Systems
  pureAudioAmbience: false,
  advancedDreamAnalysis: false,
  smellAwarenessTriggers: false,
  bodyLanguageDetection: false,

  // Phase 5 — External Integrations
  calendarIntegration: false,
  googleFitIntegration: false,
  spotifyIntegration: false,
  gmailIntegration: false,

  // Phase 6 — Interactive & Advanced Features
  hapticFeedback: false,
  insightMarketplace: false,
} as const;