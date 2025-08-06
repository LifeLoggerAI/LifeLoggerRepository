
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {FirestoreEvent} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Section 3: Timeline & Replay Systems Implementation
 * Following the URAI build checklist specifications
 */

/**
 * 1. Cognitive Timeline Playback
 * Query cognitiveMirror + emotionForecast by date range
 */
export const getCognitiveTimeline = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { startDate, endDate, includeForecasts = true } = request.data;
  if (!startDate || !endDate) {
    throw new HttpsError("invalid-argument", "startDate and endDate are required");
  }

  try {
    logger.info(`Fetching cognitive timeline for user ${uid} from ${startDate} to ${endDate}`);

    // Get cognitive mirror data
    const cognitiveQuery = db.collection("cognitiveMirror")
      .where("userId", "==", uid)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "asc");

    const cognitiveSnapshot = await cognitiveQuery.get();
    
    const timelineData = {
      cognitiveStates: cognitiveSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'cognitive'
      })),
      forecasts: [] as any[],
      events: [] as any[]
    };

    // Get emotion forecasts if requested
    if (includeForecasts) {
      const forecastQuery = db.collection("emotionForecast")
        .where("userId", "==", uid)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "asc");

      const forecastSnapshot = await forecastQuery.get();
      timelineData.forecasts = forecastSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'forecast'
      }));
    }

    // Get significant events (voice events, dreams, etc.)
    const eventsQuery = db.collection("voiceEvents")
      .where("uid", "==", uid)
      .where("createdAt", ">=", new Date(startDate).getTime())
      .where("createdAt", "<=", new Date(endDate).getTime() + 24 * 60 * 60 * 1000)
      .orderBy("createdAt", "asc")
      .limit(100);

    const eventsSnapshot = await eventsQuery.get();
    timelineData.events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      type: 'voice_event'
    }));

    logger.info(`Retrieved ${timelineData.cognitiveStates.length} cognitive states, ${timelineData.forecasts.length} forecasts, ${timelineData.events.length} events`);

    return {
      success: true,
      data: timelineData,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    logger.error("Error fetching cognitive timeline:", error);
    throw new HttpsError("internal", "Failed to fetch cognitive timeline");
  }
});

/**
 * 2. Timeline Compare Mode
 * Compare two date ranges → highlight differences
 */
export const compareTimelinePeriods = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { period1, period2 } = request.data;
  if (!period1?.startDate || !period1?.endDate || !period2?.startDate || !period2?.endDate) {
    throw new HttpsError("invalid-argument", "Both periods must have startDate and endDate");
  }

  try {
    logger.info(`Comparing timeline periods for user ${uid}: ${period1.startDate}-${period1.endDate} vs ${period2.startDate}-${period2.endDate}`);

    // Get cognitive mirror data for both periods
    const [period1Data, period2Data] = await Promise.all([
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .where("date", ">=", period1.startDate)
        .where("date", "<=", period1.endDate)
        .get(),
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .where("date", ">=", period2.startDate)
        .where("date", "<=", period2.endDate)
        .get()
    ]);

    // Calculate averages for each period
    const period1Avg = {
      moodScore: 0,
      stressIndex: 0,
      energyLevel: 0,
      count: period1Data.docs.length
    };

    const period2Avg = {
      moodScore: 0,
      stressIndex: 0,
      energyLevel: 0,
      count: period2Data.docs.length
    };

    period1Data.docs.forEach(doc => {
      const data = doc.data();
      period1Avg.moodScore += data.moodScore || 0;
      period1Avg.stressIndex += data.stressIndex || 0;
      period1Avg.energyLevel += data.energyLevel || 0;
    });

    period2Data.docs.forEach(doc => {
      const data = doc.data();
      period2Avg.moodScore += data.moodScore || 0;
      period2Avg.stressIndex += data.stressIndex || 0;
      period2Avg.energyLevel += data.energyLevel || 0;
    });

    if (period1Avg.count > 0) {
      period1Avg.moodScore /= period1Avg.count;
      period1Avg.stressIndex /= period1Avg.count;
      period1Avg.energyLevel /= period1Avg.count;
    }

    if (period2Avg.count > 0) {
      period2Avg.moodScore /= period2Avg.count;
      period2Avg.stressIndex /= period2Avg.count;
      period2Avg.energyLevel /= period2Avg.count;
    }

    // Calculate differences
    const differences = {
      moodChange: period2Avg.moodScore - period1Avg.moodScore,
      stressChange: period2Avg.stressIndex - period1Avg.stressIndex,
      energyChange: period2Avg.energyLevel - period1Avg.energyLevel
    };

    // Generate insights
    const insights = [];
    if (Math.abs(differences.moodChange) > 10) {
      insights.push({
        type: 'mood',
        change: differences.moodChange,
        description: differences.moodChange > 0 ? 
          `Your mood improved by ${differences.moodChange.toFixed(1)} points` :
          `Your mood declined by ${Math.abs(differences.moodChange).toFixed(1)} points`
      });
    }

    if (Math.abs(differences.stressChange) > 10) {
      insights.push({
        type: 'stress',
        change: differences.stressChange,
        description: differences.stressChange > 0 ? 
          `Your stress levels increased by ${differences.stressChange.toFixed(1)} points` :
          `Your stress levels decreased by ${Math.abs(differences.stressChange).toFixed(1)} points`
      });
    }

    return {
      success: true,
      comparison: {
        period1: period1Avg,
        period2: period2Avg,
        differences: differences,
        insights: insights
      }
    };
  } catch (error) {
    logger.error("Error comparing timeline periods:", error);
    throw new HttpsError("internal", "Failed to compare timeline periods");
  }
});

