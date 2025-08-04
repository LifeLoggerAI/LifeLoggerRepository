
import { z } from "zod";

// Base sentiment type
export type Sentiment = "positive" | "negative" | "neutral";

export const TraitChangeSchema = z.object({
  trait: z.string(),
  from: z.number(),
  to: z.number(),
  date: z.string(),
});
export type TraitChange = z.infer<typeof TraitChangeSchema>;

export const PersonaProfileSchema = z.object({
  traits: z.record(z.number()).optional(),
  traitChanges: z.array(TraitChangeSchema).optional(),
  dominantPersona: z.string().optional(),
  moodAlignmentScore: z.number().optional(),
  conflictEvents: z.array(z.string()).optional(),
  highProductivityWhen: z.array(z.string()).optional(),
  emotionalDrainWhen: z.array(z.string()).optional(),
});
export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

// From Blueprint Data Model
export const UserSchema = z.object({
    uid: z.string(),
    displayName: z.string().optional(),
    email: z.string().email().optional(),
    createdAt: z.number(),
    avatarUrl: z.string().url().optional(),
    isProUser: z.boolean().default(false),
    onboardingComplete: z.boolean().default(false),
    pronouns: z.string().optional(),
    moodColor: z.string().optional(),
    avatarStyle: z.string().optional(),
    lastLoginAt: z.number().optional(),
    lastLogoutAt: z.number().optional(),
    stats: z.record(z.any()).optional(),
    socialGraph: z.record(z.any()).optional(),
    constellation: z.record(z.any()).optional(),
    // Fields for demo mode
    mood: z.string().optional(),
    location: z.string().optional(),
    lastVoiceTranscript: z.string().optional(),
    lastActivity: z.string().optional(),
    demoMode: z.boolean().optional(),
    settings: z.object({
        moodTrackingEnabled: z.boolean().default(true),
        passiveAudioEnabled: z.boolean().default(true),
        faceEmotionEnabled: z.boolean().default(false),
        dataExportEnabled: z.boolean().default(true),
        narratorVolume: z.number().min(0).max(1).default(0.8),
        ttsVoice: z.string().default('warmCalm'),
        pushNotifications: z.boolean().default(true),
        // New privacy fields
        gpsAllowed: z.boolean().default(false),
        allowVoiceRetention: z.boolean().default(true),
        // New email fields
        receiveWeeklyEmail: z.boolean().default(true),
        receiveMilestones: z.boolean().default(true),
        emailTone: z.string().default('poetic'),
        dataConsent: z.object({
            shareAnonymousData: z.boolean(),
            optedOutAt: z.number().nullable(),
        }).optional(),
        telemetryPermissionsGranted: z.boolean().default(false),
        cameraCapturePermissionsGranted: z.boolean().default(false),
        identityModelOptIn: z.boolean().default(false),
    }).optional(),
    narratorPrefs: z.object({
        toneStyle: z.string(),
        metaphorLexicon: z.array(z.string()),
        ttsConfig: z.object({ pitch: z.number(), speed: z.number() }),
    }).optional(),
    personaProfile: PersonaProfileSchema.optional(),
    symbolLexicon: z.record(z.any()).optional(),
    subscriptionTier: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const PermissionsSchema = z.object({
    micPermission: z.boolean(),
    gpsPermission: z.boolean(),
    motionPermission: z.boolean(),
    notificationsPermission: z.boolean(),
    cameraCapturePermissionsGranted: z.boolean().default(false),
    shareAnonymizedData: z.boolean(),
    acceptedTerms: z.boolean(),
    acceptedPrivacyPolicy: z.boolean(),
    consentTimestamp: z.number(),
    acceptedTermsVersion: z.string().optional(),
});
export type Permissions = z.infer<typeof PermissionsSchema>;

export const AudioEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    storagePath: z.string(),
    startTs: z.number(),
    endTs: z.number(),
    durationSec: z.number(),
    voicePrintHashes: z.array(z.string()).optional(),
    transcriptionStatus: z.enum(["pending", "complete", "error"]),
    conversationId: z.string().optional(),
});
export type AudioEvent = z.infer<typeof AudioEventSchema>;

export const VoiceEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    audioEventId: z.string(),
    speakerLabel: z.string(),
    text: z.string(),
    emotion: z.string(),
    sentimentScore: z.number(),
    toneShift: z.number(),
    voiceArchetype: z.string(),
    createdAt: z.number(),
    people: z.array(z.string()).optional(),
    tasks: z.array(z.string()).optional(),
});
export type VoiceEvent = z.infer<typeof VoiceEventSchema>;

export const PersonSchema = z.object({
    id: z.string(),
    uid: z.string(),
    name: z.string(),
    lastSeen: z.number(),
    familiarityIndex: z.number().optional(),
    socialRoleHistory: z.array(z.object({
        date: z.number(),
        role: z.string(),
    })),
    avatarUrl: z.string().optional(),
    // New fields from 'socialContacts'
    voiceprintId: z.string().optional(),
    interactionCount: z.number().optional(),
    voiceMemoryStrength: z.number().optional(), // 0-100
    echoLoopScore: z.number().optional(), // 0-100
    silenceDurationDays: z.number().optional(),
    orbitRadius: z.number().optional(),
    isFlagged: z.boolean().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const DreamEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    text: z.string(),
    createdAt: z.number(),
    emotions: z.array(z.string()),
    themes: z.array(z.string()),
    symbols: z.array(z.string()),
    sentimentScore: z.number(),
    inferredSleepTime: z.number().optional(),
    wakeTime: z.number().optional(),
    dreamSignalStrength: z.number().optional(),
    dreamSymbolTags: z.array(z.string()).optional(),
    emotionBeforeSleep: z.string().optional(),
    emotionUponWaking: z.string().optional(),
    dreamNarrationText: z.string().optional(),
    dreamReplayStyle: z.string().optional(),
    audioMemoryOverlayId: z.string().optional(),
});
export type Dream = z.infer<typeof DreamEventSchema>;

export const InnerVoiceReflectionSchema = z.object({
    id: z.string(),
    uid: z.string(),
    text: z.string(),
    createdAt: z.number(),
    sentimentScore: z.number(),
});
export type InnerVoiceReflection = z.infer<typeof InnerVoiceReflectionSchema>;

export const CameraCaptureSchema = z.object({
    id: z.string(),
    uid: z.string(),
    imageUrl: z.string(),
    createdAt: z.number(),
    triggerType: z.enum(['emotional_spike', 'ritual_end', 'gps_change', 'manual', 'forecast_trigger', 'voice_peak']),
    emotionInference: z.record(z.number()).optional(),
    environmentInference: z.array(z.string()).optional(),
    objectTags: z.array(z.string()).optional(),
    lightLevel: z.number().optional(),
    faceCount: z.number().optional(),
    dominantColor: z.string().optional(),
    symbolicTagSummary: z.string().optional(),
    cameraAngle: z.string().optional(),
    faceLayoutSummary: z.string().optional(),
    backgroundMoodTags: z.array(z.string()).optional(),
    contextualSymbolMatches: z.array(z.string()).optional(),
    linkedArchetype: z.string().optional(),
});
export type CameraCapture = z.infer<typeof CameraCaptureSchema>;

