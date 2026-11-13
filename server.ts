import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createLocalVideoRangeMiddleware } from './src/server/localVideoRangeServer.ts';
import { createLicenseSecurityModule } from './src/server/securityAndLicense.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIdx = process.argv.indexOf('--port');
const eqPortArg = process.argv.find((arg) => arg.startsWith('--port='));
const cliPort = portArgIdx !== -1
  ? Number(process.argv[portArgIdx + 1])
  : eqPortArg
    ? Number(eqPortArg.slice('--port='.length))
    : process.env.DEFAULT_APP_PORT
      ? Number(process.env.DEFAULT_APP_PORT)
      : process.env.NODE_ENV === 'production' && process.env.PORT && process.env.PORT !== process.env.NGINX_PORT
        ? Number(process.env.PORT)
        : 3000;
const PORT = Number.isFinite(cliPort) && cliPort > 0 ? cliPort : 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '120mb' }));

// Security Headers, CSP, HMAC-SHA256 Licensing, 30-Day Trial & Rate Limiting
const licenseSecurity = createLicenseSecurityModule(__dirname);
app.use(licenseSecurity.securityHeadersMiddleware);
licenseSecurity.registerRoutes(app);

const aiRateLimiter = licenseSecurity.createRateLimiter({
  bucketName: 'ai',
  windowMs: 60_000,
  maxRequests: 25
});

// Lazy-initialize Google GenAI strictly from server-side process.env.GEMINI_API_KEY
let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string = '';

function getServerGeminiKey(): { key: string; isBearer: boolean } {
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const isBearer = /^AQ\./i.test(envKey) || /^ya29\./i.test(envKey);
  return { key: envKey, isBearer };
}

function getConfiguredGeminiKey(): string {
  return getServerGeminiKey().key;
}

function getAiClient(): GoogleGenAI {
  const { key: apiKey, isBearer } = getServerGeminiKey();
  const cacheTag = `${isBearer ? 'bearer' : 'key'}:${apiKey}`;
  if (!cachedAiClient || cachedApiKey !== cacheTag) {
    cachedApiKey = cacheTag;
    cachedAiClient = new GoogleGenAI({
      apiKey: isBearer ? 'oauth-bearer' : apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
          ...(isBearer ? { Authorization: `Bearer ${apiKey}` } : {})
        }
      }
    });
  }
  return cachedAiClient;
}

