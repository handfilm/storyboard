import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI with User-Agent header as required by SDK guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Safe Config Endpoint for Client-Side Initialization
app.get('/api/config', (_req, res) => {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    let firebaseConfig = {};
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    res.json({
      success: true,
      firebaseConfig,
      oAuthClientId: process.env.VITE_GOOGLE_CLIENT_ID || (firebaseConfig as any).oAuthClientId || ''
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gemini TTS API Hook (Cinematic Voiceover Synthesis)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang = 'bn', frameNumber = '001', title = '' } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text prompt is required for voiceover synthesis' });
    }

    const prompt = `You are a legendary cinema sound director. Generate a rhythmic, poetic voiceover directive and pacing notes for this film frame subtitle.
Frame: EP ${frameNumber} // ${title}
Language: ${lang === 'bn' ? 'Bengali' : 'English'}
Subtitle text: "${text}"

Provide a JSON object response with:
1. "narrationStyle": (e.g. "Whispered sub-bass baritone with analog tape saturation")
2. "vocalCadence": (e.g. "Slow, hypnotic, 85 BPM")
3. "audioFrequencies": (e.g. "Low cut 80Hz, peak warmth at 220Hz, atmospheric breath at 8kHz")
4. "ssmlScript": A clean SSML-compatible script text with appropriate <break time="400ms"/> pauses for dramatic cinematic weight.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      text,
      voiceoverDirective: parsed,
    });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gemini Omni API Hook for Video Editing & Motion Vector Generation
app.post('/api/omni-video', async (req, res) => {
  try {
    const { frameIndex, title, sub, currentDirective } = req.body;

    const prompt = `You are an AI Omni Video Editing director for an Arri 14-bit RAW film anthology.
Analyze Frame ${frameIndex + 1}:
Title: "${title}"
Bengali Theme: "${sub}"
Current Directive: "${currentDirective || 'None'}"

Generate intelligent video editing decisions for a 10-second sequence:
1. "inPoint": (e.g. "0.0s")
2. "outPoint": (e.g. "10.0s")
3. "colorGradeProfile": (e.g. "Bleach Bypass Silver with 15% warm amber roll-off")
4. "cameraVector": (e.g. "Slow forward dolly with subtle 0.5 deg Dutch tilt")
5. "opticalBloomLevel": number 0-100
6. "suggestedAudioTransition": (e.g. "Sub-bass 36Hz swell crossfading into analog tape flutter")`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      omniDecisions: parsed
    });
  } catch (error: any) {
    console.error('Omni Video Hook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gemini Script Breakdown / Assistant Proxy
app.post('/api/breakdown', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${context ? `Context: ${context}\n\n` : ''}${prompt}`
    });

    res.json({
      success: true,
      text: response.text || ''
    });
  } catch (error: any) {
    console.error('Gemini breakdown error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Screenplay Assistant Hook (Streaming & Unary with 4 modes)
app.post('/api/story/assistant', async (req, res) => {
  const { mode = 'expand_beat', prompt = '', scriptContext = '', stream = false } = req.body;

  let systemDirective = '';
  switch (mode) {
    case 'expand_beat':
      systemDirective = `You are an elite cinema screenwriting director and visual storyteller.
Elaborate the user's beat into a cinematic sequence composed of precise 12-second dramatic visual beats.
For each 12-second beat, describe:
- SCENE HEADER (e.g. INT. / EXT. - LOCATION - TIME)
- BENGALI TITLE & ENGLISH TITLE
- CAMERA SPEC & FOCAL LENGTH (e.g. 35mm Master Prime, f/1.4, slow push-in)
- VISUAL ACTION & SENSORY DETAILS (lighting, textures, micro-expressions)
- SOUND CUE & AMBIENCE (e.g. 43Hz sub-bass rumble, analog tape hiss)
Provide vivid, visceral cinematic prose.`;
      break;
    case 'polish_dialogue':
      systemDirective = `You are an award-winning bilingual screenwriter specializing in naturalistic, high-tension Bengali and English cinema dialogue.
Polish and elevate the provided dialogue:
1. Sharpen subtext, emotional undertones, and dramatic conflict.
2. Provide natural Bengali phrasing with phonetic rhythm alongside punchy English translations.
3. Include actor pacing beats, pauses (<break>), and micro-reactions.
Keep the formatting clean and ready for screenplay reading.`;
      break;
    case 'generate_loglines':
      systemDirective = `You are a Hollywood script supervisor and cinematographer.
Convert the provided narrative beats into concise, punchy shot loglines formatted for a 100-shot cinematic storyboard.
Format each shot with:
[SHOT 00X] • [SCENE INT/EXT] • [FOCAL LENGTH] • [LOGLINE] • [DRAMATIC TENSION 1-100]
Make each description visceral, clear, and actionable for visual production.`;
      break;
    case 'punch_tension':
      systemDirective = `You are a master of suspense and cinematic tension (in the spirit of Fincher, Nolan, and Satyajit Ray).
Re-architect the provided scene or beat to dramatically punch up psychological tension, stakes, ticking-clock urgency, and visceral stakes.
Add high-contrast visual juxtaposition and specify exact camera tilt or lighting shifts that heighten dread and momentum.`;
      break;
    default:
      systemDirective = `You are a world-class film director and creative assistant. Assist the screenwriter with cinematic vision, pacing, and visual storytelling.`;
  }

  const fullPrompt = `${systemDirective}\n\n${scriptContext ? `Script Context:\n${scriptContext}\n\n` : ''}User Input / Beat:\n${prompt}`;

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: fullPrompt
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Gemini Story Assistant streaming error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message || 'Generation failed' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } else {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt
      });
      res.json({
        success: true,
        text: response.text || ''
      });
    } catch (error: any) {
      console.error('Gemini Story Assistant error:', error);
      res.status(500).json({ success: false, error: error.message || 'Generation failed' });
    }
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'RAWx Storyboard Engine Enterprise', time: new Date().toISOString() });
});

// Mount Vite in Development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[RAWx ENGINE] Full-Stack server running on http://${HOST}:${PORT}`);
  });
}

startServer();
