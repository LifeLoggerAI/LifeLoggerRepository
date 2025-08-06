import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import type {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Section 5: Visual & Animation Layer Implementation
 * Following the URAI build checklist specifications
 */

/**
 * 1. Placeholder Lottie Animations
 * Animation asset management and serving
 */
export const getAvailableAnimations = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  try {
    logger.info(`Getting available animations for user ${uid}`);

    // Get user's current state to determine appropriate animations
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Get recent cognitive state for context
    const recentCognitive = await db.collection("cognitiveMirror")
      .where("userId", "==", uid)
      .orderBy("date", "desc")
      .limit(1)
      .get();

    const currentMoodContext = !recentCognitive.empty ? 
      recentCognitive.docs[0].data() : { moodScore: 50, stressIndex: 50 };

    // Define available animations with mood-based recommendations
    const animations = {
      lottie: [
        {
          id: "aura-glow",
          name: "Aura Glow",
          path: "/assets/animations/lottie/aura-glow.json",
          category: "mood",
          triggers: ["mood_improvement", "positive_insight"],
          moodRange: { min: 40, max: 100 },
          recommended: currentMoodContext.moodScore >= 40
        },
        {
          id: "memory-bloom",
          name: "Memory Bloom",
          path: "/assets/animations/lottie/memory-bloom.json",
          category: "recovery",
          triggers: ["recovery_detected", "milestone_achieved"],
          moodRange: { min: 30, max: 100 },
          recommended: currentMoodContext.moodScore >= 30
        },
        {
          id: "gentle-pulse",
          name: "Gentle Pulse",
          path: "/assets/animations/lottie/gentle-pulse.json",
          category: "calming",
          triggers: ["stress_relief", "meditation_mode"],
          moodRange: { min: 0, max: 100 },
          recommended: currentMoodContext.stressIndex > 60
        },
        {
          id: "energy-flow",
          name: "Energy Flow",
          path: "/assets/animations/lottie/energy-flow.json",
          category: "activation",
          triggers: ["energy_boost", "goal_focus"],
          moodRange: { min: 50, max: 100 },
          recommended: currentMoodContext.moodScore >= 60
        }
      ],
      overlays: [
        {
          id: "mood-aura",
          name: "Mood Aura",
          path: "/assets/overlays/svg/mood-aura.svg",
          type: "svg",
          category: "background",
          adaptable: true
        },
        {
          id: "particle-field",
          name: "Particle Field",
          path: "/assets/overlays/svg/particle-field.svg",
          type: "svg",
          category: "ambient",
          adaptable: true
        }
      ]
    };

    return {
      success: true,
      animations: animations,
      currentMoodContext: currentMoodContext,
      recommendations: getAnimationRecommendations(animations, currentMoodContext)
    };
  } catch (error) {
    logger.error("Error getting available animations:", error);
    throw new HttpsError("internal", "Failed to get available animations");
  }
});

/**
 * 2. Aura & Particle Overlays
 * Mood-linked visual effects system
 */
export const generateAuraOverlay = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { moodScore, stressIndex, energyLevel, customColor } = request.data;

  try {
    logger.info(`Generating aura overlay for user ${uid}, mood: ${moodScore}`);

    // Calculate aura properties based on mood and energy
    const auraConfig = calculateAuraProperties(moodScore, stressIndex, energyLevel, customColor);

    // Create dynamic overlay configuration
    const overlayConfig = {
      id: uuidv4(),
      userId: uid,
      type: "aura_overlay",
      properties: auraConfig,
      animationDuration: auraConfig.intensity > 70 ? 3000 : 5000, // Faster when energetic
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minute duration
    };

    // Store the overlay config for client retrieval
    await db.collection("activeOverlays").doc(overlayConfig.id).set(overlayConfig);

    return {
      success: true,
      overlay: overlayConfig,
      svgPath: generateAuraSVG(auraConfig),
      cssProperties: generateAuraCSS(auraConfig)
    };
  } catch (error) {
    logger.error("Error generating aura overlay:", error);
    throw new HttpsError("internal", "Failed to generate aura overlay");
  }
});

