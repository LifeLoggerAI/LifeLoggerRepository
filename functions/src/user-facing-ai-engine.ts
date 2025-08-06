import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import type {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Section 4: User-Facing AI Implementation
 * Following the URAI build checklist specifications
 */

/**
 * 1. Narrator Insight Chat (Enhanced)
 * Enhanced chat with TTS integration based on cognitive mirror data
 */
export const getNarratorInsight = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { contextType = 'daily', specificDate, includeForecasts = true } = request.data;

  try {
    logger.info(`Generating narrator insight for user ${uid}, context: ${contextType}`);

    // Get recent cognitive mirror data for context
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = specificDate || yesterday.toISOString().split('T')[0];

    const [cognitiveData, emotionForecast, recentEvents] = await Promise.all([
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .where("date", "<=", dateKey)
        .orderBy("date", "desc")
        .limit(7)
        .get(),
      includeForecasts ? db.collection("emotionForecast")
        .where("userId", "==", uid)
        .where("date", ">=", dateKey)
        .orderBy("date", "asc")
        .limit(3)
        .get() : null,
      db.collection("voiceEvents")
        .where("uid", "==", uid)
        .where("createdAt", ">=", yesterday.getTime() - 7 * 24 * 60 * 60 * 1000)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get()
    ]);

    // Generate contextual insights
    const insights = generateNarratorInsights(
      cognitiveData.docs.map(doc => doc.data()),
      emotionForecast?.docs.map(doc => doc.data()) || [],
      recentEvents.docs.map(doc => doc.data()),
      contextType
    );

    // Get user's narrator preferences
    const userDoc = await db.collection("users").doc(uid).get();
    const narratorPrefs = userDoc.data()?.narratorPrefs || getDefaultNarratorPrefs();

    // Create narrator insight entry
    const narratorInsightId = uuidv4();
    const narratorInsight = {
      id: narratorInsightId,
      userId: uid,
      contextType: contextType,
      insights: insights,
      narratorTone: narratorPrefs.toneStyle || 'empathetic',
      ttsConfig: narratorPrefs.ttsConfig || { pitch: 1.0, speed: 1.0 },
      createdAt: Date.now(),
      consumed: false
    };

    await db.collection("narratorInsights").doc(narratorInsightId).set(narratorInsight);

    return {
      success: true,
      insight: narratorInsight,
      needsTTS: true // Flag for client to generate TTS
    };
  } catch (error) {
    logger.error("Error generating narrator insight:", error);
    throw new HttpsError("internal", "Failed to generate narrator insight");
  }
});

/**
 * 2. Inner Voice Modeling
 * Personalized TTS voice configuration based on user patterns
 */
export const updateInnerVoiceModel = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { voicePreferences, adaptToMood = true } = request.data;

  try {
    logger.info(`Updating inner voice model for user ${uid}`);

    // Get recent voice events to analyze user's speaking patterns
    const recentVoiceEvents = await db.collection("voiceEvents")
      .where("uid", "==", uid)
      .where("createdAt", ">=", Date.now() - 30 * 24 * 60 * 60 * 1000)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    // Analyze speaking patterns
    const voiceAnalysis = analyzeVoicePatterns(recentVoiceEvents.docs.map(doc => doc.data()));

    // Get recent cognitive states for mood adaptation
    const recentCognitive = await db.collection("cognitiveMirror")
      .where("userId", "==", uid)
      .orderBy("date", "desc")
      .limit(7)
      .get();

    const moodContext = adaptToMood ? analyzeMoodContext(recentCognitive.docs.map(doc => doc.data())) : null;

    // Create or update inner voice model
    const innerVoiceModel = {
      userId: uid,
      lastUpdated: Date.now(),
      baseVoiceProfile: {
        pitch: voicePreferences?.pitch || voiceAnalysis.averagePitch || 1.0,
        speed: voicePreferences?.speed || voiceAnalysis.averageSpeed || 1.0,
        tone: voicePreferences?.tone || voiceAnalysis.dominantTone || 'calm',
        warmth: voicePreferences?.warmth || 0.7
      },
      adaptiveMoodMapping: moodContext ? {
        happy: { pitchAdjust: 0.1, speedAdjust: 0.1 },
        sad: { pitchAdjust: -0.1, speedAdjust: -0.1 },
        stressed: { pitchAdjust: 0.05, speedAdjust: 0.15 },
        calm: { pitchAdjust: 0, speedAdjust: 0 }
      } : null,
      personalityTraits: voiceAnalysis.personalityTraits,
      metaphorLexicon: generatePersonalizedMetaphors(voiceAnalysis, moodContext),
      humorStyle: voiceAnalysis.humorStyle || 'gentle'
    };

    await db.collection("innerVoiceModels").doc(uid).set(innerVoiceModel);

    // Update user's narrator preferences
    await db.collection("users").doc(uid).update({
      narratorPrefs: {
        toneStyle: innerVoiceModel.baseVoiceProfile.tone,
        ttsConfig: {
          pitch: innerVoiceModel.baseVoiceProfile.pitch,
          speed: innerVoiceModel.baseVoiceProfile.speed
        },
        metaphorLexicon: innerVoiceModel.metaphorLexicon
      }
    });

    return {
      success: true,
      voiceModel: innerVoiceModel
    };
  } catch (error) {
    logger.error("Error updating inner voice model:", error);
    throw new HttpsError("internal", "Failed to update inner voice model");
  }
});

