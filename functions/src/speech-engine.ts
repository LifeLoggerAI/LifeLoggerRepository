
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Transcribes a voice clip uploaded to Cloud Storage.
 * This is a placeholder for a function that would be triggered by a Cloud Storage event.
 * Trigger: onFinalize(Storage) on `lifelogger-voice/{uid}/{...}/{clipId}.opus`
 */
export const transcribeVoiceClip = functions.storage.object().onFinalize(async (object) => {
  functions.logger.info(`Placeholder for transcribing file: ${object.name}`);
  // In a real implementation:
  // 1. Download .opus clip from Cloud Storage.
  // 2. Call a transcription service like Whisper AI.
  // 3. Save the resulting transcript to Firestore in `/voiceTranscripts`.
  // 4. Update the original `/voiceClips` document to mark it as processed.
  // 5. Publish a message to a Pub/Sub topic like `transcriptReady` to trigger further analysis.
  return null;
});

/**
 * Analyzes a transcript for NLP tags and intents.
 * Implements basic keyword extraction and sentiment analysis.
 * Trigger: Pub/Sub message on topic `transcriptReady`
 */
export const analyzeTranscript = functions.pubsub.topic("transcriptReady").onPublish(async (message) => {
  functions.logger.info("Analyzing transcript. Message:", message.json);
  
  try {
    const messageData = message.json;
    const { clipId, uid, transcriptText, timestamp } = messageData;
    
    if (!clipId || !uid || !transcriptText) {
      functions.logger.error("Missing required fields in transcript message:", messageData);
      return;
    }

    functions.logger.info(`Analyzing transcript for user ${uid}, clip ${clipId}`);

    // Basic sentiment analysis
    const sentiment = analyzeSentiment(transcriptText);
    
    // Extract keywords and entities
    const keywords = extractKeywords(transcriptText);
    
    // Detect intents and categories
    const intents = detectIntents(transcriptText);
    
    // Extract potential goals, tasks, and emotions
    const entities = extractEntities(transcriptText, keywords);

    // Save analysis results to transcriptTags
    const analysisResult = {
      clipId,
      uid,
      sentiment,
      keywords,
      intents,
      entities,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      originalTimestamp: timestamp,
      confidence: calculateConfidence(transcriptText, keywords, intents)
    };

    await admin.firestore()
      .collection('transcriptTags')
      .doc(clipId)
      .set(analysisResult);

    // Create related documents based on extracted intents
    await processIntents(uid, intents, entities, transcriptText);

    functions.logger.info(`Successfully analyzed transcript for clip ${clipId}`);
    
  } catch (error) {
    functions.logger.error("Error analyzing transcript:", error);
  }
});

/**
 * Basic sentiment analysis function
 */
function analyzeSentiment(text: string): { score: number; label: string; magnitude: number } {
  const positiveWords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'love', 'excited', 'grateful', 'thankful', 'accomplished', 'proud', 'success'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'worried', 'anxious', 'stressed', 'depressed', 'fail'];
  
  const words = text.toLowerCase().split(/\W+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  const totalSentimentWords = positiveCount + negativeCount;
  const score = totalSentimentWords > 0 ? (positiveCount - negativeCount) / totalSentimentWords : 0;
  
  let label = 'neutral';
  if (score > 0.2) label = 'positive';
  else if (score < -0.2) label = 'negative';
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    label,
    magnitude: totalSentimentWords / words.length
  };
}

/**
 * Extract keywords from transcript
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once']);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Count word frequency
  const wordCounts: { [key: string]: number } = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Return top keywords
  return Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Detect intents from transcript
 */
function detectIntents(text: string): string[] {
  const intentPatterns = {
    'goal_setting': ['goal', 'want to', 'plan to', 'hoping to', 'aim to', 'objective', 'target'],
    'task_creation': ['need to', 'have to', 'should', 'must', 'reminder', 'todo', 'task'],
    'reflection': ['thinking about', 'realize', 'learned', 'understand', 'feel like', 'reflection'],
    'gratitude': ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky'],
    'concern': ['worried', 'concerned', 'anxious', 'stressed', 'problem', 'issue'],
    'achievement': ['accomplished', 'completed', 'finished', 'achieved', 'success', 'proud'],
    'social': ['friend', 'family', 'relationship', 'talk to', 'meet with', 'social'],
    'health': ['exercise', 'workout', 'sleep', 'tired', 'energy', 'health', 'medical']
  };
  
  const detectedIntents: string[] = [];
  const lowerText = text.toLowerCase();
  
  Object.entries(intentPatterns).forEach(([intent, patterns]) => {
    if (patterns.some(pattern => lowerText.includes(pattern))) {
      detectedIntents.push(intent);
    }
  });
  
  return detectedIntents;
}

