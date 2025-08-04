
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {FirestoreEvent} from "firebase-functions/v2/firestore";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Triggers an Orb insight based on a significant change in the user's metrics.
 * Placeholder function.
 */
export const triggerOrbInsight = onDocumentWritten("presentMetrics/{uid}", async (event: FirestoreEvent<any>) => {
    logger.info(`Checking for Orb trigger for user ${event.params.uid}.`);
    // In a real app:
    // 1. Compare before/after snapshots of presentMetrics.
    // 2. If a significant change is detected (e.g., in tone, shadow, forecast):
    //    a. Generate a narratorInsight document.
    //    b. Set the user's /orbState/{uid} document's mode to "chat".
    //    c. Create a new /orbEvents document to log the trigger.
    return;
  });

/**
 * Generates an AI response for the Orb Coach.
 * Placeholder for HTTPS callable function.
 */
export const generateOrbResponse = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  logger.info(`Generating Orb response for user ${uid}.`);
  // In a real app:
  // 1. Receive userPrompt and context.
  // 2. Call an AI model (e.g., OpenAI) with a specialized prompt pack.
  // 3. Return the AI's text, a TTS audio reference, and a symbolic summary.
  // 4. Log the interaction to /orbDialogMemory.

  return {
    text: "This is a placeholder response from your AI Coach.",
    ttsUrl: null,
    symbolicSummary: "reflection",
  };
});

/**
 * Starts a symbolic ritual from a user prompt via the Orb.
 * Placeholder for HTTPS callable function.
 */
export const startRitualByPrompt = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  logger.info(`Starting a ritual for user ${uid}.`);
  // In a real app:
  // 1. Determine the ritual type from the input.
  // 2. Create a new /rituals document.
  // 3. Log the action to /orbEvents.

  return {success: true, ritualId: "demoRitual123"};
});


/**
 * Daily trigger for the Orb to offer a reflection. Pro-tier feature.
 * Placeholder for Pub/Sub scheduled function.
 */
export const dailyOrbNarratorTrigger = onSchedule("10 02 * * *", async () => {
    logger.info("Running daily Orb narrator trigger job.");
    // For every "pro" user:
    // 1. Generate a daily reflection insight.
    // 2. Create a narratorInsight document.
    // 3. Optionally create an orbEvent to notify the user.
    return;
  });
