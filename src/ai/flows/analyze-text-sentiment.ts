
'use server';

/**
 * @fileOverview Analyzes text for its sentiment score.
 *
 * - analyzeTextSentiment - A function that handles the analysis of a text string.
 * - AnalyzeTextSentimentInput - The input type for the function.
 * - AnalyzeTextSentimentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeTextSentimentInputSchema,
  AnalyzeTextSentimentOutputSchema,
  type AnalyzeTextSentimentInput,
  type AnalyzeTextSentimentOutput,
} from '@/lib/types';

export async function analyzeTextSentiment(input: AnalyzeTextSentimentInput): Promise<AnalyzeTextSentimentOutput> {
  return analyzeTextSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTextSentimentPrompt',
  input: {schema: AnalyzeTextSentimentInputSchema},
  output: {schema: AnalyzeTextSentimentOutputSchema},
  prompt: `You are an expert in sentiment analysis. Analyze the following text entry and provide a sentiment score.

Text Entry:
{{{text}}}

Based on the text, provide the following analysis:
1.  **Sentiment Score**: Provide an overall sentiment score from -1 (very negative) to 1 (very positive).`,
});

const analyzeTextSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeTextSentimentFlow',
    inputSchema: AnalyzeTextSentimentInputSchema,
    outputSchema: AnalyzeTextSentimentOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output;
  }
);