/**
 * 3. Memory Map Galaxy View
 * API endpoint to return events grouped into galaxy clusters
 */
export const getMemoryGalaxy = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { timeRange = 30, clusterBy = 'emotion' } = request.data; // days

  try {
    logger.info(`Generating memory galaxy for user ${uid}, ${timeRange} days, clustered by ${clusterBy}`);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRange * 24 * 60 * 60 * 1000);

    // Get various event types for clustering
    const [voiceEvents, dreamEvents, cognitiveStates] = await Promise.all([
      db.collection("voiceEvents")
        .where("uid", "==", uid)
        .where("createdAt", ">=", startDate.getTime())
        .where("createdAt", "<=", endDate.getTime())
        .get(),
      db.collection("dreamEvents")
        .where("uid", "==", uid)
        .where("createdAt", ">=", startDate.getTime())
        .where("createdAt", "<=", endDate.getTime())
        .get(),
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .where("date", ">=", startDate.toISOString().split('T')[0])
        .where("date", "<=", endDate.toISOString().split('T')[0])
        .get()
    ]);

    // Create clusters based on emotion/theme
    const clusters: Record<string, any> = {};

    // Cluster voice events by emotion
    voiceEvents.docs.forEach(doc => {
      const data = doc.data();
      const clusterKey = data.emotion || 'neutral';
      if (!clusters[clusterKey]) {
        clusters[clusterKey] = {
          id: uuidv4(),
          name: clusterKey,
          type: 'emotion',
          events: [],
          center: { x: Math.random() * 800, y: Math.random() * 600 }, // Placeholder positioning
          size: 0,
          color: getEmotionColor(clusterKey)
        };
      }
      clusters[clusterKey].events.push({
        id: doc.id,
        type: 'voice',
        data: data,
        timestamp: data.createdAt
      });
      clusters[clusterKey].size++;
    });

    // Cluster dreams by themes
    dreamEvents.docs.forEach(doc => {
      const data = doc.data();
      const themes = data.themes || ['unknown'];
      themes.forEach((theme: string) => {
        const clusterKey = `dream_${theme}`;
        if (!clusters[clusterKey]) {
          clusters[clusterKey] = {
            id: uuidv4(),
            name: theme,
            type: 'dream_theme',
            events: [],
            center: { x: Math.random() * 800, y: Math.random() * 600 },
            size: 0,
            color: getDreamThemeColor(theme)
          };
        }
        clusters[clusterKey].events.push({
          id: doc.id,
          type: 'dream',
          data: data,
          timestamp: data.createdAt
        });
        clusters[clusterKey].size++;
      });
    });

    // Add cognitive states as background constellation
    const cognitiveCluster = {
      id: uuidv4(),
      name: 'cognitive_backdrop',
      type: 'cognitive',
      events: cognitiveStates.docs.map(doc => ({
        id: doc.id,
        type: 'cognitive',
        data: doc.data(),
        timestamp: new Date(doc.data().date).getTime()
      })),
      center: { x: 400, y: 300 }, // Center of galaxy
      size: cognitiveStates.docs.length,
      color: '#4a5568'
    };

    const galaxyData = {
      clusters: [...Object.values(clusters), cognitiveCluster],
      metadata: {
        timeRange: timeRange,
        totalEvents: voiceEvents.docs.length + dreamEvents.docs.length + cognitiveStates.docs.length,
        clusterCount: Object.keys(clusters).length + 1,
        generatedAt: Date.now()
      }
    };

    return {
      success: true,
      galaxy: galaxyData
    };
  } catch (error) {
    logger.error("Error generating memory galaxy:", error);
    throw new HttpsError("internal", "Failed to generate memory galaxy");
  }
});

