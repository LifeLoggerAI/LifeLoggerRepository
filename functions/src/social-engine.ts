
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
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
 * Ingests a voice interaction and updates social contact data.
 * This is a placeholder for a complex data ingestion pipeline.
 */
export const voiceInteractionIngest = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  logger.info(`Ingesting voice interaction for user ${uid}.`);
  // Logic to:
  // 1. Match or create a /people record.
  // 2. Update interactionCount, voiceMemoryStrength, lastHeardAt, silenceDurationDays.
  // 3. Write a /socialEvents document.
  // 4. Recalculate echoLoopScore.

  return {success: true};
});

/**
 * Analyzes interaction history to determine a contact's social archetype.
 * Triggered when social contact data is updated. Placeholder.
 */
export const socialArchetypeEngine = onDocumentUpdated("people/{personId}", async (event: FirestoreEvent<any>) => {
    const personData = event.data?.after.data();
    if (!personData) return;

    logger.info(`Running social archetype engine for user ${personData.uid}, contact ${event.params.personId}.`);
    // Logic to call 'ArchetypeShiftEngine' AI model and update socialArchetype.
    return;
  });

/**
 * Daily check for contacts that have gone silent.
 */
export const checkSilenceThresholds = onSchedule("30 04 * * *", async () => {
    logger.info("Running daily social silence check.");

    const sixtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
    const staleContactsQuery = db.collection("people").where("lastSeen", "<", sixtyDaysAgo);

    const staleContactsSnap = await staleContactsQuery.get();

    if (staleContactsSnap.empty) {
      logger.info("No stale contacts found.");
      return;
    }

    for (const contactDoc of staleContactsSnap.docs) {
      const contact = contactDoc.data();
      const {uid, name: personName} = contact;
      const daysSilent = Math.floor((Date.now() - contact.lastSeen) / (1000 * 60 * 60 * 24));
      
      // Prevents sending multiple notifications for the same stale contact on the same day
      const insightId = `silence-${uid}-${contactDoc.id}-${new Date().toISOString().split("T")[0]}`;
      const existingInsight = await db.collection("narratorInsights").doc(insightId).get();

      if (existingInsight.exists) {
        continue;
      }

      logger.info(`Silence threshold met for user ${uid}, contact ${personName} (${daysSilent} days). Creating insight.`);

      const insightPayload = {
        uid: uid,
        insightId: insightId,
        insightType: "silence_threshold",
        payload: {
          personId: contactDoc.id,
          personName: personName,
          daysSilent: daysSilent,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        consumed: false,
        ttsUrl: null,
      };
      await db.collection("narratorInsights").doc(insightId).set(insightPayload);

      // Enqueue a push notification
      const notificationPayload = {
        uid: uid,
        type: "insight",
        body: `It's been a while since you've connected with ${personName}. A little silence can mean many things.`,
      };
      await db.collection("messages/queue").add(notificationPayload);
    }
    
    return;
  });


/**
 * Detects post-interaction emotional echoes.
 * Triggered on new social events. Placeholder.
 */
export const echoLoopDetection = onDocumentWritten("socialEvents/{eventId}", async (event: FirestoreEvent<any>) => {
    const eventData = event.data?.after.data();
    if (!eventData) return;

    logger.info(`Detecting echo loops for user ${eventData.uid}.`);
    // Logic to compare post-interaction mood signals.
    // If lingering effects, increase echoLoopScore on the socialContact.
    return;
  });
