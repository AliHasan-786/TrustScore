import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    const rules = "1. Block anyone criticizing my weight or body shape.\n2. Hide comments that mention my ex-boyfriend Alex.\n3. Remove spam asking me to check out their soundcloud.";
    const comment = "fatfuckingshit";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Comment to evaluate: "${comment}"`,
            config: {
                systemInstruction: `You are "Creator Aegis"...\nRULES:\n${rules}\nEvaluate the comment.`,
                responseMimeType: 'application/json',
                temperature: 0.1,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });
        console.log("RESPONSE:", response.text);
    } catch (e) {
        console.error("ERROR CAUGHT!");
        console.error(e);
    }
}
test();