export const generateParticleOverlay = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { emotionState, intensity = 50, particleType = "floating" } = request.data;

  try {
    logger.info(`Generating particle overlay for user ${uid}, emotion: ${emotionState}`);

    const particleConfig = generateParticleConfiguration(emotionState, intensity, particleType);

    const overlayConfig = {
      id: uuidv4(),
      userId: uid,
      type: "particle_overlay",
      emotionState: emotionState,
      properties: particleConfig,
      createdAt: Date.now(),
      duration: particleConfig.lifespan * 1000
    };

    await db.collection("activeOverlays").doc(overlayConfig.id).set(overlayConfig);

    return {
      success: true,
      overlay: overlayConfig,
      particleConfig: particleConfig
    };
  } catch (error) {
    logger.error("Error generating particle overlay:", error);
    throw new HttpsError("internal", "Failed to generate particle overlay");
  }
});

/**
 * 3. Mood Weather & Seasonal Story Overlays
 * Dynamic weather based on mood and seasonal theming
 */
export const getMoodWeather = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { includeSeasonalTheme = true } = request.data;

  try {
    logger.info(`Getting mood weather for user ${uid}`);

    // Get recent cognitive and emotional data
    const [recentCognitive, recentEmotions] = await Promise.all([
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(7)
        .get(),
      db.collection("voiceEvents")
        .where("uid", "==", uid)
        .where("createdAt", ">=", Date.now() - 7 * 24 * 60 * 60 * 1000)
        .get()
    ]);

    // Calculate mood weather
    const moodWeather = calculateMoodWeather(
      recentCognitive.docs.map(doc => doc.data()),
      recentEmotions.docs.map(doc => doc.data())
    );

    // Add seasonal context if requested
    let seasonalTheme = null;
    if (includeSeasonalTheme) {
      seasonalTheme = getCurrentSeasonalTheme();
    }

    const weatherOverlay = {
      id: uuidv4(),
      userId: uid,
      weather: moodWeather,
      seasonal: seasonalTheme,
      skyConfig: generateSkyConfiguration(moodWeather, seasonalTheme),
      createdAt: Date.now(),
      validUntil: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    };

    await db.collection("moodWeather").doc(weatherOverlay.id).set(weatherOverlay);

    return {
      success: true,
      weather: weatherOverlay,
      backgroundUrl: generateWeatherBackground(moodWeather, seasonalTheme),
      ambientSounds: getAmbientSounds(moodWeather)
    };
  } catch (error) {
    logger.error("Error getting mood weather:", error);
    throw new HttpsError("internal", "Failed to get mood weather");
  }
});

/**
 * 4. Seasonal Story Overlays
 * Dynamic seasonal themes and narratives
 */
export const getSeasonalStoryOverlay = onCall(async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { season, storyTheme = "personal_growth" } = request.data;

  try {
    logger.info(`Getting seasonal story overlay for user ${uid}, season: ${season || 'current'}`);

    const currentSeason = season || getCurrentSeason();
    
    // Get user's journey data for personalized seasonal narrative
    const [userProfile, recentHighlights, yearProgress] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("cognitiveMirror")
        .where("userId", "==", uid)
        .orderBy("date", "desc")
        .limit(30)
        .get(),
      db.collection("recoveryEngine")
        .where("userId", "==", uid)
        .where("reboundDetected", "==", true)
        .orderBy("timestamp", "desc")
        .limit(10)
        .get()
    ]);

    const userJourney = {
      profile: userProfile.data(),
      highlights: recentHighlights.docs.map(doc => doc.data()),
      recoveryMoments: yearProgress.docs.map(doc => doc.data())
    };

    const seasonalStory = generateSeasonalStory(currentSeason, storyTheme, userJourney);

    const storyOverlay = {
      id: uuidv4(),
      userId: uid,
      season: currentSeason,
      theme: storyTheme,
      story: seasonalStory,
      visualElements: generateSeasonalVisuals(currentSeason, seasonalStory),
      narratorScript: generateSeasonalNarration(seasonalStory),
      createdAt: Date.now(),
      validUntil: getSeasonEndTimestamp(currentSeason)
    };

    await db.collection("seasonalStories").doc(storyOverlay.id).set(storyOverlay);

    return {
      success: true,
      seasonalStory: storyOverlay
    };
  } catch (error) {
    logger.error("Error getting seasonal story overlay:", error);
    throw new HttpsError("internal", "Failed to get seasonal story overlay");
  }
});

/**
 * Update visual overlays when mood changes significantly
 */
