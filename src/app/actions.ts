
'use server';

import type { VoiceEvent, Dream, DashboardData, CompanionChatInput, SuggestRitualOutput, MoodLog, AuraState } from "@/lib/types";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, writeBatch, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { transcribeAudio } from "@/ai/flows/transcribe-audio";
import { summarizeText } from "@/ai/flows/summarize-text";
import { generateSpeech } from "@/ai/flows/generate-speech";
import { DashboardDataSchema, CompanionChatInputSchema, SuggestRitualInputSchema, MoodLogSchema, AuraStateSchema } from "@/lib/types";
import { format } from "date-fns";
import { companionChat } from "@/ai/flows/companion-chat";
import { analyzeCameraImage } from "@/ai/flows/analyze-camera-image";
import { generateSymbolicInsight } from "@/ai/flows/generate-symbolic-insight";
import { suggestRitual } from "@/ai/flows/suggest-ritual";
import { processOnboardingTranscript } from "@/ai/flows/process-onboarding-transcript";


export async function summarizeWeekAction(userId: string): Promise<{ summary: string | null; audioDataUri: string | null; error: string | null; }> {
    if (!userId) {
        return { summary: null, audioDataUri: null, error: "User not authenticated." };
    }

    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const q = query(
            collection(db, "voiceEvents"), 
            where("uid", "==", userId), 
            where("createdAt", ">=", oneWeekAgo.getTime()),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { summary: "No memories were logged in the last week. Record some new voice notes to get your first summary!", audioDataUri: null, error: null };
        }

        const allTranscripts = querySnapshot.docs
            .map(doc => doc.data().text)
            .join("\n\n---\n\n");

        const summaryResult = await summarizeText({ text: allTranscripts });

        if (!summaryResult?.summary) {
            return { summary: null, audioDataUri: null, error: "Failed to generate summary." };
        }
        
        const speechResult = await generateSpeech({ text: summaryResult.summary });

        if (!speechResult?.audioDataUri) {
            console.warn("TTS generation failed, returning summary text only.");
            return { summary: summaryResult.summary, audioDataUri: null, error: null };
        }

        return { summary: summaryResult.summary, audioDataUri: speechResult.audioDataUri, error: null };

    } catch (e) {
        console.error(e);
        return { summary: null, audioDataUri: null, error: "An error occurred while generating the summary." };
    }
}


