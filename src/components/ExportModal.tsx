import React, { useState } from 'react';
import {
  Download,
  X,
  CheckCircle2,
  Video,
  FileCode,
  Image as ImageIcon,
  Loader2,
  Film,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AspectRatio, AudioTrack, SubtitleSegment, TextOverlay, VideoClip } from '../types/editor';
import { exportTimelineVideo, ExportProgress, captureFrameSnapshot } from '../utils/exportVideo';
import { formatTimecode } from '../utils/timecode';
import { soundEngine } from '../utils/audioSynth';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: VideoClip[];
  subtitles: SubtitleSegment[];
  textOverlays: TextOverlay[];
  audioTracks: AudioTrack[];
  aspectRatio: AspectRatio;
  totalDuration: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  clips,
  subtitles,
  textOverlays,
  audioTracks,
  aspectRatio,
  totalDuration,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setDownloadUrl(null);

    try {
      const result = await exportTimelineVideo(
        clips,
        subtitles,
        textOverlays,
        audioTracks,
        aspectRatio,
        (prog) => setProgress(prog)
      );

      setDownloadUrl(result.url);
      setFileSizeBytes(result.sizeBytes);
      soundEngine.playSFX('ding');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `cinecut_export_${Date.now()}.webm`;
    a.click();
  };

  // Export EDL / JSON Project File
  const handleExportProjectJSON = () => {
    const projectData = {
      title: 'CineCut Project',
      version: '2.4',
      aspectRatio,
      totalDuration,
      clips,
      subtitles,
      textOverlays,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinecut_project_${Date.now()}.json`;
    a.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-100">Render & Export Video</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-neutral-300">
          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800/80">
            <div>
              <span className="text-[10px] text-neutral-500 font-mono uppercase block">Duration</span>
              <p className="font-mono text-sm font-bold text-neutral-200 mt-0.5">
                {formatTimecode(totalDuration)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 font-mono uppercase block">Aspect Ratio</span>
              <p className="font-mono text-sm font-bold text-neutral-200 mt-0.5">{aspectRatio}</p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 font-mono uppercase block">Format</span>
              <p className="font-mono text-sm font-bold text-amber-400 mt-0.5">WebM / VP9</p>
            </div>
          </div>

          {/* Progress / Status Display */}
          {isExporting && progress && (
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering Video Stream...
                </span>
                <span className="font-mono font-bold text-neutral-200">{progress.percent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-500 font-mono truncate">{progress.status}</p>
            </div>
          )}

          {/* Completed State */}
          {downloadUrl && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Export Complete!
                </span>
                <span className="text-neutral-400 font-mono text-[11px]">
                  {formatFileSize(fileSizeBytes)}
                </span>
              </div>

              {/* Video Preview */}
              <div className="rounded-lg overflow-hidden border border-neutral-800 max-h-40 bg-black flex items-center justify-center">
                <video src={downloadUrl} controls className="max-h-40 w-auto" />
              </div>

              <button
                onClick={handleDownloadVideo}
                className="w-full py-2.5 text-xs font-bold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Video File (.webm)</span>
              </button>
            </div>
          )}

          {/* Initial Action Button */}
          {!isExporting && !downloadUrl && (
            <button
              onClick={handleStartExport}
              disabled={clips.length === 0}
              className="w-full py-3 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              <span>Start Client-Side Render</span>
            </button>
          )}

          {/* Secondary Exports (Project EDL / JSON) */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-500 text-[11px]">Need to open in Premiere or DaVinci?</span>
            <button
              onClick={handleExportProjectJSON}
              className="text-neutral-300 hover:text-white flex items-center gap-1 text-[11px] px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export Project JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