export const SymbolicImageInsightSchema = z.object({
    id: z.string(),
    cameraCaptureId: z.string(),
    uid: z.string(),
    archetypeOverlay: z.string().optional(),
    narratorReflection: z.string(),
    linkedMoodState: z.string().optional(),
    symbolAnimationTrigger: z.enum(["aura_shift", "fog", "memory_bloom", "none"]),
    interpretiveConfidence: z.number().optional(),
});
export type SymbolicImageInsight = z.infer<typeof SymbolicImageInsightSchema>;


// Schemas for Emotion Overlay Engine
export const MoodLogSchema = z.object({
    timestamp: z.number(),
    emotion: z.string(),
    intensity: z.number(),
    physicalState: z.string().optional(),
    source: z.string(),
});
export type MoodLog = z.infer<typeof MoodLogSchema>;

export const AuraStateSchema = z.object({
    currentEmotion: z.string(),
    overlayColor: z.string(),
    overlayStyle: z.string(),
    lastUpdated: z.number(),
});
export type AuraState = z.infer<typeof AuraStateSchema>;

export const EmotionCycleSchema = z.object({
    windowStart: z.number(),
    dominantEmotion: z.string(),
    avgIntensity: z.number(),
    cycleType: z.string(),
});
export type EmotionCycle = z.infer<typeof EmotionCycleSchema>;

export const MemoryBloomSchema = z.object({
    bloomId: z.string(),
    emotion: z.string(),
    bloomColor: z.string(),
    triggeredAt: z.number(),
    description: z.string(),
    trigger: z.string().optional(),
});
export type MemoryBloom = z.infer<typeof MemoryBloomSchema>;

// Schemas for Torso Module
export const TorsoMetricsSchema = z.object({
    uid: z.string(),
    dateKey: z.string(),
    vitalityScore: z.number(),
    valueAlignmentScore: z.number(),
    selfConsistencyScore: z.number(),
    overstimIndex: z.number(),
    motivatorRankings: z.record(z.number()),
    updatedAt: z.number(),
});
export type TorsoMetrics = z.infer<typeof TorsoMetricsSchema>;

export const HabitEventSchema = z.object({
    uid: z.string(),
    eventId: z.string(),
    timestamp: z.number(),
    category: z.string(),
    intensity: z.number(),
    detectedBy: z.string(),
    source: z.string(),
});
export type HabitEvent = z.infer<typeof HabitEventSchema>;

export const NarratorInsightSchema = z.object({
    uid: z.string(),
    insightId: z.string(),
    insightType: z.string(),
    payload: z.record(z.any()),
    suggestedRitualId: z.string().optional(),
    consumed: z.boolean(),
    createdAt: z.number(),
    ttsUrl: z.string().url().optional(),
    ttsVoicePreset: z.string().optional(),
});
export type NarratorInsight = z.infer<typeof NarratorInsightSchema>;


// Schemas for Legs/Movement Module
export const LegsMetricsSchema = z.object({
    uid: z.string(),
    dateKey: z.string(),
    dailyStabilityScore: z.number(),
    behaviorMomentum: z.number(),
    routinePathType: z.enum(["linear", "loop", "fragmented"]),
    avoidanceZoneScore: z.number(),
    groundingQuality: z.number(),
    updatedAt: z.number(),
});
export type LegsMetrics = z.infer<typeof LegsMetricsSchema>;

export const MovementPathSchema = z.object({
    uid: z.string(),
    dateKey: z.string(),
    polylineEncoded: z.string(),
    distanceMeters: z.number(),
    stepCount: z.number(),
    stillnessSecs: z.number(),
    runSecs: z.number(),
    visitClusters: z.array(z.any()), // GeoPoint
    updatedAt: z.number(),
});
export type MovementPath = z.infer<typeof MovementPathSchema>;

export const AvoidanceEventSchema = z.object({
    uid: z.string(),
    eventId: z.string(),
    timestamp: z.number(),
    contextType: z.string(),
    contextId: z.string(),
    intensity: z.number(),
    predictedCause: z.string(),
    source: z.string(),
});
export type AvoidanceEvent = z.infer<typeof AvoidanceEventSchema>;

// Schemas for Arms Module
export const ArmMetricsSchema = z.object({
    uid: z.string(),
    dateKey: z.string(),
    actionFollowThroughScore: z.number().min(0).max(100),
    emotionalEffortLoad: z.number().min(0).max(100),
    relationalInitiationRatio: z.number().min(0).max(1),
    delegationIndex: z.number().min(0).max(100),
    connectionEchoScore: z.number().min(0).max(100),
    leftRightBias: z.enum(["left", "right", "balanced"]),
    updatedAt: z.number(),
});
export type ArmMetrics = z.infer<typeof ArmMetricsSchema>;

export const RelationalGestureSchema = z.object({
    uid: z.string(),
    eventId: z.string(),
    timestamp: z.number(),
    gestureType: z.enum(["reach", "support", "withdrawal"]),
    contextType: z.enum(["call", "text", "voice", "touch"]),
    direction: z.enum(["initiated", "received"]),
    armSide: z.enum(["left", "right"]),
    toneAnalysis: z.record(z.number()),
    durationSecs: z.number(),
});
export type RelationalGesture = z.infer<typeof RelationalGestureSchema>;

// Schemas for Social Constellation
export const SocialEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    personId: z.string(),
    timestamp: z.number(),
    interactionType: z.enum(["voice", "text", "physical"]),
    toneVector: z.record(z.number()),
    emotionalAfterEffect: z.string(),
    durationSecs: z.number(),
});
export type SocialEvent = z.infer<typeof SocialEventSchema>;

