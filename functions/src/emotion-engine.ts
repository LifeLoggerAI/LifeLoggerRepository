
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {FirestoreEvent} from "firebase-functions/v2/firestore";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const POSITIVE_EMOTIONS = ["joy", "calm", "recovery", "hopeful", "curiosity"];
const NEGATIVE_EMOTIONS = ["sadness", "anger", "anxiety", "frustration", "distressed"];

/**
 * Maps an emotion and intensity to a visual overlay style.
 * This is a placeholder; a real implementation would have more complex logic.
 * @param {string} emotion The detected emotion.
 * @param {number} intensity The intensity of the emotion (0-100).
 * @return {{color: string, style: string}} The visual properties for the overlay.
 */
function mapEmotionToOverlay(emotion: string, intensity: number): { color: string, style: string } {
  const intensityAlpha = 0.5 + (intensity / 100) * 0.5;
  switch (emotion.toLowerCase()) {
  case "joy":
    return {color: `hsla(120, 80%, 60%, ${intensityAlpha})`, style: "glow"};
  case "sadness":
    return {color: `hsla(240, 70%, 50%, ${intensityAlpha})`, style: "fog"};
  case "anger":
    return {color: `hsla(0, 90%, 60%, ${intensityAlpha})`, style: "flicker"};
  case "calm":
    return {color: `hsla(200, 80%, 70%, ${intensityAlpha})`, style: "glow"};
  case "anxiety":
    return {color: `hsla(60, 80%, 50%, ${intensityAlpha})`, style: "flicker"};
  default:
    return {color: `hsla(0, 0%, 80%, ${intensityAlpha})`, style: "glow"};
  }
}


/**
 * Maps an emotion to a representative color.
 * Placeholder function.
 * @param {string} emotion The detected emotion.
 * @return {string} A hex color code.
 */
function mapEmotionToColor(emotion: string): string {
  switch (emotion.toLowerCase()) {
  case "joy": return "#7CFC00";
  case "recovery": return "#32CD32";
  case "sadness": return "#1E90FF";
  case "anger": return "#DC143C";
  default: return "#A9A9A9";
  }
}


