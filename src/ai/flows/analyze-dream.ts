
'use server';

/**
 * @fileOverview Analyzes dream journal entries for symbolic and emotional content.
 *
 * - analyzeDream - A function that handles the analysis of a dream transcript.
 * - AnalyzeDreamInput - The input type for the function.
 * - AnalyzeDreamOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeDreamInputSchema,
  AnalyzeDreamOutputSchema,
  type AnalyzeDreamInput,
  type AnalyzeDreamOutput,
} from '@/lib/types';

export async function analyzeDream(input: AnalyzeDreamInput): Promise<AnalyzeDreamOutput> {
  return analyzeDreamFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDreamPrompt',
  input: {schema: AnalyzeDreamInputSchema},
  output: {schema: AnalyzeDreamOutputSchema},
  prompt: `You are an expert dream analyst with knowledge of Jungian archetypes, symbolism, and emotional interpretation. Analyze the following dream entry.

Dream Entry:
{{{text}}}

Based on the dream, provide the following analysis:
1.  **Emotions**: Identify the primary emotions felt or described in the dream.
2.  **Themes**: Extract the major recurring themes or subjects.
3.  **Symbols**: List the key symbols and provide a brief, potential interpretation for each in the context of the dream.
4.  **Sentiment Score**: Provide an overall sentiment score from -1 (very negative/nightmarish) to 1 (very positive/pleasant).`,
});

const analyzeDreamFlow = ai.defineFlow(
  {
    name: 'analyzeDreamFlow',
    inputSchema: AnalyzeDreamInputSchema,
    outputSchema: AnalyzeDreamOutputSchema,
  },
  async (input) => {
    const result = await prompt(input);
    if (!result?.output) {
      throw new Error('Failed to analyze dream: AI prompt returned no output');
    }
    return result.output;
  }
);
