// Import the functions you need from the SDKs you need
import * as admin from "firebase-admin";
import cors from "cors";

// import the Genkit and Google AI plugin libraries
import {gemini15Flash, googleAI} from "@genkit-ai/googleai";
import {genkit, defineFlow, generate} from "genkit";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Genkit
genkit({
  plugins: [googleAI()],
  model: gemini15Flash, // set default model
});

const helloFlow = defineFlow("helloFlow", async (name) => {
  // make a generation request
  const {text} = await generate({
    prompt: `Hello Gemini, my name is ${name}`,
    model: gemini15Flash, // explicitly use the model defined in genkit init
  });
  console.log(text);
  return {response: text}; // Return the generated text
});

// Expose the helloFlow as an HTTPS callable function
export const hello = functions.https.onRequest((request, response) => {
  // Enable CORS for all origins
  cors({origin: true})(request, response, async () => {
    try {
      // Ensure the request method is POST
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      // Get the name from the request body
      const name = request.body.name;

      if (!name) {
        return response.status(400).send("Name parameter is required.");
      }

      // Call the Genkit flow
      const result = await helloFlow(name);

      // Send the response back
      response.status(200).json(result);
    } catch (error) {
      console.error("Error calling helloFlow:", error);
      response.status(500).send("Internal Server Error");
    }
  });
});
