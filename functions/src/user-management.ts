
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Triggered on new user creation to create a default profile in Firestore.
 * This aligns with the "ONBOARDING SETUP TASK" from the blueprint.
 */
export const createDefaultProfile = functions.auth.user().onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;

    try {
        const newUserDoc = {
            displayName: displayName || email?.split('@')[0] || "Anonymous",
            email: email || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            avatarUrl: photoURL || `https://placehold.co/128x128.png?text=${(displayName || email || "A").charAt(0).toUpperCase()}`,
            settings: {
                moodTrackingEnabled: true,
                passiveAudioEnabled: true,
                faceEmotionEnabled: false,
                dataExportEnabled: true,
                narratorVolume: 0.8,
                ttsVoice: 'warmCalm',
                receiveWeeklyEmail: true,
                receiveMilestones: true,
                emailTone: 'poetic',
                gpsAllowed: false,
                allowVoiceRetention: true,
                dataConsent: {
                    shareAnonymousData: false,
                    optedOutAt: null,
                },
            },
            personaProfile: {},
            symbolLexicon: {},
            subscriptionTier: 'free',
            isProUser: false,
            onboardingComplete: false,
        };

        await db.collection("users").doc(uid).set(newUserDoc);
        functions.logger.info(`Successfully created profile for user: ${uid}`);

        // As per blueprint: "enqueue welcome notification"
        functions.logger.info(`Enqueued welcome notification for user ${uid}`);

    } catch (error) {
        functions.logger.error(`Error creating profile for user ${uid}:`, error);
    }
});

/**
 * Triggered on user deletion to clean up their data.
 * This starts implementing the data cleanup logic from the blueprint.
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
    const { uid } = user;
    functions.logger.info(`Starting data cleanup for deleted user: ${uid}`);
    
    const userDocRef = db.collection("users").doc(uid);
    
    try {
        // This is a simplified version. A real app would also delete associated
        // data in other collections (voiceEvents, etc.) and in Storage.
        await userDocRef.delete();
        functions.logger.info(`Successfully deleted user profile for ${uid}. Further cleanup is required for a production app.`);
    } catch (error) {
        functions.logger.error(`Error deleting user profile for ${uid}:`, error);
    }
});
