import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Process incoming audio → transcribe → diarize → sentiment analysis → store
 * This function is triggered when an audio event is created
 */
export const processAudioEvent = onDocumentCreated(
  "audioEvents/{audioEventId}",
  async (event: any) => {
    const audioEventData = event.data?.data();
    if (!audioEventData) {
      logger.error("No audio event data found");
      return;
    }

    const audioEventId = event.params.audioEventId;
    const userId = audioEventData.uid;

    try {
      // In a real implementation, this would:
      // 1. Download audio from Storage using audioEventData.storagePath
      // 2. Send to transcription service (Google Speech-to-Text, OpenAI Whisper, etc.)
      // 3. Perform speaker diarization
      // 4. Analyze sentiment and emotion
      // 5. Store results in conversations collection

      // Placeholder implementation:
      const conversationId = uuidv4();
      const conversation = {
        id: conversationId,
        userId: userId,
        timestamp: Date.now(),
        transcript: "Placeholder transcript", // Would be actual transcription
        speakerId: "speaker_1", // Would be from diarization
        emotionTag: "neutral", // Would be from sentiment analysis
        conversationId: audioEventId,
        durationSec: audioEventData.durationSec || 0,
        confidence: 0.85 // Confidence score from transcription
      };

      await db.collection("conversations").doc(conversationId).set(conversation);

      // Update the audio event with transcription status
      await db.collection("audioEvents").doc(audioEventId).update({
        transcriptionStatus: "complete",
        conversationId: conversationId
      });

      logger.info(`Audio processing completed for ${audioEventId}`);
    } catch (error) {
      logger.error("Error processing audio event:", error);
      
      // Update status to error
      await db.collection("audioEvents").doc(audioEventId).update({
        transcriptionStatus: "error"
      });
    }
  }
);

/**
 * Aggregate motion/sleep/heart rate data daily
 * Runs every day at 2 AM to process previous day's data
 */
export const aggregateDailyHealthMetrics = onSchedule(
  {
    schedule: "0 2 * * *", // Every day at 2:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting daily health metrics aggregation");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Get all users who might have telemetry data
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get telemetry events for yesterday
        const telemetrySnapshot = await db.collection("telemetryEvents")
          .where("userId", "==", userId)
          .where("timestamp", ">=", yesterday.getTime() - 24 * 60 * 60 * 1000)
          .where("timestamp", "<", yesterday.getTime())
          .get();

        if (telemetrySnapshot.empty) {
          continue; // No data for this user
        }

        // Calculate aggregated metrics
        let totalMovement = 0;
        let sleepStart = null;
        let sleepEnd = null;
        let motionEvents = 0;

        telemetrySnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          if (data.eventType === "motion_event") {
            totalMovement += data.eventDuration || 0;
            motionEvents++;
          }
          // Additional logic for sleep detection would go here
        });

        const movementScore = Math.min(100, totalMovement / 60); // Convert to score
        const sleepHours = sleepStart && sleepEnd ? 
          (sleepEnd - sleepStart) / (1000 * 60 * 60) : 8; // Default 8 hours

        // Determine rhythm state
        let rhythmState = "Stable";
        if (sleepHours < 6 || movementScore < 20) {
          rhythmState = "Off-Rhythm";
        } else if (movementScore > 80 && motionEvents > 100) {
          rhythmState = "Overstimulated";
        }

        // Create RhythmMap entry
        const rhythmMapId = uuidv4();
        const rhythmMap = {
          id: rhythmMapId,
          userId: userId,
          date: dateKey,
          sleepHours: sleepHours,
          movementScore: movementScore,
          rhythmState: rhythmState,
          createdAt: Date.now(),
          wakeTime: sleepEnd,
          bedTime: sleepStart,
          deepSleepMinutes: sleepHours * 60 * 0.2, // Estimate 20% deep sleep
          restfulnessScore: Math.min(100, sleepHours * 12.5)
        };

        await db.collection("rhythmMap").doc(rhythmMapId).set(rhythmMap);

        // Create HealthEcho entry
        const healthEchoId = uuidv4();
        const healthEcho = {
          id: healthEchoId,
          userId: userId,
          date: dateKey,
          heartRateAvg: 72, // Placeholder - would come from health data
          movementScore: movementScore,
          wellnessIndex: (movementScore + (sleepHours * 12.5)) / 2,
          createdAt: Date.now(),
          stepsCount: motionEvents * 100, // Rough estimate
          activeMinutes: totalMovement / 60,
          stressIndex: rhythmState === "Overstimulated" ? 80 : 
                      rhythmState === "Off-Rhythm" ? 60 : 30
        };

        await db.collection("healthEcho").doc(healthEchoId).set(healthEcho);

        logger.info(`Health metrics aggregated for user ${userId} on ${dateKey}`);
      }
    } catch (error) {
      logger.error("Error aggregating daily health metrics:", error);
    }
  }
);

/**
 * Process GPS events for location and emotion context tagging
 */