/**
 * 3. Passive Insight Suggestions
 * Pattern-based engagement triggers
 */
export const generatePassiveInsights = onSchedule(
  {
    schedule: "0 */3 * * *", // Every 3 hours
    timeZone: "UTC"
  },
  async () => {
    logger.info("Generating passive insights for all users");

    try {
      const usersSnapshot = await db.collection("users")
        .where("settings.passiveInsightsEnabled", "==", true)
        .get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get recent activity patterns
        const [recentCognitive, recentVoice, recentDevice] = await Promise.all([
          db.collection("cognitiveMirror")
            .where("userId", "==", userId)
            .orderBy("date", "desc")
            .limit(3)
            .get(),
          db.collection("voiceEvents")
            .where("uid", "==", userId)
            .where("createdAt", ">=", Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
            .get(),
          db.collection("deviceSignals")
            .where("userId", "==", userId)
            .where("timestamp", ">=", Date.now() - 6 * 60 * 60 * 1000)
            .get()
        ]);

        // Check for patterns that warrant gentle insights
        const patterns = detectEngagementPatterns(
          recentCognitive.docs.map(doc => doc.data()),
          recentVoice.docs.map(doc => doc.data()),
          recentDevice.docs.map(doc => doc.data())
        );

        if (patterns.shouldEngageGently) {
          const passiveInsight = {
            id: uuidv4(),
            userId: userId,
            type: patterns.type,
            trigger: patterns.trigger,
            suggestion: patterns.suggestion,
            urgency: patterns.urgency || 'low',
            deliveryMethod: patterns.preferredDelivery || 'subtle_notification',
            scheduledFor: Date.now() + (patterns.delayMinutes || 15) * 60 * 1000,
            createdAt: Date.now(),
            consumed: false
          };

          await db.collection("passiveInsights").doc(passiveInsight.id).set(passiveInsight);

          logger.info(`Passive insight generated for user ${userId}: ${patterns.type}`);
        }
      }
    } catch (error) {
      logger.error("Error generating passive insights:", error);
    }
  }
);

/**
 * 4. Humor & Inside Joke Memory
 * Store and surface personalized humorous references
 */
export const recordHumorMoment = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { content, context, humorType = 'spontaneous' } = request.data;
  if (!content) {
    throw new HttpsError("invalid-argument", "content is required");
  }

  try {
    logger.info(`Recording humor moment for user ${uid}`);

    const humorMoment = {
      id: uuidv4(),
      userId: uid,
      content: content,
      context: context || 'general',
      humorType: humorType,
      frequency: 1, // How often it's referenced
      lastUsed: Date.now(),
      createdAt: Date.now(),
      tags: extractHumorTags(content),
      moodWhenCreated: await getCurrentMoodContext(uid)
    };

    await db.collection("humorMemory").doc(humorMoment.id).set(humorMoment);

    return {
      success: true,
      humorMoment: humorMoment
    };
  } catch (error) {
    logger.error("Error recording humor moment:", error);
    throw new HttpsError("internal", "Failed to record humor moment");
  }
});

