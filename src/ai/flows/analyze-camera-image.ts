
'use server';
/**
 * @fileOverview An AI flow to analyze emotions from a facial snapshot.
 *
 * - analyzeCameraImage - A function that handles the analysis of a face image.
 * - AnalyzeCameraImageInput - The input type for the function.
 * - AnalyzeCameraImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeCameraImageInputSchema,
  AnalyzeCameraImageOutputSchema,
  type AnalyzeCameraImageInput,
  type AnalyzeCameraImageOutput,
} from '@/lib/types';

export async function analyzeCameraImage(input: AnalyzeCameraImageInput): Promise<AnalyzeCameraImageOutput> {
  return analyzeCameraImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCameraImagePrompt',
  input: {schema: AnalyzeCameraImageInputSchema},
  output: {schema: AnalyzeCameraImageOutputSchema},
  prompt: `You are an expert in symbolic visual analysis. Analyze the following image captured from a user's life. Extract deep, contextual, and symbolic meaning.

Image: {{media url=imageDataUri}}

Based on the image, provide the following structured analysis:
1.  **emotionInference**: A map of detected emotions and their confidence scores (e.g., {"joy": 0.8, "sadness": 0.1}).
2.  **environmentInference**: An array of tags describing the environment (e.g., ["nature", "bedroom", "crowd", "office"]).
3.  **objectTags**: An array of significant objects recognized in the image (e.g., ["plant", "coffee", "laptop", "mirror"]).
4.  **lightLevel**: A numerical score from 0 (dark) to 1 (bright) representing the ambient light.
5.  **faceCount**: The number of faces detected in the image.
6.  **dominantColor**: The primary color of the image in hex format.
7.  **symbolicTagSummary**: A short, poetic summary of the image's symbolic meaning (e.g., "solitude and reflection", "a moment of transition", "the weight of a shadow").
8.  **cameraAngle**: The inferred angle of the camera (e.g., "eye-level", "low-angle", "high-angle", "selfie").
9.  **faceLayoutSummary**: A description of the composition of faces (e.g., "solo", "group-focused", "background-figure", "intimate-pair").
10. **backgroundMoodTags**: An array of tags describing the emotional mood of the background (e.g., ["cluttered", "serene", "stormy", "warm"]).
11. **contextualSymbolMatches**: An array of recognized symbolic fusions (e.g., ["mirror + plant = recovery", "rain + window = introspection"]).
12. **linkedArchetype**: The primary Jungian archetype that this image seems to represent (e.g., "The Seeker", "The Orphan", "The Healer", "The Trickster").`,
});

const analyzeCameraImageFlow = ai.defineFlow(
  {
    name: 'analyzeCameraImageFlow',
    inputSchema: AnalyzeCameraImageInputSchema,
    outputSchema: AnalyzeCameraImageOutputSchema,
  },
  async (input) => {
    const result = await prompt(input);
    if (!result?.output) {
      throw new Error('Failed to analyze camera image: AI prompt returned no output');
    }
    return result.output;
  }
);
