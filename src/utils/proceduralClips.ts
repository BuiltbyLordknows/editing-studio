import { VideoClip } from '../types/editor';

/**
 * Creates an animated video blob in-browser using HTML5 Canvas and MediaRecorder.
 * This guarantees 100% offline, cross-origin safe video footage for testing.
 */
export async function generateProceduralClip(
  type: 'neon' | 'sunset' | 'studio' | 'hyperlapse',
  durationSeconds: number = 6
): Promise<{ url: string; thumbnailUrl: string; duration: number }> {
  const width = 640;
  const height = 360;
  const fps = 30;
  const totalFrames = durationSeconds * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(fps);
  let mimeType = 'video/webm;codecs=vp8';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<{ url: string; thumbnailUrl: string; duration: number }>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ url, thumbnailUrl, duration: durationSeconds });
    };
  });

  recorder.start();

  // Render frames sequentially
  let frame = 0;
  const renderFrame = () => {
    const t = frame / fps; // time in seconds

    ctx.save();
    if (type === 'neon') {
      // Cyberpunk Neon Cityscape
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a051b');
      grad.addColorStop(0.6, '#280c4d');
      grad.addColorStop(1, '#ff007f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Glowing grid floor
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      const horizon = height * 0.65;

      // Perspective lines
      for (let x = -width; x < width * 2; x += 60) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizon);
        ctx.lineTo(x + Math.sin(t) * 10, height);
        ctx.stroke();
      }

      // Horizontal grid lines moving
      const offset = (t * 80) % 30;
      for (let y = horizon; y < height; y += 12 + (y - horizon) * 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, y + offset * ((y - horizon) / height));
        ctx.lineTo(width, y + offset * ((y - horizon) / height));
        ctx.stroke();
      }

      // City silhouettes
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#060312';
      const buildingWidths = [40, 60, 50, 70, 45, 65, 80, 55, 45, 70, 60];
      let curX = 10;
      for (let i = 0; i < buildingWidths.length; i++) {
        const bw = buildingWidths[i];
        const bh = 70 + ((i * 37) % 110) + Math.sin(i + t * 0.5) * 5;
        ctx.fillRect(curX, horizon - bh, bw, bh);

        // Windows
        ctx.fillStyle = i % 2 === 0 ? '#ffea00' : '#00ffff';
        for (let wy = horizon - bh + 10; wy < horizon - 10; wy += 14) {
          if (Math.sin(wy * i) > 0.2) {
            ctx.fillRect(curX + 6, wy, 4, 6);
            ctx.fillRect(curX + bw - 12, wy, 4, 6);
          }
        }
        ctx.fillStyle = '#060312';
        curX += bw + 8;
      }

      // Neon Sun
      ctx.save();
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff0055';
      ctx.beginPath();
      ctx.arc(width / 2, horizon - 20, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (type === 'sunset') {
      // Golden Hour Ocean Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.6);
      skyGrad.addColorStop(0, '#1c1945');
      skyGrad.addColorStop(0.4, '#b83b5e');
      skyGrad.addColorStop(0.7, '#f08a5d');
      skyGrad.addColorStop(1, '#ffc764');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.6);

      // Glowing Sun
      ctx.save();
      ctx.fillStyle = '#fff4d2';
      ctx.shadowColor = '#ffaa33';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(width * 0.55, height * 0.45 + Math.sin(t * 0.5) * 4, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ocean with reflective waves
      const waterGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
      waterGrad.addColorStop(0, '#75283c');
      waterGrad.addColorStop(0.3, '#301b3f');
      waterGrad.addColorStop(1, '#110d24');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);

      // Wave glimmers
      ctx.strokeStyle = 'rgba(255, 220, 160, 0.45)';
      ctx.lineWidth = 1.5;
      for (let y = height * 0.62; y < height; y += 8) {
        ctx.beginPath();
        const waveOffset = Math.sin(y * 0.1 + t * 4) * 8;
        const centerX = width * 0.55 + waveOffset;
        const spread = (y - height * 0.6) * 3;
        ctx.moveTo(centerX - spread, y);
        ctx.lineTo(centerX + spread, y);
        ctx.stroke();
      }
    } else if (type === 'studio') {
      // Studio Tech Creator Setup
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#1c2438');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft studio rim glow
      const rim = ctx.createLinearGradient(0, 0, width, 0);
      rim.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      rim.addColorStop(0.5, 'transparent');
      rim.addColorStop(1, 'rgba(168, 85, 247, 0.25)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, width, height);

      // Studio microphone silhouette
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;

      // Mic Capsule
      ctx.beginPath();
      ctx.roundRect(width * 0.46, height * 0.35, 52, 90, 26);
      ctx.fill();
      ctx.stroke();

      // Sound Waveform Bars
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#38bdf8';
      const barCount = 28;
      const startX = width * 0.2;
      const barWidth = 7;
      const gap = 6;
      for (let i = 0; i < barCount; i++) {
        const freq = Math.sin(t * 6 + i * 0.4) * Math.cos(t * 3 - i * 0.2);
        const barHeight = Math.max(8, Math.abs(freq) * 75);
        const bx = startX + i * (barWidth + gap);
        const by = height * 0.76 - barHeight / 2;
        ctx.fillRect(bx, by, barWidth, barHeight);
      }
    } else {
      // Speed Highway Hyperlapse
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, width, height);

      // Vanishing point
      const vx = width / 2;
      const vy = height * 0.48;

      // Fast light streaks
      const streakCount = 45;
      for (let i = 0; i < streakCount; i++) {
        const seed = (i * 123.456) % 1;
        const speedMultiplier = 1 + seed * 2;
        const progress = ((t * speedMultiplier + seed) % 1);
        const angle = (i / streakCount) * Math.PI * 2;

        const startDist = Math.pow(progress, 2.5) * (width * 0.8);
        const streakLength = Math.max(10, progress * 80);

        const x1 = vx + Math.cos(angle) * startDist;
        const y1 = vy + Math.sin(angle) * (startDist * 0.55);
        const x2 = vx + Math.cos(angle) * (startDist + streakLength);
        const y2 = vy + Math.sin(angle) * ((startDist + streakLength) * 0.55);

        ctx.strokeStyle = i % 2 === 0 ? '#38bdf8' : '#f43f5e';
        ctx.lineWidth = Math.max(1, progress * 3.5);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.restore();

    frame++;
    if (frame < totalFrames) {
      setTimeout(renderFrame, 1000 / fps);
    } else {
      recorder.stop();
    }
  };

  renderFrame();
  return recordingPromise;
}