export const suggestHumorReference = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { currentMood, context = 'general' } = request.data;

  try {
    logger.info(`Suggesting humor reference for user ${uid}, mood: ${currentMood}`);

    // Get humor memories that match the context and might lift mood
    const humorQuery = db.collection("humorMemory")
      .where("userId", "==", uid)
      .where("context", "==", context)
      .orderBy("frequency", "desc")
      .limit(10);

    const humorSnapshot = await humorQuery.get();

    if (humorSnapshot.empty) {
      return {
        success: true,
        suggestion: null,
        message: "No humor memories found for this context"
      };
    }

    // Select appropriate humor based on current mood
    const humorMemories = humorSnapshot.docs.map(doc => doc.data());
    const selectedHumor = selectHumorForMood(humorMemories, currentMood);

    if (selectedHumor) {
      // Update usage frequency
      await db.collection("humorMemory").doc(selectedHumor.id).update({
        frequency: admin.firestore.FieldValue.increment(1),
        lastUsed: Date.now()
      });

      return {
        success: true,
        suggestion: {
          content: selectedHumor.content,
          context: selectedHumor.context,
          lastUsed: selectedHumor.lastUsed
        }
      };
    }

    return {
      success: true,
      suggestion: null,
      message: "No suitable humor found for current mood"
    };
  } catch (error) {
    logger.error("Error suggesting humor reference:", error);
    throw new HttpsError("internal", "Failed to suggest humor reference");
  }
});

/**
 * Trigger passive insights when cognitive state changes significantly
 */
export const onCognitiveStateChange = onDocumentCreated(
  "cognitiveMirror/{mirrorId}",
  async (event: any) => {
    const cognitiveData = event.data?.data();
    if (!cognitiveData) return;

    const userId = cognitiveData.userId;

    try {
      // Check if this represents a significant change
      const previousStates = await db.collection("cognitiveMirror")
        .where("userId", "==", userId)
        .where("date", "<", cognitiveData.date)
        .orderBy("date", "desc")
        .limit(3)
        .get();

      if (!previousStates.empty) {
        const changeDetected = detectSignificantChange(
          previousStates.docs.map(doc => doc.data()),
          cognitiveData
        );

        if (changeDetected.isSignificant) {
          // Create a passive insight opportunity
          const insight = {
            id: uuidv4(),
            userId: userId,
            type: 'mood_shift_awareness',
            trigger: changeDetected.type,
            suggestion: generateMoodShiftSuggestion(changeDetected),
            urgency: changeDetected.urgency,
            deliveryMethod: 'gentle_notification',
            scheduledFor: Date.now() + 30 * 60 * 1000, // 30 minutes delay
            createdAt: Date.now(),
            consumed: false
          };

          await db.collection("passiveInsights").doc(insight.id).set(insight);

          logger.info(`Mood shift insight created for user ${userId}: ${changeDetected.type}`);
        }
      }
    } catch (error) {
      logger.error("Error processing cognitive state change:", error);
    }
  }
);

// Helper functions
function generateNarratorInsights(cognitiveData: any[], forecastData: any[], voiceEvents: any[], contextType: string): any {
  const latestCognitive = cognitiveData[0];
  
  if (!latestCognitive) {
    return {
      message: "I'd love to share some insights, but I need a bit more data about your recent experiences.",
      tone: "encouraging",
      suggestions: ["Try logging some voice reflections to help me understand your patterns better."]
    };
  }

  let message = "";
  let tone = "empathetic";
  const suggestions = [];

  // Analyze mood trend
  if (cognitiveData.length >= 3) {
    const trend = analyzeMoodTrend(cognitiveData.slice(0, 3));
    if (trend === 'improving') {
      message = "I've noticed your mood has been on an upward trajectory lately. ";
      tone = "positive";
    } else if (trend === 'declining') {
      message = "It seems like you've been going through a challenging period. ";
      tone = "supportive";
      suggestions.push("Consider taking some time for self-care activities that bring you peace.");
    }
  }

  // Add forecast context if available
  if (forecastData.length > 0) {
    const nextForecast = forecastData[0];
    if (nextForecast.predictedMood === 'challenging') {
      message += "Tomorrow might feel a bit heavy, but remember - you've navigated difficult days before. ";
      suggestions.push("Plan something small that brings you joy for tomorrow.");
    } else if (nextForecast.predictedMood === 'positive') {
      message += "Tomorrow looks promising! ";
      suggestions.push("Consider tackling something you've been putting off while your energy is good.");
    }
  }

  // Voice activity insights
  if (voiceEvents.length === 0) {
    suggestions.push("I haven't heard from you in a while. Sometimes sharing your thoughts out loud can bring clarity.");
  }

  return {
    message: message || "Each day brings its own rhythm. I'm here to help you understand yours.",
    tone: tone,
    suggestions: suggestions
  };
}

