import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality } from '@google/genai';
import { createLocalVideoRangeMiddleware } from './src/server/localVideoRangeServer.ts';

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
    : Number(process.env.PORT);
const PORT = Number.isFinite(cliPort) && cliPort > 0 ? cliPort : 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '120mb' }));

// Lazy-initialize Google GenAI only when an /api/* AI route is invoked
let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string = '';

function extractRequestOverrideKey(req?: express.Request): { key: string; isBearer: boolean } {
  const headerAuth = String(req?.headers?.authorization || '').trim();
  if (headerAuth.toLowerCase().startsWith('bearer ')) {
    const token = headerAuth.slice(7).trim();
    if (token) return { key: token, isBearer: true };
  }
  const headerKey = String(req?.headers?.['x-gemini-api-key'] || '').trim();
  if (headerKey) {
    const isBearer = /^AQ\./i.test(headerKey) || /^ya29\./i.test(headerKey);
    return { key: headerKey, isBearer };
  }
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  const isBearer = /^AQ\./i.test(envKey) || /^ya29\./i.test(envKey);
  return { key: envKey, isBearer };
}

function getConfiguredGeminiKey(req?: express.Request): string {
  return extractRequestOverrideKey(req).key;
}

function getAiClient(req?: express.Request): GoogleGenAI {
  const { key: apiKey, isBearer } = extractRequestOverrideKey(req);
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

function parseGeminiHttpError(error: any, fallbackMessage: string, req?: express.Request): { status: number; code: string; error: string } {
  if (!getConfiguredGeminiKey(req)) {
    return {
      status: 401,
      code: 'KEY_REQUIRED',
      error: 'GEMINI_API_KEY is missing. Add GEMINI_API_KEY in AI Studio Settings > Secrets or .env.'
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
app.post('/api/breakdown', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const response = await getAiClient().models.generateContent({
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
function buildAiConfigPayload(req: express.Request) {
  const connected = getConfiguredGeminiKey(req).length > 0;
  return {
    success: true,
    connected,
    hasServerKey: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    models: {
      imageFast: 'gemini-2.5-flash-image',
      imageFallback: 'imagen-3.0-generate-002',
      imagePro: 'gemini-nano-banana-2.1',
      videoFlow: 'veo-2.0-generate-001'
    }
  };
}

app.get('/api/ai/status', (req, res) => {
  res.json(buildAiConfigPayload(req));
});

app.get('/api/ai-config', (req, res) => {
  res.json(buildAiConfigPayload(req));
});

app.get('/api/ai-key', (req, res) => {
  res.json(buildAiConfigPayload(req));
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
app.post('/api/ai/image/generate', async (req, res) => {
  try {
    if (!getConfiguredGeminiKey(req)) {
      return res.status(401).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in AI Studio Settings > Secrets.'
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

    const requestedModel = String(model || 'gemini-2.5-flash-image').trim();
    const isProTier = requestedModel === 'gemini-nano-banana-2.1';
    const { aspect, isAnamorphicScope } = resolveImageAspectRatio(aspectRatio, isProTier);
    const imagenAspect = aspect === '21:9' ? '16:9' : aspect;
    const validSize = isProTier && ['512', '1K', '2K', '4K'].includes(String(imageSize)) ? String(imageSize) : '1K';

    const enhancedPrompt = isAnamorphicScope && aspect !== '21:9'
      ? `${prompt.trim()}. Frame composition for 2.39:1 anamorphic cinema scope widescreen.`
      : prompt.trim();

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

    const ai = getAiClient(req);
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

    const parsed = parseGeminiHttpError(lastError, 'Image generation failed', req);
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  } catch (error: any) {
    console.error('Image generation error:', error);
    const parsed = parseGeminiHttpError(error, 'Image generation failed', req);
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

// 2. Image Editing / Continuation (gemini-2.5-flash-image / gemini-nano-banana-2.1)
app.post('/api/ai/image/edit', async (req, res) => {
  try {
    if (!getConfiguredGeminiKey(req)) {
      return res.status(401).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in AI Studio Settings > Secrets.'
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

    const response = await getAiClient(req).models.generateContent({
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
            text: String(editPrompt)
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
    const parsed = parseGeminiHttpError(error, 'Image edit failed', req);
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
app.post('/api/ai/video/generate', async (req, res) => {
  try {
    if (!getConfiguredGeminiKey(req)) {
      return res.status(401).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in AI Studio Settings > Secrets.'
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
      String(prompt).trim() || 'Subtle cinematic camera choreography and atmospheric film lighting.',
      `Camera Movement: ${cameraMovement}.`,
      `Motion Intensity: ${motionIntensity}.`,
      '24fps cinema cadence, rich anamorphic depth of field, temporal coherence.',
      isScope ? '2.39:1 widescreen anamorphic letterbox cinema framing.' : '',
      seed !== undefined && seed !== null && String(seed).trim() !== '' ? `Deterministic visual seed: ${seed}.` : ''
    ].filter(Boolean).join(' ');

    const ai = getAiClient(req);
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
    const parsed = parseGeminiHttpError(error, 'Failed to start Flow video generation', req);
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

// 3B. Google Flow / Veo Motion Async Polling Endpoint
app.get('/api/ai/video/status/:id(*)', async (req, res) => {
  try {
    if (!getConfiguredGeminiKey(req)) {
      return res.status(401).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'GEMINI_API_KEY is not configured on the server.'
      });
    }

    const interactionId = String(req.params.id || '').trim();
    if (!interactionId) {
      return res.status(400).json({ success: false, code: 'INVALID_ARGUMENT', error: 'interactionId is required' });
    }

    const ai = getAiClient(req);
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
    const parsed = parseGeminiHttpError(error, 'Failed to poll Flow video status', req);
    res.status(parsed.status).json({ success: false, code: parsed.code, error: parsed.error });
  }
});

// 3B-2. Server-Proxied Veo MP4 Blob Download (keeps API key on server & avoids browser CORS)
app.get('/api/ai/video/blob/:id(*)', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const record = veoCompletedVideoUriMap.get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Video asset not found or expired' });
    }
    const { key, isBearer } = extractRequestOverrideKey(req);
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
app.post('/api/ai/video/cancel/:id(*)', async (req, res) => {
  try {
    const interactionId = String(req.params.id || '').trim();
    if (!interactionId) {
      return res.status(400).json({ success: false, error: 'interactionId is required' });
    }
    veoOperationsMap.delete(interactionId);
    veoCompletedVideoUriMap.delete(interactionId);
    if (getConfiguredGeminiKey(req) && !interactionId.includes('operations/')) {
      await getAiClient(req).interactions.cancel(interactionId).catch(() => null);
    }
    res.json({ success: true, status: 'cancelled' });
  } catch (error: any) {
    res.json({ success: true, status: 'cancelled', warning: error?.message });
  }
});

// 3D. Legacy Synchronous Photo Animate Hook (upgraded to gemini-omni-1.2-flash)
app.post('/api/ai/video/animate', async (req, res) => {
  try {
    if (!getConfiguredGeminiKey()) {
      return res.status(401).json({
        success: false,
        code: 'KEY_REQUIRED',
        error: 'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in AI Studio Settings > Secrets.'
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
          text: motionPrompt || 'Cinematic camera movement with natural atmospheric dynamics and subtle depth motion.'
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
app.post('/api/ai/music/generate', async (req, res) => {
  try {
    const { prompt, durationSec = 12.0 } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required for film score generation' });
    }

    const cinematicPrompt = `Generate a cinematic film score cue lasting approx ${Math.min(30, Math.max(12, Math.round(durationSec)))} seconds: ${prompt}`;

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
    res.status(500).json({ success: false, error: error.message || 'Film score generation failed' });
  }
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
