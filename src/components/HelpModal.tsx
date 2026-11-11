import React from 'react';
import { X, Keyboard, Sparkles, Scissors, Sliders, Upload, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-100">CineCut AI Video Editing Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-neutral-300 max-h-[75vh] overflow-y-auto">
          {/* Quick Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              How To Edit Your Videos
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-3">
                <Upload className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-200">1. Upload or Drop Your Videos</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Drag and drop your MP4, WebM, MOV, or MKV files into the Media Bin. They load instantly with in-browser GPU acceleration.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-3">
                <Scissors className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-200">2. Trim & Split Clips</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Drag the yellow left and right edge handles on any clip to trim. Place the playhead and press <kbd className="bg-neutral-800 text-amber-300 px-1 py-0.5 rounded font-mono">S</kbd> to split.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-200">3. AI Co-Editor Enhancements</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Switch to the AI Assistant tab to auto-generate TikTok/Reels captions, detect dead air jump-cuts, generate 3-second viral hooks, or apply prompt-based color grades.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-3">
                <Sliders className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-200">4. Compare & Export</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    Use the "Compare" button on the player to see side-by-side RAW vs GRADED footage. Click "Export Video" to render into a real WebM/MP4 file right inside your browser!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-amber-400" /> Keyboard Shortcuts
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Play / Pause</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  Space
                </kbd>
              </div>

              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Split Clip at Playhead</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  S
                </kbd>
              </div>

              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Step Backward 1 Frame</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  ←
                </kbd>
              </div>

              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Step Forward 1 Frame</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  →
                </kbd>
              </div>

              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Delete Selected Clip</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  Del / Backspace
                </kbd>
              </div>

              <div className="p-2 rounded bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400">Return to Start</span>
                <kbd className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono text-neutral-200">
                  Home
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
