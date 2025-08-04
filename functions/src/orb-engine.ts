
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

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
 * Enhanced implementation with proper validation and context handling.
 */
export const generateOrbResponse = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { userPrompt, conversationContext } = data;
  
  // Validate input
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "userPrompt is required and must be a non-empty string.");
  }

  functions.logger.info(`Generating Orb response for user ${uid} with prompt: "${userPrompt.substring(0, 100)}..."`);
  
  try {
    // Fetch user's recent metrics for context
    const userMetricsRef = db.collection('presentMetrics').doc(uid);
    const metricsSnap = await userMetricsRef.get();
    const userMetrics = metricsSnap.exists ? metricsSnap.data() : {};

    // Generate contextual response based on user state
    const response = generateContextualResponse(userPrompt, userMetrics, conversationContext);
    
    // Log the interaction to orbDialogMemory
    await db.collection('orbDialogMemory').doc(uid).collection('conversations').add({
      userPrompt: userPrompt,
      orbResponse: response.text,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      symbolicSummary: response.symbolicSummary,
      context: conversationContext || null
    });

    functions.logger.info(`Successfully generated Orb response for user ${uid}`);
    return response;
    
  } catch (error) {
    functions.logger.error(`Error generating Orb response for user ${uid}:`, error);
    throw new functions.https.HttpsError("internal", "Failed to generate response. Please try again.");
  }
});

/**
 * Helper function to generate contextual responses based on user state and prompt
 */
function generateContextualResponse(userPrompt: string, userMetrics: any, context: any) {
  const prompt = userPrompt.toLowerCase();
  
  // Analyze user metrics for contextual awareness
  const tone = userMetrics?.tone || 'neutral';
  const shadow = userMetrics?.shadow || 0;
  const forecast = userMetrics?.forecast || 'stable';
  
  let responseText = "";
  let symbolicSummary = "reflection";
  
  // Context-aware response generation
  if (prompt.includes('stress') || prompt.includes('anxiety') || shadow > 0.7) {
    responseText = `I sense you're experiencing some tension. With your current shadow level at ${(shadow * 100).toFixed(0)}%, let's focus on grounding techniques. What's weighing most heavily on your mind right now?`;
    symbolicSummary = "support";
  } else if (prompt.includes('goal') || prompt.includes('plan')) {
    responseText = `Your forecast shows ${forecast} conditions ahead. Let's channel this energy into actionable steps. What specific outcome are you working toward?`;
    symbolicSummary = "planning";
  } else if (prompt.includes('grateful') || prompt.includes('positive') || tone === 'positive') {
    responseText = `I can sense the positive energy in your words. Your current tone reflects ${tone} vibrations. How can we amplify this feeling and carry it forward?`;
    symbolicSummary = "gratitude";
  } else if (prompt.includes('dream') || prompt.includes('sleep')) {
    responseText = `Dreams often carry messages from our subconscious. What stood out most to you about this experience? Let's explore what your inner wisdom might be sharing.`;
    symbolicSummary = "insight";
  } else {
    // Default empathetic response
    responseText = `I'm here to listen and support you. Your current state shows ${tone} energy with a ${forecast} outlook. What would feel most helpful to explore together right now?`;
    symbolicSummary = "companionship";
  }
  
  return {
    text: responseText,
    ttsUrl: null, // TTS implementation would go here
    symbolicSummary: symbolicSummary,
  };
}

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

  return {success: true, ritualId: "demoRitual123"};
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
