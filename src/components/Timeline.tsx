import React, { useRef, useState } from 'react';
import {
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Magnet,
  Plus,
  Type,
  Music,
  Video,
} from 'lucide-react';
import { AudioTrack, SubtitleSegment, TextOverlay, VideoClip } from '../types/editor';
import { formatShortTime, formatTimecode } from '../utils/timecode';
import { soundEngine } from '../utils/audioSynth';

interface TimelineProps {
  clips: VideoClip[];
  subtitles: SubtitleSegment[];
  audioTracks: AudioTrack[];
  currentTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onSeek: (time: number) => void;
  onSplitClip: (clipId: string, splitTimelineTime: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onUpdateClipTrim: (clipId: string, newTrimStart: number, newTrimEnd: number) => void;
  onAddSubtitle: (time: number) => void;
  onDeleteSubtitle: (id: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  subtitles,
  audioTracks,
  currentTime,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onSeek,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClipTrim,
  onAddSubtitle,
  onDeleteSubtitle,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 to 4
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [snapping, setSnapping] = useState(true);

  // Pixels per second based on zoom level
  const basePxPerSec = 45;
  const pxPerSec = basePxPerSec * zoomLevel;
  const timelineWidth = Math.max(900, Math.ceil(Math.max(totalDuration, 20) * pxPerSec));

  // Handle playhead scrubbing on the ruler or track area
  const handleTimelineScrub = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = rulerRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    let targetTime = Math.max(0, Math.min(totalDuration, clickX / pxPerSec));

    // Snapping logic to clip edges
    if (snapping) {
      let accum = 0;
      for (const clip of clips) {
        const dur = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
        if (Math.abs(targetTime - accum) < 0.25) {
          targetTime = accum;
          break;
        }
        accum += dur;
        if (Math.abs(targetTime - accum) < 0.25) {
          targetTime = accum;
          break;
        }
      }
    }

    onSeek(targetTime);
  };

  const handleMouseDownScrub = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    handleTimelineScrub(e.clientX);

    const onMove = (ev: MouseEvent) => {
      handleTimelineScrub(ev.clientX);
    };

    const onUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Drag-to-trim clip handler
  const handleTrimDrag = (
    e: React.MouseEvent,
    clip: VideoClip,
    edge: 'start' | 'end'
  ) => {
    e.stopPropagation();
    const initialClientX = e.clientX;
    const initialTrimStart = clip.trimStart;
    const initialTrimEnd = clip.trimEnd;

    const onMove = (ev: MouseEvent) => {
      const deltaSec = (ev.clientX - initialClientX) / pxPerSec;
      if (edge === 'start') {
        const newStart = Math.max(0, Math.min(initialTrimEnd - 0.5, initialTrimStart + deltaSec));
        onUpdateClipTrim(clip.id, newStart, initialTrimEnd);
      } else {
        const newEnd = Math.max(initialTrimStart + 0.5, Math.min(clip.sourceDuration, initialTrimEnd + deltaSec));
        onUpdateClipTrim(clip.id, initialTrimStart, newEnd);
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Ruler tick intervals
  const rulerInterval = zoomLevel >= 2 ? 1 : 2;
  const tickCount = Math.ceil(Math.max(totalDuration, 20) / rulerInterval);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * rulerInterval);

  return (
    <div className="h-64 bg-neutral-900 border-t border-neutral-800 flex flex-col select-none relative">
      {/* Timeline Action Toolbar */}
      <div className="h-10 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Split at Playhead */}
          <button
            onClick={() => {
              if (selectedClipId) {
                onSplitClip(selectedClipId, currentTime);
                soundEngine.playSFX('whoosh');
              }
            }}
            disabled={!selectedClipId}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Split Clip at Current Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split (S)</span>
          </button>

          {/* Duplicate Clip */}
          <button
            onClick={() => {
              if (selectedClipId) {
                onDuplicateClip(selectedClipId);
                soundEngine.playSFX('pop');
              }
            }}
            disabled={!selectedClipId}
            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 transition-colors"
            title="Duplicate Clip"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Clip */}
          <button
            onClick={() => {
              if (selectedClipId) {
                onDeleteClip(selectedClipId);
                soundEngine.playSFX('whoosh');
              }
            }}
            disabled={!selectedClipId}
            className="p-1.5 rounded bg-neutral-800 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 disabled:opacity-40 transition-colors"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-1" />

          {/* Add Caption Button */}
          <button
            onClick={() => {
              onAddSubtitle(currentTime);
              soundEngine.playSFX('ding');
            }}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Add Subtitle Segment at Playhead"
          >
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Caption</span>
          </button>
        </div>

        {/* Right: Snapping & Zoom controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSnapping(!snapping)}
            className={`p-1.5 rounded transition-colors ${
              snapping ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Toggle Magnet Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
            <ZoomOut className="w-3.5 h-3.5" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.25"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-20 accent-amber-400 h-1 cursor-pointer bg-neutral-700 rounded-lg"
            />
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Track Workspace with Ruler & Tracks */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left sidebar) */}
        <div className="w-24 bg-neutral-950 border-r border-neutral-800 text-[11px] text-neutral-400 flex flex-col shrink-0 select-none z-20 shadow-md">
          {/* Header spacer aligned with ruler */}
          <div className="h-6 border-b border-neutral-800 px-2 flex items-center text-[10px] text-neutral-500 font-mono">
            TRACKS
          </div>

          {/* Track 1 Label (Video) */}
          <div className="h-16 border-b border-neutral-800 px-2 flex items-center gap-1.5 text-neutral-300">
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">V1 Video</span>
          </div>

          {/* Track 2 Label (Captions) */}
          <div className="h-10 border-b border-neutral-800 px-2 flex items-center gap-1.5 text-sky-400">
            <Type className="w-3.5 h-3.5" />
            <span className="font-semibold">T1 Text</span>
          </div>

          {/* Track 3 Label (Audio) */}
          <div className="h-10 border-b border-neutral-800 px-2 flex items-center gap-1.5 text-emerald-400">
            <Music className="w-3.5 h-3.5" />
            <span className="font-semibold">A1 Audio</span>
          </div>
        </div>

        {/* Scrollable Tracks Area */}
        <div
          ref={rulerRef}
          onMouseDown={handleMouseDownScrub}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-neutral-950/70 cursor-pointer"
        >
          <div style={{ width: `${timelineWidth}px` }} className="relative h-full">
            {/* 1. Timecode Ruler */}
            <div className="h-6 bg-neutral-950 border-b border-neutral-800 relative pointer-events-none">
              {ticks.map((timeSec) => (
                <div
                  key={timeSec}
                  style={{ left: `${timeSec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 border-l border-neutral-800 flex items-start pl-1 pt-0.5"
                >
                  <span className="text-[10px] font-mono text-neutral-500">
                    {formatShortTime(timeSec)}
                  </span>
                </div>
              ))}
            </div>

            {/* 2. Red Playhead Vertical Indicator */}
            <div
              style={{ left: `${currentTime * pxPerSec}px` }}
              className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none"
            >
              {/* Playhead Head Marker */}
              <div className="w-3 h-3 bg-rose-500 -ml-1.5 rotate-45 transform shadow-md" />
              <div className="absolute top-1 left-2 bg-rose-950/90 text-rose-300 font-mono text-[9px] px-1 rounded border border-rose-800 whitespace-nowrap">
                {formatTimecode(currentTime)}
              </div>
            </div>

            {/* 3. Track 1: Video Clips */}
            <div className="h-16 border-b border-neutral-800/80 relative p-1 flex items-center">
              {(() => {
                let currentOffset = 0;
                return clips.map((clip) => {
                  const clipDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1);
                  const clipWidth = clipDuration * pxPerSec;
                  const clipLeft = currentOffset;
                  currentOffset += clipWidth;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${Math.max(24, clipWidth)}px`,
                      }}
                      className={`absolute top-1 bottom-1 rounded-md overflow-hidden cursor-pointer group transition-shadow ${
                        isSelected
                          ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
                          : 'ring-1 ring-neutral-700 hover:ring-neutral-500'
                      } ${clip.colorLabel || 'bg-neutral-800'}`}
                    >
                      {/* Thumbnail background if available */}
                      {clip.thumbnailUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
                          style={{ backgroundImage: `url(${clip.thumbnailUrl})` }}
                        />
                      )}

                      {/* Content Info */}
                      <div className="relative z-10 px-2 py-1 flex flex-col justify-between h-full text-neutral-100">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold truncate drop-shadow">
                            {clip.name}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-300 bg-black/40 px-1 rounded">
                            {clipDuration.toFixed(1)}s
                          </span>
                        </div>
                        {clip.transition !== 'none' && (
                          <span className="text-[9px] text-amber-300/80 uppercase font-mono">
                            ⚡ {clip.transition}
                          </span>
                        )}
                      </div>

                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimDrag(e, clip, 'start')}
                        className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-neutral-900/60 hover:bg-amber-400 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                        title="Drag to Trim Start"
                      >
                        <div className="w-0.5 h-4 bg-white rounded" />
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleTrimDrag(e, clip, 'end')}
                        className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-neutral-900/60 hover:bg-amber-400 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                        title="Drag to Trim End"
                      >
                        <div className="w-0.5 h-4 bg-white rounded" />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* 4. Track 2: Subtitles & Captions */}
            <div className="h-10 border-b border-neutral-800/80 relative p-1 flex items-center">
              {subtitles.map((sub) => {
                const subDuration = sub.end - sub.start;
                const subWidth = subDuration * pxPerSec;
                const subLeft = sub.start * pxPerSec;

                return (
                  <div
                    key={sub.id}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: `${subLeft}px`,
                      width: `${Math.max(20, subWidth)}px`,
                    }}
                    className="absolute top-1 bottom-1 rounded bg-sky-950/80 border border-sky-600/60 px-2 flex items-center justify-between text-xs text-sky-200 group cursor-pointer hover:bg-sky-900"
                  >
                    <span className="truncate text-[11px] font-medium">{sub.text}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubtitle(sub.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-sky-400 hover:text-white ml-1 p-0.5"
                      title="Remove subtitle"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 5. Track 3: Audio Tracks */}
            <div className="h-10 border-b border-neutral-800/80 relative p-1 flex items-center">
              {audioTracks.map((track) => {
                const trackWidth = track.duration * pxPerSec;
                const trackLeft = track.offset * pxPerSec;

                return (
                  <div
                    key={track.id}
                    style={{
                      left: `${trackLeft}px`,
                      width: `${Math.max(30, trackWidth)}px`,
                    }}
                    className="absolute top-1 bottom-1 rounded bg-emerald-950/80 border border-emerald-600/60 px-2 flex items-center justify-between text-xs text-emerald-200"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-medium truncate">{track.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/80">
                      {Math.round(track.volume * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
