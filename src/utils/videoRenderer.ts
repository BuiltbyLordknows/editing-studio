import { AspectRatio, FilterSettings, SubtitleSegment, TextOverlay, VideoClip } from '../types/editor';

/**
 * Builds standard CSS filter string from FilterSettings
 */
export function buildFilterString(filters: FilterSettings): string {
  const parts: string[] = [];

  if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
  if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`);
  if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Maps AspectRatio type to numerical width and height
 */
export function getAspectRatioDimensions(aspect: AspectRatio): { width: number; height: number; ratio: number } {
  switch (aspect) {
    case '9:16':
      return { width: 720, height: 1280, ratio: 9 / 16 };
    case '1:1':
      return { width: 1080, height: 1080, ratio: 1 };
    case '4:5':
      return { width: 1080, height: 1350, ratio: 4 / 5 };
    case '21:9':
      return { width: 1920, height: 822, ratio: 21 / 9 };
    case '16:9':
    default:
      return { width: 1280, height: 720, ratio: 16 / 9 };
  }
}

/**
 * Draws a single composite frame to a target 2D canvas context
 */
export function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  videoEl: HTMLVideoElement | null,
  canvasWidth: number,
  canvasHeight: number,
  filters: FilterSettings,
  activeSubtitles: SubtitleSegment[],
  activeOverlays: TextOverlay[],
  options?: {
    splitComparison?: boolean;
    splitPosition?: number; // 0 to 1
    showWatermark?: boolean;
  }
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!videoEl || videoEl.readyState < 2) {
    // Placeholder standby pattern
    ctx.fillStyle = '#17171c';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#73738c';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Preparing Frame...', canvasWidth / 2, canvasHeight / 2);
    return;
  }

  const vWidth = videoEl.videoWidth || 1280;
  const vHeight = videoEl.videoHeight || 720;
  const videoRatio = vWidth / vHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawW = canvasWidth;
  let drawH = canvasHeight;
  let drawX = 0;
  let drawY = 0;

  // Fit video into canvas aspect ratio (contain style)
  if (videoRatio > canvasRatio) {
    drawH = canvasWidth / videoRatio;
    drawY = (canvasHeight - drawH) / 2;
  } else {
    drawW = canvasHeight * videoRatio;
    drawX = (canvasWidth - drawW) / 2;
  }

  const filterStr = buildFilterString(filters);

  if (options?.splitComparison) {
    const splitPos = options.splitPosition ?? 0.5;
    const splitX = canvasWidth * splitPos;

    // Left side: Raw video without filters
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, canvasHeight);
    ctx.clip();
    ctx.filter = 'none';
    ctx.drawImage(videoEl, drawX, drawY, drawW, drawH);

    // Label: RAW
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(16, 16, 68, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('RAW', 34, 35);
    ctx.restore();

    // Right side: Graded / filtered video
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, canvasWidth - splitX, canvasHeight);
    ctx.clip();
    ctx.filter = filterStr;
    ctx.drawImage(videoEl, drawX, drawY, drawW, drawH);

    // Vignette
    if (filters.vignette > 0) {
      applyVignette(ctx, canvasWidth, canvasHeight, filters.vignette);
    }

    // Label: GRADED
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(canvasWidth - 94, 16, 78, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GRADED', canvasWidth - 84, 35);
    ctx.restore();

    // Divider Line
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, canvasHeight);
    ctx.stroke();

    // Divider handle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(splitX, canvasHeight / 2, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↔', splitX, canvasHeight / 2 + 3);
    ctx.restore();
  } else {
    // Normal single rendering
    ctx.save();
    ctx.filter = filterStr;
    ctx.drawImage(videoEl, drawX, drawY, drawW, drawH);

    // Apply Warmth via canvas blend mode if present
    if (filters.warmth !== 0) {
      ctx.globalCompositeOperation = 'color';
      if (filters.warmth > 0) {
        ctx.fillStyle = `rgba(255, 140, 0, ${Math.min(0.35, filters.warmth / 100)})`;
      } else {
        ctx.fillStyle = `rgba(0, 160, 255, ${Math.min(0.35, Math.abs(filters.warmth) / 100)})`;
      }
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Vignette overlay
    if (filters.vignette > 0) {
      applyVignette(ctx, canvasWidth, canvasHeight, filters.vignette);
    }
    ctx.restore();
  }

  // Draw Subtitles
  for (const sub of activeSubtitles) {
    drawSubtitleBlock(ctx, sub, canvasWidth, canvasHeight);
  }

  // Draw Text Overlays
  for (const overlay of activeOverlays) {
    drawTextOverlay(ctx, overlay, canvasWidth, canvasHeight);
  }
}

/**
 * Draws soft radial vignette on canvas
 */
function applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) {
  ctx.save();
  const grad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72
  );
  const alpha = Math.min(0.85, intensity / 80);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Draws animated/styled subtitle
 */
function drawSubtitleBlock(ctx: CanvasRenderingContext2D, sub: SubtitleSegment, width: number, height: number) {
  ctx.save();
  const baseSize = Math.max(18, Math.round(width * 0.038));
  ctx.font = `800 ${baseSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const posY = height * 0.84;
  const centerX = width / 2;

  if (sub.preset === 'tiktok-bold') {
    // TikTok / Viral bold yellow & white with strong black stroke
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(4, baseSize * 0.22);
    ctx.strokeStyle = '#000000';
    ctx.strokeText(sub.text.toUpperCase(), centerX, posY);

    ctx.fillStyle = sub.highlight ? '#facc15' : '#ffffff';
    ctx.fillText(sub.text.toUpperCase(), centerX, posY);
  } else if (sub.preset === 'cinematic-lower-third') {
    // Cinematic letterbox subtle lower-third
    const textMetrics = ctx.measureText(sub.text);
    const boxW = textMetrics.width + 36;
    const boxH = baseSize * 1.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(centerX - boxW / 2, posY - boxH / 2, boxW, boxH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(centerX - boxW / 2, posY - boxH / 2, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${baseSize * 0.85}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(sub.text, centerX, posY);
  } else {
    // Clean minimal
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub.text, centerX, posY);
  }
  ctx.restore();
}

/**
 * Draws positioned text overlay
 */
function drawTextOverlay(ctx: CanvasRenderingContext2D, overlay: TextOverlay, width: number, height: number) {
  ctx.save();
  const posX = (overlay.x / 100) * width;
  const posY = (overlay.y / 100) * height;

  const fontPx = Math.max(14, Math.round((overlay.fontSize / 100) * (width * 0.05)));
  ctx.font = `700 ${fontPx}px "${overlay.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(overlay.text);
  const paddingX = 14;
  const paddingY = 8;
  const boxW = metrics.width + paddingX * 2;
  const boxH = fontPx * 1.35 + paddingY;

  if (overlay.bgColor && overlay.bgColor !== 'transparent') {
    ctx.fillStyle = overlay.bgColor;
    ctx.beginPath();
    ctx.roundRect(posX - boxW / 2, posY - boxH / 2, boxW, boxH, 6);
    ctx.fill();
  }

  ctx.fillStyle = overlay.textColor || '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText(overlay.text, posX, posY);

  ctx.restore();
}
