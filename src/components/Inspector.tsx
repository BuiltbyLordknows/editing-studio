import React from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Gauge,
  Sparkles,
  RotateCcw,
  Sun,
  Contrast,
  Palette,
  Eye,
  Film,
} from 'lucide-react';
import { FilterSettings, TransitionType, VideoClip } from '../types/editor';

interface InspectorProps {
  clip: VideoClip | null;
  onUpdateClip: (updated: VideoClip) => void;
}

export const Inspector: React.FC<InspectorProps> = ({ clip, onUpdateClip }) => {
  if (!clip) {
    return (
      <div className="w-80 bg-neutral-900 border-l border-neutral-800 p-6 flex flex-col items-center justify-center text-center text-neutral-500 text-xs">
        <Film className="w-8 h-8 text-neutral-700 mb-2 stroke-[1.5]" />
        <p className="font-semibold text-neutral-400">No Clip Selected</p>
        <p className="mt-1 text-[11px] text-neutral-600">
          Click on any video clip on the timeline to adjust trim, color grade, speed, or transitions.
        </p>
      </div>
    );
  }

  const filters = clip.filters;

  const updateFilters = (changes: Partial<FilterSettings>) => {
    onUpdateClip({
      ...clip,
      filters: {
        ...clip.filters,
        ...changes,
      },
    });
  };

  const resetFilters = () => {
    onUpdateClip({
      ...clip,
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
    });
  };

  const lutPresets: { name: string; tag: string; filters: Partial<FilterSettings> }[] = [
    {
      name: 'Clean Tech',
      tag: 'Neutral Commercial',
      filters: { contrast: 108, brightness: 102, saturate: 110, warmth: 0, vignette: 10, sepia: 0 },
    },
    {
      name: 'Warm Film',
      tag: '1970s Kodachrome',
      filters: { contrast: 112, brightness: 100, saturate: 115, warmth: 25, sepia: 15, vignette: 20 },
    },
    {
      name: 'Nordic Noir',
      tag: 'Moody Thriller',
      filters: { contrast: 125, brightness: 96, saturate: 70, warmth: -20, vignette: 35, sepia: 0 },
    },
    {
      name: 'Cyberpunk',
      tag: 'Teal & Neon Orange',
      filters: { contrast: 125, brightness: 102, saturate: 145, hueRotate: 15, vignette: 25, sepia: 0 },
    },
    {
      name: 'Golden Hour',
      tag: 'Sunset Glow',
      filters: { contrast: 110, brightness: 104, saturate: 120, warmth: 35, vignette: 15, sepia: 5 },
    },
    {
      name: 'B&W Contrast',
      tag: 'Monochrome Leica',
      filters: { contrast: 135, brightness: 100, saturate: 0, warmth: 0, vignette: 25, sepia: 0 },
    },
  ];

  return (
    <div className="w-80 bg-neutral-900 border-l border-neutral-800 text-neutral-200 flex flex-col h-full overflow-y-auto select-none">
      {/* Header */}
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-neutral-200">Clip Inspector</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 uppercase bg-neutral-950 px-1.5 py-0.5 rounded">
          {((clip.trimEnd - clip.trimStart) / (clip.speed || 1)).toFixed(1)}s
        </span>
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* Clip Name */}
        <div>
          <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
            Clip Name
          </label>
          <input
            type="text"
            value={clip.name}
            onChange={(e) => onUpdateClip({ ...clip, name: e.target.value })}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 focus:border-amber-400 outline-none"
          />
        </div>

        {/* Speed & Volume Section */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950 rounded-lg border border-neutral-800/80">
          <div>
            <label className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              <Gauge className="w-3 h-3 text-amber-400" /> Speed
            </label>
            <select
              value={clip.speed}
              onChange={(e) => onUpdateClip({ ...clip, speed: parseFloat(e.target.value) })}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200 outline-none"
            >
              <option value="0.5">0.5x Slow</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x Normal</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x Fast</option>
              <option value="2">2.0x Double</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 flex items-center gap-1 mb-1">
              {clip.muted ? (
                <VolumeX className="w-3 h-3 text-rose-400" />
              ) : (
                <Volume2 className="w-3 h-3 text-emerald-400" />
              )}
              Audio
            </label>
            <button
              onClick={() => onUpdateClip({ ...clip, muted: !clip.muted })}
              className={`w-full py-1 text-xs rounded border transition-colors ${
                clip.muted
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {clip.muted ? 'Muted' : `${Math.round(clip.volume * 100)}% Active`}
            </button>
          </div>
        </div>

        {/* Transitions */}
        <div>
          <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
            Incoming Transition
          </label>
          <select
            value={clip.transition}
            onChange={(e) =>
              onUpdateClip({ ...clip, transition: e.target.value as TransitionType })
            }
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none focus:border-amber-400"
          >
            <option value="none">None (Hard Cut)</option>
            <option value="fade-black">Fade From Black</option>
            <option value="crossfade">Crossfade Blend</option>
            <option value="zoom-in">Quick Zoom In</option>
          </select>
        </div>

        {/* 1-Click LUT Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> 1-Click LUT Presets
            </label>
            <button
              onClick={resetFilters}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 flex items-center gap-0.5"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {lutPresets.map((lut) => (
              <button
                key={lut.name}
                onClick={() => updateFilters(lut.filters)}
                className="p-2 rounded bg-neutral-950 border border-neutral-800/80 hover:border-amber-400/60 text-left transition-all hover:bg-neutral-800/50"
              >
                <p className="text-xs font-semibold text-neutral-200">{lut.name}</p>
                <p className="text-[10px] text-neutral-500 truncate">{lut.tag}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Color Sliders */}
        <div className="space-y-3 pt-2 border-t border-neutral-800">
          <label className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider block">
            Color Grading Sliders
          </label>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Contrast</span>
              <span className="font-mono text-neutral-200">{filters.contrast}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="160"
              value={filters.contrast}
              onChange={(e) => updateFilters({ contrast: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Brightness</span>
              <span className="font-mono text-neutral-200">{filters.brightness}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="130"
              value={filters.brightness}
              onChange={(e) => updateFilters({ brightness: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Saturation</span>
              <span className="font-mono text-neutral-200">{filters.saturate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.saturate}
              onChange={(e) => updateFilters({ saturate: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Warmth / Color Temperature */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Warmth (Temperature)</span>
              <span className="font-mono text-neutral-200">
                {filters.warmth > 0 ? `+${filters.warmth}` : filters.warmth}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={filters.warmth}
              onChange={(e) => updateFilters({ warmth: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Vignette */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Vignette Falloff</span>
              <span className="font-mono text-neutral-200">{filters.vignette}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={filters.vignette}
              onChange={(e) => updateFilters({ vignette: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sepia */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Vintage Sepia</span>
              <span className="font-mono text-neutral-200">{filters.sepia}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={filters.sepia}
              onChange={(e) => updateFilters({ sepia: parseInt(e.target.value) })}
              className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
