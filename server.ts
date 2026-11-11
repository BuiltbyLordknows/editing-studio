import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. Scene & Video Analysis Endpoint
app.post('/api/ai/analyze-video', async (req, res) => {
  try {
    const { title, duration, sceneDescription, targetAudience, currentPacing } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        analysis: {
          overallRating: 'A-',
          pacingScore: 88,
          hookStrength: 85,
          colorBalanceScore: 90,
          strengths: [
            'Clean visual composition and steady camera movement.',
            'Strong subject presence in the focal center.',
            'Good natural lighting dynamics throughout the clip.',
          ],
          improvementAreas: [
            'Trim first 1.2s of dead air before the action begins.',
            'Boost saturation slightly (+15%) and add a subtle vignette to draw focus.',
            'Add energetic jump cuts during transitional explanations.',
          ],
          recommendedTrimPoints: [
            { start: 0, end: 1.2, reason: 'Leading silence before speaking or movement' },
            { start: Math.max(0, (duration || 10) - 2), end: duration || 10, reason: 'Tail freeze frame' },
          ],
          viralTips: 'Insert a punchy 3-word bold title card in the first 0.8 seconds to capture scroll retention on vertical feeds.',
        },
      });
    }

    const prompt = `You are a world-class professional video editor and post-production director.
Analyze the following video clip details and give concise, high-impact creative and technical editing recommendations.

Clip Title: ${title || 'Untitled Clip'}
Duration: ${duration || 'Unknown'} seconds
Scene Description & Context: ${sceneDescription || 'General video footage uploaded by user'}
Target Audience/Platform: ${targetAudience || 'General / Social Media'}
Current Pacing: ${currentPacing || 'Normal'}

Respond in JSON format matching this schema:
{
  "overallRating": "string (e.g. A, A-, B+)",
  "pacingScore": number (0-100),
  "hookStrength": number (0-100),
  "colorBalanceScore": number (0-100),
  "strengths": ["string", "string", "string"],
  "improvementAreas": ["string", "string", "string"],
  "recommendedTrimPoints": [
    { "start": number, "end": number, "reason": "string" }
  ],
  "viralTips": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ analysis: parsed });
  } catch (error: any) {
    console.error('Error analyzing video:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze video' });
  }
});

// 2. Auto-Caption & Subtitle Generator
app.post('/api/ai/generate-captions', async (req, res) => {
  try {
    const { videoDuration, promptOrTopic, style = 'tiktok-bold' } = req.body;
    const ai = getGeminiClient();

    const duration = Math.max(3, parseFloat(videoDuration) || 12);

    if (!ai) {
      // Smart procedural captions if offline or key not yet injected
      const sampleSegments = [
        { start: 0.2, end: Math.min(2.5, duration * 0.25), text: 'Here is what nobody tells you', highlight: 'nobody' },
        { start: Math.min(2.7, duration * 0.27), end: Math.min(5.2, duration * 0.5), text: 'about creating viral video content', highlight: 'viral' },
        { start: Math.min(5.4, duration * 0.52), end: Math.min(8.0, duration * 0.75), text: 'Master your cuts and color grade', highlight: 'cuts' },
        { start: Math.min(8.2, duration * 0.77), end: Math.min(duration - 0.2, duration * 0.95), text: 'and watch your retention skyrocket!', highlight: 'skyrocket' },
      ].filter((s) => s.start < duration);

      return res.json({ captions: sampleSegments });
    }

    const systemPrompt = `You are an expert video caption and subtitle creator for TikTok, YouTube Shorts, Reels, and modern video productions.
Generate timed caption segments that fit within a total video duration of ${duration} seconds.
Topic / Scene info: ${promptOrTopic || 'General video commentary and dynamic dialogue'}.
Visual style preference: ${style}.

Generate 3 to 7 subtitle blocks. Each block must have:
- "start": timestamp in seconds (e.g. 0.5)
- "end": timestamp in seconds (e.g. 2.8)
- "text": punchy, readable phrase (max 6-8 words)
- "highlight": one key power word from the phrase to colorize or emphasize in the subtitle styling

Segments must not exceed ${duration} seconds.
Respond strictly with a JSON array of segment objects:
[
  { "start": 0.5, "end": 2.2, "text": "This will change your workflow", "highlight": "workflow" }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({ captions: Array.isArray(parsed) ? parsed : [] });
  } catch (error: any) {
    console.error('Error generating captions:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate captions' });
  }
});

// 3. AI Viral Hook & Headline Generator
app.post('/api/ai/viral-hooks', async (req, res) => {
  try {
    const { videoTopic, niche = 'General' } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        hooks: [
          {
            type: 'Contrarian Question',
            text: 'Stop editing your videos like it is 2019.',
            visualCue: 'Fast zoom-in with sound effect on the speaker',
            screenText: 'STOP DOING THIS ❌',
          },
          {
            type: 'Curiosity Gap',
            text: 'The 3-second editing secret that doubled my watch time.',
            visualCue: 'Quick B-roll montage with high contrast color grade',
            screenText: 'THE 3s RULE ⚡',
          },
          {
            type: 'Direct Value Hook',
            text: 'If you want cinematic video on any camera, watch this.',
            visualCue: 'Split screen comparison (before vs after grade)',
            screenText: 'CINEMATIC HACK 🎬',
          },
        ],
      });
    }

    const prompt = `Generate 3 distinct high-retention 3-second hook ideas for a video about: "${videoTopic || 'Creative Video Editing'}". Niche: "${niche}".
Provide a catchy spoken hook line, a recommended visual editing cue (camera action, cut, or effect), and bold on-screen overlay text.

Respond in JSON format matching:
{
  "hooks": [
    {
      "type": "string",
      "text": "string",
      "visualCue": "string",
      "screenText": "string"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating hooks:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate hooks' });
  }
});

// 4. Natural Language AI Color Grade & LUT Predictor
app.post('/api/ai/color-grade', async (req, res) => {
  try {
    const { moodPrompt } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        presetName: moodPrompt || 'Cinematic Film',
        filters: {
          contrast: 115,
          brightness: 102,
          saturate: 110,
          sepia: 10,
          hueRotate: 0,
          blur: 0,
          vignette: 25,
          warmth: 10,
        },
        description: 'Enhanced dynamic range with subtle warm film tones and focused vignette.',
      });
    }

    const prompt = `You are a senior digital colorist for motion picture and commercial video.
Convert this artistic color grading request into precise CSS filter values and parameters:
Request: "${moodPrompt}"

Allowed ranges:
- contrast: integer (80 to 200, 100 is default)
- brightness: integer (70 to 140, 100 is default)
- saturate: integer (0 to 220, 100 is default, 0 is B&W)
- sepia: integer (0 to 100, 0 is default)
- hueRotate: integer (-180 to 180, 0 is default)
- blur: integer (0 to 5, 0 is default)
- vignette: integer (0 to 80, 0 is default)
- warmth: integer (-50 to 50, 0 is neutral)

Respond strictly in JSON:
{
  "presetName": "string",
  "filters": {
    "contrast": number,
    "brightness": number,
    "saturate": number,
    "sepia": number,
    "hueRotate": number,
    "blur": number,
    "vignette": number,
    "warmth": number
  },
  "description": "string"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in color grade generator:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate color grade' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CineCut AI Server running on port ${PORT}`);
  });
}

startServer();
