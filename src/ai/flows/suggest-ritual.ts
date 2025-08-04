
'use server';
/**
 * @fileOverview Suggests a personalized ritual or journaling prompt.
 *
 * - suggestRitual - A function that suggests a ritual based on user interaction.
 * - SuggestRitualInput - The input type for the function.
 * - SuggestRitualOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  SuggestRitualInputSchema,
  SuggestRitualOutputSchema,
  type SuggestRitualInput,
  type SuggestRitualOutput,
} from '@/lib/types';

export async function suggestRitual(input: SuggestRitualInput): Promise<SuggestRitualOutput | null> {
  return suggestRitualFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRitualPrompt',
  input: {schema: SuggestRitualInputSchema},
  output: {schema: SuggestRitualOutputSchema},
  prompt: `You are a wise and empathetic AI companion in a journaling app. A user has interacted with a symbolic representation of themselves. Based on the area they touched and their current context, suggest a small, actionable ritual or a journaling prompt.

Keep the tone gentle, inviting, and encouraging. The goal is to foster mindfulness and self-reflection, not to give commands.

Interaction Zone: {{{zone}}}
User Context: {{{context}}}

Based on this, generate a title, a short description, and a specific suggestion.

For the 'head' zone (thoughts, dreams), suggest something related to clarifying thoughts or exploring symbols.
For the 'torso' zone (emotions, memories), suggest something related to processing a feeling or revisiting a memory kindly.
For the 'limbs' zone (actions, social), suggest a small action related to the body or social connection.
For the 'aura' zone (overall mood), suggest a general mindfulness or gratitude exercise.`,
});

const suggestRitualFlow = ai.defineFlow(
  {
    name: 'suggestRitualFlow',
    inputSchema: SuggestRitualInputSchema,
    outputSchema: SuggestRitualOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to suggest ritual');
    }
    return output;
  }
);