/**
 * 4. AI Therapist Replay Mode
 * Generate replay scenes with symbolic overlays
 */
export const generateTherapistReplay = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { eventIds, replayTheme = 'recovery' } = request.data;
  if (!eventIds || !Array.isArray(eventIds)) {
    throw new HttpsError("invalid-argument", "eventIds array is required");
  }

  try {
    logger.info(`Generating therapist replay for user ${uid}, theme: ${replayTheme}`);

    // Get the specified events
    const events = [];
    for (const eventId of eventIds) {
      // Try to find the event in different collections
      const [voiceEvent, dreamEvent, cognitiveEvent] = await Promise.all([
        db.collection("voiceEvents").doc(eventId).get(),
        db.collection("dreamEvents").doc(eventId).get(),
        db.collection("cognitiveMirror").doc(eventId).get()
      ]);

      if (voiceEvent.exists) {
        events.push({ type: 'voice', data: voiceEvent.data(), id: eventId });
      } else if (dreamEvent.exists) {
        events.push({ type: 'dream', data: dreamEvent.data(), id: eventId });
      } else if (cognitiveEvent.exists) {
        events.push({ type: 'cognitive', data: cognitiveEvent.data(), id: eventId });
      }
    }

    if (events.length === 0) {
      throw new HttpsError("not-found", "No valid events found for replay");
    }

    // Generate symbolic overlays based on theme and events
    const replayScenes = events.map((event, index) => {
      const scene = {
        id: uuidv4(),
        eventId: event.id,
        eventType: event.type,
        sceneIndex: index,
        symbolicOverlay: generateSymbolicOverlay(event, replayTheme),
        narratorScript: generateNarratorScript(event, replayTheme),
        visualEffects: generateVisualEffects(event, replayTheme),
        transitionTo: index < events.length - 1 ? 'next' : 'end'
      };
      return scene;
    });

    // Create overall replay metadata
    const replaySession = {
      id: uuidv4(),
      userId: uid,
      theme: replayTheme,
      createdAt: Date.now(),
      scenes: replayScenes,
      totalDuration: replayScenes.length * 30, // 30 seconds per scene
      status: 'ready'
    };

    // Store the replay session
    await db.collection("therapistReplays").doc(replaySession.id).set(replaySession);

    return {
      success: true,
      replay: replaySession
    };
  } catch (error) {
    logger.error("Error generating therapist replay:", error);
    throw new HttpsError("internal", "Failed to generate therapist replay");
  }
});

/**
 * 5. Dream Logging & Replay (Enhanced)
 * Add enhanced dreamLog functionality
 */
export const createDreamReplay = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { dreamId, replayStyle = 'symbolic' } = request.data;
  if (!dreamId) {
    throw new HttpsError("invalid-argument", "dreamId is required");
  }

  try {
    logger.info(`Creating dream replay for user ${uid}, dream: ${dreamId}`);

    const dreamDoc = await db.collection("dreamEvents").doc(dreamId).get();
    if (!dreamDoc.exists) {
      throw new HttpsError("not-found", "Dream not found");
    }

    const dreamData = dreamDoc.data();
    if (dreamData?.uid !== uid) {
      throw new HttpsError("permission-denied", "Access denied to this dream");
    }

    // Create enhanced dream replay with visual storytelling
    const dreamReplay = {
      id: uuidv4(),
      userId: uid,
      dreamId: dreamId,
      replayStyle: replayStyle,
      createdAt: Date.now(),
      scenes: generateDreamReplayScenes(dreamData, replayStyle),
      symbolicMap: extractSymbolicMap(dreamData),
      narratorVoiceOver: generateDreamNarration(dreamData),
      visualLayers: generateDreamVisualLayers(dreamData),
      interactiveElements: generateDreamInteractiveElements(dreamData)
    };

    // Store the dream replay
    await db.collection("dreamLog").doc(dreamReplay.id).set(dreamReplay);

    return {
      success: true,
      dreamReplay: dreamReplay
    };
  } catch (error) {
    logger.error("Error creating dream replay:", error);
    throw new HttpsError("internal", "Failed to create dream replay");
  }
});

