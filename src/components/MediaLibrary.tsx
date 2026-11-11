import React, { useRef, useState } from 'react';
import { Upload, Plus, Play, Music, Sparkles, Film, RefreshCw } from 'lucide-react';
import { VideoClip, AudioTrack } from '../types/editor';
import { generateProceduralClip } from '../utils/proceduralClips';
import { formatShortTime } from '../utils/timecode';
import { soundEngine, DEFAULT_AUDIO_PRESETS } from '../utils/audioSynth';

interface MediaLibraryProps {
  onAddClip: (clip: VideoClip) => void;
  onAddAudio: (track: AudioTrack) => void;
  onLoadDemoProject: () => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onAddClip,
  onAddAudio,
  onLoadDemoProject,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local video file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);

      // Create a temporary video element to get exact duration and generate a poster frame
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;

      tempVideo.onloadedmetadata = () => {
        const duration = tempVideo.duration || 10;
        tempVideo.currentTime = Math.min(1.0, duration / 2);
      };

      tempVideo.onseeked = () => {
        // Grab thumbnail frame
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        let thumbnailUrl = '';
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, 320, 180);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        }

        const newClip: VideoClip = {
          id: `clip_${Date.now()}_${i}`,
          name: file.name,
          url,
          thumbnailUrl,
          sourceDuration: tempVideo.duration || 10,
          trimStart: 0,
          trimEnd: tempVideo.duration || 10,
          speed: 1,
          volume: 1,
          muted: false,
          filters: {
            contrast: 100,
            brightness: 100,
            saturate: 100,
            sepia: 0,
            hueRotate: 0,
            blur: 0,
            vignette: 0,
            warmth: 0,
          },
          aspectRatio: '16:9',
          transition: 'none',
          colorLabel: 'bg-emerald-600',
        };

        onAddClip(newClip);
        soundEngine.playSFX('pop');
      };
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate a fresh procedural B-roll clip in browser
  const handleGenerateSample = async (type: 'neon' | 'sunset' | 'studio' | 'hyperlapse') => {
    setIsGenerating(true);
    try {
      const res = await generateProceduralClip(type, 6.0);
      const names = {
        neon: 'Cyberpunk Neon City.webm',
        sunset: 'Sunset Ocean Horizon.webm',
        studio: 'Creator Studio Desk.webm',
        hyperlapse: 'Speed Highway Hyperlapse.webm',
      };
      const colors = {
        neon: 'bg-fuchsia-600',
        sunset: 'bg-amber-600',
        studio: 'bg-sky-600',
        hyperlapse: 'bg-rose-600',
      };

      const newClip: VideoClip = {
        id: `gen_${Date.now()}`,
        name: names[type],
        url: res.url,
        thumbnailUrl: res.thumbnailUrl,
        sourceDuration: res.duration,
        trimStart: 0,
        trimEnd: res.duration,
        speed: 1,
        volume: 1,
        muted: false,
        filters: {
          contrast: 108,
          brightness: 100,
          saturate: 115,
          sepia: 0,
          hueRotate: 0,
          blur: 0,
          vignette: 15,
          warmth: 0,
        },
        aspectRatio: '16:9',
        transition: 'crossfade',
        colorLabel: colors[type],
      };

      onAddClip(newClip);
      soundEngine.playSFX('ding');
    } catch (err) {
      console.error('Failed generating sample footage:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Play synthetic preview of audio track
  const handlePreviewAudio = async (track: AudioTrack) => {
    if (playingAudioId === track.id) {
      setPlayingAudioId(null);
      return;
    }
    setPlayingAudioId(track.id);
    if (track.synthPreset === 'lofi') {
      const url = await soundEngine.generateLofiBeat(8);
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
    } else {
      const url = await soundEngine.generateCinematicDrone(8);
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-r border-neutral-800 text-neutral-200 w-72 shrink-0 select-none">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-1 p-0.5 bg-neutral-950 rounded-lg">
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video Bin</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        </div>

        <button
          onClick={onLoadDemoProject}
          title="Reset to Demo Project"
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20"
        >
          <Sparkles className="w-3 h-3" />
          <span>Demo</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'video' ? (
          <>
            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-amber-400/80 rounded-xl p-4 text-center cursor-pointer transition-all bg-neutral-950/50 hover:bg-neutral-950/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-400 group-hover:text-amber-400 mx-auto flex items-center justify-center transition-colors mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                Upload Your Video
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Drop MP4, WebM, MOV, or MKV
              </p>
            </div>

            {/* Instant Sample B-Roll Generators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Sample B-Roll Clips</span>
                {isGenerating && (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Rendering...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isGenerating}
                  onClick={() => handleGenerateSample('neon')}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-fuchsia-500/50 text-left transition-all hover:bg-neutral-800/60 disabled:opacity-50"
                >
                  <div className="w-full h-14 rounded bg-gradient-to-tr from-fuchsia-950 to-purple-900 border border-fuchsia-700/30 flex items-center justify-center mb-1.5">
                    <span className="text-xs font-bold text-fuchsia-300">NEON CITY</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-200 truncate">Cyberpunk</p>
                  <span className="text-[10px] text-neutral-500">6.0s · 30fps</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleGenerateSample('sunset')}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 text-left transition-all hover:bg-neutral-800/60 disabled:opacity-50"
                >
                  <div className="w-full h-14 rounded bg-gradient-to-tr from-amber-950 to-orange-900 border border-amber-700/30 flex items-center justify-center mb-1.5">
                    <span className="text-xs font-bold text-amber-300">SUNSET</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-200 truncate">Golden Hour</p>
                  <span className="text-[10px] text-neutral-500">6.0s · 30fps</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleGenerateSample('studio')}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-sky-500/50 text-left transition-all hover:bg-neutral-800/60 disabled:opacity-50"
                >
                  <div className="w-full h-14 rounded bg-gradient-to-tr from-sky-950 to-blue-900 border border-sky-700/30 flex items-center justify-center mb-1.5">
                    <span className="text-xs font-bold text-sky-300">STUDIO</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-200 truncate">Creator Setup</p>
                  <span className="text-[10px] text-neutral-500">5.0s · 30fps</span>
                </button>

                <button
                  disabled={isGenerating}
                  onClick={() => handleGenerateSample('hyperlapse')}
                  className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-rose-500/50 text-left transition-all hover:bg-neutral-800/60 disabled:opacity-50"
                >
                  <div className="w-full h-14 rounded bg-gradient-to-tr from-rose-950 to-red-900 border border-rose-700/30 flex items-center justify-center mb-1.5">
                    <span className="text-xs font-bold text-rose-300">TRAFFIC</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-200 truncate">Hyperlapse</p>
                  <span className="text-[10px] text-neutral-500">6.0s · 30fps</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">Royalty-Free Audio & Synth Tracks</p>
            {DEFAULT_AUDIO_PRESETS.map((track) => (
              <div
                key={track.id}
                className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-200 truncate">{track.name}</p>
                  <span className="text-[10px] text-neutral-500">
                    {track.category.toUpperCase()} · {formatShortTime(track.duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePreviewAudio(track)}
                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    title="Preview Audio"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onAddAudio(track);
                      soundEngine.playSFX('ding');
                    }}
                    className="px-2 py-1 text-xs font-medium bg-neutral-800 hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 rounded transition-colors flex items-center gap-1"
                    title="Add to Timeline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>CineCut Core v2.4</span>
        <span className="text-neutral-400">In-Browser GPU</span>
      </div>
    </div>
  );
};