function analyzeVoicePatterns(voiceEvents: any[]): any {
  if (voiceEvents.length === 0) {
    return {
      averagePitch: 1.0,
      averageSpeed: 1.0,
      dominantTone: 'calm',
      personalityTraits: ['introspective'],
      humorStyle: 'gentle'
    };
  }

  const emotions = voiceEvents.map(event => event.emotion);
  const sentiments = voiceEvents.map(event => event.sentimentScore || 0);

  return {
    averagePitch: 1.0, // Would be calculated from actual voice analysis
    averageSpeed: 1.0,
    dominantTone: getMostFrequent(emotions) || 'calm',
    personalityTraits: inferPersonalityTraits(emotions, sentiments),
    humorStyle: inferHumorStyle(voiceEvents)
  };
}

function analyzeMoodContext(cognitiveData: any[]): any {
  if (cognitiveData.length === 0) return null;

  const avgMood = cognitiveData.reduce((sum, day) => sum + (day.moodScore || 50), 0) / cognitiveData.length;
  const avgStress = cognitiveData.reduce((sum, day) => sum + (day.stressIndex || 50), 0) / cognitiveData.length;

  return {
    currentMoodLevel: avgMood > 70 ? 'high' : avgMood < 40 ? 'low' : 'moderate',
    stressLevel: avgStress > 70 ? 'high' : avgStress < 40 ? 'low' : 'moderate',
    stability: Math.abs(Math.max(...cognitiveData.map(d => d.moodScore)) - Math.min(...cognitiveData.map(d => d.moodScore))) < 20 ? 'stable' : 'variable'
  };
}

function generatePersonalizedMetaphors(voiceAnalysis: any, moodContext: any): string[] {
  const metaphors = [
    "flowing river", "mountain path", "gentle breeze", "morning light",
    "deep roots", "open sky", "quiet forest", "warm embrace"
  ];

  // Customize based on personality and mood
  if (voiceAnalysis.personalityTraits?.includes('introspective')) {
    metaphors.push("inner sanctuary", "thoughtful pause", "reflective pool");
  }

  return metaphors.slice(0, 5); // Return top 5
}

function detectEngagementPatterns(cognitive: any[], voice: any[], device: any[]): any {
  // Check for patterns that suggest user needs gentle engagement
  
  if (cognitive.length > 0) {
    const latestCognitive = cognitive[0];
    
    // Low mood with no recent voice activity
    if (latestCognitive.moodScore < 40 && voice.length === 0) {
      return {
        shouldEngageGently: true,
        type: 'low_mood_silence',
        trigger: 'prolonged_low_mood_without_expression',
        suggestion: 'Sometimes talking through feelings can help. Would you like to share what\'s on your mind?',
        urgency: 'medium',
        preferredDelivery: 'gentle_notification',
        delayMinutes: 20
      };
    }

    // High stress with high device activity
    if (latestCognitive.stressIndex > 70 && device.length > 10) {
      return {
        shouldEngageGently: true,
        type: 'stress_overactivity',
        trigger: 'high_stress_with_device_overuse',
        suggestion: 'You seem to be in a busy period. Taking a moment to breathe might help center you.',
        urgency: 'low',
        preferredDelivery: 'subtle_notification',
        delayMinutes: 45
      };
    }
  }

  return {
    shouldEngageGently: false
  };
}

