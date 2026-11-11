import { AspectRatio, AudioTrack, FilterSettings, SubtitleSegment, TextOverlay, VideoClip } from '../types/editor';
import { getAspectRatioDimensions, renderCompositeFrame } from './videoRenderer';
import { calculateTimelineDuration, resolveClipAtTime } from './timecode';

export interface ExportProgress {
  percent: number;
  currentSecond: number;
  totalSeconds: number;
  status: string;
}

/**
 * Exports the composed timeline to a real playable WebM video file
 */
export async function exportTimelineVideo(
  clips: VideoClip[],
  subtitles: SubtitleSegment[],
  overlays: TextOverlay[],
  audioTracks: AudioTrack[],
  aspectRatio: AspectRatio,
  onProgress: (prog: ExportProgress) => void
): Promise<{ blob: Blob; url: string; sizeBytes: number }> {
  if (clips.length === 0) {
    throw new Error('Timeline is empty. Please add at least one clip.');
  }

  const { width, height } = getAspectRatioDimensions(aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalDuration = calculateTimelineDuration(clips);
  const totalFrames = Math.max(1, Math.round(totalDuration * fps));

  onProgress({
    percent: 0,
    currentSecond: 0,
    totalSeconds: totalDuration,
    status: 'Initializing render engine...',
  });

  // Pre-load video elements for all clips
  const clipVideos: Map<string, HTMLVideoElement> = new Map();
  for (const clip of clips) {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.preload = 'auto';
    v.src = clip.url;
    await new Promise<void>((resolve, reject) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => reject(new Error(`Failed to load video source for ${clip.name}`));
      // timeout safeguard
      setTimeout(() => resolve(), 3000);
    });
    clipVideos.set(clip.id, v);
  }

  // Set up MediaStream from canvas
  const stream = canvas.captureStream(fps);

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 6000000, // 6 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<{ blob: Blob; url: string; sizeBytes: number }>((resolve) => {
    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(finalBlob);
      resolve({ blob: finalBlob, url, sizeBytes: finalBlob.size });
    };
  });

  recorder.start();

  // Step through time frame by frame
  for (let frame = 0; frame < totalFrames; frame++) {
    const timelineTime = frame / fps;

    const clipResolved = resolveClipAtTime(clips, timelineTime);
    let activeClip: VideoClip = clips[0];
    let videoEl: HTMLVideoElement | null = null;

    if (clipResolved) {
      activeClip = clips[clipResolved.clipIndex];
      videoEl = clipVideos.get(activeClip.id) || null;
      if (videoEl) {
        videoEl.currentTime = clipResolved.clipTime;
        // wait for seek
        await new Promise<void>((res) => {
          const onSeeked = () => {
            videoEl?.removeEventListener('seeked', onSeeked);
            res();
          };
          videoEl?.addEventListener('seeked', onSeeked);
          // safeguard if seeked immediately
          setTimeout(res, 35);
        });
      }
    }

    // Active subtitles at this frame
    const activeSubs = subtitles.filter(
      (s) => timelineTime >= s.start && timelineTime <= s.end
    );

    // Active text overlays
    const activeText = overlays.filter(
      (o) => timelineTime >= o.start && timelineTime <= o.end
    );

    // Render frame
    renderCompositeFrame(
      ctx,
      videoEl,
      width,
      height,
      activeClip.filters,
      activeSubs,
      activeText
    );

    // Update progress
    const pct = Math.round(((frame + 1) / totalFrames) * 100);
    if (frame % 5 === 0 || frame === totalFrames - 1) {
      onProgress({
        percent: pct,
        currentSecond: parseFloat(timelineTime.toFixed(1)),
        totalSeconds: parseFloat(totalDuration.toFixed(1)),
        status: `Rendering frame ${frame + 1} of ${totalFrames} (${pct}%)...`,
      });
      // Allow browser tick
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress({
    percent: 100,
    currentSecond: totalDuration,
    totalSeconds: totalDuration,
    status: 'Finalizing encoding and packaging video container...',
  });

  recorder.stop();
  return recordingPromise;
}

/**
 * Captures a crisp PNG snapshot of the current frame with all active filters & text overlays
 */
export function captureFrameSnapshot(
  videoEl: HTMLVideoElement | null,
  filters: FilterSettings,
  activeSubtitles: SubtitleSegment[],
  activeOverlays: TextOverlay[],
  aspectRatio: AspectRatio
): string {
  const { width, height } = getAspectRatioDimensions(aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  renderCompositeFrame(
    ctx,
    videoEl,
    width,
    height,
    filters,
    activeSubtitles,
    activeOverlays
  );

  return canvas.toDataURL('image/png', 1.0);
}
