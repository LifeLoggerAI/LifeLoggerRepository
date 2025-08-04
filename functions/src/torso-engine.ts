
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten, onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {FirestoreEvent} from "firebase-functions/v2/firestore";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Ingests a batch of passive sensor data.
 * This is a placeholder for a complex data ingestion pipeline.
 */
export const ingestPassiveSensors = onCall(async (request: CallableRequest) => {
  // In a real app, data would be a batch of sensor readings.
  // {motion[], micSentiment[], appUse[], ambientAudio[]}
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  logger.info(`Ingesting passive sensor data for user ${uid}.`);
  // Logic to write to /torsoMetrics and /habitEvents
  // For now, this remains a placeholder for the data ingestion endpoint.

  return {success: true};
});


/**
 * Calculates value alignment score.
 * Triggered when torsoMetrics are updated. Placeholder.
 */
export const calcValueAlignment = onDocumentWritten("torsoMetrics/{uid}/{dateKey}", async (event: FirestoreEvent<any>) => {
    logger.info(`Calculating value alignment for user ${event.params.uid}.`);
    // This function would call an AI model (e.g., via a Genkit flow) to
    // compare habitEvents and torsoMetrics against user-defined values.
    // Placeholder for AI call.
    // const alignmentScore = await callValueAlignmentAI(event.data?.after.data());
    // await event.data?.after?.ref.update({ valueAlignmentScore: alignmentScore });
    return;
  });


/**
 * Detects self-conflict or fragmentation.
 * Triggered when torsoMetrics are updated. Placeholder.
 */
export const detectSelfConflict = onDocumentWritten("torsoMetrics/{uid}/{dateKey}", async (event: FirestoreEvent<any>) => {
    const data = event.data?.after.data();
    const uid = event.params.uid;

    if (data?.selfConsistencyScore < 40 && (!event.data?.before?.exists || event.data?.before.data()?.selfConsistencyScore >= 40)) {
      logger.info(`Self-conflict detected for user ${uid}.`);

      // Create a narratorInsight document
      const insightPayload = {
        uid: uid,
        insightId: `conflict-${event.params.dateKey}`,
        insightType: "self_conflict_detected",
        payload: {
          score: data.selfConsistencyScore,
          date: event.params.dateKey,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        consumed: false,
        ttsUrl: null,
      };
      await db.collection("narratorInsights").doc(insightPayload.insightId).set(insightPayload);

      // Enqueue a push notification
      const notificationPayload = {
        uid: uid,
        type: "insight",
        body: "A moment of self-conflict was detected. It might be a good time to reflect.",
      };
      await db.collection("messages/queue").add(notificationPayload);
    }
    return;
  });


/**
 * Checks Pro tier limits.
 * Triggered on new torsoMetrics. Placeholder.
 */
export const checkProLimits = onDocumentCreated("torsoMetrics/{uid}/{dateKey}", async (event: FirestoreEvent<any>) => {
    const uid = event.params.uid;
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    if (userData && !userData.isProUser) {
      logger.info(`Checking pro limits for free user ${uid}.`);

      // Logic to check if metrics > 7 days old and delete oldest.
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const dateKeySevenDaysAgo = sevenDaysAgo.toISOString().split("T")[0];

      const oldMetricsQuery = db.collection(`torsoMetrics/${uid}`)
        .where(admin.firestore.FieldPath.documentId(), "<", dateKeySevenDaysAgo)
        .orderBy(admin.firestore.FieldPath.documentId());

      const oldMetricsSnap = await oldMetricsQuery.get();
      const batch = db.batch();
      oldMetricsSnap.docs.forEach((doc) => {
        logger.info(`Deleting old metric ${doc.id} for free user ${uid}.`);
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Logic to enqueue an upsell notification.
      const notificationPayload = {
        uid: uid,
        type: "upsell",
        body: "Unlock your full history and deeper insights with Life Logger Pro.",
      };
      await db.collection("messages/queue").add(notificationPayload);
    }
    return;
  });
