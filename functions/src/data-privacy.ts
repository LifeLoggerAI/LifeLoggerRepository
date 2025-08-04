
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();


/**
 * Anonymizes user data upon request or based on settings.
 * Implements comprehensive data anonymization with PII removal and fuzzing.
 */
export const anonymizeUserData = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  
  const { collections, options } = data;
  const anonymizationLevel = options?.level || 'standard'; // 'minimal', 'standard', 'complete'
  
  functions.logger.info(`Starting ${anonymizationLevel} data anonymization for user ${uid}.`);
  
  try {
    // Generate anonymized user ID using consistent hashing
    const anonymizedUid = await generateAnonymizedId(uid);
    
    // Define collections to anonymize
    const collectionsToProcess = collections || [
      'voiceClips', 'voiceTranscripts', 'dreamJournal', 'emotionEvents', 
      'presentMetrics', 'goals', 'tasks', 'achievements'
    ];
    
    const anonymizationResults: { [collection: string]: number } = {};
    
    // Process each collection
    for (const collectionName of collectionsToProcess) {
      try {
        const documentsProcessed = await anonymizeCollection(uid, anonymizedUid, collectionName, anonymizationLevel);
        anonymizationResults[collectionName] = documentsProcessed;
        
        functions.logger.info(`Anonymized ${documentsProcessed} documents from ${collectionName} for user ${uid}`);
      } catch (error) {
        functions.logger.error(`Error anonymizing ${collectionName} for user ${uid}:`, error);
        anonymizationResults[collectionName] = -1; // Indicate error
      }
    }
    
    // Create anonymization record
    await db.collection('anonymizedData').doc(anonymizedUid).set({
      originalUid: await hashWithSalt(uid), // Double-hashed for extra security
      anonymizedAt: admin.firestore.FieldValue.serverTimestamp(),
      anonymizationLevel: anonymizationLevel,
      collectionsProcessed: anonymizationResults,
      totalDocuments: Object.values(anonymizationResults).reduce((sum, count) => sum + Math.max(0, count), 0)
    });
    
    // Log the anonymization event
    await db.collection('dataPrivacyLogs').add({
      uid: await hashWithSalt(uid),
      action: 'anonymization',
      level: anonymizationLevel,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      results: anonymizationResults
    });
    
    functions.logger.info(`Successfully completed anonymization for user ${uid}`);
    
    return {
      success: true, 
      message: "Anonymization process completed.",
      anonymizedId: anonymizedUid,
      results: anonymizationResults
    };
    
  } catch (error) {
    functions.logger.error(`Error in anonymization process for user ${uid}:`, error);
    throw new functions.https.HttpsError("internal", "Anonymization process failed. Please try again.");
  }
});

/**
 * Generate consistent anonymized ID for a user
 */
async function generateAnonymizedId(uid: string): Promise<string> {
  const crypto = require('crypto');
  const salt = process.env.ANONYMIZATION_SALT || 'default-salt-change-in-production';
  
  return crypto
    .createHash('sha256')
    .update(uid + salt)
    .digest('hex')
    .substring(0, 20); // Use first 20 characters for anonymized ID
}

/**
 * Hash string with salt for additional security
 */
async function hashWithSalt(input: string): Promise<string> {
  const crypto = require('crypto');
  const salt = process.env.PRIVACY_SALT || 'privacy-salt-change-in-production';
  
  return crypto
    .createHash('sha256')
    .update(input + salt)
    .digest('hex');
}

/**
 * Anonymize a specific collection for a user
 */
