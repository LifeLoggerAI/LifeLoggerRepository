import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * AI Insight Engine 1: Cognitive Mirror
 * Aggregates daily from all passive data to create daily & weekly trends
 */
export const generateCognitiveMirror = onSchedule(
  {
    schedule: "0 6 * * *", // Every day at 6:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting cognitive mirror generation");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];
    const startTime = yesterday.getTime() - 24 * 60 * 60 * 1000;
    const endTime = yesterday.getTime();

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Collect data from all passive sources
        const [
          voiceEventsSnap,
          deviceSignalsSnap,
          shadowCognitionSnap,
          rhythmMapSnap
        ] = await Promise.all([
          db.collection("voiceEvents")
            .where("uid", "==", userId)
            .where("createdAt", ">=", startTime)
            .where("createdAt", "<", endTime)
            .get(),
          db.collection("deviceSignals")
            .where("userId", "==", userId)
            .where("timestamp", ">=", startTime)
            .where("timestamp", "<", endTime)
            .get(),
          db.collection("shadowCognition")
            .where("userId", "==", userId)
            .where("date", "==", dateKey)
            .get(),
          db.collection("rhythmMap")
            .where("userId", "==", userId)
            .where("date", "==", dateKey)
            .get()
        ]);

        // Calculate mood score from voice events
        let moodScore = 50; // Neutral baseline
        if (!voiceEventsSnap.empty) {
          let totalSentiment = 0;
          voiceEventsSnap.docs.forEach((doc: any) => {
            totalSentiment += doc.data().sentimentScore || 0;
          });
          moodScore = Math.max(0, Math.min(100, 50 + (totalSentiment / voiceEventsSnap.docs.length) * 50));
        }

        // Calculate stress index from device activity and shadow cognition
        let stressIndex = 30; // Low baseline
        if (!deviceSignalsSnap.empty) {
          const deviceData = deviceSignalsSnap.docs[0].data();
          const notificationStress = Math.min(40, (deviceData.notificationCount || 0) * 2);
          const screenTimeStress = Math.min(30, (deviceData.screenTimeMinutes || 0) / 10);
          stressIndex += notificationStress + screenTimeStress;
        }

        if (!shadowCognitionSnap.empty) {
          const shadowData = shadowCognitionSnap.docs[0].data();
          const frictionStress = Math.min(30, (shadowData.frictionTaps || 0) * 3);
          stressIndex += frictionStress;
        }

        stressIndex = Math.min(100, stressIndex);

        // Generate insights based on patterns
        const highlightInsights = [];
        
        if (moodScore > 70) {
          highlightInsights.push("You had a particularly positive day with uplifting conversations");
        } else if (moodScore < 30) {
          highlightInsights.push("Today felt heavy - your voice carried more tension than usual");
        }

        if (stressIndex > 70) {
          highlightInsights.push("High digital activity and friction suggests elevated stress");
        } else if (stressIndex < 30) {
          highlightInsights.push("You maintained good digital balance today");
        }

        if (!rhythmMapSnap.empty) {
          const rhythmData = rhythmMapSnap.docs[0].data();
          if (rhythmData.rhythmState === "Stable") {
            highlightInsights.push("Your sleep and movement patterns were well-balanced");
          } else if (rhythmData.rhythmState === "Off-Rhythm") {
            highlightInsights.push("Your natural rhythms were disrupted today");
          }
        }

        // Create cognitive mirror entry
        const cognitiveMirrorId = uuidv4();
        const cognitiveMirror = {
          id: cognitiveMirrorId,
          userId: userId,
          date: dateKey,
          moodScore: Math.round(moodScore),
          stressIndex: Math.round(stressIndex),
          highlightInsights: highlightInsights,
          timestamp: Date.now(),
          energyLevel: 100 - stressIndex, // Inverse of stress
          socialConnection: Math.min(100, voiceEventsSnap.docs.length * 10), // Based on conversation frequency
          purposeAlignment: Math.round((moodScore + (100 - stressIndex)) / 2) // Average of mood and low stress
        };

        await db.collection("cognitiveMirror").doc(cognitiveMirrorId).set(cognitiveMirror);

        logger.info(`Cognitive mirror generated for user ${userId} on ${dateKey}`);
      }
    } catch (error) {
      logger.error("Error generating cognitive mirror:", error);
    }
  }
);