// Schemas for Rotational Swipe Views
export const TimelineEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    timestamp: z.number(),
    tone: z.string(),
    intensity: z.number(),
    description: z.string(),
    linkedZone: z.string(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ShadowEpisodeSchema = z.object({
    id: z.string(),
    uid: z.string(),
    startTimestamp: z.number(),
    endTimestamp: z.number(),
    shadowType: z.string(),
    resolutionStatus: z.enum(["unresolved", "recovering"]),
});
export type ShadowEpisode = z.infer<typeof ShadowEpisodeSchema>;

export const ForecastProfileSchema = z.object({
    id: z.string(),
    uid: z.string(),
    date: z.number(),
    predictedTone: z.string(),
    confidence: z.number(),
    ritualSuggestionId: z.string().optional(),
});
export type ForecastProfile = z.infer<typeof ForecastProfileSchema>;

export const ArchetypeStateSchema = z.object({
    id: z.string(),
    uid: z.string(),
    startDate: z.number(),
    endDate: z.number().nullable(),
    archetypeLabel: z.string(),
    morphProgress: z.number(),
});
export type ArchetypeState = z.infer<typeof ArchetypeStateSchema>;

export const LegacyThreadSchema = z.object({
    id: z.string(),
    uid: z.string(),
    theme: z.string(),
    plannedOutcome: z.string(),
    progressScore: z.number(),
});
export type LegacyThread = z.infer<typeof LegacyThreadSchema>;

export const PresentMetricsSchema = z.object({
    uid: z.string(),
    currentAuraColor: z.string(),
    heartbeat: z.number(),
    updatedAt: z.number(),
});
export type PresentMetrics = z.infer<typeof PresentMetricsSchema>;

// Schemas for Orb AI Coach System
export const OrbStateSchema = z.object({
    uid: z.string(),
    currentMode: z.enum(["idle", "chat", "ritual", "coreView"]),
    lastInsightAt: z.number(),
    moodColor: z.string(),
    forecastTrigger: z.string().optional(),
    isSpeaking: z.boolean().default(false),
});
export type OrbState = z.infer<typeof OrbStateSchema>;

export const OrbEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    eventType: z.enum(["tap", "triggered", "voiceReply", "ritualStart"]),
    timestamp: z.number(),
    promptUsed: z.string().optional(),
    aiResponseSummary: z.string().optional(),
    deliveryMethod: z.enum(["text", "tts", "symbolic"]),
    linkedView: z.string().optional(),
});
export type OrbEvent = z.infer<typeof OrbEventSchema>;

export const OrbDialogMemorySchema = z.object({
    id: z.string(),
    uid: z.string(),
    timestamp: z.number(),
    userPrompt: z.string(),
    aiNarration: z.string(),
    moodContext: z.string(),
    voicePlayed: z.boolean(),
});
export type OrbDialogMemory = z.infer<typeof OrbDialogMemorySchema>;

export const OrbSymbolicMapSchema = z.object({
    uid: z.string(),
    dominantSymbols: z.array(z.string()),
    toneMetaphors: z.record(z.string()),
    archetypeOverlay: z.string().optional(),
    preferredTone: z.string(),
});
export type OrbSymbolicMap = z.infer<typeof OrbSymbolicMapSchema>;


// Schemas for Onboarding
export const OnboardIntakeSchema = z.object({
    id: z.string(),
    uid: z.string(),
    fullTranscript: z.string(),
    createdAt: z.number(),
    detectedLanguage: z.string().optional(),
    audioUrl: z.string().url().optional(),
});
export type OnboardIntake = z.infer<typeof OnboardIntakeSchema>;