/**
 * Extract entities like goals, tasks, emotions
 */
function extractEntities(text: string, keywords: string[]): { [key: string]: string[] } {
  const entities: { [key: string]: string[] } = {
    emotions: [],
    goals: [],
    tasks: [],
    people: [],
    activities: []
  };
  
  const emotionWords = ['happy', 'sad', 'angry', 'excited', 'nervous', 'calm', 'frustrated', 'grateful', 'proud', 'worried'];
  const goalIndicators = ['want to', 'plan to', 'hope to', 'goal', 'aim', 'objective'];
  const taskIndicators = ['need to', 'have to', 'should', 'must', 'reminder'];
  
  const lowerText = text.toLowerCase();
  
  // Extract emotions
  keywords.forEach(keyword => {
    if (emotionWords.includes(keyword)) {
      entities.emotions.push(keyword);
    }
  });
  
  // Extract potential goals and tasks based on patterns
  goalIndicators.forEach(indicator => {
    const pattern = new RegExp(`${indicator}\\s+([^.!?]{1,50})`, 'gi');
    const matches = text.match(pattern);
    if (matches) {
      entities.goals.push(...matches.map(match => match.replace(indicator, '').trim()));
    }
  });
  
  taskIndicators.forEach(indicator => {
    const pattern = new RegExp(`${indicator}\\s+([^.!?]{1,50})`, 'gi');
    const matches = text.match(pattern);
    if (matches) {
      entities.tasks.push(...matches.map(match => match.replace(indicator, '').trim()));
    }
  });
  
  return entities;
}

/**
 * Calculate confidence score for the analysis
 */
function calculateConfidence(text: string, keywords: string[], intents: string[]): number {
  const textLength = text.split(/\s+/).length;
  const keywordDensity = keywords.length / Math.max(textLength, 1);
  const intentCoverage = intents.length > 0 ? 1 : 0;
  
  // Simple confidence calculation
  return Math.min(1, (keywordDensity * 0.5 + intentCoverage * 0.5) * Math.min(textLength / 10, 1));
}

/**
 * Process detected intents and create related documents
 */
async function processIntents(uid: string, intents: string[], entities: any, transcriptText: string): Promise<void> {
  const batch = admin.firestore().batch();
  
  if (intents.includes('goal_setting') && entities.goals.length > 0) {
    entities.goals.forEach((goal: string) => {
      const goalRef = admin.firestore().collection('goals').doc();
      batch.set(goalRef, {
        uid,
        title: goal.substring(0, 100),
        status: 'draft',
        source: 'voice_transcript',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        originalText: transcriptText
      });
    });
  }
  
  if (intents.includes('task_creation') && entities.tasks.length > 0) {
    entities.tasks.forEach((task: string) => {
      const taskRef = admin.firestore().collection('tasks').doc();
      batch.set(taskRef, {
        uid,
        title: task.substring(0, 100),
        completed: false,
        source: 'voice_transcript',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        originalText: transcriptText
      });
    });
  }
  
  if (batch._writes && batch._writes.length > 0) {
    await batch.commit();
    functions.logger.info(`Created ${batch._writes.length} documents from transcript intents for user ${uid}`);
  }
}


/**
 * Synthesizes narrator voice for a new insight and updates the insight document.
 * This is a placeholder for a function that would be triggered by a new document in Firestore.
 * Trigger: onCreate /narratorInsights/{uid}/{insightId}
 */
export const synthesizeNarratorVoice = functions.firestore
  .document("narratorInsights/{uid}/{insightId}")
  .onCreate(async (snap, context) => {
    const insight = snap.data();
    functions.logger.info(`Synthesizing narrator voice for insight ${context.params.insightId}`, insight);
    // In a real implementation:
    // 1. Determine the correct voice preset from user preferences.
    // 2. Call a Text-to-Speech service (Google TTS, ElevenLabs) with the insight's text.
    // 3. Save the generated audio file to a Cloud Storage bucket.
    // 4. Update the original narratorInsight document with the URL to the audio file.
    return null;
  });
