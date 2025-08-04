
import {onDocumentCreated} from "firebase-functions/v2/firestore";
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
 * Gathers data for all users and queues it up for email generation.
 * This function is scheduled to run daily.
 */
export const enqueueDigestSummaries = onSchedule
  .onRun(async (context: any) => {
    logger.info("Running daily job to enqueue email digests.");
    // In a real application, this function would:
    // 1. Query for all users who have opted into weekly emails.
    // 2. For each user, analyze logs from the past week (moods, rituals, dreams).
    // 3. Build a digest JSON object with the summary data.
    // 4. Write this JSON object to the /dailyDigestQueue/{uid} collection.
    // This write would then trigger the sendNarratedEmail function.
    return;
  });

/**
 * Sends a narrated email when a new digest is added to the queue.
 * This function is triggered by a new document write in /dailyDigestQueue.
 */
export const sendNarratedEmail = onDocumentCreated("/dailyDigestQueue/{uid}", async (event: FirestoreEvent<any>) => {
    const {uid} = event.params;
    
    logger.info(`Processing email digest for user ${uid}.`);

    // In a real application, this function would:
    // 1. Generate a narrated TTS voice clip of the digest's reflection text.
    // 2. Generate a symbolic constellation image based on the digest data.
    // 3. Get the user's email from their profile.
    // 4. Use the "Trigger Email" extension to send a formatted HTML email
    //    by writing a document to the /mail collection.

    // Example of what would be written to the /mail collection:
    /*
    await db.collection('mail').add({
      to: userEmail,
      subject: "Your Weekly Reflection Bloom",
      html: generatedHtml,
      template: "weekly_digest",
      attachments: [generatedImageUrl],
      ttsVoiceUrl: generatedTtsUrl
    });
    */

    return;
  });