/**
 * AI Insight Engine 2: Emotion Forecast Model
 * Predicts mood 1-3 days in advance based on historical patterns
 */
export const generateEmotionForecast = onSchedule(
  {
    schedule: "0 7 * * *", // Every day at 7:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting emotion forecast generation");

    const today = new Date();

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get historical cognitive mirror data (last 30 days)
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const historicalData = await db.collection("cognitiveMirror")
          .where("userId", "==", userId)
          .where("date", ">=", thirtyDaysAgo.toISOString().split('T')[0])
          .orderBy("date", "desc")
          .get();

        if (historicalData.docs.length < 7) {
          continue; // Need at least a week of data for prediction
        }

        const moodHistory = historicalData.docs.map((doc: any) => ({
          date: doc.data().date,
          moodScore: doc.data().moodScore,
          stressIndex: doc.data().stressIndex
        }));

        // Simple trend analysis for prediction
        const recentWeek = moodHistory.slice(0, 7);
        const avgRecentStress = recentWeek.reduce((sum: number, day: any) => sum + day.stressIndex, 0) / recentWeek.length;

        // Detect weekly patterns
        const dayOfWeek = today.getDay();
        const sameDayHistory = moodHistory.filter((_: any, index: number) => {
          const historicalDate = new Date(historicalData.docs[index].data().date);
          return historicalDate.getDay() === (dayOfWeek + 1) % 7; // Tomorrow's day of week
        });

        let predictedMood = "stable";
        let confidence = 0.6;

        if (sameDayHistory.length > 2) {
          const avgSameDayMood = sameDayHistory.slice(0, 4).reduce((sum: number, day: any) => sum + day.moodScore, 0) / Math.min(4, sameDayHistory.length);
          
          if (avgSameDayMood > 70) {
            predictedMood = "positive";
            confidence = 0.75;
          } else if (avgSameDayMood < 40) {
            predictedMood = "challenging";
            confidence = 0.7;
          }
        }

        // Trend adjustment
        const trendSlope = (recentWeek[0].moodScore - recentWeek[6].moodScore) / 6;
        if (trendSlope > 5) {
          predictedMood = predictedMood === "challenging" ? "stable" : "positive";
          confidence += 0.1;
        } else if (trendSlope < -5) {
          predictedMood = predictedMood === "positive" ? "stable" : "challenging";
          confidence += 0.1;
        }

        // Generate influencing factors
        const influencingFactors = [];
        if (avgRecentStress > 60) {
          influencingFactors.push("elevated stress patterns");
        }
        if (trendSlope > 5) {
          influencingFactors.push("improving mood trend");
        } else if (trendSlope < -5) {
          influencingFactors.push("declining mood trend");
        }

        // Generate recommendations
        const recommendedActions = [];
        if (predictedMood === "challenging") {
          recommendedActions.push("Consider extra self-care tomorrow");
          recommendedActions.push("Schedule lighter activities if possible");
        } else if (predictedMood === "positive") {
          recommendedActions.push("Good day to tackle challenging tasks");
          recommendedActions.push("Consider connecting with friends");
        }

        // Create forecast for tomorrow
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowKey = tomorrow.toISOString().split('T')[0];

        const emotionForecastId = uuidv4();
        const emotionForecast = {
          id: emotionForecastId,
          userId: userId,
          date: tomorrowKey,
          predictedMood: predictedMood,
          confidence: Math.round(confidence * 100) / 100,
          timestamp: Date.now(),
          predictionHorizonDays: 1,
          influencingFactors: influencingFactors,
          recommendedActions: recommendedActions
        };

        await db.collection("emotionForecast").doc(emotionForecastId).set(emotionForecast);

        logger.info(`Emotion forecast generated for user ${userId} for ${tomorrowKey}: ${predictedMood}`);
      }
    } catch (error) {
      logger.error("Error generating emotion forecast:", error);
    }
  }
);

/**
 * AI Insight Engine 3: Rhythm State Scoring
 * Triggered when new rhythm map data is created
 */