export async function getDashboardDataAction(userId: string): Promise<{ data: DashboardData | null; error: string | null; }> {
    if (!userId) {
        return { data: null, error: "User not authenticated." };
    }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const voiceEventsQuery = query(
            collection(db, "voiceEvents"), 
            where("uid", "==", userId), 
            where("createdAt", ">=", thirtyDaysAgo.getTime()),
            orderBy("createdAt", "asc")
        );

        const dreamsQuery = query(
            collection(db, "dreamEvents"),
            where("uid", "==", userId),
            where("createdAt", ">=", thirtyDaysAgo.getTime()),
            orderBy("createdAt", "asc")
        );

        const peopleQuery = query(collection(db, "people"), where("uid", "==", userId));

        const [voiceEventsSnapshot, dreamsSnapshot, peopleSnapshot] = await Promise.all([
            getDocs(voiceEventsQuery),
            getDocs(dreamsQuery),
            getDocs(peopleQuery),
        ]);

        const voiceEvents = voiceEventsSnapshot.docs.map(doc => doc.data() as VoiceEvent);
        const dreams = dreamsSnapshot.docs.map(doc => doc.data() as Dream);

        // Process sentiment data
        const sentimentData = [...voiceEvents, ...dreams].map(event => ({
            createdAt: event.createdAt,
            sentiment: event.sentimentScore
        })).sort((a, b) => a.createdAt - b.createdAt);
        
        // Aggregate sentiment by day (average)
        const dailySentiment = sentimentData.reduce((acc, curr) => {
            const day = format(new Date(curr.createdAt), "MMM d");
            if (!acc[day]) {
                acc[day] = { sentiment: 0, count: 0 };
            }
            acc[day].sentiment += curr.sentiment;
            acc[day].count += 1;
            return acc;
        }, {} as Record<string, { sentiment: number; count: number }>);

        const sentimentOverTime = Object.entries(dailySentiment).map(([date, { sentiment, count }]) => ({
            date,
            sentiment: parseFloat((sentiment / count).toFixed(2)),
        }));

        // Process emotion data
        const emotionCounts: Record<string, number> = {};
        voiceEvents.forEach(event => {
            const emotion = event.emotion.charAt(0).toUpperCase() + event.emotion.slice(1);
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
        dreams.forEach(dream => {
            dream.emotions.forEach(emotionRaw => {
                const emotion = emotionRaw.charAt(0).toUpperCase() + emotionRaw.slice(1);
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
            });
        });

        const emotionBreakdown = Object.entries(emotionCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Stats
        const stats = {
            totalMemories: voiceEvents.length,
            totalDreams: dreams.length,
            totalPeople: peopleSnapshot.size,
        };
        
        const dashboardData: DashboardData = {
            sentimentOverTime,
            emotionBreakdown,
            stats,
        };
        
        const validatedData = DashboardDataSchema.safeParse(dashboardData);
        if (!validatedData.success) {
            console.error("Dashboard data validation error:", validatedData.error);
            return { data: null, error: "Failed to validate dashboard data." };
        }

        return { data: validatedData.data, error: null };
    } catch (e) {
        console.error("Failed to get dashboard data:", e);
        return { data: null, error: "An error occurred while fetching dashboard data." };
    }
}


type CompanionChatReturn = {
    response: string | null;
    error: string | null;
};

export async function companionChatAction(input: CompanionChatInput): Promise<CompanionChatReturn> {
    const validatedFields = CompanionChatInputSchema.safeParse(input);

    if (!validatedFields.success) {
        return { response: null, error: "Invalid input." };
    }

    try {
        const result = await companionChat(validatedFields.data);
        if (!result?.response) {
            return { response: null, error: "The AI companion failed to respond." };
        }
        return { response: result.response, error: null };
    } catch (e) {
        console.error("Companion chat action failed:", e);
        return { response: null, error: "An error occurred while talking to the companion." };
    }
}

type SuggestRitualReturn = {
    suggestion: SuggestRitualOutput | null;
    error: string | null;
}

export async function suggestRitualAction(input: z.infer<typeof SuggestRitualInputSchema>): Promise<SuggestRitualReturn> {
    const validatedFields = SuggestRitualInputSchema.safeParse(input);
    if (!validatedFields.success) {
        return { suggestion: null, error: "Invalid input." };
    }
    
    try {
        const result = await suggestRitual(validatedFields.data);
        if (!result) {
             return { suggestion: null, error: "Could not generate a suggestion at this time." };
        }
        return { suggestion: result, error: null };
    } catch (e) {
        console.error("Suggest ritual action failed:", e);
        return { suggestion: null, error: "An error occurred while generating a suggestion." };
    }
}

const processOnboardingVoiceSchema = z.object({
    audioDataUri: z.string().min(1, "Audio data cannot be empty."),
});

type ProcessOnboardingVoiceInput = z.infer<typeof processOnboardingVoiceSchema>;

type ProcessOnboardingReturn = {
    transcript: string | null;
    analysis: ProcessOnboardingTranscriptOutput | null;
    error: string | null;
};

export async function processOnboardingVoiceAction(input: ProcessOnboardingVoiceInput): Promise<ProcessOnboardingReturn> {
    const validatedFields = processOnboardingVoiceSchema.safeParse(input);
    if (!validatedFields.success) {
        return { transcript: null, analysis: null, error: "Invalid input." };
    }

    const { audioDataUri } = validatedFields.data;

    try {
        const { transcript } = await transcribeAudio({ audioDataUri });
        if (!transcript) {
            return { transcript: null, analysis: null, error: "Failed to transcribe audio." };
        }
        
        const analysis = await processOnboardingTranscript({ transcript });
        
        // Return the transcript and analysis to the client for DB operations
        return { transcript, analysis, error: null };

    } catch (e) {
        console.error("Error during onboarding AI processing:", e);
        const firebaseError = e as {code?: string, message: string};
        const errorMessage = firebaseError.message || "An unknown error occurred during AI processing.";
        return { transcript: null, analysis: null, error: `Onboarding processing failed. Reason: ${errorMessage}` };
    }
}


export async function analyzeAndLogCameraFrameAction(
    input: { userId: string, imageDataUri: string }
): Promise<{ success: boolean; error?: string }> {
    if (!input.userId) {
        return { success: false, error: "User not authenticated." };
    }

    try {
        const analysis = await analyzeCameraImage({ imageDataUri: input.imageDataUri });
        if (!analysis) {
            throw new Error('Image analysis failed to return data.');
        }

        const insight = await generateSymbolicInsight({ analysis: JSON.stringify(analysis, null, 2) });
        if (!insight) {
            throw new Error('Symbolic insight generation failed.');
        }
        
        const primaryEmotion = Object.keys(analysis.emotionInference).reduce((a, b) => 
            analysis.emotionInference[a] > analysis.emotionInference[b] ? a : b, 'neutral'
        );

        const batch = writeBatch(db);

        // 1. Log the mood
        const moodLogRef = doc(collection(db, `users/${input.userId}/moodLogs`));
        const moodLog: MoodLog = MoodLogSchema.parse({
            timestamp: Date.now(),
            emotion: primaryEmotion,
            intensity: analysis.emotionInference[primaryEmotion] * 100,
            source: 'camera_passive'
        });
        batch.set(moodLogRef, moodLog);

        // 2. Update the aura state
        const auraStateRef = doc(db, `users/${input.userId}/auraStates/current`);
        const auraState: AuraState = AuraStateSchema.parse({
            currentEmotion: primaryEmotion,
            overlayColor: analysis.dominantColor,
            overlayStyle: insight.symbolAnimationTrigger === 'aura_shift' ? 'glow' : (insight.symbolAnimationTrigger || 'none'),
            lastUpdated: Date.now()
        });
        batch.set(auraStateRef, auraState, { merge: true });

        await batch.commit();

        return { success: true };

    } catch (e) {
        console.error("Failed to analyze and log camera frame:", e);
        return { success: false, error: (e as Error).message };
    }
}