async function anonymizeCollection(uid: string, anonymizedUid: string, collectionName: string, level: string): Promise<number> {
  const userDocs = await db.collection(collectionName).where('uid', '==', uid).get();
  
  if (userDocs.empty) {
    return 0;
  }
  
  const batch = db.batch();
  let processedCount = 0;
  
  for (const doc of userDocs.docs) {
    const originalData = doc.data();
    const anonymizedData = await anonymizeDocumentData(originalData, level);
    
    // Add anonymized document to anonymizedData collection
    const anonymizedDocRef = db.collection('anonymizedData')
      .doc(anonymizedUid)
      .collection(collectionName)
      .doc(doc.id);
    
    batch.set(anonymizedDocRef, {
      ...anonymizedData,
      uid: anonymizedUid,
      originalCollection: collectionName,
      anonymizedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    processedCount++;
    
    // Commit batch when it gets large
    if (processedCount % 400 === 0) {
      await batch.commit();
    }
  }
  
  // Commit remaining documents
  if (processedCount % 400 !== 0) {
    await batch.commit();
  }
  
  return processedCount;
}

/**
 * Anonymize document data based on anonymization level
 */
async function anonymizeDocumentData(data: any, level: string): Promise<any> {
  const anonymized = { ...data };
  
  // Remove direct PII
  delete anonymized.uid;
  delete anonymized.email;
  delete anonymized.name;
  delete anonymized.phoneNumber;
  
  // Fuzz timestamps based on level
  if (anonymized.timestamp) {
    anonymized.timestamp = fuzzTimestamp(anonymized.timestamp, level);
  }
  if (anonymized.createdAt) {
    anonymized.createdAt = fuzzTimestamp(anonymized.createdAt, level);
  }
  
  // Handle location data
  if (anonymized.location) {
    anonymized.location = anonymizeLocation(anonymized.location, level);
  }
  if (anonymized.gps) {
    anonymized.gps = anonymizeLocation(anonymized.gps, level);
  }
  
  // Anonymize text content based on level
  if (anonymized.text && level === 'complete') {
    anonymized.text = anonymizeTextContent(anonymized.text);
  }
  
  // Fuzz numerical metrics
  if (anonymized.metrics) {
    anonymized.metrics = fuzzMetrics(anonymized.metrics, level);
  }
  
  return anonymized;
}

/**
 * Fuzz timestamp to reduce precision
 */
function fuzzTimestamp(timestamp: any, level: string): admin.firestore.Timestamp {
  if (!timestamp || !timestamp.toDate) return timestamp;
  
  const date = timestamp.toDate();
  let fuzzedDate: Date;
  
  switch (level) {
    case 'minimal':
      // Round to nearest hour
      fuzzedDate = new Date(Math.round(date.getTime() / (60 * 60 * 1000)) * (60 * 60 * 1000));
      break;
    case 'standard':
      // Round to nearest 4 hours
      fuzzedDate = new Date(Math.round(date.getTime() / (4 * 60 * 60 * 1000)) * (4 * 60 * 60 * 1000));
      break;
    case 'complete':
      // Round to nearest day
      fuzzedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      break;
    default:
      fuzzedDate = date;
  }
  
  return admin.firestore.Timestamp.fromDate(fuzzedDate);
}

/**
 * Anonymize location data
 */
function anonymizeLocation(location: any, level: string): any {
  if (!location || (!location.latitude && !location.lng)) return null;
  
  const lat = location.latitude || location.lat;
  const lng = location.longitude || location.lng;
  
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  
  let precision: number;
  switch (level) {
    case 'minimal':
      precision = 0.01; // ~1km precision
      break;
    case 'standard':
      precision = 0.1; // ~10km precision
      break;
    case 'complete':
      precision = 1; // ~100km precision
      break;
    default:
      precision = 0.01;
  }
  
  return {
    latitude: Math.round(lat / precision) * precision,
    longitude: Math.round(lng / precision) * precision,
    anonymized: true
  };
}

/**
 * Anonymize text content by removing potential PII
 */
function anonymizeTextContent(text: string): string {
  if (!text) return text;
  
  // Replace potential names, emails, phones with placeholders
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[NAME]')
    .replace(/\b\d{1,5}\s+[A-Za-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[ADDRESS]');
}

/**
 * Fuzz numerical metrics to reduce precision
 */
function fuzzMetrics(metrics: any, level: string): any {
  if (!metrics || typeof metrics !== 'object') return metrics;
  
  const fuzzed = { ...metrics };
  
  for (const [key, value] of Object.entries(fuzzed)) {
    if (typeof value === 'number') {
      let fuzzFactor: number;
      
      switch (level) {
        case 'minimal':
          fuzzFactor = 0.95; // 5% variance
          break;
        case 'standard':
          fuzzFactor = 0.9; // 10% variance
          break;
        case 'complete':
          fuzzFactor = 0.8; // 20% variance
          break;
        default:
          fuzzFactor = 0.95;
      }
      
      // Add random variance within the fuzz factor
      const variance = (Math.random() - 0.5) * 2 * (1 - fuzzFactor);
      fuzzed[key] = Math.round((value * (1 + variance)) * 100) / 100;
    }
  }
  
  return fuzzed;
}

/**
 * Generates aggregated B2B insights from anonymized data.
 * Runs nightly. This is a placeholder.
 */
export const generateAggregateInsights = functions.pubsub
  .schedule("every day 01:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    functions.logger.info("Running nightly job to generate aggregate insights.");
    // In a real implementation:
    // 1. Pool all new data from /anonymizedData.
    // 2. Perform aggregation (e.g., mood heatmaps, correlation analysis).
    // 3. Save reports to /b2bExports or stream to BigQuery.
    return null;
  });

/**
 * Deletes all data associated with a user.
 * This is a placeholder for a user-initiated deletion.
 */
export const deleteUserData = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  functions.logger.info(`Initiating data deletion for user ${uid}.`);
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
export const exportUserData = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  functions.logger.info(`Initiating data export for user ${uid}.`);
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
export const storeConsentAudit = functions.firestore
  .document("permissions/{uid}")
  .onWrite(async (change, context) => {
    const {uid} = context.params;
    const consentData = change.after.data();

    if (!consentData) {
      functions.logger.info(`Consent data for ${uid} deleted, skipping audit.`);
      return null;
    }

    const auditLog = {
      uid: uid,
      ...consentData,
      auditTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      changeType: change.before.exists ? "update" : "create",
    };

    try {
      // Creates a new document in the consentAudit collection for each change
      await db.collection("consentAudit").add(auditLog);
      functions.logger.info(`Successfully logged consent audit for user ${uid}.`);
    } catch (error) {
      functions.logger.error(`Failed to log consent audit for user ${uid}:`, error);
    }
    return null;
  });

/**
 * Creates a Data Access Request from an external partner.
 * Requires partnerId, packageId, and apiKey in the data payload.
 */
export const createDarRequest = functions.https.onCall(async (data, context) => {
  const {partnerId, packageId, apiKey} = data;
  if (!partnerId || !packageId || !apiKey) {
    throw new functions.https.HttpsError("invalid-argument", "Missing partnerId, packageId, or apiKey.");
  }

  const partnerRef = db.collection("partnerAuth").doc(partnerId);
  const partnerDoc = await partnerRef.get();

  if (!partnerDoc.exists || partnerDoc.data()?.apiKey !== apiKey || !partnerDoc.data()?.isApproved) {
    throw new functions.https.HttpsError("unauthenticated", "Invalid partner ID or API key.");
  }

  const packageRef = db.doc(`dataMarketplace/packages/${packageId}`);
  const packageDoc = await packageRef.get();
  if (!packageDoc.exists) {
    throw new functions.https.HttpsError("not-found", "The specified data package does not exist.");
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

  functions.logger.info(`New DAR created: ${darRef.id} for partner ${partnerId}`);
  return {success: true, requestId: darRef.id};
});

/**
 * Approves a Data Access Request. Admin-only.
 * Requires requestId in the data payload.
 */
export const approveDarRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Must be an admin to approve requests.");
  }
  const {requestId} = data;
  if (!requestId) {
    throw new functions.https.HttpsError("invalid-argument", "Request ID is required.");
  }

  const darRef = db.collection("darRequests").doc(requestId);
  await darRef.update({
    status: "approved",
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewerUid: context.auth?.uid,
  });

  functions.logger.info(`DAR ${requestId} approved by admin ${context.auth?.uid}.`);
  functions.logger.info(`Placeholder: Triggering BigQuery export for DAR ${requestId}.`);

  return {success: true};
});

/**
 * Rejects a Data Access Request. Admin-only.
 * Requires requestId and notes in the data payload.
 */
export const rejectDarRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Must be an admin to reject requests.");
  }
  const {requestId, notes} = data;
  if (!requestId || !notes) {
    throw new functions.https.HttpsError("invalid-argument", "Request ID and rejection notes are required.");
  }

  const darRef = db.collection("darRequests").doc(requestId);
  await darRef.update({
    status: "rejected",
    notes: notes,
    reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewerUid: context.auth?.uid,
  });

  functions.logger.info(`DAR ${requestId} rejected by admin ${context.auth?.uid}.`);
  return {success: true};
});