// 1. updateAuraState – triggered on new moodLog
export const updateAuraState = onDocumentCreated("users/{uid}/moodLogs/{logId}", async (event: FirestoreEvent<any>) => {
    const data = event.data?.data();
    const {uid} = event.params;

    if (!data.emotion || typeof data.intensity !== "number") {
      logger.warn(`Missing emotion or intensity for moodLog ${event.params.logId}`);
      return;
    }

    const overlay = mapEmotionToOverlay(data.emotion, data.intensity);
    logger.info(`Updating aura for user ${uid} to emotion: ${data.emotion}`);

    try {
      await db.doc(`users/${uid}/auraStates/current`).set({
        currentEmotion: data.emotion,
        overlayColor: overlay.color,
        overlayStyle: overlay.style,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    } catch (error) {
      logger.error(`Failed to update auraState for user ${uid}:`, error);
    }
  });


// 2. emotionOverTimeWatcher – trend detector (hourly)
export const emotionOverTimeWatcher = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async () => {
    logger.info("Running hourly emotionOverTimeWatcher job.");
    const usersSnap = await db.collection("users").get();

    const promises = usersSnap.docs.map(async (userDoc) => {
      const uid = userDoc.id;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      const moodLogsQuery = db.collection(`users/${uid}/moodLogs`)
        .where("timestamp", ">=", oneHourAgo);

      const moodLogsSnap = await moodLogsQuery.get();

      if (moodLogsSnap.empty) {
        logger.info(`No mood logs in the last hour for user ${uid}. Skipping.`);
        return;
      }

      const logs = moodLogsSnap.docs.map((doc) => doc.data());

      const emotionCounts: { [key: string]: number } = {};
      let totalIntensity = 0;
      logs.forEach((log) => {
        emotionCounts[log.emotion] = (emotionCounts[log.emotion] || 0) + 1;
        totalIntensity += log.intensity;
      });

      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b);
      const avgIntensity = totalIntensity / logs.length;

      let cycleType = "neutral";
      const positiveEmotions = ["joy", "calm", "recovery"];
      const negativeEmotions = ["sadness", "anger", "anxiety"];

      if (positiveEmotions.includes(dominantEmotion.toLowerCase()) && avgIntensity > 50) {
        cycleType = "recovery";
      } else if (negativeEmotions.includes(dominantEmotion.toLowerCase()) && avgIntensity > 50) {
        cycleType = "strain";
      }

      const cycleId = uuidv4();
      const windowStart = oneHourAgo;

      try {
        await db.collection(`users/${uid}/emotionCycles`).doc(cycleId).set({
          windowStart,
          dominantEmotion,
          avgIntensity,
          cycleType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Created new emotion cycle ${cycleId} for user ${uid}.`);
      } catch (error) {
        logger.error(`Failed to create emotionCycle for user ${uid}:`, error);
      }
    });

    await Promise.all(promises);
    return;
  });


// 3. triggerBloom – milestone bloom when recovery detected
export const triggerBloom = onDocumentCreated("users/{uid}/emotionCycles/{cycleId}", async (event: FirestoreEvent<any>) => {
    const cycleData = event.data?.data();
    const {uid} = event.params;

    if (cycleData.cycleType === "recovery") {
      logger.info(`Recovery detected for user ${uid}. Triggering bloom.`);
      try {
        await db.collection(`users/${uid}/memoryBlooms`).add({
          bloomId: uuidv4(),
          emotion: cycleData.dominantEmotion || "recovery",
          bloomColor: mapEmotionToColor(cycleData.dominantEmotion || "recovery"),
          triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
          description: "A moment of positive recovery was detected.",
        });
      } catch (error) {
        logger.error(`Failed to create memoryBloom for user ${uid}:`, error);
      }
    }
  });


/**
 * Detects a positive mood shift and triggers a recovery bloom.
 */
export const detectRecoveryBloomOnAuraUpdate = onDocumentUpdated("users/{uid}/auraStates/current", async (event: FirestoreEvent<any>) => {
    const before = event.data?.before.data() as AuraState;
    const after = event.data?.after.data() as AuraState;
    const { uid } = event.params;

    if (!before?.currentEmotion || !after?.currentEmotion) {
        return;
    }

    const beforeIsNegative = NEGATIVE_EMOTIONS.includes(before.currentEmotion.toLowerCase());
    const afterIsPositive = POSITIVE_EMOTIONS.includes(after.currentEmotion.toLowerCase());

    if (beforeIsNegative && afterIsPositive) {
      logger.info(`Recovery bloom detected for user ${uid}. From ${before.currentEmotion} to ${after.currentEmotion}.`);
      try {
        const bloomId = uuidv4();
        const memoryBloomPayload: Omit<MemoryBloom, 'triggeredAt'> & { triggeredAt: admin.firestore.FieldValue } = {
            bloomId: bloomId,
            emotion: after.currentEmotion,
            bloomColor: after.overlayColor || mapEmotionToColor(after.currentEmotion),
            triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
            description: "You’ve made it through something heavy. A moment of recovery.",
        };
        await db.collection(`users/${uid}/memoryBlooms`).doc(bloomId).set(memoryBloomPayload);
        
        const insightPayload = {
            uid: uid,
            insightId: `bloom-${bloomId}`,
            insightType: "recovery_bloom",
            payload: { bloomId: bloomId, emotion: after.currentEmotion },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            consumed: false,
            ttsUrl: null,
        };
        await db.collection("narratorInsights").doc(insightPayload.insightId).set(insightPayload);

      } catch (error) {
        logger.error(`Failed to create recovery bloom for user ${uid}:`, error);
      }
    }
    return;
  });
