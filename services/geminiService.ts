import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Language, Message } from "../types";

// We instantiate GoogleGenAI inside functions to ensure we use the most up-to-date environment variables
// and follow the best practices for transient clients in the Gemini 3 ecosystem.

export interface GuidanceResult {
  text: string;
  isRedFlag: boolean;
}

export async function getHealthGuidance(
  prompt: string, 
  language: Language, 
  history: Message[],
  useThinking: boolean = false,
  imagePart?: { inlineData: { data: string; mimeType: string } }
): Promise<GuidanceResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Use gemini-3-pro-preview for complex reasoning (thinking) or multimodal analysis
    // Use gemini-3-flash-preview for standard lightning-fast Q&A
    const modelName = (useThinking || imagePart) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    // Gemini multi-turn contents MUST start with a 'user' role.
    // We filter the history to ensure the sequence is valid (user -> model -> user ...).
    const historyParts = history.map(m => ({ 
      role: m.role === 'assistant' ? 'model' as const : 'user' as const, 
      parts: [{ text: m.content }] 
    }));

    let validHistory = historyParts;
    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory.shift();
    }

    const contents = [
      ...validHistory.slice(-6), // Keep context window manageable
      { 
        role: 'user', 
        parts: imagePart ? [imagePart.inlineData, { text: prompt }] : [{ text: prompt }] 
      }
    ];

    const config: any = {
      systemInstruction: `
        You are "AI Doctor India", a high-tech medical assistant for Indian citizens.
        Respond in: ${language}.
        
        CRITICAL SAFETY PROTOCOLS:
        1. NO DOSAGES: Never recommend specific drug dosages.
        2. RED FLAGS: If symptoms suggest a life-threatening emergency (e.g., severe chest pain, sudden paralysis, heavy bleeding), set isRedFlag to true and prioritize advising them to call 112 immediately.
        3. LOCAL CONTEXT: Suggest common Indian home remedies (like Haldi, Tulsi, Ginger) for minor symptoms, but clarify they are supportive, not curative.
        4. IMAGE ANALYSIS: If an image is provided, describe what you observe professionally (e.g., "The image shows a red, circular rash with raised edges") and provide general possibilities, but never a final diagnosis.
        5. TONE: Be empathetic, professional, and high-tech. Keep responses concise and structured.
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "Your empathetic and professional medical guidance." },
          isRedFlag: { type: Type.BOOLEAN, description: "True if symptoms are urgent/critical." }
        },
        required: ["text", "isRedFlag"]
      }
    };

    if (useThinking && modelName === 'gemini-3-pro-preview') {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents as any,
      config: config
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Empty response from AI");

    const result = JSON.parse(textOutput.trim());
    return {
      text: result.text || "I'm sorry, I couldn't process your request. Please try again.",
      isRedFlag: !!result.isRedFlag
    };
  } catch (error) {
    console.error("Gemini Guidance Error:", error);
    return { 
      text: "Connection to my health database was interrupted. If you are feeling unwell, please visit a doctor immediately.", 
      isRedFlag: false 
    };
  }
}

export async function getSpeech(text: string, voiceName: string = 'Kore'): Promise<string | undefined> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say in a professional medical tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (err) {
    console.error("TTS Generation Error:", err);
    return undefined;
  }
}

export async function findHospitals(
  lat: number,
  lng: number,
  language: Language
): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find 3 multi-specialty hospitals or emergency clinics near me. Provide the information in ${language}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || "I found a few medical centers near your current location:";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .filter(chunk => chunk.maps)
      .map(chunk => ({
        title: chunk.maps?.title || "Hospital",
        uri: chunk.maps?.uri || "#"
      }));

    return { text, sources };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { 
      text: "I'm having trouble searching for local hospitals right now. Please call 112 or use Google Maps directly.", 
      sources: [] 
    };
  }
}

export const getLiveAPI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