export const onMoodChange = onDocumentCreated(
  "cognitiveMirror/{mirrorId}",
  async (event: any) => {
    const cognitiveData = event.data?.data();
    if (!cognitiveData) return;

    const userId = cognitiveData.userId;

    try {
      // Check if visual update is warranted
      const previousState = await db.collection("cognitiveMirror")
        .where("userId", "==", userId)
        .where("date", "<", cognitiveData.date)
        .orderBy("date", "desc")
        .limit(1)
        .get();

      if (!previousState.empty) {
        const prev = previousState.docs[0].data();
        const moodChange = Math.abs(cognitiveData.moodScore - prev.moodScore);
        const stressChange = Math.abs(cognitiveData.stressIndex - prev.stressIndex);

        // Update visuals if significant change
        if (moodChange > 15 || stressChange > 20) {
          const newAuraConfig = calculateAuraProperties(
            cognitiveData.moodScore,
            cognitiveData.stressIndex,
            cognitiveData.energyLevel || 50
          );

          // Create new aura overlay
          const overlayConfig = {
            id: uuidv4(),
            userId: userId,
            type: "auto_aura_update",
            properties: newAuraConfig,
            triggerReason: moodChange > 15 ? 'mood_change' : 'stress_change',
            animationDuration: 4000,
            createdAt: Date.now(),
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
          };

          await db.collection("activeOverlays").doc(overlayConfig.id).set(overlayConfig);

          logger.info(`Auto-updated visual overlay for user ${userId} due to significant ${overlayConfig.triggerReason}`);
        }
      }
    } catch (error) {
      logger.error("Error updating visual overlay on mood change:", error);
    }
  }
);

/**
 * Cleanup expired overlays
 */
