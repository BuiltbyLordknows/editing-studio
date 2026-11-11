export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export interface FilterSettings {
  contrast: number; // 80 - 200, default 100
  brightness: number; // 70 - 140, default 100
  saturate: number; // 0 - 220, default 100
  sepia: number; // 0 - 100, default 0
  hueRotate: number; // -180 - 180, default 0
  blur: number; // 0 - 5, default 0
  vignette: number; // 0 - 80, default 0
  warmth: number; // -50 - 50, default 0
}

export type TransitionType = 'none' | 'fade-black' | 'crossfade' | 'zoom-in';

export interface VideoClip {
  id: string;
  name: string;
  url: string;
  sourceDuration: number; // in seconds
  trimStart: number; // seconds from source start
  trimEnd: number; // seconds from source start
  speed: number; // 0.25 - 2.0
  volume: number; // 0 - 1
  muted: boolean;
  filters: FilterSettings;
  aspectRatio: AspectRatio;
  transition: TransitionType;
  thumbnailUrl?: string;
  colorLabel?: string;
}

export type CaptionPreset = 'tiktok-bold' | 'cinematic-lower-third' | 'clean-minimal' | 'karaoke-glow';

export interface SubtitleSegment {
  id: string;
  start: number; // timeline seconds
  end: number; // timeline seconds
  text: string;
  highlight?: string;
  preset: CaptionPreset;
}

export interface TextOverlay {
  id: string;
  text: string;
  start: number;
  end: number;
  x: number; // 0 - 100 percentage
  y: number; // 0 - 100 percentage
  fontSize: number;
  textColor: string;
  bgColor: string;
  fontFamily: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  category: 'cinematic' | 'upbeat' | 'ambient' | 'sfx';
  duration: number;
  volume: number;
  offset: number; // timeline start in seconds
  muted: boolean;
  synthPreset: string;
}

export interface AIAnalysisReport {
  overallRating: string;
  pacingScore: number;
  hookStrength: number;
  colorBalanceScore: number;
  strengths: string[];
  improvementAreas: string[];
  recommendedTrimPoints: { start: number; end: number; reason: string }[];
  viralTips: string;
}

export interface ViralHook {
  type: string;
  text: string;
  visualCue: string;
  screenText: string;
}

export interface EditorProject {
  id: string;
  title: string;
  clips: VideoClip[];
  subtitles: SubtitleSegment[];
  textOverlays: TextOverlay[];
  audioTracks: AudioTrack[];
  aspectRatio: AspectRatio;
  fps: number;
}
