import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Route for translation
  app.post("/api/translate", async (req, res) => {
    const { text, targetLanguage } = req.body;
    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment, falling back to mock");
      // Fallback simple simulation so it doesn't fail
      const mockTranslation = `[Traducción al ${targetLanguage}]: ${text}`;
      return res.json({ translatedText: mockTranslation });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Traduce exactamente el siguiente texto de un post de redes sociales al idioma "${targetLanguage}". Conserva el tono, formato, hashtags, saltos de línea y emojis si los hay. No añadas introducciones ni explicaciones de ningún tipo, solo devuelve la traducción directa:\n\n${text}`,
      });

      res.json({ translatedText: response.text });
    } catch (error: any) {
      console.error("Gemini Translation Error:", error);
      res.status(500).json({ error: error.message || "Error al realizar la traducción" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
