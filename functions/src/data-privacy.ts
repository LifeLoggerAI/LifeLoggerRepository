
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
 * Anonymizes user data upon request or based on settings.
 * This is a placeholder for a complex data anonymization pipeline.
 */
export const anonymizeUserData = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  logger.info(`Starting data anonymization for user ${uid}.`);
  // In a real implementation:
  // 1. Hash user UID with a salt.
  // 2. Query user's data from various collections.
  // 3. Fuzz timestamps, round GPS, remove PII.
  // 4. Write to /anonymizedData collection.
  return {success: true, message: "Anonymization process initiated."};
});

/**
 * Generates aggregated B2B insights from anonymized data.
 * Runs nightly. This is a placeholder.
 */
export const generateAggregateInsights = onSchedule("00 01 * * *", async () => {
    logger.info("Running nightly job to generate aggregate insights.");
    // In a real implementation:
    // 1. Pool all new data from /anonymizedData.
    // 2. Perform aggregation (e.g., mood heatmaps, correlation analysis).
    // 3. Save reports to /b2bExports or stream to BigQuery.
    return;
  });

/**
 * Deletes all data associated with a user.
 * This is a placeholder for a user-initiated deletion.
 */
export const deleteUserData = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  logger.info(`Initiating data deletion for user ${uid}.`);
  // In a real implementation, you would need a robust, multi-step process
  // to delete all user data across all collections and Storage.
  // This is a complex and destructive operation.
  // Example: await admin.firestore().collection('users').doc(uid).delete();
  //          await admin.firestore().collection('voiceEvents').where('uid', '==', uid).get().then(...)
  return {success: true, message: "Data deletion process initiated."};
});

/**
 * Exports all data associated with a user.
 * This is a placeholder for a user-initiated export.
 */
export const exportUserData = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }
  logger.info(`Initiating data export for user ${uid}.`);
  // In a real implementation:
  // 1. Gather all user data from Firestore collections.
  // 2. Compile into a machine-readable format (e.g., JSON files).
  // 3. Zip the files and upload to a private Cloud Storage bucket.
  // 4. Generate a signed URL for the user to download the file.
  // 5. Send the URL to the user's email.
  return {success: true, message: "Data export process initiated. You will receive an email with a download link shortly."};
});

/**
 * Creates an audit log whenever a user's permissions document is written.
 */
export const storeConsentAudit = onDocumentWritten("permissions/{uid}", async (event: FirestoreEvent<any>) => {
    const {uid} = event.params;
    const consentData = event.data?.after.data();

    if (!consentData) {
      logger.info(`Consent data for ${uid} deleted, skipping audit.`);
      return;
    }

    const auditLog = {
      uid: uid,
      ...consentData,
      auditTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      changeType: event.data?.before?.exists ? "update" : "create",
    };

    try {
      // Creates a new document in the consentAudit collection for each change
      await db.collection("consentAudit").add(auditLog);
      logger.info(`Successfully logged consent audit for user ${uid}.`);
    } catch (error) {
      logger.error(`Failed to log consent audit for user ${uid}:`, error);
    }
    return;
  });

/**
 * Creates a Data Access Request from an external partner.
 * Requires partnerId, packageId, and apiKey in the data payload.
 */
export const createDarRequest = onCall(async (request: CallableRequest) => {
  const {partnerId, packageId, apiKey} = request.data;
  if (!partnerId || !packageId || !apiKey) {
    throw new HttpsError("invalid-argument", "Missing partnerId, packageId, or apiKey.");
  }

  const partnerRef = db.collection("partnerAuth").doc(partnerId);
  const partnerDoc = await partnerRef.get();

  if (!partnerDoc.exists || partnerDoc.data()?.apiKey !== apiKey || !partnerDoc.data()?.isApproved) {
    throw new HttpsError("unauthenticated", "Invalid partner ID or API key.");
  }

  const packageRef = db.doc(`dataMarketplace/packages/${packageId}`);
  const packageDoc = await packageRef.get();
  if (!packageDoc.exists) {
    throw new HttpsError("not-found", "The specified data package does not exist.");
  }

  const darRef = db.collection("darRequests").doc();
  await darRef.set({
    partnerId,
    packageId,
    status: "pending",
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewerUid: null,
    notes: null,
  });

  logger.info(`New DAR created: ${darRef.id} for partner ${partnerId}`);
  return {success: true, requestId: darRef.id};
});

/**
 * Approves a Data Access Request. Admin-only.
 * Requires requestId in the data payload.
 */