export const GoalSchema = z.object({
    id: z.string(),
    uid: z.string(),
    title: z.string(),
    createdAt: z.number(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const TaskSchema = z.object({
    id: z.string(),
    uid: z.string(),
    title: z.string(),
    dueDate: z.number(),
    status: z.enum(["pending", "complete"]),
});
export type Task = z.infer<typeof TaskSchema>;

export const CalendarEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    title: z.string(),
    startTime: z.number(),
    contextSource: z.string(),
});
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export const HabitWatchSchema = z.object({
    id: z.string(),
    uid: z.string(),
    name: z.string(),
    frequency: z.string(),
    context: z.string(),
});
export type HabitWatch = z.infer<typeof HabitWatchSchema>;


// Schemas for Genkit Flows

export const ProcessOnboardingTranscriptInputSchema = z.object({
    transcript: z.string().describe("The full transcript of the user's onboarding conversation."),
    currentDate: z.string().describe("The current date in YYYY-MM-DD format."),
});
export type ProcessOnboardingTranscriptInput = z.infer<typeof ProcessOnboardingTranscriptInputSchema>;

export const ProcessOnboardingTranscriptOutputSchema = z.object({
    goal: z.string().optional().describe("The primary goal or dream the user mentioned."),
    task: z.string().optional().describe("A single, small, actionable first step towards that goal."),
    reminderDate: z.string().optional().describe("An ISO 8601 date string for when the user wants a reminder."),
    habitToTrack: z.string().optional().describe("A habit the user wants to track related to their goal."),
});
export type ProcessOnboardingTranscriptOutput = z.infer<typeof ProcessOnboardingTranscriptOutputSchema>;

export const EnrichVoiceEventInputSchema = z.object({
  text: z.string().describe('The full text transcript from a voice recording.'),
});
export type EnrichVoiceEventInput = z.infer<typeof EnrichVoiceEventInputSchema>;

export const EnrichVoiceEventOutputSchema = z.object({
    emotion: z.string().describe("The primary emotion detected in the text."),
    sentimentScore: z.number().describe("A score from -1 (negative) to 1 (positive) representing the overall tone."),
    toneShift: z.number().describe("A score representing the change in tone within the text."),
    voiceArchetype: z.string().describe("The social archetype displayed (e.g., 'Mentor', 'Friend', 'Reporter')."),
    people: z.array(z.string()).describe("A list of names of people mentioned in the transcript."),
    tasks: z.array(z.string()).describe("A list of actionable tasks or to-do items mentioned in the transcript."),
});
export type EnrichVoiceEventOutput = z.infer<typeof EnrichVoiceEventOutputSchema>;


export const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

export const TranscribeAudioOutputSchema = z.object({
    transcript: z.string().describe("The transcribed text from the audio."),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export const GenerateSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
export type GenerateSpeechInput = z.infer<typeof GenerateSpeechInputSchema>;

export const GenerateSpeechOutputSchema = z.object({
  audioDataUri: z
    .string()
    .describe('The generated speech as a data URI in WAV format.'),
});
export type GenerateSpeechOutput = z.infer<typeof GenerateSpeechOutputSchema>;

export const SummarizeTextInputSchema = z.object({
  text: z.string().describe('A concatenation of text entries to be summarized.'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

export const SummarizeTextOutputSchema = z.object({
    summary: z.string().describe("A concise summary of the key themes, moments, and overall mood from the provided text."),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export const AnalyzeDreamInputSchema = z.object({
  text: z.string().describe('The text of a dream entry.'),
});
export type AnalyzeDreamInput = z.infer<typeof AnalyzeDreamInputSchema>;

export const AnalyzeDreamOutputSchema = z.object({
    emotions: z.array(z.string()).describe("A list of primary emotions present in the dream."),
    themes: z.array(z.string()).describe("A list of recurring themes or topics in the dream."),
    symbols: z.array(z.string()).describe("A list of key symbols and their potential meanings within the dream's context."),
    sentimentScore: z.number().describe("A score from -1 (very negative) to 1 (very positive) for the dream's overall tone."),
});
export type AnalyzeDreamOutput = z.infer<typeof AnalyzeDreamOutputSchema>;

export const GenerateAvatarInputSchema = z.object({
  name: z.string().describe('The name of the person for whom to generate an avatar.'),
  role: z.string().describe('The social role associated with the person.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

export const GenerateAvatarOutputSchema = z.object({
  avatarDataUri: z.string().describe('The generated avatar image as a data URI.'),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export const AnalyzeCameraImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a face, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeCameraImageInput = z.infer<typeof AnalyzeCameraImageInputSchema>;

export const AnalyzeCameraImageOutputSchema = z.object({
  emotionInference: z.record(z.number()).describe("A map of detected emotions and their confidence scores."),
  environmentInference: z.array(z.string()).describe("An array of tags describing the environment."),
  objectTags: z.array(z.string()).describe("An array of significant objects recognized in the image."),
  lightLevel: z.number().describe("A numerical score from 0 (dark) to 1 (bright)."),
  faceCount: z.number().describe("The number of faces detected."),
  dominantColor: z.string().describe("The primary color of the image in hex format."),
  symbolicTagSummary: z.string().describe("A short, poetic summary of the image's symbolic meaning."),
  cameraAngle: z.string().describe("The inferred angle of the camera."),
  faceLayoutSummary: z.string().describe("A description of the composition of faces."),
  backgroundMoodTags: z.array(z.string()).describe("An array of tags describing the emotional mood of the background."),
  contextualSymbolMatches: z.array(z.string()).describe("An array of recognized symbolic fusions."),
  linkedArchetype: z.string().describe("The primary Jungian archetype that this image seems to represent."),
});
export type AnalyzeCameraImageOutput = z.infer<typeof AnalyzeCameraImageOutputSchema>;

export const GenerateSymbolicInsightInputSchema = z.object({
    analysis: z.string().describe("The stringified JSON of the structured analysis result from the AnalyzeCameraImage flow."),
});
export type GenerateSymbolicInsightInput = z.infer<typeof GenerateSymbolicInsightInputSchema>;

export const GenerateSymbolicInsightOutputSchema = z.object({
    narratorReflection: z.string().describe("A short, insightful, and empathetic reflection for the user."),
    symbolAnimationTrigger: z.enum(["aura_shift", "fog", "memory_bloom", "none"]).describe("A suggested symbolic animation trigger."),
});
export type GenerateSymbolicInsightOutput = z.infer<typeof GenerateSymbolicInsightOutputSchema>;

export const AnalyzeTextSentimentInputSchema = z.object({
    text: z.string().describe('The text to analyze.'),
});
export type AnalyzeTextSentimentInput = z.infer<typeof AnalyzeTextSentimentInputSchema>;

export const AnalyzeTextSentimentOutputSchema = z.object({
    sentimentScore: z.number().describe("A score from -1 (negative) to 1 (positive) representing the overall tone."),
});
export type AnalyzeTextSentimentOutput = z.infer<typeof AnalyzeTextSentimentOutputSchema>;


// Schema for Settings Form
export const UpdateUserSettingsSchema = z.object({
    displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50, "Display name cannot exceed 50 characters."),
    moodTrackingEnabled: z.boolean().default(true),
    passiveAudioEnabled: z.boolean().default(true),
    faceEmotionEnabled: z.boolean().default(false),
    dataExportEnabled: z.boolean().default(true),
    narratorVolume: z.number().min(0).max(1).default(0.8),
    ttsVoice: z.string().default('warmCalm'),
    // New privacy fields
    gpsAllowed: z.boolean().default(false),
    dataConsent: z.object({
        shareAnonymousData: z.boolean(),
        optedOutAt: z.number().nullable(),
    }).default({ shareAnonymousData: false, optedOutAt: null }),
    allowVoiceRetention: z.boolean().default(true),
    // New email fields
    receiveWeeklyEmail: z.boolean().default(true),
    receiveMilestones: z.boolean().default(true),
    emailTone: z.enum(["poetic", "calm", "analytical"]).default("poetic"),
});
export type UpdateUserSettings = z.infer<typeof UpdateUserSettingsSchema>;

// Schemas for Dashboard View
export const SentimentDataPointSchema = z.object({
  date: z.string(),
  sentiment: z.number(),
});
export type SentimentDataPoint = z.infer<typeof SentimentDataPointSchema>;

export const EmotionCountSchema = z.object({
  name: z.string(),
  count: z.number(),
});
export type EmotionCount = z.infer<typeof EmotionCountSchema>;

export const DashboardDataSchema = z.object({
  sentimentOverTime: z.array(SentimentDataPointSchema),
  emotionBreakdown: z.array(EmotionCountSchema),
  stats: z.object({
    totalMemories: z.number(),
    totalDreams: z.number(),
    totalPeople: z.number(),
  }),
});
export type DashboardData = z.infer<typeof DashboardDataSchema>;

// Schemas for Companion Chat
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CompanionChatInputSchema = z.object({
  history: z.array(ChatMessageSchema),
  message: z.string().describe('The latest message from the user.'),
});
export type CompanionChatInput = z.infer<typeof CompanionChatInputSchema>;

export const CompanionChatOutputSchema = z.object({
  response: z.string().describe('The AI companion\'s response.'),
});
export type CompanionChatOutput = z.infer<typeof CompanionChatOutputSchema>;


// Schemas for Ritual Suggestions
export const SuggestRitualInputSchema = z.object({
  zone: z.enum(['head', 'torso', 'legs', 'arms', 'aura']).describe("The area of the symbolic avatar that was clicked."),
  context: z.string().describe("Brief context about the user's current state, like overall mood or recent themes."),
});
export type SuggestRitualInput = z.infer<typeof SuggestRitualInputSchema>;

export const SuggestRitualOutputSchema = z.object({
  title: z.string().describe("A short, engaging title for the suggested ritual or reflection."),
  description: z.string().describe("A one or two-sentence description of the ritual, framed as a gentle suggestion."),
  suggestion: z.string().describe("A concrete action or journaling prompt for the user."),
});
export type SuggestRitualOutput = z.infer<typeof SuggestRitualOutputSchema>;

// Schemas for Sky & Ground Module
export const GroundSnapshotSchema = z.object({
    gardenJSON: z.record(z.any()),
    soilHealthScore: z.number(),
    recoveryEvents: z.array(z.object({
        eventId: z.string(),
        label: z.string(),
        emoji: z.string(),
        ts: z.number(),
    })),
});
export type GroundSnapshot = z.infer<typeof GroundSnapshotSchema>;

export const GestureEventSchema = z.object({
    layer: z.enum(["sky", "ground"]),
    action: z.enum(["tap", "zoomIn", "zoomOut", "swipe"]),
    meta: z.record(z.any()),
    ts: z.number(),
});
export type GestureEvent = z.infer<typeof GestureEventSchema>;

// Schemas for Advanced Optional Systems from Master Prompt
export const SafetyTriggerSchema = z.object({
    id: z.string(),
    uid: z.string(),
    triggerType: z.enum(["shout", "cry", "hypervent"]),
    detectedAt: z.number(),
    intensityScore: z.number(),
    ritualLaunched: z.boolean(),
});
export type SafetyTrigger = z.infer<typeof SafetyTriggerSchema>;

export const CrossAppContextCorrelationSchema = z.object({
    id: z.string(),
    uid: z.string(),
    summary: z.string(),
    correlatedApps: z.array(z.string()),
    emotionImpact: z.string(),
    lastDetected: z.number(),
    companionPrompted: z.boolean(),
});
export type CrossAppContextCorrelation = z.infer<typeof CrossAppContextCorrelationSchema>;

export const VisualStrainEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    durationMinutes: z.number(),
    postureAngle: z.number(),
    ambientLight: z.number(),
    detectedAt: z.number(),
    fatigueIndex: z.number(),
    recommendedBreakIssued: z.boolean(),
});
export type VisualStrainEvent = z.infer<typeof VisualStrainEventSchema>;

// Schemas for Monetization, Gamification, and B2B Systems
export const AchievementSchema = z.object({
    id: z.string(),
    uid: z.string(),
    name: z.string(),
    description: z.string(),
    unlockedAt: z.number(),
    visibleInGallery: z.boolean(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const RitualStreakSchema = z.object({
    uid: z.string(),
    currentStreak: z.number(),
    longestStreak: z.number(),
    lastCompleted: z.number(),
});
export type RitualStreak = z.infer<typeof RitualStreakSchema>;

export const CurrencySchema = z.object({
    uid: z.string(),
    seeds: z.number(),
    threads: z.number(),
    lastEarned: z.number(),
});
export type Currency = z.infer<typeof CurrencySchema>;

export const MarketplaceItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    costSeeds: z.number(),
    type: z.string(),
    unlockEffect: z.string(),
});
export type MarketplaceItem = z.infer<typeof MarketplaceItemSchema>;

export const SubscriptionSchema = z.object({
    uid: z.string(),
    plan: z.enum(["free", "pro", "therapist"]),
    startedAt: z.number(),
    renewsAt: z.number(),
    status: z.enum(["active", "paused", "expired"]),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// Data Marketplace Schemas
export const PartnerAuthSchema = z.object({
    apiKey: z.string(),
    displayName: z.string(),
    industry: z.string(),
    contactEmail: z.string().email(),
    licenseTier: z.enum(["trial", "standard", "premium"]),
    createdAt: z.number(),
    isApproved: z.boolean(),
});
export type PartnerAuth = z.infer<typeof PartnerAuthSchema>;

export const DataMarketplacePackageSchema = z.object({
    name: z.string(),
    description: z.string(),
    dataScope: z.string(),
    pricePerMonthUSD: z.number(),
    segmentFilter: z.record(z.any()),
    anonymisationLevel: z.enum(["high", "medium"]),
    watermarkSalt: z.string(),
});
export type DataMarketplacePackage = z.infer<typeof DataMarketplacePackageSchema>;

export const DarRequestSchema = z.object({
    requestId: z.string(),
    partnerId: z.string(),
    packageId: z.string(),
    status: z.enum(["pending", "approved", "rejected"]),
    requestedAt: z.number(),
    reviewedAt: z.number().nullable(),
    reviewerUid: z.string().nullable(),
    notes: z.string().nullable(),
});
export type DarRequest = z.infer<typeof DarRequestSchema>;

export const ExportSummarySchema = z.object({
    exportId: z.string(),
    partnerId: z.string(),
    packageId: z.string(),
    generatedAt: z.number(),
    recordCount: z.number(),
    anonymisationFlags: z.record(z.any()),
    watermarkId: z.string(),
});
export type ExportSummary = z.infer<typeof ExportSummarySchema>;

export const MonetizationLogSchema = z.object({
    entryId: z.string(),
    uid: z.string(),
    exportId: z.string(),
    packageId: z.string(),
    partnerId: z.string(),
    shareValueUSD: z.number(),
    timestamp: z.number(),
});
export type MonetizationLog = z.infer<typeof MonetizationLogSchema>;


// Additional Schemas from Final Master Prompt
export const LocationLogSchema = z.object({
    id: z.string(),
    uid: z.string(),
    timestamp: z.number(),
    coords: z.object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number().optional(),
    }),
    placeId: z.string().optional(),
    eventType: z.enum(["motion", "stationary", "visit"]),
    source: z.enum(["gps", "wifi", "ble"]),
});
export type LocationLog = z.infer<typeof LocationLogSchema>;

export const ShadowMetricsWeeklySchema = z.object({
    id: z.string(),
    uid: z.string(),
    weekStart: z.number(),
    frictionTaps: z.number().optional(),
    motionAnxietyScore: z.number().optional(),
    bedtimeScrollingMins: z.number().optional(),
    stillnessEpisodes: z.number().optional(),
    compositeShadowStress: z.number().min(0).max(100),
});
export type ShadowMetricsWeekly = z.infer<typeof ShadowMetricsWeeklySchema>;

export const ObscuraPatternsWeeklySchema = z.object({
    id: z.string(),
    uid: z.string(),
    weekStart: z.number(),
    faceTiltVariance: z.number().optional(),
    microCancelRate: z.number().optional(),
    sensorStillnessScore: z.number().optional(),
    behavioralFatigue: z.number().min(0).max(100),
});
export type ObscuraPatternsWeekly = z.infer<typeof ObscuraPatternsWeeklySchema>;

const BaseClusterSchema = z.object({
    id: z.string(),
    uid: z.string(),
    month: z.number(),
});

export const PsycheMirrorsMonthlySchema = BaseClusterSchema.extend({
    selfConceptFragmentation: z.number(),
    influenceEcho: z.number(),
    emotionalCompassDrift: z.number(),
    memoryMutationRate: z.number(),
});
export type PsycheMirrorsMonthly = z.infer<typeof PsycheMirrorsMonthlySchema>;

export const SubconsciousSignalsMonthlySchema = BaseClusterSchema.extend({
    dreamSymptomSync: z.number(),
    moralConflictIndex: z.number(),
    narrativeCollapseProbability: z.number(),
});
export type SubconsciousSignalsMonthly = z.infer<typeof SubconsciousSignalsMonthlySchema>;

export const SoulSignalsMonthlySchema = BaseClusterSchema.extend({
    spiritualVoidDepth: z.number(),
    invisibleIdentityShift: z.number(),
    narrativeTruthDelta: z.number(),
});
export type SoulSignalsMonthly = z.infer<typeof SoulSignalsMonthlySchema>;

export const MythosMeaningMonthlySchema = BaseClusterSchema.extend({
    archetypalOverloadScore: z.number(),
    selfConceptDrift: z.number(),
    mythicAlignmentVector: z.record(z.number()),
});
export type MythosMeaningMonthly = z.infer<typeof MythosMeaningMonthlySchema>;

export const GoogleDataSchema = z.object({
    id: z.string(),
    uid: z.string(),
    dataType: z.enum(["calendar", "photos", "history", "gmail"]),
    externalId: z.string(),
    processed: z.boolean().default(false),
});
export type GoogleData = z.infer<typeof GoogleDataSchema>;

export const RitualSchema = z.object({
    id: z.string(),
    uid: z.string(),
    type: z.string(),
    createdAt: z.number(),
    status: z.enum(["planned", "done", "shared"]),
    mediaRef: z.string().optional(),
    archetype: z.string().optional(),
    triggers: z.array(z.object({
        type: z.string(),
        sourceId: z.string(),
    })).optional(),
    replyChainRef: z.string().optional(),
});
export type Ritual = z.infer<typeof RitualSchema>;

export const StoryExportSchema = z.object({
    id: z.string(),
    uid: z.string(),
    type: z.enum(["seasonal", "scroll", "dream", "companion"]),
    createdAt: z.number(),
    fileRef: z.string(),
    ttsRef: z.string().optional(),
    publicUrl: z.string().url().optional(),
    reactions: z.record(z.number()).optional(),
});
export type StoryExport = z.infer<typeof StoryExportSchema>;

export const ForecastsDailySchema = z.object({
    id: z.string(),
    uid: z.string(),
    date: z.number(),
    moodForecastVector: z.record(z.number()),
    rhythmState: z.string(),
    stressIndex: z.number(),
    skyShaderParams: z.record(z.any()),
    narratorScriptRef: z.string().optional(),
});
export type ForecastsDaily = z.infer<typeof ForecastsDailySchema>;

export const AutomationSchema = z.object({
    id: z.string(),
    uid: z.string(),
    category: z.enum(["trigger", "schedule", "conditional"]),
    sourceRef: z.string().optional(),
    action: z.enum(["notification", "narration", "ritualSuggestion"]),
    scheduleCron: z.string().optional(),
    enabled: z.boolean().default(true),
});
export type Automation = z.infer<typeof AutomationSchema>;

export const CulturalSettingsSchema = z.object({
    id: z.string(),
    uid: z.string(),
    language: z.string().default('en'),
    seasonalTheme: z.string().optional(),
});
export type CulturalSettings = z.infer<typeof CulturalSettingsSchema>;

export const MetaMetricsSchema = z.object({
    id: z.string(),
    uid: z.string(),
    date: z.number(),
    regretLoopScore: z.number().optional(),
    growthArcProgress: z.number().optional(),
    symbolicResonance: z.number().optional(),
});
export type MetaMetrics = z.infer<typeof MetaMetricsSchema>;

export const ThresholdEventSchema = z.object({
    id: z.string(),
    uid: z.string(),
    timestamp: z.number(),
    eventType: z.string(),
    payload: z.record(z.any()),
});
export type ThresholdEvent = z.infer<typeof ThresholdEventSchema>;

export const LockedMomentSchema = z.object({
    id: z.string(),
    uid: z.string(),
    eventId: z.string(),
    lockedAt: z.number(),
    reason: z.string(),
});
export type LockedMoment = z.infer<typeof LockedMomentSchema>;

export const CompanionThreadSchema = z.object({
    id: z.string(),
    uid: z.string(),
    archetypeId: z.string(),
    createdAt: z.number(),
    lastInteractionAt: z.number(),
    symbolicMemory: z.record(z.any()),
});
export type CompanionThread = z.infer<typeof CompanionThreadSchema>;

// Data Privacy Schemas
export const AnonymizedDataSchema = z.object({
    hashId: z.string(),
    metricId: z.string(),
    moodVector: z.array(z.number()),
    patternCluster: z.string(),
    recoveryArc: z.number(),
    metadata: z.object({
        timezoneGroup: z.string(),
        deviceType: z.string(),
    }),
});
export type AnonymizedData = z.infer<typeof AnonymizedDataSchema>;

export const B2BExportSchema = z.object({
    reportId: z.string(),
    week: z.string(),
    data: z.record(z.any()), // This would be structured reports
});
export type B2BExport = z.infer<typeof B2BExportSchema>;

// Email System Schemas
export const MailSchema = z.object({
    to: z.string().email(),
    subject: z.string(),
    html: z.string(),
    template: z.string().optional(),
    attachments: z.array(z.object({ url: z.string(), type: z.string() })).optional(),
    ttsVoiceUrl: z.string().url().optional(),
});
export type Mail = z.infer<typeof MailSchema>;

export const EmailThreadReplySchema = z.object({
    id: z.string(),
    uid: z.string(),
    originalRitualId: z.string(),
    replyText: z.string(),
    timestamp: z.number(),
});
export type EmailThreadReply = z.infer<typeof EmailThreadReplySchema>;

export const DailyDigestQueueSchema = z.object({
    uid: z.string(),
    moodTrend: z.array(z.any()),
    ritualsPerformed: z.array(z.any()),
    dreamSummary: z.record(z.any()),
    stressScore: z.number(),
    narratorReflection: z.string(),
});
export type DailyDigestQueue = z.infer<typeof DailyDigestQueueSchema>;

// Speech, TTS, and AI Pipeline Schemas
export const VoiceClipSchema = z.object({
    clipUrl: z.string().url(),
    type: z.enum(["ambient", "prompt", "ritual", "reply"]),
    triggerContext: z.string(),
    recordedAt: z.number(),
    processed: z.boolean().default(false),
});
export type VoiceClip = z.infer<typeof VoiceClipSchema>;

export const VoiceTranscriptSchema = z.object({
    text: z.string(),
    language: z.string(),
    words: z.number(),
    whisperModel: z.string(),
    finishedAt: z.number(),
});
export type VoiceTranscript = z.infer<typeof VoiceTranscriptSchema>;

export const TranscriptTagsSchema = z.object({
    goal: z.string().nullable(),
    task: z.string().nullable(),
    reminderDate: z.number().nullable(),
    emotionTag: z.string(),
    peopleMentioned: z.array(z.string()),
    sentimentScore: z.number(),
});
export type TranscriptTags = z.infer<typeof TranscriptTagsSchema>;

export const AmbientToneSchema = z.object({
    valence: z.number(),
    arousal: z.number(),
    clipId: z.string(),
    timestamp: z.number(),
    locationBucket: z.string(),
});
export type AmbientTone = z.infer<typeof AmbientToneSchema>;

// Schemas for Visual Animations & Overlays
export const EmotionEventVisualSchema = z.object({
    id: z.string(),
    uid: z.string(),
    valence: z.number().min(-1).max(1),
    arousal: z.number().min(0).max(1),
    detectedAt: z.number(),
    source: z.enum(["ambient", "voice", "interaction"]),
    auraColor: z.string(),
    moodGradient: z.string(),
    constellationGlow: z.boolean(),
    triggeredOverlay: z.string().nullable(),
});
export type EmotionEventVisual = z.infer<typeof EmotionEventVisualSchema>;

export const SocialOverlaySchema = z.object({
    personId: z.string(),
    uid: z.string(),
    lastInteraction: z.number(),
    silhouetteVisible: z.boolean(),
    shadowFracture: z.boolean(),
    orbitGlowIntensity: z.number(),
    archetypeSymbol: z.string().nullable(),
});
export type SocialOverlay = z.infer<typeof SocialOverlaySchema>;

export const RecoveryBloomSchema = z.object({
    id: z.string(),
    uid: z.string(),
    bloomTriggeredAt: z.number(),
    bloomType: z.enum(["insight", "ritual", "dream"]),
    bloomLocation: z.string(), // "left_foot", "chest"
    replayAvailable: z.boolean(),
    constellationLinked: z.boolean(),
});
export type RecoveryBloom = z.infer<typeof RecoveryBloomSchema>;

export const RitualCardSchema = z.object({
    id: z.string(),
    uid: z.string(),
    animationVariant: z.enum(["petal", "seed", "flame"]),
    displayGlyph: z.string(),
    glowState: z.enum(["active", "archived"]),
    voiceOverlayUrl: z.string().url().nullable(),
});
export type RitualCard = z.infer<typeof RitualCardSchema>;

// Passive Telemetry Schemas
export const TelemetryEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  timestamp: z.number(),
  eventType: z.enum([
    'screen_on',
    'screen_off',
    'notification_received',
    'app_opened',
    'charging_started',
    'motion_event',
    'idle',
  ]),
  packageName: z.string().optional(),
  eventDuration: z.number().optional(),
  screenBrightnessLevel: z.number().optional(),
  batteryLevel: z.number().optional(),
  isUserInteracting: z.boolean(),
  gpsLocation: z.any().optional(), // GeoPoint
});
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

export const DailyTelemetrySummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD
  totalScreenTimeMs: z.number(),
  numNotifications: z.number(),
  numAppSwitches: z.number(),
  mostUsedApps: z.array(z.string()),
  nighttimeUsageScore: z.number(),
  overstimulationScore: z.number(),
  attentionFragmentationIndex: z.number(),
  notificationInterruptionsScore: z.number(),
  digitalFatigueLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  emotionLinkedInsights: z.record(z.number()),
  linkedVoiceEvents: z.array(z.string()),
});
export type DailyTelemetrySummary = z.infer<typeof DailyTelemetrySummarySchema>;

// Avatar Identity Schemas
export const AvatarIdentityProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  dayOnSystem: z.number(),
  inferredSkinTone: z.string().optional(),
  inferredGenderSignal: z.record(z.number()).optional(),
  inferredRaceTag: z.string().optional(),
  inferredOrientationHint: z.string().optional(),
  featureStage: z.enum([
    'blank',
    'limbs',
    'tone',
    'faceShape',
    'clothing',
    'artifact',
    'locked',
  ]),
  customizationAllowed: z.boolean(),
  avatarArtDetails: z.record(z.string()),
});
export type AvatarIdentityProgress = z.infer<typeof AvatarIdentityProgressSchema>;

export const NarratorIdentityMomentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  timestamp: z.number(),
  triggerStage: z.string(),
  reflectionText: z.string(),
});
export type NarratorIdentityMoment = z.infer<typeof NarratorIdentityMomentSchema>;

// Dream Intelligence Schemas
export const DreamSymbolLibrarySchema = z.object({
  symbolId: z.string(),
  name: z.string(),
  symbolType: z.string(),
  archetypalTag: z.string(),
  visualOverlay: z.string(),
  interpretationHint: z.string(),
});
export type DreamSymbolLibrary = z.infer<typeof DreamSymbolLibrarySchema>;

export const DreamConstellationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  week: z.string(), // YYYY-WW
  dominantSymbols: z.array(z.string()),
  emotionalArc: z.string(),
  linkedMoodShifts: z.array(z.string()),
  memoryBloomLink: z.string().optional(),
});
export type DreamConstellation = z.infer<typeof DreamConstellationSchema>;

// B2B Export Schema
export const AnonymizedBehaviorExportSchema = z.object({
  id: z.string(),
  hashedUserId: z.string(),
  date: z.string(),
  screenTimeCategory: z.string(),
  notificationDensity: z.string(),
  attentionSwitchRate: z.number(),
  emotionCorrelationSummary: z.record(z.number()),
  shadowFatigueIndex: z.number(),
});
export type AnonymizedBehaviorExport = z.infer<typeof AnonymizedBehaviorExportSchema>;

// Advanced Symbolic Systems
export const SymbolicMemoryNodeSchema = z.object({
    nodeId: z.string(),
    userId: z.string(),
    sourceType: z.enum(['scroll', 'dream', 'ritual', 'threshold', 'voiceEvent', 'companion', 'innerVoice']),
    linkedEventId: z.string(), // reference
    symbolTags: z.array(z.string()),
    emotionState: z.record(z.number()),
    archetypeInvolved: z.string(),
    memoryWeight: z.number().min(0).max(1),
    timestamp: z.number(),
    isKeyNode: z.boolean(),
});
export type SymbolicMemoryNode = z.infer<typeof SymbolicMemoryNodeSchema>;

export const SymbolicMemoryLinkSchema = z.object({
    linkId: z.string(),
    userId: z.string(),
    fromNodeId: z.string(), // reference
    toNodeId: z.string(), // reference
    linkType: z.enum(['echo', 'transformation', 'loop', 'inversion', 'resolution']),
    linkStrength: z.number().min(0).max(1),
    symbolicMeaning: z.string(),
});
export type SymbolicMemoryLink = z.infer<typeof SymbolicMemoryLinkSchema>;

export const SymbolicMetaPatternSummarySchema = z.object({
    userId: z.string(),
    lastUpdated: z.number(),
    dominantPatterns: z.array(z.string()),
    archetypeTrajectoryMap: z.string(), // e.g. 'Seeker -> Ghost -> Witness'
    forecastedSymbolStates: z.array(z.string()),
    memoryDensityIndex: z.number(),
});
export type SymbolicMetaPatternSummary = z.infer<typeof SymbolicMetaPatternSummarySchema>;

export const SharedConstellationLinkSchema = z.object({
    linkId: z.string(),
    userIds: z.array(z.string()),
    sharedScrollId: z.string(),
    createdAt: z.number(),
});
export type SharedConstellationLink = z.infer<typeof SharedConstellationLinkSchema>;

export const GenerationalLinkSchema = z.object({
    linkId: z.string(),
    userId: z.string(),
    linkedScrolls: z.array(z.string()),
    symbolicTheme: z.string(),
    sharedSymbols: z.array(z.string()),
    emotionalArcType: z.enum(['repeat', 'resolve', 'mutate', 'invert']),
    narratorLinkReflection: z.string(),
    visualOverlay: z.enum(['thread', 'root', 'loop', 'constellation', 'fracture']),
    ancestralLinkId: z.string().optional(),
    relationType: z.string().optional(),
    inheritedEmotionArcs: z.array(z.string()).optional(),
});
export type GenerationalLink = z.infer<typeof GenerationalLinkSchema>;

export const DreamVisualStorySchema = z.object({
    storyId: z.string(),
    userId: z.string(),
    dreamId: z.string(),
    videoUrl: z.string().url(),
    createdAt: z.number(),
});
export type DreamVisualStory = z.infer<typeof DreamVisualStorySchema>;

export const CompanionMessageSchema = z.object({
    messageId: z.string(),
    threadId: z.string(),
    userId: z.string(),
    companionId: z.string(),
    role: z.enum(['user', 'companion']),
    content: z.string(),
    timestamp: z.number(),
});
export type CompanionMessage = z.infer<typeof CompanionMessageSchema>;

export const WeeklyForecastReportSchema = z.object({
    reportId: z.string(),
    userId: z.string(),
    weekStartDate: z.number(),
    symbolicTrends: z.array(z.string()),
    dreamArcSummary: z.string(),
    auraShiftSummary: z.string(),
    narratorQuote: z.string(),
    suggestedRitual: z.string(),
});
export type WeeklyForecastReport = z.infer<typeof WeeklyForecastReportSchema>;

export const RecoveryEventSchema = z.object({
    eventId: z.string(),
    userId: z.string(),
    timestamp: z.number(),
    recoveryType: z.enum(['emotional', 'identity', 'relational', 'health', 'creative', 'spiritual']),
    linkedThresholdId: z.string().optional(),
    symbolicTags: z.array(z.string()),
    voiceNarrationUrl: z.string().url().optional(),
    memoryBloomId: z.string().optional(),
});
export type RecoveryEvent = z.infer<typeof RecoveryEventSchema>;

export const RecoveryAnniversarySchema = z.object({
    anniversaryId: z.string(),
    userId: z.string(),
    eventRef: z.string(),
    anniversaryDate: z.number(),
    yearCount: z.number(),
    triggered: z.boolean(),
    reflectionText: z.string(),
    suggestedRitual: z.string().optional(),
    visualOverlay: z.enum(['sunburst', 'aurora', 'garden_return', 'light_pulse', 'sky_bridge']),
});
export type RecoveryAnniversary = z.infer<typeof RecoveryAnniversarySchema>;

export const MirrorOfBecomingSchema = z.object({
    id: z.string(),
    userId: z.string(),
    createdAt: z.number(),
    scrollFragmentsUsed: z.array(z.string()),
    dominantArchetypeThreads: z.array(z.string()),
    emotionTrajectory: z.record(z.number()),
    auraColorMap: z.record(z.string()),
    symbolicMilestoneTags: z.array(z.string()),
    narrativeScrollText: z.string(),
    voiceNarrationUrl: z.string().url().optional(),
    finalAvatarStyle: z.record(z.string()),
    visualConstellationMapUrl: z.string().url().optional(),
});
export type MirrorOfBecoming = z.infer<typeof MirrorOfBecomingSchema>;

export const LifeStoryExportSchema = z.object({
    exportId: z.string(),
    userId: z.string(),
    formatType: z.enum(['pdf', 'mp3', 'mp4', 'gif', 'zip']),
    fileUrl: z.string().url(),
    createdAt: z.number(),
    includedSections: z.record(z.boolean()),
    sharedPublicly: z.boolean(),
});
export type LifeStoryExport = z.infer<typeof LifeStoryExportSchema>;

export const ScrollRemixSchema = z.object({
    remixId: z.string(),
    userId: z.string(),
    originalScrollId: z.string(),
    remixTitle: z.string(),
    remixType: z.enum(['alternate_ending', 'shadow_path', 'ritual_insert', 'symbolic_mirror', 'healing_thread']),
    originalThemes: z.array(z.string()),
    alternateSymbols: z.array(z.string()),
    removedSymbols: z.array(z.string()),
    remixNarrativeText: z.string(),
    remixVoiceNarrationUrl: z.string().url().optional(),
    remixVisualOverlay: z.enum(['shattered_scroll', 'mirror_scroll', 'new_bloom', 'storm_resolve']),
});
export type ScrollRemix = z.infer<typeof ScrollRemixSchema>;

export const PublicGalleryPostSchema = z.object({
    postId: z.string(),
    userId: z.string(),
    scrollId: z.string().optional(),
    remixId: z.string().optional(),
    postType: z.enum(['scroll', 'remix', 'ritualThread']),
    publishedAt: z.number(),
    themeTags: z.array(z.string()),
    symbolOverlay: z.enum(['bloom', 'storm', 'mirror', 'night_fire', 'tree']),
    visibility: z.enum(['public', 'gallery_only', 'reply_only']),
    archetypeTone: z.string(),
});
export type PublicGalleryPost = z.infer<typeof PublicGalleryPostSchema>;

export const ViewerReactionSchema = z.object({
    reactionId: z.string(),
    postId: z.string(),
    viewerId: z.string(),
    reactionSymbol: z.string(),
    timestamp: z.number(),
});
export type ViewerReaction = z.infer<typeof ViewerReactionSchema>;

export const PublicReplyChainSchema = z.object({
    replyId: z.string(),
    postId: z.string(),
    replyType: z.enum(['text', 'audio', 'visual_symbol']),
    content: z.string(),
    replyerArchetype: z.string().optional(),
    timestamp: z.number(),
    isThreadLink: z.boolean(),
});
export type PublicReplyChain = z.infer<typeof PublicReplyChainSchema>;

export const InnerVoiceModelSchema = z.object({
    userId: z.string(),
    lastUpdated: z.number(),
    dominantToneProfile: z.record(z.number()),
    symbolicSelfView: z.enum(['child', 'warrior', 'wanderer', 'ghost', 'mirror', 'observer']),
    emotionalDefaultState: z.string(),
    moodContrastWithNarrator: z.record(z.number()),
    lastContrastEventId: z.string(),
    innerVoiceQuoteExamples: z.array(z.string()),
});
export type InnerVoiceModel = z.infer<typeof InnerVoiceModelSchema>;

export const InnerVoiceMomentSchema = z.object({
    id: z.string(),
    userId: z.string(),
    timestamp: z.number(),
    sourceType: z.enum(['ritual', 'dream', 'voiceEvent', 'threshold']),
    detectedInnerTone: z.record(z.number()),
    contrastWithNarrator: z.boolean(),
    summaryText: z.string(),
    linkedEmotionState: z.string(),
});
export type InnerVoiceMoment = z.infer<typeof InnerVoiceMomentSchema>;

export const ProcessedOnboardingDataSchema = z.object({
    onboardIntake: OnboardIntakeSchema,
    goal: GoalSchema.optional(),
    task: TaskSchema.optional(),
    calendarEvent: CalendarEventSchema.optional(),
    habitWatch: HabitWatchSchema.optional(),
});
export type ProcessedOnboardingData = z.infer<typeof ProcessedOnboardingDataSchema>;


export const WeeklyScrollSchema = z.object({
    id: z.string(),
    uid: z.string(),
    title: z.string().optional(),
    weekStart: z.number().optional(),
    weekEnd: z.number().optional(),
    summaryMood: z.string().optional(),
    highlights: z.array(z.object({
        type: z.string(),
        text: z.string(),
    })),
    segments: z.array(z.string()).optional(),
    narrationScript: z.string(),
    exportLinks: z.object({
        audio: z.string(),
        image: z.string(),
    }),
    createdAt: z.number(),
    linkedUserIds: z.array(z.string()).optional(),
});
export type WeeklyScroll = z.infer<typeof WeeklyScrollSchema>;

export const CompanionSchema = z.object({
    id: z.string(),
    uid: z.string(),
    archetype: z.string(),
    tone: z.string(),
    memoryThread: z.array(z.string()),
    evolutionStage: z.string(),
    voicePreset: z.string(),
    isActive: z.boolean(),
});
export type Companion = z.infer<typeof CompanionSchema>;
