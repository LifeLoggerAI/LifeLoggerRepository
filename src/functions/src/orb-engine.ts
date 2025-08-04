
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
// const db = admin.firestore(); // Unused for now

/**
 * Triggers an Orb insight based on a significant change in the user's metrics.
 * Placeholder function.
 */
export const triggerOrbInsight = functions.firestore
  .document("presentMetrics/{uid}")
  .onWrite(async (change, context) => {
    functions.logger.info(`Checking for Orb trigger for user ${context.params.uid}.`);
    // In a real app:
    // 1. Compare before/after snapshots of presentMetrics.
    // 2. If a significant change is detected (e.g., in tone, shadow, forecast):
    //    a. Generate a narratorInsight document.
    //    b. Set the user's /orbState/{uid} document's mode to "chat".
    //    c. Create a new /orbEvents document to log the trigger.
    return null;
  });

/**
 * Generates an AI response for the Orb Coach.
 * Placeholder for HTTPS callable function.
 */
export const generateOrbResponse = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
    
  functions.logger.info(`Generating Orb response for user ${uid}.`);
  // In a real app:
  // 1. Receive userPrompt and context.
  // 2. Call an AI model (e.g., OpenAI) with a specialized prompt pack.
  // 3. Return the AI's text, a TTS audio reference, and a symbolic summary.
  // 4. Log the interaction to /orbDialogMemory.
    
  return { 
    text: "This is a placeholder response from your AI Coach.",
    ttsUrl: null,
    symbolicSummary: "reflection"
  };
});

/**
 * Starts a symbolic ritual from a user prompt via the Orb.
 * Placeholder for HTTPS callable function.
 */
export const startRitualByPrompt = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
    
  functions.logger.info(`Starting a ritual for user ${uid}.`);
  // In a real app:
  // 1. Determine the ritual type from the input.
  // 2. Create a new /rituals document.
  // 3. Log the action to /orbEvents.
    
  return { success: true, ritualId: "demoRitual123" };
});


/**
 * Daily trigger for the Orb to offer a reflection. Pro-tier feature.
 * Placeholder for Pub/Sub scheduled function.
 */
export const dailyOrbNarratorTrigger = functions.pubsub
  .schedule("every day 02:10")
  .timeZone("UTC")
  .onRun(async () => {
    functions.logger.info("Running daily Orb narrator trigger job.");
    // For every "pro" user:
    // 1. Generate a daily reflection insight.
    // 2. Create a narratorInsight document.
    // 3. Optionally create an orbEvent to notify the user.
    return null;
  });