function extractHumorTags(content: string): string[] {
  // Simple tag extraction - in reality would use NLP
  const tags = [];
  if (content.includes('funny')) tags.push('funny');
  if (content.includes('joke')) tags.push('joke');
  if (content.includes('laugh')) tags.push('laughter');
  return tags;
}

async function getCurrentMoodContext(uid: string): Promise<string> {
  try {
    const recentCognitive = await db.collection("cognitiveMirror")
      .where("userId", "==", uid)
      .orderBy("date", "desc")
      .limit(1)
      .get();

    if (!recentCognitive.empty) {
      const moodScore = recentCognitive.docs[0].data().moodScore || 50;
      return moodScore > 70 ? 'positive' : moodScore < 40 ? 'low' : 'neutral';
    }
  } catch (error) {
    logger.error("Error getting current mood context:", error);
  }
  return 'neutral';
}

function selectHumorForMood(humorMemories: any[], currentMood: string): any {
  // Select humor that's appropriate for current mood
  if (currentMood === 'low') {
    // Find gentle, uplifting humor
    return humorMemories.find(humor => 
      humor.humorType === 'uplifting' || humor.moodWhenCreated === 'positive'
    ) || humorMemories[0];
  }
  
  return humorMemories[0]; // Return most frequent
}

function detectSignificantChange(previousStates: any[], currentState: any): any {
  if (previousStates.length === 0) {
    return { isSignificant: false };
  }

  const avgPreviousMood = previousStates.reduce((sum, state) => sum + (state.moodScore || 50), 0) / previousStates.length;
  const moodChange = (currentState.moodScore || 50) - avgPreviousMood;

  if (Math.abs(moodChange) > 20) {
    return {
      isSignificant: true,
      type: moodChange > 0 ? 'mood_improvement' : 'mood_decline',
      magnitude: Math.abs(moodChange),
      urgency: Math.abs(moodChange) > 30 ? 'medium' : 'low'
    };
  }

  return { isSignificant: false };
}

function generateMoodShiftSuggestion(changeDetected: any): string {
  if (changeDetected.type === 'mood_improvement') {
    return "I noticed your mood has been lifting lately. It's beautiful to witness your resilience in action.";
  } else if (changeDetected.type === 'mood_decline') {
    return "I sense you're going through a more difficult time. Remember, these valleys are temporary, and you don't have to navigate them alone.";
  }
  return "I'm here to support you through whatever you're experiencing.";
}

function analyzeMoodTrend(cognitiveData: any[]): string {
  if (cognitiveData.length < 2) return 'stable';
  
  const scores = cognitiveData.map(data => data.moodScore || 50);
  const slope = (scores[0] - scores[scores.length - 1]) / (scores.length - 1);
  
  if (slope > 5) return 'improving';
  if (slope < -5) return 'declining';
  return 'stable';
}

function getMostFrequent(arr: any[]): any {
  if (arr.length === 0) return null;
  
  const frequency: Record<string, number> = {};
  arr.forEach(item => {
    frequency[item] = (frequency[item] || 0) + 1;
  });
  
  return Object.entries(frequency).reduce((a, b) => frequency[a[0]] > frequency[b[0]] ? a : b)[0];
}

function inferPersonalityTraits(emotions: string[], sentiments: number[]): string[] {
  const traits = [];
  
  const avgSentiment = sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length;
  
  if (avgSentiment > 0.3) traits.push('optimistic');
  if (avgSentiment < -0.3) traits.push('contemplative');
  
  const emotionVariety = new Set(emotions).size;
  if (emotionVariety > emotions.length * 0.7) traits.push('emotionally_expressive');
  
  return traits.length > 0 ? traits : ['introspective'];
}

function inferHumorStyle(voiceEvents: any[]): string {
  // Simple analysis - would be more sophisticated in practice
  const hasPositiveEmotions = voiceEvents.some(event => 
    ['joy', 'amusement', 'playful'].includes(event.emotion)
  );
  
  return hasPositiveEmotions ? 'playful' : 'gentle';
}

function getDefaultNarratorPrefs(): any {
  return {
    toneStyle: 'empathetic',
    ttsConfig: { pitch: 1.0, speed: 1.0 },
    metaphorLexicon: ['gentle river', 'quiet strength', 'inner light']
  };
}