export const processGpsEvent = onDocumentCreated(
  "locationLogs/{locationId}",
  async (event: any) => {
    const locationData = event.data?.data();
    if (!locationData) {
      logger.error("No location data found");
      return;
    }

    const userId = locationData.uid;

    try {
      // Get recent emotion data to tag location with emotional context
      const recentEmotions = await db.collection("voiceEvents")
        .where("uid", "==", userId)
        .where("createdAt", ">=", Date.now() - 30 * 60 * 1000) // Last 30 minutes
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

      let dominantEmotion = "neutral";
      if (!recentEmotions.empty) {
        const emotions = recentEmotions.docs.map(doc => doc.data().emotion);
        // Simple majority voting for dominant emotion
        const emotionCounts = emotions.reduce((acc, emotion) => {
          acc[emotion] = (acc[emotion] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        dominantEmotion = Object.entries(emotionCounts)
          .reduce((a, b) => emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b)[0];
      }

      // Create GPS event with emotion context
      const gpsEventId = uuidv4();
      const gpsEvent = {
        id: gpsEventId,
        userId: userId,
        locationName: locationData.placeId || "Unknown Location",
        lat: locationData.coords.lat,
        lng: locationData.coords.lng,
        taggedEmotion: dominantEmotion,
        timestamp: locationData.timestamp,
        accuracy: locationData.coords.accuracy,
        dwellTimeMinutes: 0, // Would be calculated based on entry/exit
        visitType: locationData.eventType
      };

      await db.collection("gpsEvents").doc(gpsEventId).set(gpsEvent);

      logger.info(`GPS event processed for ${userId} at ${gpsEvent.locationName}`);
    } catch (error) {
      logger.error("Error processing GPS event:", error);
    }
  }
);

/**
 * Aggregate device activity signals daily
 */
export const aggregateDeviceSignals = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 3:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting device signals aggregation");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startTime = yesterday.getTime() - 24 * 60 * 60 * 1000;
    const endTime = yesterday.getTime();

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get telemetry events for device activity
        const telemetrySnapshot = await db.collection("telemetryEvents")
          .where("userId", "==", userId)
          .where("timestamp", ">=", startTime)
          .where("timestamp", "<", endTime)
          .get();

        if (telemetrySnapshot.empty) {
          continue;
        }

        let notificationCount = 0;
        let screenTimeMinutes = 0;
        let appSwitches = 0;
        let dndActive = false;

        telemetrySnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          switch (data.eventType) {
            case "notification_received":
              notificationCount++;
              break;
            case "screen_on":
              screenTimeMinutes += (data.eventDuration || 0) / (1000 * 60);
              break;
            case "app_opened":
              appSwitches++;
              break;
          }
        });

        const deviceSignalId = uuidv4();
        const deviceSignal = {
          id: deviceSignalId,
          userId: userId,
          dndState: dndActive,
          notificationCount: notificationCount,
          missedCalls: 0, // Would need call log access
          timestamp: Date.now(),
          screenTimeMinutes: screenTimeMinutes,
          appSwitches: appSwitches,
          batteryLevel: 100 // Placeholder
        };

        await db.collection("deviceSignals").doc(deviceSignalId).set(deviceSignal);

        logger.info(`Device signals aggregated for user ${userId}`);
      }
    } catch (error) {
      logger.error("Error aggregating device signals:", error);
    }
  }
);

/**
 * Aggregate shadow cognition metrics daily
 */
export const aggregateShadowCognition = onSchedule(
  {
    schedule: "0 4 * * *", // Every day at 4:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting shadow cognition aggregation");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get telemetry data for friction analysis
        const telemetrySnapshot = await db.collection("telemetryEvents")
          .where("userId", "==", userId)
          .where("timestamp", ">=", yesterday.getTime() - 24 * 60 * 60 * 1000)
          .where("timestamp", "<", yesterday.getTime())
          .get();

        if (telemetrySnapshot.empty) {
          continue;
        }

        let frictionTaps = 0;
        let bedtimeScrolling = 0;
        let anxietyMotion = 0;

        // Analyze patterns in telemetry data
        const events = telemetrySnapshot.docs.map((doc: any) => doc.data());
        
        // Count rapid app switches as friction
        for (let i = 1; i < events.length; i++) {
          if (events[i].eventType === "app_opened" && 
              events[i-1].eventType === "app_opened" &&
              events[i].timestamp - events[i-1].timestamp < 5000) { // < 5 seconds
            frictionTaps++;
          }
        }

        // Count late night screen usage
        events.forEach((event: any) => {
          const hour = new Date(event.timestamp).getHours();
          if ((hour >= 22 || hour <= 6) && event.eventType === "screen_on") {
            bedtimeScrolling += (event.eventDuration || 0) / (1000 * 60); // Minutes
          }
        });

        const shadowCognitionId = uuidv4();
        const shadowCognition = {
          id: shadowCognitionId,
          userId: userId,
          date: dateKey,
          frictionTaps: frictionTaps,
          anxietyMotion: anxietyMotion,
          bedtimeScroll: bedtimeScrolling,
          timestamp: Date.now(),
          compulsiveOpenCount: Math.floor(frictionTaps * 1.5),
          hesitationTaps: Math.floor(frictionTaps * 0.3),
          avoidanceBehaviors: Math.floor(frictionTaps * 0.8)
        };

        await db.collection("shadowCognition").doc(shadowCognitionId).set(shadowCognition);

        logger.info(`Shadow cognition metrics aggregated for user ${userId}`);
      }
    } catch (error) {
      logger.error("Error aggregating shadow cognition:", error);
    }
  }
);

