export const featureFlags = {
  // Phase 1 — Core Spine
  auth: true,
  basicOnboarding: true,
  textNotes: true,
  dreamJournal: true,
  
  // Phase 2 — AI Integration
  aiCompanion: true,
  voiceTranscription: false,
  aiInsights: true,
  
  // Phase 3 — Advanced Features
  visualEffects: true,
  socialFeatures: false,
  dataExport: true,
  
  // Development/Debug Features
  devMode: process.env.NODE_ENV === 'development',
  debugLogs: false,
};

export default featureFlags;