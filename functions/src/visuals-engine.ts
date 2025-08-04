
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Triggers a constellation glow effect when a significant recovery event occurs.
 * Implements visual feedback system for user achievements and insights.
 * Trigger: onCreate /recoveryBlooms/{uid}/{bloomId}
 */
export const triggerConstellationGlow = functions.firestore
  .document("recoveryBlooms/{uid}/{bloomId}")
  .onCreate(async (snap, context) => {
    const bloom = snap.data();
    const uid = context.params.uid;
    const bloomId = context.params.bloomId;
    
    functions.logger.info(`Constellation glow triggered for user ${uid}`, bloom);
    
    try {
      // Validate bloom data
      if (!bloom.bloomType || !bloom.intensity) {
        functions.logger.warn(`Invalid bloom data for ${bloomId}`, bloom);
        return;
      }

      // Determine glow characteristics based on bloom type
      const glowConfig = getGlowConfiguration(bloom.bloomType, bloom.intensity);
      
      // Check if bloom is related to insights or dreams
      if (bloom.bloomType === "insight" || bloom.bloomType === "dream_insight") {
        // Find related emotion events to update
        const emotionEventsQuery = await admin.firestore()
          .collection('emotionEvents')
          .where('uid', '==', uid)
          .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
          .orderBy('timestamp', 'desc')
          .limit(5)
          .get();

        if (!emotionEventsQuery.empty) {
          const batch = admin.firestore().batch();
          
          emotionEventsQuery.docs.forEach(doc => {
            const eventData = doc.data();
            
            // Update emotion event with constellation glow effect
            batch.update(doc.ref, {
              constellationGlow: true,
              glowIntensity: glowConfig.intensity,
              glowColor: glowConfig.color,
              glowDuration: glowConfig.duration,
              linkedBloomId: bloomId,
              glowTriggeredAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
          
          await batch.commit();
          functions.logger.info(`Updated ${emotionEventsQuery.docs.length} emotion events with constellation glow for user ${uid}`);
        }
      }

      // Create visual effect record for frontend
      await admin.firestore()
        .collection('visualEffects')
        .doc(uid)
        .collection('constellationGlows')
        .add({
          bloomId: bloomId,
          bloomType: bloom.bloomType,
          intensity: glowConfig.intensity,
          color: glowConfig.color,
          duration: glowConfig.duration,
          position: glowConfig.position,
          active: true,
          triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + glowConfig.duration * 1000)
        });

      // Update user's visual state
      await admin.firestore()
        .collection('userVisualState')
        .doc(uid)
        .set({
          hasActiveGlow: true,
          lastGlowTriggered: admin.firestore.FieldValue.serverTimestamp(),
          totalGlowsTriggered: admin.firestore.FieldValue.increment(1),
          currentGlowIntensity: Math.max(glowConfig.intensity, 0.3) // Minimum visibility
        }, { merge: true });

      // Create achievement if this is a significant bloom
      if (bloom.intensity >= 0.8) {
        await createAchievement(uid, 'constellation_master', {
          bloomId: bloomId,
          bloomType: bloom.bloomType,
          intensity: bloom.intensity
        });
      }

      // Trigger notification for high-intensity blooms
      if (bloom.intensity >= 0.7) {
        await admin.firestore()
          .collection('messages')
          .collection('queue')
          .add({
            uid: uid,
            type: 'achievement',
            title: 'Constellation Activated!',
            body: `Your ${bloom.bloomType} has triggered a beautiful constellation glow effect.`,
            priority: 'normal',
            metadata: {
              bloomId: bloomId,
              effectType: 'constellation_glow'
            }
          });
      }

      functions.logger.info(`Successfully processed constellation glow for bloom ${bloomId} for user ${uid}`);
      
    } catch (error) {
      functions.logger.error(`Error processing constellation glow for user ${uid}:`, error);
    }
  });

/**
 * Helper function to get glow configuration based on bloom type and intensity
 */
function getGlowConfiguration(bloomType: string, intensity: number): {
  intensity: number;
  color: string;
  duration: number;
  position: string;
} {
  const configs: { [key: string]: any } = {
    'insight': {
      color: '#FFD700', // Gold
      baseIntensity: 0.8,
      baseDuration: 300, // 5 minutes
      position: 'center'
    },
    'dream_insight': {
      color: '#9370DB', // Medium Purple
      baseIntensity: 0.7,
      baseDuration: 240, // 4 minutes
      position: 'upper_right'
    },
    'achievement': {
      color: '#00FF7F', // Spring Green
      baseIntensity: 0.9,
      baseDuration: 180, // 3 minutes
      position: 'lower_left'
    },
    'reflection': {
      color: '#87CEEB', // Sky Blue
      baseIntensity: 0.6,
      baseDuration: 360, // 6 minutes
      position: 'upper_left'
    },
    'default': {
      color: '#FFFFFF', // White
      baseIntensity: 0.5,
      baseDuration: 120, // 2 minutes
      position: 'center'
    }
  };

  const config = configs[bloomType] || configs['default'];
  
  return {
    intensity: Math.min(1, config.baseIntensity * intensity),
    color: config.color,
    duration: Math.floor(config.baseDuration * intensity),
    position: config.position
  };
}

/**
 * Create achievement record for significant visual events
 */
async function createAchievement(uid: string, achievementType: string, metadata: any): Promise<void> {
  try {
    await admin.firestore()
      .collection('achievements')
      .doc(uid)
      .collection('earned')
      .add({
        type: achievementType,
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata,
        notified: false
      });
    
    functions.logger.info(`Created achievement ${achievementType} for user ${uid}`);
  } catch (error) {
    functions.logger.error(`Error creating achievement for user ${uid}:`, error);
  }
}

/**
 * Scheduled daily function to fade out social silhouettes that have not been interacted with.
 * This is a placeholder.
 */
export const fadeOldShadows = functions.pubsub
  .schedule("every day 05:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    functions.logger.info("Running daily job to fade old social shadows.");
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // In a real application, this function would:
    // 1. Query all socialOverlays collections.
    // 2. For each user, find overlays where lastInteraction < thirtyDaysAgo.
    // 3. Update those documents to set silhouetteVisible = false.
    // This is a complex operation that would require iterating through all users.
    return null;
  });
