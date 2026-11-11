/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AspectRatio,
  AudioTrack,
  FilterSettings,
  SubtitleSegment,
  TextOverlay,
  VideoClip,
} from './types/editor';
import { calculateTimelineDuration, resolveClipAtTime } from './utils/timecode';
import { createDefaultSampleClips } from './utils/proceduralClips';
import { DEFAULT_AUDIO_PRESETS, soundEngine } from './utils/audioSynth';
import { Header } from './components/Header';
import { MediaLibrary } from './components/MediaLibrary';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { AICoEditor } from './components/AICoEditor';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'color' | 'captions'>('editor');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const totalDuration = calculateTimelineDuration(clips);

  // Initialize sample project with 3 animated clips and demo subtitles on mount
  useEffect(() => {
    let mounted = true;
    createDefaultSampleClips().then((sampleClips) => {
      if (!mounted) return;
      setClips(sampleClips);
      if (sampleClips.length > 0) {
        setSelectedClipId(sampleClips[0].id);
      }

      // Initial demo subtitles
      setSubtitles([
        {
          id: 'sub_demo_1',
          start: 0.5,
          end: 3.2,
          text: 'Welcome to CineCut AI Studio',
          highlight: 'CineCut',
          preset: 'tiktok-bold',
        },
        {
          id: 'sub_demo_2',
          start: 3.8,
          end: 7.5,
          text: 'Upload any video & color grade in real-time',
          highlight: 'color grade',
          preset: 'tiktok-bold',
        },
        {
          id: 'sub_demo_3',
          start: 8.0,
          end: 12.0,
          text: 'Export real 1080p video directly in browser',
          highlight: 'directly',
          preset: 'cinematic-lower-third',
        },
      ]);

      // Initial audio track
      setAudioTracks([DEFAULT_AUDIO_PRESETS[0]]);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Playback timer loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying && totalDuration > 0) {
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= totalDuration) {
            if (isLooping) return 0;
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration, isLooping]);

  // Resolve active clip and internal clip timestamp
  const resolved = resolveClipAtTime(clips, currentTime);
  const activeClip = resolved ? clips[resolved.clipIndex] : clips[0] || null;
  const activeClipTime = resolved ? resolved.clipTime : 0;

  // Active subtitles and overlays for the current timestamp
  const activeSubtitles = subtitles.filter(
    (s) => currentTime >= s.start && currentTime <= s.end
  );
  const activeOverlays = textOverlays.filter(
    (o) => currentTime >= o.start && currentTime <= o.end
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        if (selectedClipId) {
          handleSplitClip(selectedClipId, currentTime);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        if (selectedClipId) {
          handleDeleteClip(selectedClipId);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime, clips]);

  // Split clip at playhead
  const handleSplitClip = (clipId: string, splitTimelineTime: number) => {
    const resolvedTarget = resolveClipAtTime(clips, splitTimelineTime);
    if (!resolvedTarget) return;

    const clipIndex = resolvedTarget.clipIndex;
    const clipToSplit = clips[clipIndex];
    const cutClipTime = resolvedTarget.clipTime;

    // Minimum 0.3s fragment safeguard
    if (
      cutClipTime <= clipToSplit.trimStart + 0.3 ||
      cutClipTime >= clipToSplit.trimEnd - 0.3
    ) {
      return;
    }

    const firstHalf: VideoClip = {
      ...clipToSplit,
      id: `${clipToSplit.id}_part1`,
      trimEnd: cutClipTime,
    };

    const secondHalf: VideoClip = {
      ...clipToSplit,
      id: `${clipToSplit.id}_part2_${Date.now()}`,
      trimStart: cutClipTime,
    };

    const newClips = [...clips];
    newClips.splice(clipIndex, 1, firstHalf, secondHalf);
    setClips(newClips);
    setSelectedClipId(secondHalf.id);
  };

  // Delete clip
  const handleDeleteClip = (clipId: string) => {
    const newClips = clips.filter((c) => c.id !== clipId);
    setClips(newClips);
    if (selectedClipId === clipId) {
      setSelectedClipId(newClips[0]?.id || null);
    }
  };

  // Duplicate clip
  const handleDuplicateClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const clone: VideoClip = {
      ...clip,
      id: `clip_clone_${Date.now()}`,
      name: `${clip.name} (Copy)`,
    };
    const idx = clips.findIndex((c) => c.id === clipId);
    const newClips = [...clips];
    newClips.splice(idx + 1, 0, clone);
    setClips(newClips);
    setSelectedClipId(clone.id);
  };

  // Update clip trim
  const handleUpdateClipTrim = (
    clipId: string,
    newTrimStart: number,
    newTrimEnd: number
  ) => {
    setClips((prev) =>
      prev.map((c) =>
        c.id === clipId
          ? { ...c, trimStart: newTrimStart, trimEnd: newTrimEnd }
          : c
      )
    );
  };

  // Update full clip settings
  const handleUpdateClip = (updated: VideoClip) => {
    setClips((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  // Step frame forward or backward
  const handleStepFrame = (dir: -1 | 1) => {
    const frameStep = 1 / 30;
    setCurrentTime((t) => Math.max(0, Math.min(totalDuration, t + dir * frameStep)));
  };

  // Add subtitle at time
  const handleAddSubtitle = (time: number) => {
    const newSub: SubtitleSegment = {
      id: `sub_${Date.now()}`,
      start: time,
      end: Math.min(totalDuration, time + 2.5),
      text: 'New Subtitle Caption',
      preset: 'tiktok-bold',
    };
    setSubtitles((prev) => [...prev, newSub]);
  };

  // Apply AI Trim Suggestions
  const handleApplyTrimSuggestions = (
    trimPoints: { start: number; end: number; reason: string }[]
  ) => {
    if (clips.length === 0 || trimPoints.length === 0) return;
    // Apply dead air cuts: trim start of first clip
    const firstCut = trimPoints.find((tp) => tp.start === 0);
    if (firstCut && clips[0]) {
      const cutEnd = Math.min(clips[0].trimEnd - 1, firstCut.end);
      handleUpdateClipTrim(clips[0].id, cutEnd, clips[0].trimEnd);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* 1. Header (Strict 3-zone Top Bar Contract) */}
      <Header
        timelineDuration={totalDuration}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Media Library Bin & File Uploads */}
        <MediaLibrary
          onAddClip={(newClip) => {
            setClips((prev) => [...prev, newClip]);
            setSelectedClipId(newClip.id);
          }}
          onAddAudio={(track) => setAudioTracks((prev) => [...prev, track])}
          onLoadDemoProject={() => {
            createDefaultSampleClips().then((sampleClips) => {
              setClips(sampleClips);
              setSelectedClipId(sampleClips[0]?.id || null);
            });
          }}
        />

        {/* Center: Video Player Preview Monitor */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
          <VideoPlayer
            currentTime={currentTime}
            totalDuration={totalDuration}
            isPlaying={isPlaying}
            activeClip={activeClip}
            activeClipTime={activeClipTime}
            activeSubtitles={activeSubtitles}
            activeOverlays={activeOverlays}
            aspectRatio={aspectRatio}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onSeek={(t) => setCurrentTime(t)}
            onStepFrame={handleStepFrame}
            onChangeAspectRatio={(ar) => setAspectRatio(ar)}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping(!isLooping)}
          />
        </div>

        {/* Right: Contextual Inspector or AI Co-Editor Panel */}
        {activeTab === 'editor' ? (
          <Inspector
            clip={clips.find((c) => c.id === selectedClipId) || null}
            onUpdateClip={handleUpdateClip}
          />
        ) : (
          <div className="w-96 border-l border-neutral-800 flex flex-col bg-neutral-900 shrink-0">
            <AICoEditor
              clips={clips}
              totalDuration={totalDuration}
              activeClip={activeClip}
              onApplyTrimSuggestions={handleApplyTrimSuggestions}
              onApplyCaptions={(newSubs) => setSubtitles(newSubs)}
              onAddTextOverlay={(overlay) => setTextOverlays((prev) => [...prev, overlay])}
              onApplyColorGrade={(newFilters) => {
                if (selectedClipId) {
                  const target = clips.find((c) => c.id === selectedClipId);
                  if (target) {
                    handleUpdateClip({ ...target, filters: newFilters });
                  }
                } else if (clips[0]) {
                  handleUpdateClip({ ...clips[0], filters: newFilters });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 3. Bottom: Multi-Track Timeline */}
      <Timeline
        clips={clips}
        subtitles={subtitles}
        audioTracks={audioTracks}
        currentTime={currentTime}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        onSelectClip={(id) => setSelectedClipId(id)}
        onSeek={(t) => setCurrentTime(t)}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onUpdateClipTrim={handleUpdateClipTrim}
        onAddSubtitle={handleAddSubtitle}
        onDeleteSubtitle={(id) => setSubtitles((prev) => prev.filter((s) => s.id !== id))}
      />

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        clips={clips}
        subtitles={subtitles}
        textOverlays={textOverlays}
        audioTracks={audioTracks}
        aspectRatio={aspectRatio}
        totalDuration={totalDuration}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
