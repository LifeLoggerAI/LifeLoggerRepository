
'use server';
/**
 * @fileOverview Generates a symbolic insight from a camera image analysis.
 *
 * - generateSymbolicInsight - A function that creates a reflection from image analysis.
 * - GenerateSymbolicInsightInput - The input type for the function.
 * - GenerateSymbolicInsightOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateSymbolicInsightInputSchema,
  GenerateSymbolicInsightOutputSchema,
  type GenerateSymbolicInsightInput,
  type GenerateSymbolicInsightOutput,
} from '@/lib/types';

export async function generateSymbolicInsight(input: GenerateSymbolicInsightInput): Promise<GenerateSymbolicInsightOutput | null> {
  return generateSymbolicInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSymbolicInsightPrompt',
  input: {schema: GenerateSymbolicInsightInputSchema},
  output: {schema: GenerateSymbolicInsightOutputSchema},
  prompt: `You are an AI companion that generates symbolic insights. Based on the analysis of an image from a user's life, generate a narrator reflection and determine if a visual effect should be triggered.

Image Analysis:
{{{analysis}}}

1.  **narratorReflection**: Write a short, insightful, and empathetic reflection for the user based on the analysis.
2.  **symbolAnimationTrigger**: Based on the analysis, suggest a symbolic animation trigger. Possible values are "aura_shift", "fog", "memory_bloom", or "none".`,
});

const generateSymbolicInsightFlow = ai.defineFlow(
  {
    name: 'generateSymbolicInsightFlow',
    inputSchema: GenerateSymbolicInsightInputSchema,
    outputSchema: GenerateSymbolicInsightOutputSchema,
  },
  async (input) => {
    // Stringify the analysis object to pass it into the prompt context
    const analysisStr = JSON.stringify(input.analysis, null, 2);
    const {output} = await prompt({ analysis: analysisStr });
    if (!output) {
      throw new Error('Failed to generate symbolic insight');
    }
    return output;
  }
);