/**
 * Default sample project clips prepared on initial app load
 */
export async function createDefaultSampleClips(): Promise<VideoClip[]> {
  const [neon, sunset, studio] = await Promise.all([
    generateProceduralClip('neon', 5.5),
    generateProceduralClip('sunset', 6.0),
    generateProceduralClip('studio', 5.0),
  ]);

  const defaultFilters = {
    contrast: 105,
    brightness: 100,
    saturate: 110,
    sepia: 0,
    hueRotate: 0,
    blur: 0,
    vignette: 15,
    warmth: 0,
  };

  return [
    {
      id: 'clip_neon_1',
      name: 'Cyberpunk Neon City.webm',
      url: neon.url,
      thumbnailUrl: neon.thumbnailUrl,
      sourceDuration: neon.duration,
      trimStart: 0,
      trimEnd: neon.duration,
      speed: 1,
      volume: 1,
      muted: false,
      filters: { ...defaultFilters, saturate: 125, contrast: 115 },
      aspectRatio: '16:9',
      transition: 'fade-black',
      colorLabel: 'bg-fuchsia-600',
    },
    {
      id: 'clip_sunset_2',
      name: 'Golden Hour Horizon.webm',
      url: sunset.url,
      thumbnailUrl: sunset.thumbnailUrl,
      sourceDuration: sunset.duration,
      trimStart: 0.5,
      trimEnd: sunset.duration - 0.5,
      speed: 1,
      volume: 1,
      muted: false,
      filters: { ...defaultFilters, warmth: 20, contrast: 108 },
      aspectRatio: '16:9',
      transition: 'crossfade',
      colorLabel: 'bg-amber-600',
    },
    {
      id: 'clip_studio_3',
      name: 'Creator Studio B-Roll.webm',
      url: studio.url,
      thumbnailUrl: studio.thumbnailUrl,
      sourceDuration: studio.duration,
      trimStart: 0,
      trimEnd: studio.duration,
      speed: 1,
      volume: 1,
      muted: false,
      filters: { ...defaultFilters, contrast: 110, vignette: 25 },
      aspectRatio: '16:9',
      transition: 'none',
      colorLabel: 'bg-sky-600',
    },
  ];
}