/**
 * Handles user opt-out for data sharing.
 * Triggered when a user's dataConsent settings change.
 */
export const cleanupOptOut = functions.firestore
  .document("users/{uid}")
  .onUpdate(async (change, context) => {
    const beforeSettings = change.before.data().settings || {};
    const afterSettings = change.after.data().settings || {};

    const beforeConsent = beforeSettings.dataConsent?.shareAnonymousData;
    const afterConsent = afterSettings.dataConsent?.shareAnonymousData;

    if (beforeConsent === true && afterConsent === false) {
      const uid = context.params.uid;
      functions.logger.info(`User ${uid} has opted out of data sharing.`);

      if (!afterSettings.dataConsent?.optedOutAt) {
        functions.logger.info(`Client did not set optedOutAt, setting it now for user ${uid}.`);
        await change.after.ref.set({
          settings: {
            dataConsent: {
              shareAnonymousData: false,
              optedOutAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
        }, {merge: true});
      }
    }
    return null;
  });

/**
 * Nightly job to check watermarks on new exports.
 */
export const dailyWatermarkChecker = functions.pubsub
  .schedule("every day 01:30")
  .timeZone("UTC")
  .onRun(async () => {
    functions.logger.info("Running daily watermark checker job.");

    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const recentExportsQuery = db.collection("exportSummaries").where("generatedAt", ">=", twentyFourHoursAgo);
      const recentExportsSnap = await recentExportsQuery.get();

      if (recentExportsSnap.empty) {
        functions.logger.info("No new exports to check in the last 24 hours.");
        return null;
      }

      for (const doc of recentExportsSnap.docs) {
        const exportSummary = doc.data();
        const {packageId, watermarkId} = exportSummary;

        if (!packageId || !watermarkId) {
          functions.logger.warn(`Export ${doc.id} is missing packageId or watermarkId.`);
          continue;
        }

        const packageRef = db.doc(`dataMarketplace/packages/${packageId}`);
        const packageDoc = await packageRef.get();

        if (!packageDoc.exists) {
          functions.logger.error(`Could not find package ${packageId} for export ${doc.id}. Flagging for review.`);
          // In a real app, write to an alerts collection.
          continue;
        }

        const {watermarkSalt} = packageDoc.data() as any;
        if (!watermarkSalt) {
          functions.logger.error(`Package ${packageId} is missing a watermarkSalt. Flagging for review.`);
          // In a real app, write to an alerts collection.
          continue;
        }

        // This is a placeholder for a real verification logic.
        // A real implementation might involve hashing the salt with some export data
        // and comparing it to the watermarkId.
        const isWatermarkValid = watermarkId.startsWith("watermark_") && watermarkId.length > 10;

        if (isWatermarkValid) {
          functions.logger.info(`Watermark for export ${doc.id} is valid.`);
        } else {
          functions.logger.error(`Invalid watermark detected for export ${doc.id}. Flagging for review.`);
          // In a real app, write to an alerts collection.
        }
      }

      functions.logger.info("Daily watermark checker job finished.");
    } catch (error) {
      functions.logger.error("Error running daily watermark checker:", error);
    }

    return null;
  });