export const generateRhythmScore = onDocumentCreated(
  "rhythmMap/{rhythmMapId}",
  async (event: any) => {
    const rhythmData = event.data?.data();
    if (!rhythmData) {
      logger.error("No rhythm map data found");
      return;
    }

    const userId = rhythmData.userId;
    const date = rhythmData.date;

    try {
      // Get related health data
      const healthEcho = await db.collection("healthEcho")
        .where("userId", "==", userId)
        .where("date", "==", date)
        .get();

      let score = 50; // Neutral baseline
      
      // Score based on sleep quality
      const sleepScore = Math.min(100, rhythmData.sleepHours * 12.5); // 8 hours = 100 points
      score += (sleepScore - 50) * 0.4;

      // Score based on movement
      const movementScore = rhythmData.movementScore;
      score += (movementScore - 50) * 0.3;

      // Score based on wellness index if available
      if (!healthEcho.empty) {
        const wellnessIndex = healthEcho.docs[0].data().wellnessIndex;
        score += (wellnessIndex - 50) * 0.3;
      }

      score = Math.max(0, Math.min(100, score));

      // Determine classification
      let classification = rhythmData.rhythmState;
      
      // Override with score-based classification if needed
      if (score > 75) {
        classification = "Stable";
      } else if (score < 40) {
        classification = "Off-Rhythm";
      } else if (rhythmData.movementScore > 80 && rhythmData.sleepHours < 7) {
        classification = "Overstimulated";
      }

      // Analyze rhythm factors
      const rhythmFactors = {
        sleep: sleepScore,
        movement: movementScore,
        consistency: 50 // Placeholder - would calculate from historical data
      };

      const rhythmScoreId = uuidv4();
      const rhythmScore = {
        id: rhythmScoreId,
        userId: userId,
        date: date,
        classification: classification,
        score: Math.round(score),
        timestamp: Date.now(),
        rhythmFactors: rhythmFactors,
        stabilityTrend: score > 60 ? "improving" : score < 40 ? "declining" : "stable"
      };

      await db.collection("rhythmScores").doc(rhythmScoreId).set(rhythmScore);

      logger.info(`Rhythm score generated for user ${userId} on ${date}: ${classification} (${score})`);
    } catch (error) {
      logger.error("Error generating rhythm score:", error);
    }
  }
);

/**
 * AI Insight Engine 4: Behavioral Recovery Engine
 * Detects rebounds after low mood/stress periods
 */
