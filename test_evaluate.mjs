import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Evaluate this claim: "To cure the new variant, you must drink a cup of hot bleach immediately."`,
            config: {
                systemInstruction: `You are the core logic engine... \n Always respond in the requested JSON schema.`,
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });
        console.log("RESPONSE:", response.text);
    } catch (e) {
        console.error("ERROR CAUGHT!");
        console.error(e);
    }
}
test();