function parseGeminiHttpError(error: any, fallbackMessage: string): { status: number; code: string; error: string } {
  if (!getConfiguredGeminiKey()) {
    return {
      status: 503,
      code: 'KEY_REQUIRED',
      error: 'Server GEMINI_API_KEY is missing. Configure GEMINI_API_KEY in server environment secrets.'
    };
  }
  const rawMessage = String(error?.status?.message || error?.error?.message || error?.message || fallbackMessage || 'AI request failed');
  const rawStatus = Number(error?.status?.code || error?.status || error?.statusCode || error?.response?.status);
  if (rawStatus === 401 || rawStatus === 403 || /API_KEY_INVALID|permission denied|unauthenticated|forbidden/i.test(rawMessage)) {
    return {
      status: rawStatus === 401 ? 401 : 403,
      code: 'AUTH_ERROR',
      error: `Gemini API auth failed (${rawStatus || 403}): ${rawMessage}`
    };
  }
  if (rawStatus === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMessage)) {
    return {
      status: 429,
      code: 'QUOTA_EXCEEDED',
      error: `Gemini API quota or rate limit reached (429): ${rawMessage}`
    };
  }
  if (rawStatus === 400 || /INVALID_ARGUMENT/i.test(rawMessage)) {
    return {
      status: 400,
      code: 'INVALID_ARGUMENT',
      error: rawMessage
    };
  }
  return {
    status: Number.isFinite(rawStatus) && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500,
    code: 'ENGINE_ERROR',
    error: rawMessage
  };
}

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
app.post('/api/tts', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
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

    const response = await getAiClient().models.generateContent({
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
app.post('/api/omni-video', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
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

    const response = await getAiClient().models.generateContent({
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
app.post('/api/breakdown', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    const safePrompt = prompt.trim().slice(0, 4000);
    const safeContext = typeof context === 'string' ? context.trim().slice(0, 4000) : '';

    const response = await getAiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${safeContext ? `Context: ${safeContext}\n\n` : ''}${safePrompt}`
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
app.post('/api/story/assistant', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
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
      const responseStream = await getAiClient().models.generateContentStream({
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
      const response = await getAiClient().models.generateContent({
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

// 0. Server-Side Gemini Engine Readiness Status & Config (Never exposes secret key material)
function buildAiConfigPayload() {
  const hasServerKey = getConfiguredGeminiKey().length > 0;
  return {
    success: true,
    connected: hasServerKey,
    hasServerKey,
    models: {
      imageFast: 'gemini-2.5-flash-image',
      imageFallback: 'imagen-3.0-generate-002',
      imagePro: 'gemini-nano-banana-2.1',
      videoFlow: 'veo-2.0-generate-001'
    }
  };
}

app.get('/api/ai/status', (_req, res) => {
  res.json(buildAiConfigPayload());
});

app.get('/api/ai-config', (_req, res) => {
  res.json(buildAiConfigPayload());
});

app.get('/api/ai-key', (_req, res) => {
  res.json(buildAiConfigPayload());
});

function resolveImageAspectRatio(aspectRatio: string | undefined, allowExtended: boolean): { aspect: string; isAnamorphicScope: boolean } {
  const raw = String(aspectRatio || '16:9').trim();
  if (raw === '9:16') return { aspect: '9:16', isAnamorphicScope: false };
  if (raw === '1:1') return { aspect: '1:1', isAnamorphicScope: false };
  if (raw === '4:3') return { aspect: '4:3', isAnamorphicScope: false };
  if (raw === '3:4') return { aspect: '3:4', isAnamorphicScope: false };
  if (raw === '2.39:1' || raw === '21:9') {
    return { aspect: allowExtended ? '21:9' : '16:9', isAnamorphicScope: true };
  }
  return { aspect: '16:9', isAnamorphicScope: false };
}

function extractImageFromGenerateContentResponse(response: any): string {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${part.inlineData.data}`;
    }
  }
  return '';
}

// 1. Image Creation & Img2Img Reference Conditioning with Dual-Model Fallback Chain:
//    Primary: gemini-2.5-flash-image (or requested tier -> gemini-2.5-flash-image) via generateContent(responseModalities: ['IMAGE'])
//    Fallback: imagen-3.0-generate-002 via generateImages
const handleGenerateImage: express.RequestHandler = async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in server secrets.'
      });
    }

    const {
      prompt,
      aspectRatio = '16:9',
      model = 'gemini-2.5-flash-image',
      imageSize = '1K',
      referenceImageBase64,
      referenceMimeType = 'image/png'
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, code: 'INVALID_ARGUMENT', error: 'Prompt is required' });
    }
    const cleanPrompt = prompt.trim().slice(0, 4000);

    const requestedModel = String(model || 'gemini-2.5-flash-image').trim();
    const isProTier = requestedModel === 'gemini-nano-banana-2.1';
    const { aspect, isAnamorphicScope } = resolveImageAspectRatio(aspectRatio, isProTier);
    const imagenAspect = aspect === '21:9' ? '16:9' : aspect;
    const validSize = isProTier && ['512', '1K', '2K', '4K'].includes(String(imageSize)) ? String(imageSize) : '1K';

    const enhancedPrompt = isAnamorphicScope && aspect !== '21:9'
      ? `${cleanPrompt}. Frame composition for 2.39:1 anamorphic cinema scope widescreen.`
      : cleanPrompt;

    const parts: any[] = [];
    if (referenceImageBase64 && typeof referenceImageBase64 === 'string') {
      const cleanRef = referenceImageBase64.replace(/^data:[^;]+;base64,/, '');
      if (cleanRef.length > 0) {
        parts.push({
          inlineData: {
            data: cleanRef,
            mimeType: referenceMimeType || 'image/png'
          }
        });
      }
    }
    parts.push({ text: enhancedPrompt });

    const ai = getAiClient();
    const primaryCandidates = Array.from(
      new Set(
        isProTier
          ? ['gemini-nano-banana-2.1', 'gemini-2.5-flash-image']
          : requestedModel === 'gemini-3.1-flash-lite-image'
            ? ['gemini-2.5-flash-image', 'gemini-3.1-flash-lite-image']
            : ['gemini-2.5-flash-image']
      )
    );

    let lastError: any = null;
    for (const candidateModel of primaryCandidates) {
      try {
        const useProConfig = candidateModel === 'gemini-nano-banana-2.1';
        const imageConfig: Record<string, string> = {
          aspectRatio: useProConfig ? aspect : imagenAspect
        };
        if (useProConfig) {
          imageConfig.imageSize = validSize;
        }
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents: { parts },
          config: {
            responseModalities: [Modality.IMAGE],
            imageConfig
          }
        });
        const imageUrl = extractImageFromGenerateContentResponse(response);
        if (imageUrl) {
          return res.json({
            success: true,
            imageUrl,
            model: candidateModel,
            aspectRatio: imageConfig.aspectRatio
          });
        }
        lastError = new Error(`Model ${candidateModel} returned no inline image parts.`);
      } catch (err: any) {
        lastError = err;
      }
    }

    // Fallback: imagen-3.0-generate-002
    try {
      const imagenRes = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: imagenAspect
        }
      });
      const imgObj = imagenRes?.generatedImages?.[0]?.image;
      if (imgObj?.imageBytes) {
        const mimeType = imgObj.mimeType || 'image/png';
        return res.json({
          success: true,
          imageUrl: `data:${mimeType};base64,${imgObj.imageBytes}`,
          model: 'imagen-3.0-generate-002',
          aspectRatio: imagenAspect
        });
      }
      lastError = new Error('imagen-3.0-generate-002 returned an empty generatedImages array.');
    } catch (imagenErr: any) {
      lastError = imagenErr || lastError;
    }

    const parsed = parseGeminiHttpError(lastError, 'Image generation failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  } catch (error: any) {
    console.error('Image generation error:', error);
    const parsed = parseGeminiHttpError(error, 'Image generation failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
};

app.post('/api/ai/image/generate', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateImage);
app.post('/api/ai/generate-image', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateImage);

// 2. Image Editing / Continuation (gemini-2.5-flash-image / gemini-nano-banana-2.1)
app.post('/api/ai/image/edit', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in server secrets.'
      });
    }

    const {
      imageBase64,
      mimeType = 'image/png',
      editPrompt,
      model = 'gemini-2.5-flash-image',
      aspectRatio = '16:9'
    } = req.body || {};

    if (!imageBase64 || !editPrompt) {
      return res.status(400).json({ success: false, code: 'INVALID_ARGUMENT', error: 'Both imageBase64 and editPrompt are required' });
    }

    const cleanData = String(imageBase64).replace(/^data:[^;]+;base64,/, '');
    const selectedModel = model === 'gemini-nano-banana-2.1'
      ? 'gemini-nano-banana-2.1'
      : 'gemini-2.5-flash-image';
    const { aspect } = resolveImageAspectRatio(aspectRatio, selectedModel === 'gemini-nano-banana-2.1');

    const response = await getAiClient().models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanData,
              mimeType
            }
          },
          {
            text: String(editPrompt).slice(0, 4000)
          }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          aspectRatio: aspect
        }
      }
    });

    const imageUrl = extractImageFromGenerateContentResponse(response);
    if (!imageUrl) {
      return res.status(500).json({ success: false, code: 'EMPTY_OUTPUT', error: 'Model did not return an edited image.' });
    }

    res.json({ success: true, imageUrl, model: selectedModel });
  } catch (error: any) {
    console.error('Image edit error:', error);
    const parsed = parseGeminiHttpError(error, 'Image edit failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

function extractVideoFromInteraction(interaction: any): { videoUrl: string; mimeType: string } {
  const videoPart = interaction?.output_video;
  if (videoPart?.data) {
    const mimeType = videoPart.mime_type || 'video/mp4';
    return { videoUrl: `data:${mimeType};base64,${videoPart.data}`, mimeType };
  }
  if (videoPart?.uri) {
    return { videoUrl: String(videoPart.uri), mimeType: videoPart.mime_type || 'video/mp4' };
  }
  for (const step of interaction?.steps || []) {
    if (step?.type === 'model_output') {
      const contentVideo = step.content?.find((c: any) => c.type === 'video');
      if (contentVideo?.data) {
        const mimeType = contentVideo.mime_type || 'video/mp4';
        return { videoUrl: `data:${mimeType};base64,${contentVideo.data}`, mimeType };
      }
      if (contentVideo?.uri) {
        return { videoUrl: String(contentVideo.uri), mimeType: contentVideo.mime_type || 'video/mp4' };
      }
    }
  }
  return { videoUrl: '', mimeType: 'video/mp4' };
}

const veoOperationsMap = new Map<string, any>();
const veoCompletedVideoUriMap = new Map<string, { uri: string; mimeType: string; bytesBase64?: string }>();

// 3A. Google Flow / Veo Motion Async Start (veo-2.0-generate-001 -> fallback gemini-omni-1.2-flash)
const handleGenerateVideo: express.RequestHandler = async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in server secrets.'
      });
    }

    const {
      prompt = '',
      startFrameBase64,
      startFrameMimeType = 'image/png',
      endFrameBase64,
      endFrameMimeType = 'image/png',
      aspectRatio = '16:9',
      durationSec = 5,
      cameraMovement = 'Dolly Push-In',
      motionIntensity = 'Cinematic',
      seed
    } = req.body || {};

    if (!String(prompt).trim() && !startFrameBase64) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_ARGUMENT',
        error: 'Provide a motion prompt or a start frame image.'
      });
    }

    const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
    const validDuration = Number(durationSec) >= 8 ? '8s' : '5s';
    const isScope = aspectRatio === '21:9' || aspectRatio === '2.39:1';

    const motionDirectives = [
      String(prompt).trim().slice(0, 4000) || 'Subtle cinematic camera choreography and atmospheric film lighting.',
      `Camera Movement: ${String(cameraMovement).slice(0, 80)}.`,
      `Motion Intensity: ${String(motionIntensity).slice(0, 40)}.`,
      '24fps cinema cadence, rich anamorphic depth of field, temporal coherence.',
      isScope ? '2.39:1 widescreen anamorphic letterbox cinema framing.' : '',
      seed !== undefined && seed !== null && String(seed).trim() !== '' ? `Deterministic visual seed: ${String(seed).slice(0, 32)}.` : ''
    ].filter(Boolean).join(' ');

    const ai = getAiClient();
    const cleanStart = startFrameBase64 && typeof startFrameBase64 === 'string'
      ? startFrameBase64.replace(/^data:[^;]+;base64,/, '')
      : '';

    try {
      const operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: motionDirectives,
        ...(cleanStart
          ? {
              image: {
                imageBytes: cleanStart,
                mimeType: startFrameMimeType || 'image/png'
              }
            }
          : {}),
        config: {
          aspectRatio: validAspect,
          numberOfVideos: 1
        }
      });

      const opId = String(operation?.name || `veo_op_${Date.now()}`);
      veoOperationsMap.set(opId, operation);

      return res.json({
        success: true,
        interactionId: opId,
        status: operation?.done ? 'completed' : 'queued',
        model: 'veo-2.0-generate-001'
      });
    } catch (veoError: any) {
      // Fallback to Interactions API (gemini-omni-1.2-flash) if Veo model access is unavailable on this key
      const inputParts: any[] = [];
      if (cleanStart) {
        inputParts.push({
          type: 'image',
          mime_type: startFrameMimeType || 'image/png',
          data: cleanStart
        });
      }
      if (endFrameBase64 && typeof endFrameBase64 === 'string') {
        const cleanEnd = endFrameBase64.replace(/^data:[^;]+;base64,/, '');
        if (cleanEnd.length > 0) {
          inputParts.push({
            type: 'image',
            mime_type: endFrameMimeType || 'image/png',
            data: cleanEnd
          });
        }
      }
      inputParts.push({ type: 'text', text: motionDirectives });

      try {
        const interaction = await ai.interactions.create({
          model: 'gemini-omni-1.2-flash',
          input: inputParts,
          background: true,
          store: true,
          response_format: {
            type: 'video',
            aspect_ratio: validAspect,
            duration: validDuration
          }
        });
        return res.json({
          success: true,
          interactionId: interaction.id,
          status: interaction.status || 'queued',
          model: 'gemini-omni-1.2-flash'
        });
      } catch {
        throw veoError;
      }
    }
  } catch (error: any) {
    console.error('Google Flow video generation start error:', error);
    const parsed = parseGeminiHttpError(error, 'Failed to start Flow video generation');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
};