// Helper functions for symbolic overlays and visual effects
function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    joy: '#FFD700',
    sadness: '#4169E1',
    anger: '#DC143C',
    calm: '#20B2AA',
    anxiety: '#FF6347',
    neutral: '#808080'
  };
  return colors[emotion] || colors.neutral;
}

function getDreamThemeColor(theme: string): string {
  const colors: Record<string, string> = {
    adventure: '#FF4500',
    memory: '#9370DB',
    fear: '#8B0000',
    flying: '#87CEEB',
    water: '#0077BE',
    unknown: '#696969'
  };
  return colors[theme] || colors.unknown;
}

function generateSymbolicOverlay(event: any, theme: string): any {
  // Placeholder for symbolic overlay generation
  return {
    type: theme === 'recovery' ? 'healing_light' : 'emotional_fog',
    intensity: event.type === 'voice' ? (event.data.sentimentScore * 100) : 50,
    duration: 5000, // 5 seconds
    effects: ['soft_glow', 'particle_drift']
  };
}

function generateNarratorScript(event: any, theme: string): string {
  // Placeholder for narrator script generation
  if (event.type === 'voice') {
    return `In this moment, your voice carried ${event.data.emotion}...`;
  } else if (event.type === 'dream') {
    return `Your subconscious painted a scene of ${event.data.themes?.join(' and ')}...`;
  }
  return `This was a time of ${theme} in your journey...`;
}

function generateVisualEffects(event: any, theme: string): any[] {
  // Placeholder for visual effects
  return [
    { type: 'fade_in', duration: 1000 },
    { type: theme === 'recovery' ? 'warm_glow' : 'cool_mist', duration: 3000 },
    { type: 'fade_out', duration: 1000 }
  ];
}

function generateDreamReplayScenes(dreamData: any, style: string): any[] {
  // Placeholder for dream scene generation
  return [
    {
      id: uuidv4(),
      title: 'Dream Opening',
      symbols: dreamData.symbols || [],
      emotions: dreamData.emotions || [],
      style: style,
      duration: 10000
    }
  ];
}

function extractSymbolicMap(dreamData: any): any {
  return {
    primarySymbols: dreamData.symbols?.slice(0, 3) || [],
    emotionalTone: dreamData.sentimentScore > 0 ? 'positive' : 'negative',
    archetypes: ['dreamer', 'observer']
  };
}

function generateDreamNarration(dreamData: any): string {
  return `Your dream wove together themes of ${dreamData.themes?.join(', ')} with symbols of ${dreamData.symbols?.join(', ')}...`;
}

function generateDreamVisualLayers(dreamData: any): any[] {
  return [
    { layer: 'background', type: 'dreamscape', intensity: 0.7 },
    { layer: 'symbols', type: 'floating_elements', symbols: dreamData.symbols },
    { layer: 'emotions', type: 'color_wash', emotion: dreamData.emotions?.[0] }
  ];
}

function generateDreamInteractiveElements(dreamData: any): any[] {
  return [
    { type: 'symbol_tap', symbols: dreamData.symbols, action: 'reveal_meaning' },
    { type: 'emotion_swipe', emotions: dreamData.emotions, action: 'color_shift' }
  ];
}

// Legacy functions (keeping existing functionality)
export const ingestTimelineEvent = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  logger.info(`Ingesting timeline event for user ${uid}.`);
  return {success: true};
});

export const detectShadowEpisode = onDocumentWritten("timelineEvents/{uid}/{eventId}", async (event: FirestoreEvent<any>) => {
    logger.info(`Checking for shadow episode for user ${event.params.uid}.`);
    return;
  });

export const runForecastEngine = onSchedule("05 02 * * *", async () => {
    logger.info("Running daily emotional forecast for all users.");
    return;
  });
    // 3. Create a narratorInsight.
    return;
  });

/**
 * Updates the user's current archetype based on recent activity.
 * This is a placeholder.
 */
export const updateArchetypeState = onSchedule("every sunday 04:00", async () => {
    logger.info("Running weekly archetype evolution for all users.");
    // For every user:
    // 1. Analyze last 4 weeks of data.
    // 2. Call 'ArchetypeMorphEngine' AI model.
    // 3. Set the new /archetypeStates document.
    return;
  });

/**
 * Evaluates progress on a user's legacy threads.
 * Triggered on updates to legacy threads. Placeholder.
 */
export const evaluateLegacyProgress = onDocumentUpdated("legacyThreads/{uid}/{threadId}", async (event: FirestoreEvent<any>) => {
    logger.info(`Evaluating legacy progress for user ${event.params.uid}.`);
    // Logic to check progressScore and trigger notifications if milestones are met.
    return;
  });
