/**
 * Formats seconds into MM:SS.SS or HH:MM:SS.FF
 */
export function formatTimecode(seconds: number, includeHours: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30); // 30fps frames

  const pad = (n: number, z = 2) => ('00' + n).slice(-z);

  if (includeHours || hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(frames)}`;
  }
  return `${pad(mins)}:${pad(secs)}.${pad(frames)}`;
}

/**
 * Formats compact seconds like "0:04" or "1:22"
 */
export function formatShortTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => ('00' + n).slice(-2);
  return `${mins}:${pad(secs)}`;
}

/**
 * Calculates total effective timeline duration from a list of video clips
 */
export function calculateTimelineDuration(clips: Array<{ trimStart: number; trimEnd: number; speed: number }>): number {
  return clips.reduce((sum, clip) => {
    const clipDur = Math.max(0.1, (clip.trimEnd - clip.trimStart) / (clip.speed || 1));
    return sum + clipDur;
  }, 0);
}

/**
 * Resolves which clip and what internal clip timestamp corresponds to a timeline timestamp
 */
export function resolveClipAtTime(
  clips: Array<{ id: string; trimStart: number; trimEnd: number; speed: number }>,
  timelineTime: number
): { clipIndex: number; clipTime: number; clipTimelineStart: number; clipTimelineEnd: number } | null {
  let accumulatedTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipDuration = Math.max(0.1, (clip.trimEnd - clip.trimStart) / (clip.speed || 1));
    const clipTimelineStart = accumulatedTime;
    const clipTimelineEnd = accumulatedTime + clipDuration;

    if (timelineTime >= clipTimelineStart && (timelineTime <= clipTimelineEnd || i === clips.length - 1)) {
      const offsetIntoClip = (timelineTime - clipTimelineStart) * (clip.speed || 1);
      const clipTime = Math.min(clip.trimEnd, clip.trimStart + offsetIntoClip);
      return { clipIndex: i, clipTime, clipTimelineStart, clipTimelineEnd };
    }

    accumulatedTime += clipDuration;
  }

  return null;
}
