
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Processes messages added to the notification queue.
 * Implements FCM push notifications and in-app notification delivery.
 */
export const processNotificationQueue = functions.firestore
  .document("messages/queue/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const {uid, type, body, title, priority, metadata} = message;

    if (!uid || !body) {
      functions.logger.error(`Notification queue message ${context.params.messageId} is missing uid or body.`);
      return;
    }

    functions.logger.info(`Processing notification for user ${uid} of type ${type}: "${body}"`);

    try {
      // Get user's notification preferences and FCM tokens
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      const userData = userDoc.data();
      
      if (!userData) {
        functions.logger.warn(`User ${uid} not found, skipping notification`);
        return snap.ref.delete();
      }

      // Check user notification preferences
      const notificationPrefs = userData.notificationPreferences || {};
      if (notificationPrefs.enabled === false || notificationPrefs[type] === false) {
        functions.logger.info(`Notifications disabled for user ${uid} or type ${type}`);
        return snap.ref.delete();
      }

      // Get FCM tokens for the user
      const tokensSnapshot = await admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('fcmTokens')
        .where('active', '==', true)
        .get();

      const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(Boolean);

      if (tokens.length > 0) {
        // Prepare FCM payload
        const payload = {
          notification: {
            title: title || getDefaultTitle(type),
            body: body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
          },
          data: {
            type: type,
            uid: uid,
            clickAction: getClickAction(type),
            ...(metadata || {})
          },
          options: {
            priority: priority === 'high' ? 'high' : 'normal',
            timeToLive: 24 * 60 * 60, // 24 hours
          }
        };

        // Send to all user devices
        const results = await admin.messaging().sendToDevice(tokens, payload, payload.options);
        
        // Clean up invalid tokens
        const invalidTokens: string[] = [];
        results.results.forEach((result, index) => {
          if (result.error && 
              (result.error.code === 'messaging/invalid-registration-token' ||
               result.error.code === 'messaging/registration-token-not-registered')) {
            invalidTokens.push(tokens[index]);
          }
        });

        // Remove invalid tokens
        if (invalidTokens.length > 0) {
          const batch = admin.firestore().batch();
          for (const token of invalidTokens) {
            const tokenQuery = await admin.firestore()
              .collection('users')
              .doc(uid)
              .collection('fcmTokens')
              .where('token', '==', token)
              .get();
            
            tokenQuery.docs.forEach(doc => batch.delete(doc.ref));
          }
          await batch.commit();
          functions.logger.info(`Removed ${invalidTokens.length} invalid tokens for user ${uid}`);
        }

        functions.logger.info(`Sent notification to ${tokens.length} devices for user ${uid}, ${results.successCount} successful`);
      }

      // Create in-app notification record
      await admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .add({
          type: type,
          title: title || getDefaultTitle(type),
          body: body,
          read: false,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: metadata || null
        });

      // Trigger Orb TTS narration for high-priority messages if user has it enabled
      if (priority === 'high' && notificationPrefs.orbNarration !== false) {
        await admin.firestore().collection('orbEvents').add({
          uid: uid,
          type: 'narration_request',
          text: `${title || 'Notification'}: ${body}`,
          priority: 'high',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      functions.logger.info(`Successfully processed notification for user ${uid}`);
      
    } catch (error) {
      functions.logger.error(`Error processing notification for user ${uid}:`, error);
      // Don't delete the message if there was an error, so it can be retried
      return;
    }

    // Clean up the processed message from the queue
    return snap.ref.delete();
  });

/**
 * Helper function to get default notification titles based on type
 */
function getDefaultTitle(type: string): string {
  const titles: { [key: string]: string } = {
    'insight': 'New Insight Available',
    'reminder': 'Friendly Reminder',
    'milestone': 'Milestone Achieved!',
    'ritual': 'Ritual Time',
    'reflection': 'Time to Reflect',
    'check_in': 'Daily Check-in',
    'system': 'System Notification',
  };
  return titles[type] || 'UrAi Notification';
}

/**
 * Helper function to determine click action based on notification type
 */
function getClickAction(type: string): string {
  const actions: { [key: string]: string } = {
    'insight': '/insights',
    'reminder': '/today',
    'milestone': '/progress',
    'ritual': '/rituals',
    'reflection': '/journal',
    'check_in': '/checkin',
  };
  return actions[type] || '/';
}