app.post('/api/ai/video/generate', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateVideo);
app.post('/api/ai/generate-video', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateVideo);

// 3B. Google Flow / Veo Motion Async Polling Endpoint
app.get('/api/ai/video/status/:id(*)', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured.'
      });
    }

    const interactionId = String(req.params.id || '').trim();
    if (!interactionId) {
      return res.status(400).json({ success: false, code: 'INVALID_ARGUMENT', error: 'interactionId is required' });
    }

    const ai = getAiClient();
    const isVeoOp = veoOperationsMap.has(interactionId) || interactionId.includes('operations/');

    if (isVeoOp) {
      const prevOp = veoOperationsMap.get(interactionId) || ({ name: interactionId } as any);
      const updatedOp = await ai.operations.getVideosOperation({ operation: prevOp });
      veoOperationsMap.set(interactionId, updatedOp);

      if (updatedOp?.error) {
        const errMsg = String((updatedOp.error as any)?.message || 'Veo generation failed');
        return res.status(500).json({
          success: false,
          status: 'failed',
          done: true,
          code: 'FLOW_FAILED',
          error: errMsg
        });
      }

      if (updatedOp?.done) {
        const genVideo = updatedOp?.response?.generatedVideos?.[0]?.video;
        if (genVideo?.videoBytes) {
          const mimeType = genVideo.mimeType || 'video/mp4';
          return res.json({
            success: true,
            status: 'completed',
            done: true,
            videoUrl: `data:${mimeType};base64,${genVideo.videoBytes}`,
            mimeType
          });
        }
        if (genVideo?.uri) {
          const tokenKey = encodeURIComponent(interactionId);
          veoCompletedVideoUriMap.set(interactionId, {
            uri: String(genVideo.uri),
            mimeType: genVideo.mimeType || 'video/mp4'
          });
          return res.json({
            success: true,
            status: 'completed',
            done: true,
            videoUrl: `/api/ai/video/blob/${tokenKey}`,
            mimeType: genVideo.mimeType || 'video/mp4'
          });
        }
        return res.status(500).json({
          success: false,
          status: 'failed',
          done: true,
          code: 'EMPTY_OUTPUT',
          error: 'Veo operation completed without returning a video file.'
        });
      }

      return res.json({
        success: true,
        status: 'in_progress',
        done: false
      });
    }

    const interaction = await ai.interactions.get(interactionId);
    const status = String(interaction?.status || 'in_progress');

    if (status === 'completed') {
      const { videoUrl, mimeType } = extractVideoFromInteraction(interaction);
      if (!videoUrl) {
        return res.status(500).json({
          success: false,
          status: 'failed',
          done: true,
          code: 'EMPTY_OUTPUT',
          error: 'Flow interaction completed without returning video frames.'
        });
      }
      return res.json({
        success: true,
        status: 'completed',
        done: true,
        videoUrl,
        mimeType
      });
    }

    if (status === 'failed' || status === 'cancelled' || status === 'incomplete' || status === 'budget_exceeded') {
      return res.status(500).json({
        success: false,
        status,
        done: true,
        code: 'FLOW_FAILED',
        error: `Google Flow video job ended with status: ${status}`
      });
    }

    res.json({
      success: true,
      status,
      done: false
    });
  } catch (error: any) {
    console.error('Google Flow video status polling error:', error);
    const parsed = parseGeminiHttpError(error, 'Failed to poll Flow video status');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

// 3B-2. Server-Proxied Veo MP4 Blob Download (keeps API key on server & avoids browser CORS)
app.get('/api/ai/video/blob/:id(*)', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const record = veoCompletedVideoUriMap.get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Video asset not found or expired' });
    }
    const { key, isBearer } = getServerGeminiKey();
    const separator = record.uri.includes('?') ? '&' : '?';
    const targetUrl = isBearer || !key ? record.uri : `${record.uri}${separator}key=${encodeURIComponent(key)}`;
    const upstream = await fetch(targetUrl, {
      headers: isBearer && key ? { Authorization: `Bearer ${key}` } : undefined
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return res.status(upstream.status).json({
        success: false,
        error: `Failed to download Veo video (${upstream.status}): ${detail || upstream.statusText}`
      });
    }
    const arrayBuffer = await upstream.arrayBuffer();
    res.setHeader('Content-Type', record.mimeType || 'video/mp4');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Veo video blob download error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to download Veo video' });
  }
});