/**
 * Aggregate obscura patterns daily
 */
export const aggregateObscuraPatterns = onSchedule(
  {
    schedule: "0 5 * * *", // Every day at 5:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting obscura patterns aggregation");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get camera captures and motion data for obscura analysis
        const capturesSnapshot = await db.collection("cameraCaptures")
          .where("uid", "==", userId)
          .where("createdAt", ">=", yesterday.getTime() - 24 * 60 * 60 * 1000)
          .where("createdAt", "<", yesterday.getTime())
          .get();

        if (capturesSnapshot.empty) {
          continue;
        }

        let faceTiltScore = 0;
        let cancelBehaviorCount = 0;
        let stillnessIndex = 0;

        // Analyze camera captures for micro-patterns
        capturesSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          
          // Calculate face tilt variance (placeholder logic)
          if (data.cameraAngle && data.cameraAngle !== "straight") {
            faceTiltScore += 10;
          }
          
          // Count environmental stillness
          if (data.objectTags && data.objectTags.length < 3) {
            stillnessIndex += 5;
          }
        });

        const obscuraPatternsId = uuidv4();
        const obscuraPatterns = {
          id: obscuraPatternsId,
          userId: userId,
          date: dateKey,
          faceTiltScore: faceTiltScore,
          cancelBehaviorCount: cancelBehaviorCount,
          stillnessIndex: stillnessIndex,
          timestamp: Date.now(),
          postureShifts: faceTiltScore * 2,
          microExpressionChanges: faceTiltScore * 0.5,
          environmentalStillness: stillnessIndex
        };

        await db.collection("obscuraPatterns").doc(obscuraPatternsId).set(obscuraPatterns);

        logger.info(`Obscura patterns aggregated for user ${userId}`);
      }
    } catch (error) {
      logger.error("Error aggregating obscura patterns:", error);
    }
  }
);

/**
 * Update voice profiles when new voice events are created
 */
export const updateVoiceProfile = onDocumentCreated(
  "voiceEvents/{voiceEventId}",
  async (event: any) => {
    const voiceEventData = event.data?.data();
    if (!voiceEventData) {
      logger.error("No voice event data found");
      return;
    }

    const userId = voiceEventData.uid;
    const speakerLabel = voiceEventData.speakerLabel;
    const emotion = voiceEventData.emotion;

    try {
      // Create or update voice profile for the speaker
      const voiceProfileQuery = await db.collection("voiceProfiles")
        .where("userId", "==", userId)
        .where("speakerName", "==", speakerLabel)
        .get();

      let voiceProfileRef;
      let voiceProfileData;

      if (voiceProfileQuery.empty) {
        // Create new voice profile
        const voiceProfileId = uuidv4();
        voiceProfileData = {
          id: voiceProfileId,
          userId: userId,
          voicePrintHash: `hash_${speakerLabel}_${Date.now()}`,
          familiarityScore: 1,
          emotionalTrend: emotion,
          speakerName: speakerLabel,
          relationshipType: "unknown",
          lastInteraction: Date.now(),
          conversationCount: 1,
          toneEvolution: [{
            date: Date.now(),
            dominantTone: emotion
          }]
        };
        
        voiceProfileRef = db.collection("voiceProfiles").doc(voiceProfileId);
        await voiceProfileRef.set(voiceProfileData);
      } else {
        // Update existing voice profile
        voiceProfileRef = voiceProfileQuery.docs[0].ref;
        voiceProfileData = voiceProfileQuery.docs[0].data();
        
        const updates = {
          familiarityScore: Math.min(100, (voiceProfileData.familiarityScore || 0) + 1),
          emotionalTrend: emotion,
          lastInteraction: Date.now(),
          conversationCount: (voiceProfileData.conversationCount || 0) + 1,
          toneEvolution: [
            ...(voiceProfileData.toneEvolution || []),
            {
              date: Date.now(),
              dominantTone: emotion
            }
          ].slice(-10) // Keep only last 10 tone records
        };

        await voiceProfileRef.update(updates);
      }

      logger.info(`Voice profile updated for ${speakerLabel} (user: ${userId})`);
    } catch (error) {
      logger.error("Error updating voice profile:", error);
    }
  }
);