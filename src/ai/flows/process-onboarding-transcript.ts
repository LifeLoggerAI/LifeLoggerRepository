
'use server';
/**
 * @fileOverview An AI flow to process the user's voice onboarding transcript.
 *
 * - processOnboardingTranscript - A function that extracts structured data from the onboarding conversation.
 * - ProcessOnboardingTranscriptInput - The input type for the function.
 * - ProcessOnboardingTranscriptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  ProcessOnboardingTranscriptInputSchema,
  ProcessOnboardingTranscriptOutputSchema,
  type ProcessOnboardingTranscriptInput,
  type ProcessOnboardingTranscriptOutput,
} from '@/lib/types';

export async function processOnboardingTranscript(input: ProcessOnboardingTranscriptInput): Promise<ProcessOnboardingTranscriptOutput> {
  return processOnboardingTranscriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processOnboardingTranscriptPrompt',
  input: {schema: ProcessOnboardingTranscriptInputSchema},
  output: {schema: ProcessOnboardingTranscriptOutputSchema},
  prompt: `You are an expert at understanding user goals from a brief conversation. Analyze the following transcript from a new user onboarding.

Your task is to extract four key pieces of information:
1.  **Goal**: Identify the user's primary goal, dream, or aspiration. This should be a high-level objective.
2.  **Task**: Pinpoint a single, small, concrete action the user mentioned they could take towards this goal. This should be a specific, actionable first step.
3.  **Reminder Date**: Extract the date or time the user wants to be reminded. If they are vague (e.g., "next week"), calculate a specific date. Today's date is {{currentDate}}. Return the date in ISO 8601 format (YYYY-MM-DD).
4.  **Habit to Track**: Identify a recurring behavior or thing to "watch out for" that the user mentioned. This could be a positive habit to build or a negative one to avoid.

Transcript:
{{{transcript}}}
`,
});

const processOnboardingTranscriptFlow = ai.defineFlow(
  {
    name: 'processOnboardingTranscriptFlow',
    inputSchema: ProcessOnboardingTranscriptInputSchema,
    outputSchema: ProcessOnboardingTranscriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt({
        ...input,
        currentDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
    });
    return output;
  }
);
