import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, targetLanguage } = req.body ?? {};
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found in environment, falling back to mock');
    const mockTranslation = `[Traducción al ${targetLanguage}]: ${text}`;
    return res.json({ translatedText: mockTranslation });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Traduce exactamente el siguiente texto de un post de redes sociales al idioma "${targetLanguage}". Conserva el tono, formato, hashtags, saltos de línea y emojis si los hay. No añadas introducciones ni explicaciones de ningún tipo, solo devuelve la traducción directa:\n\n${text}`,
    });

    res.json({ translatedText: response.text });
  } catch (error: any) {
    console.error('Gemini Translation Error:', error);
    res.status(500).json({ error: error.message || 'Error al realizar la traducción' });
  }
}
