import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Camera,
  Maximize2,
  Columns,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AspectRatio, SubtitleSegment, TextOverlay, VideoClip } from '../types/editor';
import { formatTimecode } from '../utils/timecode';
import { getAspectRatioDimensions, renderCompositeFrame } from '../utils/videoRenderer';
import { captureFrameSnapshot } from '../utils/exportVideo';
import { soundEngine } from '../utils/audioSynth';

interface VideoPlayerProps {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  activeClip: VideoClip | null;
  activeClipTime: number;
  activeSubtitles: SubtitleSegment[];
  activeOverlays: TextOverlay[];
  aspectRatio: AspectRatio;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (direction: -1 | 1) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  currentTime,
  totalDuration,
  isPlaying,
  activeClip,
  activeClipTime,
  activeSubtitles,
  activeOverlays,
  aspectRatio,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onChangeAspectRatio,
  isLooping,
  onToggleLoop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [splitComparison, setSplitComparison] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sync hidden video element with active clip source and time
  useEffect(() => {
    const video = hiddenVideoRef.current;
    if (!video || !activeClip) return;

    if (video.src !== activeClip.url) {
      video.src = activeClip.url;
      video.load();
    }

    // Set playback rate & volume
    video.playbackRate = playbackSpeed * (activeClip.speed || 1);
    video.volume = activeClip.muted || isMuted ? 0 : activeClip.volume ?? 1;

    // Check drift and sync time
    if (Math.abs(video.currentTime - activeClipTime) > 0.15) {
      video.currentTime = activeClipTime;
    }
  }, [activeClip, activeClipTime, playbackSpeed, isMuted]);

  // Video play/pause management
  useEffect(() => {
    const video = hiddenVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Frame rendering loop
  useEffect(() => {
    let animId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      const video = hiddenVideoRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = getAspectRatioDimensions(aspectRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const filters = activeClip?.filters || {
        contrast: 100,
        brightness: 100,
        saturate: 100,
        sepia: 0,
        hueRotate: 0,
        blur: 0,
        vignette: 0,
        warmth: 0,
      };

      renderCompositeFrame(
        ctx,
        video,
        width,
        height,
        filters,
        activeSubtitles,
        activeOverlays,
        {
          splitComparison,
          splitPosition: splitPos,
        }
      );

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [activeClip, activeSubtitles, activeOverlays, aspectRatio, splitComparison, splitPos]);

  // Handle split-screen dragging
  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSplit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    setSplitPos(x);
  };

  // Instant Snapshot grabber
  const handleCaptureSnapshot = () => {
    soundEngine.playSFX('ding');
    const filters = activeClip?.filters || {
      contrast: 100,
      brightness: 100,
      saturate: 100,
      sepia: 0,
      hueRotate: 0,
      blur: 0,
      vignette: 0,
      warmth: 0,
    };
    const dataUrl = captureFrameSnapshot(
      hiddenVideoRef.current,
      filters,
      activeSubtitles,
      activeOverlays,
      aspectRatio
    );

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cinecut_snapshot_${Date.now()}.png`;
    a.click();
  };

  // Aspect ratio options
  const aspectRatios: { label: string; value: AspectRatio }[] = [
    { label: '16:9 Landscape', value: '16:9' },
    { label: '9:16 Shorts/Reels', value: '9:16' },
    { label: '1:1 Square', value: '1:1' },
    { label: '4:5 Portrait', value: '4:5' },
    { label: '21:9 Cinema', value: '21:9' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative select-none">
      {/* Top Viewport Toolbar */}
      <div className="h-10 px-4 bg-neutral-900/60 border-b border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">Aspect</span>
          <select
            value={aspectRatio}
            onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatio)}
            className="bg-neutral-800 border border-neutral-700 text-neutral-200 rounded px-2 py-0.5 text-xs outline-none focus:border-amber-400"
          >
            {aspectRatios.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {ar.label}
              </option>
            ))}
          </select>
        </div>

        {/* Center Clip Tag */}
        <div className="hidden sm:flex items-center gap-2">
          {activeClip ? (
            <span className="text-neutral-300 font-medium truncate max-w-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeClip.colorLabel || 'bg-amber-500'}`} />
              {activeClip.name}
            </span>
          ) : (
            <span className="text-neutral-500">No clip active</span>
          )}
        </div>

        {/* Right Tools (Before/After split & Snapshot) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSplitComparison(!splitComparison)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              splitComparison
                ? 'bg-amber-400 text-neutral-950 font-semibold'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
            title="Split-screen RAW vs GRADED comparison"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Compare</span>
          </button>

          <button
            onClick={handleCaptureSnapshot}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
            title="Grab 1080p Frame Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        onMouseMove={handleSplitMouseMove}
        onMouseUp={() => setIsDraggingSplit(false)}
        onMouseLeave={() => setIsDraggingSplit(false)}
        className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-neutral-950"
      >
        <div
          className="relative max-h-full max-w-full flex items-center justify-center rounded-lg shadow-2xl overflow-hidden border border-neutral-800 bg-black"
          style={{
            aspectRatio:
              aspectRatio === '9:16'
                ? '9/16'
                : aspectRatio === '1:1'
                ? '1/1'
                : aspectRatio === '4:5'
                ? '4/5'
                : aspectRatio === '21:9'
                ? '21/9'
                : '16/9',
            maxHeight: 'calc(100vh - 380px)',
            minHeight: '260px',
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
          />

          {/* Hidden video element used as frame texture source */}
          <video
            ref={hiddenVideoRef}
            playsInline
            muted={isMuted || activeClip?.muted}
            className="hidden"
          />

          {/* Play/Pause overlay icon on click */}
          {!isPlaying && (
            <div
              onClick={onTogglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 cursor-pointer transition-colors"
            >
              <div className="w-14 h-14 rounded-full bg-neutral-900/80 border border-neutral-700 text-amber-400 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform backdrop-blur-sm">
                <Play className="w-6 h-6 ml-1 fill-amber-400" />
              </div>
            </div>
          )}

          {/* Split comparison drag handler overlay */}
          {splitComparison && (
            <div
              onMouseDown={() => setIsDraggingSplit(true)}
              style={{ left: `${splitPos * 100}%` }}
              className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center z-20 group"
            >
              <div className="w-0.5 h-full bg-white group-hover:bg-amber-400 shadow-md" />
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="h-12 bg-neutral-900/90 border-t border-neutral-800 px-6 flex items-center justify-between select-none">
        {/* Left: Timecode */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-amber-400 font-bold text-sm tracking-wider">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Center: Play/Pause/Scrub buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Return to Start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onStepFrame(-1)}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Step Back 1 Frame (←)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center justify-center shadow-md active:scale-95 transition-all"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-neutral-950" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-neutral-950" />
            )}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Step Forward 1 Frame (→)"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded transition-colors ${
              isLooping ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Playback Loop"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Audio Volume & Speed */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Speed Selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] rounded px-1.5 py-0.5 outline-none font-mono"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
