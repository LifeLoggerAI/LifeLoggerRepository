'use server';

/**
 * @fileOverview Enriches a voice event transcript with AI analysis.
 *
 * - enrichVoiceEvent - A function that handles the full analysis of a voice transcript.
 * - EnrichVoiceEventInput - The input type for the function.
 * - EnrichVoiceEventOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  EnrichVoiceEventInputSchema,
  EnrichVoiceEventOutputSchema,
  type EnrichVoiceEventInput,
  type EnrichVoiceEventOutput,
} from '@/lib/types';

export async function enrichVoiceEvent(input: EnrichVoiceEventInput): Promise<EnrichVoiceEventOutput | null> {
  return enrichVoiceEventFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enrichVoiceEventPrompt',
  input: {schema: EnrichVoiceEventInputSchema},
  output: {schema: EnrichVoiceEventOutputSchema},
  prompt: `You are an expert in analyzing human conversation. Analyze the following transcript to extract key information.

Transcript:
{{{text}}}

Based on the transcript, provide the following:
1.  The primary emotion conveyed (e.g., 'joy', 'frustration', 'curiosity').
2.  An sentiment score from -1 (very negative) to 1 (very positive).
3.  A tone shift score from 0 (stable) to 1 (highly volatile).
4.  The social archetype the speaker is embodying (e.g., 'Mentor', 'Friend', 'Reporter', 'Storyteller').
5.  A list of any proper nouns that are names of people mentioned.
6.  A list of any actionable tasks or to-do items mentioned. If no tasks are found, return an empty array.`,
});

const enrichVoiceEventFlow = ai.defineFlow(
  {
    name: 'enrichVoiceEventFlow',
    inputSchema: EnrichVoiceEventInputSchema,
    outputSchema: EnrichVoiceEventOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to enrich voice event');
    }
    return output;
  }
);