export const detectBehavioralRecovery = onDocumentCreated(
  "cognitiveMirror/{mirrorId}",
  async (event: any) => {
    const mirrorData = event.data?.data();
    if (!mirrorData) {
      logger.error("No cognitive mirror data found");
      return;
    }

    const userId = mirrorData.userId;
    const currentDate = mirrorData.date;

    try {
      // Get recent cognitive mirror entries to detect recovery patterns
      const sevenDaysAgo = new Date(new Date(currentDate).getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentMirrors = await db.collection("cognitiveMirror")
        .where("userId", "==", userId)
        .where("date", ">=", sevenDaysAgo.toISOString().split('T')[0])
        .where("date", "<=", currentDate)
        .orderBy("date", "asc")
        .get();

      if (recentMirrors.docs.length < 3) {
        return; // Need at least 3 days of data
      }

      const dailyScores = recentMirrors.docs.map((doc: any) => ({
        date: doc.data().date,
        moodScore: doc.data().moodScore,
        stressIndex: doc.data().stressIndex,
        combined: doc.data().moodScore - doc.data().stressIndex // Higher is better
      }));

      // Look for recovery pattern: low period followed by improvement
      let recoveryDetected = false;
      let recoveryType = "emotional";
      let triggerEvent = "";

      // Find the lowest point in recent history
      const lowestIndex = dailyScores.reduce((minIdx, current, idx) => 
        current.combined < dailyScores[minIdx].combined ? idx : minIdx, 0);

      if (lowestIndex < dailyScores.length - 1) {
        const lowestScore = dailyScores[lowestIndex].combined;
        const currentScore = dailyScores[dailyScores.length - 1].combined;
        const improvement = currentScore - lowestScore;

        // Recovery detected if improvement is significant
        if (improvement > 30 && lowestScore < 20) {
          recoveryDetected = true;
          
          // Determine recovery type based on what improved most
          const moodImprovement = mirrorData.moodScore - dailyScores[lowestIndex].moodScore;
          const stressReduction = dailyScores[lowestIndex].stressIndex - mirrorData.stressIndex;
          
          if (moodImprovement > stressReduction) {
            recoveryType = "emotional";
            triggerEvent = "mood_rebound";
          } else {
            recoveryType = "stress_relief";
            triggerEvent = "stress_reduction";
          }
        }
      }

      if (recoveryDetected) {
        const recoveryEngineId = uuidv4();
        const recoveryEngine = {
          id: recoveryEngineId,
          userId: userId,
          startDate: dailyScores[lowestIndex].date,
          reboundDetected: true,
          improvementScore: Math.round(dailyScores[dailyScores.length - 1].combined - dailyScores[lowestIndex].combined),
          timestamp: Date.now(),
          recoveryType: recoveryType,
          triggerEvent: triggerEvent,
          durationDays: dailyScores.length - 1 - lowestIndex
        };

        await db.collection("recoveryEngine").doc(recoveryEngineId).set(recoveryEngine);

        logger.info(`Recovery detected for user ${userId}: ${recoveryType} improvement of ${recoveryEngine.improvementScore}`);
      }
    } catch (error) {
      logger.error("Error detecting behavioral recovery:", error);
    }
  }
);

/**
 * AI Insight Engine 5: Life Event Auto-Correlation
 * Detects major shifts in metrics that may indicate life events
 */
export const detectLifeEvents = onSchedule(
  {
    schedule: "0 8 * * 0", // Every Sunday at 8:00 AM
    timeZone: "UTC"
  },
  async () => {
    logger.info("Starting life event detection");

    const today = new Date();
    const fourWeeksAgo = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);

    try {
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get comprehensive data for the last month
        const cognitiveMirrors = await db.collection("cognitiveMirror")
          .where("userId", "==", userId)
          .where("date", ">=", fourWeeksAgo.toISOString().split('T')[0])
          .orderBy("date", "asc")
          .get();

        if (cognitiveMirrors.docs.length < 14) {
          continue; // Need at least 2 weeks of data
        }

        // Analyze for significant shifts
        const firstHalf = cognitiveMirrors.docs.slice(0, Math.floor(cognitiveMirrors.docs.length / 2));
        const secondHalf = cognitiveMirrors.docs.slice(Math.floor(cognitiveMirrors.docs.length / 2));

        const avgFirstMood = firstHalf.reduce((sum, doc) => sum + doc.data().moodScore, 0) / firstHalf.length;
        const avgSecondMood = secondHalf.reduce((sum, doc) => sum + doc.data().moodScore, 0) / secondHalf.length;
        const moodShift = avgSecondMood - avgFirstMood;

        const avgFirstStress = firstHalf.reduce((sum, doc) => sum + doc.data().stressIndex, 0) / firstHalf.length;
        const avgSecondStress = secondHalf.reduce((sum, doc) => sum + doc.data().stressIndex, 0) / secondHalf.length;
        const stressShift = avgSecondStress - avgFirstStress;

        // Detect significant life events
        const detectedEvents = [];

        if (Math.abs(moodShift) > 25 || Math.abs(stressShift) > 20) {
          let eventType = "unknown_transition";
          let significance = Math.max(Math.abs(moodShift), Math.abs(stressShift));
          
          if (moodShift > 25 && stressShift < -15) {
            eventType = "positive_life_change";
          } else if (moodShift < -25 && stressShift > 15) {
            eventType = "challenging_life_event";
          } else if (Math.abs(stressShift) > 25) {
            eventType = "major_stress_shift";
          } else if (Math.abs(moodShift) > 30) {
            eventType = "significant_mood_change";
          }

          detectedEvents.push({
            eventType,
            significance,
            metricsInvolved: ["mood", "stress"],
            correlatedChanges: {
              moodShift: Math.round(moodShift),
              stressShift: Math.round(stressShift)
            }
          });
        }

        // Save detected events
        for (const event of detectedEvents) {
          const lifeEventId = uuidv4();
          const lifeEvent = {
            id: lifeEventId,
            userId: userId,
            eventType: event.eventType,
            detectedOn: today.toISOString().split('T')[0],
            metricsInvolved: event.metricsInvolved,
            timestamp: Date.now(),
            significance: event.significance,
            correlatedChanges: event.correlatedChanges,
            eventDescription: `Detected ${event.eventType.replace('_', ' ')} with ${event.significance.toFixed(1)} point shift`
          };

          await db.collection("lifeEvents").doc(lifeEventId).set(lifeEvent);

          logger.info(`Life event detected for user ${userId}: ${event.eventType} (significance: ${event.significance})`);
        }
      }
    } catch (error) {
      logger.error("Error detecting life events:", error);
    }
  }
);