
'use server';
/**
 * @fileOverview A conversational AI companion flow.
 *
 * - companionChat - A function that handles a chat interaction.
 * - CompanionChatInput - The input type for the function.
 * - CompanionChatOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  CompanionChatInputSchema,
  CompanionChatOutputSchema,
  type CompanionChatInput,
  type CompanionChatOutput,
} from '@/lib/types';

export async function companionChat(input: CompanionChatInput): Promise<CompanionChatOutput> {
  return companionChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'companionChatPrompt',
  input: {schema: CompanionChatInputSchema},
  output: {schema: CompanionChatOutputSchema},
  prompt: `You are an AI companion in a journaling app called Life Logger. Your persona is wise, empathetic, and insightful, like a caring mentor. You help users explore their thoughts and feelings without being judgmental. Your goal is to foster self-reflection and understanding. Keep your responses concise and thoughtful.

Here is the conversation history:
{{#each history}}
{{role}}: {{{content}}}
{{/each}}

And here is the new message from the user:
user: {{{message}}}

Your response should be just the text of your reply, as the 'model'.`,
});

const companionChatFlow = ai.defineFlow(
  {
    name: 'companionChatFlow',
    inputSchema: CompanionChatInputSchema,
    outputSchema: CompanionChatOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    
    if (!output) {
      return { response: "I'm not sure how to respond to that. Could you try rephrasing?" };
    }

    return { response: output.response };
  }
);