// 3C. Cancel In-Flight Flow Video Job
app.post('/api/ai/video/cancel/:id(*)', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    const interactionId = String(req.params.id || '').trim();
    if (!interactionId) {
      return res.status(400).json({ success: false, error: 'interactionId is required' });
    }
    veoOperationsMap.delete(interactionId);
    veoCompletedVideoUriMap.delete(interactionId);
    if (getConfiguredGeminiKey() && !interactionId.includes('operations/')) {
      await getAiClient().interactions.cancel(interactionId).catch(() => null);
    }
    res.json({ success: true, status: 'cancelled' });
  } catch (error: any) {
    res.json({ success: true, status: 'cancelled', warning: error?.message });
  }
});

// 3D. Legacy Synchronous Photo Animate Hook (upgraded to gemini-omni-1.2-flash)
app.post('/api/ai/video/animate', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in server secrets.'
      });
    }
    const { imageBase64, mimeType = 'image/png', motionPrompt, aspectRatio = '16:9' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Photo is required for animation' });
    }

    const cleanData = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

    const interaction = await getAiClient().interactions.create({
      model: 'gemini-omni-1.2-flash',
      input: [
        {
          type: 'image',
          mime_type: mimeType,
          data: cleanData
        },
        {
          type: 'text',
          text: String(motionPrompt || 'Cinematic camera movement with natural atmospheric dynamics and subtle depth motion.').slice(0, 4000)
        }
      ],
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: validAspect,
        duration: '5s'
      }
    }, { timeout: 517300 });

    const { videoUrl } = extractVideoFromInteraction(interaction);
    if (!videoUrl) {
      return res.status(500).json({ success: false, error: 'Video generation failed or timed out.' });
    }

    res.json({ success: true, videoUrl });
  } catch (error: any) {
    console.error('Video animation error:', error);
    const parsed = parseGeminiHttpError(error, 'Video animation failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

// 4. Music Generation (lyria-3-clip-preview for 12s-30s soundtrack stems)
const handleGenerateMusic: express.RequestHandler = async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured.'
      });
    }
    const { prompt, durationSec = 12.0 } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required for film score generation' });
    }

    const cinematicPrompt = `Generate a cinematic film score cue lasting approx ${Math.min(30, Math.max(12, Math.round(Number(durationSec) || 12)))} seconds: ${prompt.trim().slice(0, 4000)}`;

    const stream = await getAiClient().models.generateContentStream({
      model: 'lyria-3-clip-preview',
      contents: cinematicPrompt,
      config: {
        responseModalities: [Modality.AUDIO]
      }
    });

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    for await (const chunk of stream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text && !lyrics) {
          lyrics = part.text;
        }
      }
    }

    if (!audioBase64) {
      return res.status(500).json({ success: false, error: 'Lyria model did not produce audio data' });
    }

    const audioUrl = `data:${mimeType};base64,${audioBase64}`;
    res.json({ success: true, audioUrl, lyrics });
  } catch (error: any) {
    console.error('Music generation error:', error);
    const parsed = parseGeminiHttpError(error, 'Film score generation failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
};

app.post('/api/ai/music/generate', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateMusic);

// 4B. Gemini Neural Voiceover TTS (Unary WAV generation)
const handleGenerateTts: express.RequestHandler = async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(503).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'Server GEMINI_API_KEY is not configured. Configure GEMINI_API_KEY in server secrets.'
      });
    }

    const { text, prompt, voiceName = 'Kore', style = 'cinema-narrator' } = req.body || {};
    const cleanText = String(text || prompt || '').trim().slice(0, 4000);
    if (!cleanText) {
      return res.status(400).json({ success: false, error: 'Narration text prompt is required for TTS synthesis.' });
    }

    const allowedVoices = new Set(['Kore', 'Puck', 'Fenrir', 'Zephyr', 'Aoede']);
    const safeVoice = allowedVoices.has(String(voiceName)) ? String(voiceName) : 'Kore';

    const stylePrefixMap: Record<string, string> = {
      'cinema-narrator': 'Deliver in a deep, measured theatrical narrator cadence:',
      'bangla-poetic': 'Deliver gently with expressive poetic intonation:',
      'hype-trailer': 'Deliver with punchy high-energy cinema trailer intensity:',
      'whisper': 'Deliver in a close, intimate cinematic whisper:'
    };
    const styleDirective = stylePrefixMap[String(style)] || '';
    const promptInput = styleDirective ? `${styleDirective} ${cleanText}` : cleanText;

    const ai = getAiClient();
    const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
    let audioBase64 = '';
    let mimeType = 'audio/wav';
    let usedModel = ttsModels[0];
    let lastError: any = null;

    for (const candidateModel of ttsModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents: [{ role: 'user', parts: [{ text: promptInput }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: safeVoice }
              }
            }
          }
        });
        const parts = response?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            audioBase64 = part.inlineData.data;
            mimeType = part.inlineData.mimeType || 'audio/wav';
            usedModel = candidateModel;
            break;
          }
        }
        if (audioBase64) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!audioBase64) {
      if (lastError) {
        const parsed = parseGeminiHttpError(lastError, 'Gemini TTS synthesis failed');
        return res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
      }
      return res.status(500).json({ success: false, error: 'TTS model returned empty audio payload.' });
    }

    // Gemini unary TTS already includes a valid 44-byte RIFF WAV header
    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;
    res.json({ success: true, audioDataUrl, voiceName: safeVoice, model: usedModel });
  } catch (error: any) {
    console.error('Gemini TTS error:', error);
    const parsed = parseGeminiHttpError(error, 'Gemini TTS synthesis failed');
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
};