export const approveDarRequest = onCall(async (request: CallableRequest) => {
  if (!request.auth?.token.admin) {
    throw new HttpsError("permission-denied", "Must be an admin to approve requests.");
  }
  const {requestId} = request.data;
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Request ID is required.");
  }

  const darRef = db.collection("darRequests").doc(requestId);
  await darRef.update({
    status: "approved",
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewerUid: request.auth?.uid,
  });

  logger.info(`DAR ${requestId} approved by admin ${request.auth?.uid}.`);
  logger.info(`Placeholder: Triggering BigQuery export for DAR ${requestId}.`);

  return {success: true};
});

/**
 * Rejects a Data Access Request. Admin-only.
 * Requires requestId and notes in the data payload.
 */
export const rejectDarRequest = onCall(async (request: CallableRequest) => {
  if (!request.auth?.token.admin) {
    throw new HttpsError("permission-denied", "Must be an admin to reject requests.");
  }
  const {requestId, notes} = request.data;
  if (!requestId || !notes) {
    throw new HttpsError("invalid-argument", "Request ID and rejection notes are required.");
  }

  const darRef = db.collection("darRequests").doc(requestId);
  await darRef.update({
    status: "rejected",
    notes: notes,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewerUid: request.auth?.uid,
  });

  logger.info(`DAR ${requestId} rejected by admin ${request.auth?.uid}.`);
  return {success: true};
});

/**
 * Handles user opt-out for data sharing.
 * Triggered when a user's dataConsent settings change.
 */
export const cleanupOptOut = onDocumentUpdated("users/{uid}", async (event: FirestoreEvent<any>) => {
    const beforeSettings = event.data?.before.data().settings || {};
    const afterSettings = event.data?.after.data().settings || {};

    const beforeConsent = beforeSettings.dataConsent?.shareAnonymousData;
    const afterConsent = afterSettings.dataConsent?.shareAnonymousData;

    if (beforeConsent === true && afterConsent === false) {
      const uid = event.params.uid;
      logger.info(`User ${uid} has opted out of data sharing.`);

      if (!afterSettings.dataConsent?.optedOutAt) {
        logger.info(`Client did not set optedOutAt, setting it now for user ${uid}.`);
        await event.data?.after?.ref.set({
          settings: {
            dataConsent: {
              shareAnonymousData: false,
              optedOutAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
        }, {merge: true});
      }
    }
    return;
  });

/**
 * Nightly job to check watermarks on new exports.
 */
export const dailyWatermarkChecker = onSchedule("30 01 * * *", async () => {
    logger.info("Running daily watermark checker job.");

    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const recentExportsQuery = db.collection("exportSummaries").where("generatedAt", ">=", twentyFourHoursAgo);
      const recentExportsSnap = await recentExportsQuery.get();

      if (recentExportsSnap.empty) {
        logger.info("No new exports to check in the last 24 hours.");
        return;
      }

      for (const doc of recentExportsSnap.docs) {
        const exportSummary = doc.data();
        const {packageId, watermarkId} = exportSummary;

        if (!packageId || !watermarkId) {
          logger.warn(`Export ${doc.id} is missing packageId or watermarkId.`);
          continue;
        }

        const packageRef = db.doc(`dataMarketplace/packages/${packageId}`);
        const packageDoc = await packageRef.get();

        if (!packageDoc.exists) {
          logger.error(`Could not find package ${packageId} for export ${doc.id}. Flagging for review.`);
          // In a real app, write to an alerts collection.
          continue;
        }

        const {watermarkSalt} = packageDoc.data() as any;
        if (!watermarkSalt) {
          logger.error(`Package ${packageId} is missing a watermarkSalt. Flagging for review.`);
          // In a real app, write to an alerts collection.
          continue;
        }

        // This is a placeholder for a real verification logic.
        // A real implementation might involve hashing the salt with some export data
        // and comparing it to the watermarkId.
        const isWatermarkValid = watermarkId.startsWith("watermark_") && watermarkId.length > 10;

        if (isWatermarkValid) {
          logger.info(`Watermark for export ${doc.id} is valid.`);
        } else {
          logger.error(`Invalid watermark detected for export ${doc.id}. Flagging for review.`);
          // In a real app, write to an alerts collection.
        }
      }

      logger.info("Daily watermark checker job finished.");
    } catch (error) {
      logger.error("Error running daily watermark checker:", error);
    }

    return;
  });