export const cleanupExpiredOverlays = onSchedule(
  {
    schedule: "*/15 * * * *", // Every 15 minutes
    timeZone: "UTC"
  },
  async () => {
    logger.info("Cleaning up expired visual overlays");

    try {
      const now = Date.now();
      
      // Find expired overlays
      const expiredOverlays = await db.collection("activeOverlays")
        .where("expiresAt", "<", now)
        .get();

      // Delete expired overlays in batches
      const batch = db.batch();
      expiredOverlays.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (expiredOverlays.docs.length > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${expiredOverlays.docs.length} expired overlays`);
      }
    } catch (error) {
      logger.error("Error cleaning up expired overlays:", error);
    }
  }
);

// Helper functions
function calculateAuraProperties(moodScore: number, stressIndex: number, energyLevel: number, customColor?: string): any {
  const moodHue = Math.max(0, Math.min(300, (moodScore / 100) * 300)); // 0 = red, 300 = magenta
  const stressIntensity = Math.max(0.3, Math.min(1, (100 - stressIndex) / 100));
  const energyBrightness = Math.max(30, Math.min(90, 30 + (energyLevel / 100) * 60));

  return {
    color: customColor || `hsl(${moodHue}, 70%, ${energyBrightness}%)`,
    intensity: Math.max(20, Math.min(100, moodScore)),
    opacity: stressIntensity,
    pulseDuration: energyLevel > 70 ? 2 : energyLevel < 30 ? 6 : 4,
    glowRadius: Math.max(50, Math.min(200, 50 + (moodScore / 100) * 150)),
    particleCount: Math.floor((energyLevel / 100) * 20) + 5,
    animationType: moodScore > 70 ? 'energetic' : moodScore < 30 ? 'gentle' : 'steady'
  };
}

function generateParticleConfiguration(emotionState: string, intensity: number, particleType: string): any {
  const emotionConfigs: Record<string, any> = {
    joy: { color: '#FFD700', speed: 2, direction: 'up', pattern: 'burst' },
    calm: { color: '#87CEEB', speed: 0.5, direction: 'float', pattern: 'gentle' },
    excited: { color: '#FF6B6B', speed: 3, direction: 'all', pattern: 'chaotic' },
    peaceful: { color: '#98FB98', speed: 0.3, direction: 'drift', pattern: 'slow' },
    energetic: { color: '#FFA500', speed: 2.5, direction: 'spiral', pattern: 'dynamic' },
    default: { color: '#B0C4DE', speed: 1, direction: 'float', pattern: 'steady' }
  };

  const config = emotionConfigs[emotionState] || emotionConfigs.default;
  
  return {
    ...config,
    count: Math.floor((intensity / 100) * 30) + 10,
    size: intensity > 70 ? 'large' : intensity < 30 ? 'small' : 'medium',
    lifespan: 5 + (intensity / 100) * 10, // 5-15 seconds
    opacity: Math.max(0.3, Math.min(0.8, intensity / 100)),
    blendMode: intensity > 80 ? 'screen' : 'normal'
  };
}

function calculateMoodWeather(cognitiveData: any[], emotionData: any[]): any {
  if (cognitiveData.length === 0) {
    return { type: 'clear', intensity: 50, description: 'Neutral skies' };
  }

  const avgMood = cognitiveData.reduce((sum, day) => sum + (day.moodScore || 50), 0) / cognitiveData.length;
  const avgStress = cognitiveData.reduce((sum, day) => sum + (day.stressIndex || 50), 0) / cognitiveData.length;
  
  // Determine weather based on mood patterns
  if (avgMood > 70 && avgStress < 40) {
    return { type: 'sunny', intensity: 80, description: 'Bright and clear' };
  } else if (avgMood < 30 || avgStress > 70) {
    return { type: 'stormy', intensity: 70, description: 'Turbulent weather' };
  } else if (avgMood > 50 && avgStress < 60) {
    return { type: 'partly_cloudy', intensity: 60, description: 'Mixed conditions' };
  } else {
    return { type: 'overcast', intensity: 50, description: 'Cloudy skies' };
  }
}

function getCurrentSeasonalTheme(): any {
  const now = new Date();
  const month = now.getMonth();
  
  if (month >= 2 && month <= 4) {
    return { season: 'spring', theme: 'renewal', colors: ['#98FB98', '#FFB6C1', '#87CEEB'] };
  } else if (month >= 5 && month <= 7) {
    return { season: 'summer', theme: 'growth', colors: ['#FFD700', '#FF6347', '#32CD32'] };
  } else if (month >= 8 && month <= 10) {
    return { season: 'autumn', theme: 'reflection', colors: ['#FF8C00', '#CD853F', '#B22222'] };
  } else {
    return { season: 'winter', theme: 'contemplation', colors: ['#B0C4DE', '#E6E6FA', '#F0F8FF'] };
  }
}

function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';  
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function generateSkyConfiguration(weather: any, seasonal: any): any {
  return {
    backgroundColor: getWeatherBackgroundColor(weather.type),
    cloudDensity: getCloudDensity(weather.type),
    cloudMovement: weather.intensity > 60 ? 'fast' : 'slow',
    seasonalTint: seasonal?.colors[0] || '#FFFFFF',
    atmosphericEffects: getAtmosphericEffects(weather.type)
  };
}

function generateSeasonalStory(season: string, theme: string, userJourney: any): any {
  const templates: Record<string, any> = {
    spring: {
      title: "Renewal and Growth",
      narrative: "Like the earth awakening from winter's rest, you too are in a season of new possibilities.",
      symbolism: ["budding trees", "flowing streams", "morning light"],
      personalizations: extractPersonalGrowth(userJourney)
    },
    summer: {
      title: "Full Bloom", 
      narrative: "In the warmth of summer's embrace, your journey reaches its most vibrant expression.",
      symbolism: ["golden fields", "abundant gardens", "endless skies"],
      personalizations: extractEnergeticMoments(userJourney)
    },
    autumn: {
      title: "Harvest of Wisdom",
      narrative: "As leaves change color, so too have you transformed through your experiences.",
      symbolism: ["falling leaves", "harvest moon", "warm hearth"],
      personalizations: extractReflectiveMoments(userJourney)
    },
    winter: {
      title: "Inner Sanctuary", 
      narrative: "In winter's quiet depths, you find the strength that comes from turning inward.",
      symbolism: ["snow-covered landscapes", "cozy fires", "starlit nights"],
      personalizations: extractContemplativeMoments(userJourney)
    }
  };

  return templates[season] || templates.spring;
}

function generateSeasonalVisuals(season: string, story: any): any[] {
  return [
    { type: 'background', asset: `/assets/seasonal/${season}-background.svg` },
    { type: 'overlay', asset: `/assets/seasonal/${season}-overlay.png` },
    { type: 'particles', config: getSeasonalParticles(season) }
  ];
}

function generateSeasonalNarration(story: any): string {
  return `${story.title}: ${story.narrative} ${story.personalizations?.join(' ')}`;
}

function getSeasonEndTimestamp(season: string): number {
  const now = new Date();
  const year = now.getFullYear();
  
  const seasonEnds: Record<string, Date> = {
    spring: new Date(year, 5, 21), // June 21
    summer: new Date(year, 8, 23), // September 23  
    autumn: new Date(year, 11, 21), // December 21
    winter: new Date(year + 1, 2, 20) // March 20 next year
  };

  return seasonEnds[season]?.getTime() || Date.now() + 90 * 24 * 60 * 60 * 1000;
}

function getAnimationRecommendations(animations: any, moodContext: any): any[] {
  return animations.lottie.filter((anim: any) => anim.recommended).slice(0, 3);
}

function generateAuraSVG(config: any): string {
  return `/assets/overlays/svg/mood-aura.svg?color=${encodeURIComponent(config.color)}&intensity=${config.intensity}`;
}

function generateAuraCSS(config: any): any {
  return {
    '--aura-color': config.color,
    '--aura-opacity': config.opacity,
    '--aura-radius': `${config.glowRadius}px`,
    '--animation-duration': `${config.pulseDuration}s`
  };
}

function generateWeatherBackground(weather: any, seasonal: any): string {
  return `/assets/weather/sky-background.svg?weather=${weather.type}&season=${seasonal?.season || 'neutral'}`;
}

function getAmbientSounds(weather: any): string[] {
  const soundMap: Record<string, string[]> = {
    sunny: ['birds', 'gentle_breeze'],
    rainy: ['rain_drops', 'distant_thunder'],
    stormy: ['wind', 'rain'],
    cloudy: ['soft_wind', 'muffled_ambience'],
    clear: ['silence', 'peaceful']
  };
  
  return soundMap[weather.type] || ['ambient'];
}

function getWeatherBackgroundColor(weatherType: string): string {
  const colors: Record<string, string> = {
    sunny: '#87CEEB',
    stormy: '#696969', 
    rainy: '#708090',
    cloudy: '#B0C4DE',
    clear: '#E0F6FF'
  };
  
  return colors[weatherType] || colors.clear;
}

function getCloudDensity(weatherType: string): number {
  const density: Record<string, number> = {
    sunny: 0.2,
    stormy: 0.9,
    rainy: 0.7, 
    cloudy: 0.6,
    clear: 0.1
  };
  
  return density[weatherType] || 0.3;
}

function getAtmosphericEffects(weatherType: string): string[] {
  const effects: Record<string, string[]> = {
    sunny: ['sun_rays', 'sparkles'],
    stormy: ['lightning', 'heavy_rain'],
    rainy: ['rain_drops', 'mist'],
    cloudy: ['soft_shadows'],
    clear: ['gentle_glow']
  };
  
  return effects[weatherType] || [];
}

function getSeasonalParticles(season: string): any {
  const particles: Record<string, any> = {
    spring: { type: 'petals', color: '#FFB6C1', count: 15 },
    summer: { type: 'fireflies', color: '#FFD700', count: 20 },
    autumn: { type: 'leaves', color: '#FF8C00', count: 12 },
    winter: { type: 'snowflakes', color: '#FFFFFF', count: 25 }
  };
  
  return particles[season] || particles.spring;
}

function extractPersonalGrowth(journey: any): string[] {
  // Extract growth moments from user journey
  const growth = [];
  if (journey.recoveryMoments?.length > 0) {
    growth.push("You've shown remarkable resilience in your journey.");
  }
  return growth;
}

function extractEnergeticMoments(journey: any): string[] {
  // Extract high-energy positive moments
  const energetic = [];
  const highMoodDays = journey.highlights?.filter((h: any) => h.moodScore > 70);
  if (highMoodDays?.length > 5) {
    energetic.push("Your summer has been filled with vibrant energy and joy.");
  }
  return energetic;
}

function extractReflectiveMoments(journey: any): string[] {
  // Extract thoughtful, reflective patterns
  const reflective = [];
  if (journey.highlights?.some((h: any) => h.highlightInsights?.length > 2)) {
    reflective.push("You've gathered deep insights through your autumn of reflection.");
  }
  return reflective;
}

function extractContemplativeMoments(journey: any): string[] {
  // Extract quiet, contemplative periods
  const contemplative = [];
  if (journey.profile?.personaProfile?.traits?.includes('introspective')) {
    contemplative.push("Your winter contemplation has strengthened your inner wisdom.");
  }
  return contemplative;
}