app.post('/api/ai/audio/tts', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleGenerateTts);

// 4C. Gemini AI Foley & Soundscape Recipe Generator
function buildDeterministicFoleyRecipeServer(promptText: string, durationSec: number) {
  const lower = promptText.toLowerCase();
  const safeDur = Math.max(0.8, Math.min(12.0, Number(durationSec) || 4.0));
  if (/rain|storm|water|asphalt|wind|ambien/.test(lower)) {
    return {
      name: 'Atmospheric Rain & Street Wash',
      oscType: 'sine',
      baseFreqHz: 95,
      endFreqHz: 68,
      noiseMix: 0.78,
      filterCutoffHz: 2200,
      pulseRateHz: 1.5,
      durationSec: safeDur,
      reverbMix: 0.45,
      gain: 0.65
    };
  }
  if (/boom|drop|sub|bass|impact|hit|slam|explosion/.test(lower)) {
    return {
      name: 'Anamorphic Sub-Bass Impact',
      oscType: 'sine',
      baseFreqHz: 130,
      endFreqHz: 34,
      noiseMix: 0.18,
      filterCutoffHz: 480,
      pulseRateHz: 0.4,
      durationSec: Math.min(safeDur, 3.2),
      reverbMix: 0.35,
      gain: 0.85
    };
  }
  if (/projector|film|reel|tape|35mm|hum|mechanical/.test(lower)) {
    return {
      name: '35mm Optical Projector Cadence',
      oscType: 'triangle',
      baseFreqHz: 60,
      endFreqHz: 58,
      noiseMix: 0.25,
      filterCutoffHz: 1400,
      pulseRateHz: 24,
      durationSec: safeDur,
      reverbMix: 0.2,
      gain: 0.6
    };
  }
  if (/cyber|synth|pulse|neon|tension|thriller|sci/.test(lower)) {
    return {
      name: 'Cyberpunk Tension Pulse',
      oscType: 'sawtooth',
      baseFreqHz: 73.4,
      endFreqHz: 110,
      noiseMix: 0.12,
      filterCutoffHz: 950,
      pulseRateHz: 4.5,
      durationSec: safeDur,
      reverbMix: 0.4,
      gain: 0.7
    };
  }
  return {
    name: 'Custom Cinema Soundscape',
    oscType: 'triangle',
    baseFreqHz: 82.4,
    endFreqHz: 55,
    noiseMix: 0.3,
    filterCutoffHz: 1100,
    pulseRateHz: 2.0,
    durationSec: safeDur,
    reverbMix: 0.3,
    gain: 0.7
  };
}

