'use server';
/**
 * @fileOverview A flow to summarize a collection of text entries.
 *
 * - summarizeText - A function that takes a block of text and returns a summary.
 * - SummarizeTextInput - The input type for the function.
 * - SummarizeTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { 
    SummarizeTextInputSchema,
    SummarizeTextOutputSchema,
    type SummarizeTextInput,
    type SummarizeTextOutput
} from '@/lib/types';

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput | null> {
  return summarizeTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `You are an expert at synthesizing information and finding patterns in journal entries.
Analyze the following collection of thoughts and experiences.

Based on the text provided, generate a concise summary that includes:
1.  The primary themes or recurring topics.
2.  Any significant events or key moments mentioned.
3.  The overall mood or emotional tone of the period.

Present the output as a coherent narrative summary.

Entries:
{{{text}}}
`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to summarize text');
    }
    return output;
  }
);
