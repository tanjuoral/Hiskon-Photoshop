import { GoogleGenAI, Modality, Part } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const getMimeType = (base64: string): string => {
    return base64.substring("data:".length, base64.indexOf(";base64"));
}

export const editOrCreateImage = async (prompt: string, base64Images: (string | null)[]): Promise<string> => {
    const parts: Part[] = [];

    for (const image of base64Images) {
        if (image) {
            parts.push({
                inlineData: {
                    data: image.split(',')[1],
                    mimeType: getMimeType(image)
                }
            });
        }
    }
    
    parts.push({ text: prompt });

    // Ensure text is always the last part if images exist
    if (parts.length > 1 && parts[parts.length - 1].inlineData) {
        const textPart = parts.find(p => p.text);
        if(textPart) {
            const otherParts = parts.filter(p => !p.text);
            parts.splice(0, parts.length, ...otherParts, textPart);
        }
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (imagePart?.inlineData) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    throw new Error("No image data found in response.");
};

export const generateTextStream = async (prompt: string, onChunk: (chunk: string) => void) => {
    const response = await ai.models.generateContentStream({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });

    for await (const chunk of response) {
        onChunk(chunk.text);
    }
};