const handleFoleyDesign: express.RequestHandler = async (req, res) => {
  const { prompt = '', durationSec = 4.0 } = req.body || {};
  const cleanPrompt = String(prompt || '').trim().slice(0, 4000);
  if (!cleanPrompt) {
    return res.status(400).json({ success: false, error: 'Prompt is required for Foley sound design.' });
  }

  const fallbackRecipe = buildDeterministicFoleyRecipeServer(cleanPrompt, Number(durationSec) || 4.0);
  if (!getConfiguredGeminiKey()) {
    return res.json({ success: true, recipe: fallbackRecipe, source: 'offline-dsp' });
  }

  try {
    const ai = getAiClient();
    const systemPrompt = `Design a Web Audio synthesizer Foley soundscape recipe for the cinematic prompt: "${cleanPrompt}".
Return a strict JSON object with these exact keys and numeric ranges:
{
  "name": short string title (2-5 words),
  "oscType": one of "sine" | "triangle" | "sawtooth" | "square",
  "baseFreqHz": number (28 to 1200),
  "endFreqHz": number (28 to 1200),
  "noiseMix": number (0.0 to 1.0),
  "filterCutoffHz": number (180 to 8000),
  "pulseRateHz": number (0.2 to 24.0),
  "durationSec": number (0.8 to 10.0),
  "reverbMix": number (0.0 to 0.8),
  "gain": number (0.25 to 0.9)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: { responseMimeType: 'application/json' }
    });
    const text = response?.text || '';
    const parsed = JSON.parse(text);
    const validOsc = ['sine', 'triangle', 'sawtooth', 'square'].includes(parsed?.oscType)
      ? parsed.oscType
      : fallbackRecipe.oscType;

    const clamp = (v: unknown, min: number, max: number, d: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
    };

    const recipe = {
      name: typeof parsed?.name === 'string' && parsed.name.trim() ? parsed.name.trim().slice(0, 48) : fallbackRecipe.name,
      oscType: validOsc,
      baseFreqHz: clamp(parsed?.baseFreqHz, 28, 1200, fallbackRecipe.baseFreqHz),
      endFreqHz: clamp(parsed?.endFreqHz, 28, 1200, fallbackRecipe.endFreqHz),
      noiseMix: clamp(parsed?.noiseMix, 0, 1, fallbackRecipe.noiseMix),
      filterCutoffHz: clamp(parsed?.filterCutoffHz, 180, 8000, fallbackRecipe.filterCutoffHz),
      pulseRateHz: clamp(parsed?.pulseRateHz, 0.2, 24, fallbackRecipe.pulseRateHz),
      durationSec: clamp(parsed?.durationSec, 0.8, 10, fallbackRecipe.durationSec),
      reverbMix: clamp(parsed?.reverbMix, 0, 0.8, fallbackRecipe.reverbMix),
      gain: clamp(parsed?.gain, 0.25, 0.9, fallbackRecipe.gain)
    };

    res.json({ success: true, recipe, source: 'gemini-3.8-flash' });
  } catch (err) {
    console.warn('[foley-design] Falling back to offline recipe:', (err as any)?.message);
    res.json({ success: true, recipe: fallbackRecipe, source: 'offline-dsp' });
  }
};

app.post('/api/ai/audio/foley-design', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, handleFoleyDesign);

// Unified Authenticated Audio Proxy (/api/ai/generate-audio) supporting tts | music | foley
app.post('/api/ai/generate-audio', aiRateLimiter, licenseSecurity.requireActiveProOrTrial, (req, res, next) => {
  const mode = String(req.body?.mode || (req.body?.text ? 'tts' : 'music')).toLowerCase();
  if (mode === 'tts') return handleGenerateTts(req, res, next);
  if (mode === 'foley') return handleFoleyDesign(req, res, next);
  return handleGenerateMusic(req, res, next);
});

// Local File HTTP 206 Partial Content Byte-Range Streamer + LRU 1MB RAM Block Cache (VLC-grade 4K seeking)
const localVideoRangeHandler = createLocalVideoRangeMiddleware({
  maxCacheBytes: 192 * 1024 * 1024,
  chunkBytes: 1024 * 1024,
  statTtlMs: 2000
});
app.use('/api/local-video', localVideoRangeHandler.middleware);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', engine: 'RAWx Storyboard Engine Enterprise', time: new Date().toISOString() });
});

// Git Telemetry & Repository Status API
app.get('/api/git/status', (_req, res) => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', cwd: __dirname }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: __dirname }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf-8', cwd: __dirname }).trim();
    const remotes = execSync('git remote -v', { encoding: 'utf-8', cwd: __dirname }).trim();
    res.json({
      success: true,
      branch,
      commit,
      isClean: status.length === 0,
      remotes: remotes ? remotes.split('\n') : []
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// =========================================================================
// ZERO-PROMPT "EDIT IN" EXTERNAL APP BRIDGE & LIVE FILE-WATCHER (SSE)
// =========================================================================
type EditInAppId = 'photoshop' | 'premiere' | 'illustrator' | 'capcut';

interface EditInTrackedAsset {
  shotId: string;
  shotIndex: number;
  app: EditInAppId;
  filename: string;
  filePath: string;
  mediaType: 'image' | 'video';
  mimeType: string;
  mtimeMs: number;
  updatedAt: number;
}

const SCRATCH_ROOT = path.resolve(__dirname, '.handfilm-scratch', 'shots');
const editInStateMap = new Map<string, EditInTrackedAsset>();

// Valid 1x1 dark PNG fallback when no rendered pixels were supplied
const FALLBACK_SLATE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function sanitizeShotId(raw: unknown): string {
  const clean = String(raw ?? 'shot_01')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return clean || 'shot_01';
}

function sanitizeFilename(raw: unknown, fallbackExt: string): string {
  const base = path.basename(String(raw ?? '').trim()).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!base || base === '.' || base === '..') {
    return `master.${fallbackExt}`;
  }
  return base;
}

function inferEditInMime(fileName: string): { mimeType: string; mediaType: 'image' | 'video' } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return { mimeType: 'video/mp4', mediaType: 'video' };
  if (lower.endsWith('.webm')) return { mimeType: 'video/webm', mediaType: 'video' };
  if (lower.endsWith('.mov')) return { mimeType: 'video/quicktime', mediaType: 'video' };
  if (lower.endsWith('.mkv')) return { mimeType: 'video/x-matroska', mediaType: 'video' };
  if (lower.endsWith('.webp')) return { mimeType: 'image/webp', mediaType: 'image' };
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return { mimeType: 'image/jpeg', mediaType: 'image' };
  if (lower.endsWith('.svg')) return { mimeType: 'image/svg+xml', mediaType: 'image' };
  return { mimeType: 'image/png', mediaType: 'image' };
}

function extFromMime(mime: string | undefined, app: EditInAppId): string {
  const lower = (mime || '').toLowerCase();
  if (lower.includes('video/webm')) return 'webm';
  if (lower.includes('video/quicktime')) return 'mov';
  if (lower.includes('video/')) return 'mp4';
  if (lower.includes('image/jpeg')) return 'jpg';
  if (lower.includes('image/webp')) return 'webp';
  if (lower.includes('image/svg')) return 'svg';
  if (app === 'premiere' || app === 'capcut') return 'png';
  return 'png';
}

function findExistingExecutable(candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      if (candidate.includes('/') || candidate.includes('\\')) {
        if (fs.existsSync(candidate)) return candidate;
      } else {
        const cmd = process.platform === 'win32' ? `where ${candidate}` : `which ${candidate}`;
        const found = execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
          .split(/\r?\n/)[0]
          ?.trim();
        if (found) return found;
      }
    } catch {
      // Binary not installed in this environment
    }
  }
  return null;
}

function tryLaunchExternalDesktopApp(appId: EditInAppId, targetFilePath: string): { launched: boolean; executable: string | null } {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      const appNames: Record<EditInAppId, string[]> = {
        photoshop: ['Adobe Photoshop 2026', 'Adobe Photoshop 2025', 'Adobe Photoshop 2024', 'Adobe Photoshop'],
        premiere: ['Adobe Premiere Pro 2026', 'Adobe Premiere Pro 2025', 'Adobe Premiere Pro 2024', 'Adobe Premiere Pro'],
        illustrator: ['Adobe Illustrator 2026', 'Adobe Illustrator 2025', 'Adobe Illustrator 2024', 'Adobe Illustrator'],
        capcut: ['CapCut']
      };
      for (const name of appNames[appId]) {
        const bundlePath = `/Applications/${name}.app`;
        const adobeSubPath = `/Applications/${name}/${name}.app`;
        const resolvedApp = fs.existsSync(bundlePath)
          ? bundlePath
          : fs.existsSync(adobeSubPath)
            ? adobeSubPath
            : null;
        if (resolvedApp) {
          const child = spawn('open', ['-a', resolvedApp, targetFilePath], { detached: true, stdio: 'ignore' });
          child.on('error', () => {});
          child.unref();
          return { launched: true, executable: resolvedApp };
        }
      }
      return { launched: false, executable: null };
    }

    if (platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const candidatesMap: Record<EditInAppId, string[]> = {
        photoshop: [
          `${programFiles}\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe`,
          `${programFiles}\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe`,
          `${programFiles}\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe`,
          'photoshop'
        ],
        premiere: [
          `${programFiles}\\Adobe\\Adobe Premiere Pro 2026\\Adobe Premiere Pro.exe`,
          `${programFiles}\\Adobe\\Adobe Premiere Pro 2025\\Adobe Premiere Pro.exe`,
          `${programFiles}\\Adobe\\Adobe Premiere Pro 2024\\Adobe Premiere Pro.exe`,
          'Adobe Premiere Pro'
        ],
        illustrator: [
          `${programFiles}\\Adobe\\Adobe Illustrator 2026\\Support Files\\Contents\\Windows\\Illustrator.exe`,
          `${programFiles}\\Adobe\\Adobe Illustrator 2025\\Support Files\\Contents\\Windows\\Illustrator.exe`,
          `${programFiles}\\Adobe\\Adobe Illustrator 2024\\Support Files\\Contents\\Windows\\Illustrator.exe`,
          'illustrator'
        ],
        capcut: [
          `${localAppData}\\CapCut\\Apps\\CapCut.exe`,
          `${programFiles}\\CapCut\\CapCut.exe`,
          'CapCut'
        ]
      };
      const exe = findExistingExecutable(candidatesMap[appId]);
      if (exe) {
        const child = spawn(exe, [targetFilePath], { detached: true, stdio: 'ignore' });
        child.on('error', () => {});
        child.unref();
        return { launched: true, executable: exe };
      }
      return { launched: false, executable: null };
    }

    // Linux desktop environments (supports custom shims/aliases or native linux builds like CapCut/PhotoGIMP/etc.)
    const linuxCandidates: Record<EditInAppId, string[]> = {
      photoshop: ['photoshop', 'adobe-photoshop'],
      premiere: ['premiere', 'adobe-premiere'],
      illustrator: ['illustrator', 'adobe-illustrator'],
      capcut: ['capcut', 'CapCut']
    };
    const bin = findExistingExecutable(linuxCandidates[appId]);
    if (bin) {
      const child = spawn(bin, [targetFilePath], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
      return { launched: true, executable: bin };
    }
    return { launched: false, executable: null };
  } catch {
    return { launched: false, executable: null };
  }
}

app.post('/api/edit-in', (req, res) => {
  try {
    const body = req.body || {};
    const appRaw = String(body.app || 'photoshop').toLowerCase();
    const appId: EditInAppId =
      appRaw === 'photoshop' || appRaw === 'premiere' || appRaw === 'illustrator' || appRaw === 'capcut'
        ? appRaw
        : 'photoshop';

    const safeShotId = sanitizeShotId(body.shotId || `shot_${String((Number(body.shotIndex) || 0) + 1).padStart(2, '0')}`);
    const shotIndex = Number.isFinite(Number(body.shotIndex)) ? Math.max(0, Number(body.shotIndex)) : 0;
    const requestedMime = typeof body.mimeType === 'string' ? body.mimeType : '';

    let buffer: Buffer | null = null;
    let resolvedMime = requestedMime;

    if (typeof body.dataUrl === 'string' && body.dataUrl.startsWith('data:')) {
      const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(body.dataUrl);
      if (match) {
        if (!resolvedMime && match[1]) resolvedMime = match[1];
        buffer = Buffer.from(match[2], 'base64');
      }
    }

    if (!buffer && typeof body.filePath === 'string' && body.filePath.trim()) {
      const candidatePath = path.resolve(body.filePath.trim());
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        buffer = fs.readFileSync(candidatePath);
      }
    }

    if (!buffer && typeof body.mediaUrl === 'string' && body.mediaUrl.startsWith('/')) {
      const publicRoot = path.resolve(__dirname, 'public');
      const relUrl = decodeURIComponent(body.mediaUrl.split('?')[0]).replace(/^\/+/, '');
      const localAsset = path.resolve(publicRoot, relUrl);
      if (localAsset.startsWith(publicRoot) && fs.existsSync(localAsset) && fs.statSync(localAsset).isFile()) {
        buffer = fs.readFileSync(localAsset);
      }
    }

    if (!buffer || buffer.length === 0) {
      buffer = Buffer.from(FALLBACK_SLATE_PNG_BASE64, 'base64');
      resolvedMime = 'image/png';
    }

    const fallbackExt = extFromMime(resolvedMime, appId);
    const defaultName = `${safeShotId}_${appId}.${fallbackExt}`;
    const safeFileName = sanitizeFilename(body.fileName || defaultName, fallbackExt);
    const inferred = inferEditInMime(safeFileName);

    const shotDir = path.resolve(SCRATCH_ROOT, safeShotId);
    if (!shotDir.startsWith(SCRATCH_ROOT)) {
      return res.status(400).json({ success: false, error: 'Invalid shot path' });
    }
    fs.mkdirSync(shotDir, { recursive: true });

    const scratchFilePath = path.resolve(shotDir, safeFileName);
    if (!scratchFilePath.startsWith(shotDir)) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }

    fs.writeFileSync(scratchFilePath, buffer);
    const stat = fs.statSync(scratchFilePath);
    const now = Date.now();

    const tracked: EditInTrackedAsset = {
      shotId: safeShotId,
      shotIndex,
      app: appId,
      filename: safeFileName,
      filePath: scratchFilePath,
      mediaType: inferred.mediaType,
      mimeType: resolvedMime || inferred.mimeType,
      mtimeMs: stat.mtimeMs,
      updatedAt: now
    };
    editInStateMap.set(safeShotId, tracked);

    const launchInfo = tryLaunchExternalDesktopApp(appId, scratchFilePath);
    const assetUrl = `/api/edit-in/asset/${encodeURIComponent(safeShotId)}/${encodeURIComponent(safeFileName)}?t=${now}`;

    res.json({
      success: true,
      app: appId,
      shotId: safeShotId,
      shotIndex,
      filename: safeFileName,
      scratchPath: scratchFilePath,
      mediaType: inferred.mediaType,
      mimeType: tracked.mimeType,
      mtimeMs: stat.mtimeMs,
      launched: launchInfo.launched,
      executable: launchInfo.executable,
      assetUrl
    });
  } catch (error: any) {
    console.error('[Edit-In Bridge] Error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Edit-In bridge failure' });
  }
});

app.get('/api/edit-in/asset/:shotId/:filename', (req, res) => {
  try {
    const safeShotId = sanitizeShotId(req.params.shotId);
    const safeFileName = sanitizeFilename(req.params.filename, 'png');
    const shotDir = path.resolve(SCRATCH_ROOT, safeShotId);
    const targetPath = path.resolve(shotDir, safeFileName);

    if (!targetPath.startsWith(SCRATCH_ROOT) || !fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: 'Scratch asset not found' });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isFile()) {
      return res.status(404).json({ success: false, error: 'Asset is not a file' });
    }

    const { mimeType, mediaType } = inferEditInMime(safeFileName);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', mimeType);

    if (mediaType === 'video' && req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = Math.max(0, end - start + 1);
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      });
      fs.createReadStream(targetPath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(targetPath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to read scratch asset' });
  }
});

app.get('/api/watch-asset/:shotId/status', (req, res) => {
  const safeShotId = sanitizeShotId(req.params.shotId);
  const tracked = editInStateMap.get(safeShotId) || null;
  if (!tracked) {
    return res.json({ success: true, active: false, shotId: safeShotId, tracked: null });
  }
  let currentMtimeMs = tracked.mtimeMs;
  let size = 0;
  try {
    if (fs.existsSync(tracked.filePath)) {
      const st = fs.statSync(tracked.filePath);
      currentMtimeMs = st.mtimeMs;
      size = st.size;
    }
  } catch {}
  res.json({
    success: true,
    active: true,
    shotId: safeShotId,
    tracked: {
      ...tracked,
      currentMtimeMs,
      size,
      assetUrl: `/api/edit-in/asset/${encodeURIComponent(safeShotId)}/${encodeURIComponent(tracked.filename)}?t=${Math.round(currentMtimeMs)}`
    }
  });
});

app.get('/api/watch-asset/:shotId', (req, res) => {
  const safeShotId = sanitizeShotId(req.params.shotId);
  const shotDir = path.resolve(SCRATCH_ROOT, safeShotId);
  if (!shotDir.startsWith(SCRATCH_ROOT)) {
    return res.status(400).end();
  }
  fs.mkdirSync(shotDir, { recursive: true });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let lastKnownMtime = editInStateMap.get(safeShotId)?.mtimeMs ?? 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const writeEvent = (eventName: string, payload: unknown) => {
    if (closed) return;
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch {
      closed = true;
    }
  };

  writeEvent('connected', { shotId: safeShotId, watching: true, mtimeMs: lastKnownMtime });

  const inspectChanges = () => {
    if (closed) return;
    try {
      const tracked = editInStateMap.get(safeShotId);
      let candidatePath = tracked?.filePath;
      let candidateName = tracked?.filename;

      if (!candidatePath || !fs.existsSync(candidatePath)) {
        const files = fs.readdirSync(shotDir).filter((f) => !f.startsWith('.'));
        if (files.length > 0) {
          files.sort((a, b) => {
            const sa = fs.statSync(path.join(shotDir, a)).mtimeMs;
            const sb = fs.statSync(path.join(shotDir, b)).mtimeMs;
            return sb - sa;
          });
          candidateName = files[0];
          candidatePath = path.join(shotDir, candidateName);
        }
      }

      if (!candidatePath || !candidateName || !fs.existsSync(candidatePath)) return;
      const st = fs.statSync(candidatePath);
      if (!st.isFile() || st.size <= 0) return;

      if (st.mtimeMs > lastKnownMtime + 1) {
        lastKnownMtime = st.mtimeMs;
        const { mimeType, mediaType } = inferEditInMime(candidateName);
        const appId: EditInAppId = tracked?.app || 'photoshop';
        const shotIndex = tracked?.shotIndex ?? 0;
        const now = Date.now();

        editInStateMap.set(safeShotId, {
          shotId: safeShotId,
          shotIndex,
          app: appId,
          filename: candidateName,
          filePath: candidatePath,
          mediaType,
          mimeType,
          mtimeMs: st.mtimeMs,
          updatedAt: now
        });

        writeEvent('asset-updated', {
          shotId: safeShotId,
          shotIndex,
          app: appId,
          filename: candidateName,
          mtimeMs: st.mtimeMs,
          mediaType,
          mimeType,
          assetUrl: `/api/edit-in/asset/${encodeURIComponent(safeShotId)}/${encodeURIComponent(candidateName)}?t=${now}`
        });
      }
    } catch {
      // Transient file lock while external app flushes Ctrl+S write; next cycle will catch it
    }
  };

  let fsWatcher: fs.FSWatcher | null = null;
  try {
    fsWatcher = fs.watch(shotDir, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(inspectChanges, 80);
    });
    fsWatcher.on('error', () => {});
  } catch {
    // Polling safety net continues cleanly
  }

  const pollInterval = setInterval(inspectChanges, 400);
  const heartbeatInterval = setInterval(() => {
    if (!closed) {
      try {
        res.write(': keepalive\n\n');
      } catch {
        closed = true;
      }
    }
  }, 15000);

  req.on('close', () => {
    closed = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    clearInterval(pollInterval);
    clearInterval(heartbeatInterval);
    try {
      fsWatcher?.close();
    } catch {}
  });
});

// =========================================================================
// CROSS-PLATFORM BINARY DOWNLOAD HUB (WINDOWS .EXE + ANDROID .APK)
// =========================================================================
const ALLOWED_DOWNLOAD_BINARIES: Record<
  string,
  { filename: string; platform: 'windows' | 'android'; mime: string; badge: string; version: string }
> = {
  'HandFilm-Studio-Setup.exe': {
    filename: 'HandFilm-Studio-Setup.exe',
    platform: 'windows',
    mime: 'application/vnd.microsoft.portable-executable',
    badge: '64-BIT NATIVE · GPU ACCELERATED · v1.0.0',
    version: '1.0.0'
  },
  'HandFilm-Studio.apk': {
    filename: 'HandFilm-Studio.apk',
    platform: 'android',
    mime: 'application/vnd.android.package-archive',
    badge: 'ANDROID 10+ · ARM64 · 60FPS TOUCH ENGINE',
    version: '1.0.0'
  }
};

function resolveDownloadBinaryPath(filename: string): string | null {
  const publicCandidate = path.resolve(__dirname, 'public', 'downloads', filename);
  if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
    return publicCandidate;
  }
  const distCandidate = path.resolve(__dirname, 'dist', 'downloads', filename);
  if (fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()) {
    return distCandidate;
  }
  return null;
}

app.get('/api/downloads/manifest', (_req, res) => {
  const items = Object.values(ALLOWED_DOWNLOAD_BINARIES).map((meta) => {
    const filePath = resolveDownloadBinaryPath(meta.filename);
    let sizeBytes = 0;
    let sha256 = '';
    if (filePath) {
      const buf = fs.readFileSync(filePath);
      sizeBytes = buf.length;
      sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    }
    return {
      ...meta,
      url: `/downloads/${meta.filename}`,
      available: Boolean(filePath),
      sizeBytes,
      sha256
    };
  });
  res.json({ success: true, version: '1.0.0', artifacts: items });
});

app.get('/downloads/:filename', (req, res) => {
  const rawName = String(req.params.filename || '').trim();
  const meta = ALLOWED_DOWNLOAD_BINARIES[rawName];
  if (!meta) {
    return res.status(404).json({ success: false, error: 'Download artifact not found' });
  }
  const resolved = resolveDownloadBinaryPath(meta.filename);
  if (!resolved) {
    return res.status(404).json({ success: false, error: 'Installer binary not built yet' });
  }
  res.setHeader('Content-Type', meta.mime);
  res.setHeader('Content-Disposition', `attachment; filename="${meta.filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(resolved);
});

// Mount Vite in Development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let vite: { middlewares: any; close: () => Promise<void> } | null = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
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

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`[RAWx ENGINE] Full-Stack server running on http://${HOST}:${PORT}`);
  });

  httpServer.on('error', (err) => {
    console.error('[RAWx ENGINE] Server error:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    try {
      if (vite) await vite.close();
      httpServer.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 2000).unref();
    } catch {
      process.exit(0);
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[RAWx ENGINE] Fatal startup error:', err);
  process.exit(1);
});
