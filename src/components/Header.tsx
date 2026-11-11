import React from 'react';
import { Film, Download, Sparkles, Sliders, Type, HelpCircle } from 'lucide-react';
import { formatTimecode } from '../utils/timecode';

interface HeaderProps {
  timelineDuration: number;
  activeTab: 'editor' | 'ai' | 'color' | 'captions';
  onTabChange: (tab: 'editor' | 'ai' | 'color' | 'captions') => void;
  onOpenExport: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timelineDuration,
  activeTab,
  onTabChange,
  onOpenExport,
  onOpenHelp,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 bg-neutral-900/90 border-b border-neutral-800 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-neutral-950 font-bold shadow-md shadow-amber-500/20">
          <Film className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
        </div>
        <a href="/" className="text-base font-bold tracking-tight text-neutral-100 hover:text-white transition-colors">
          CineCut <span className="text-amber-400">AI</span>
        </a>
      </div>

      {/* Zone 2: 4-5 concise single-line nav / workspace tabs */}
      <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium text-neutral-400">
        <button
          onClick={() => onTabChange('editor')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'editor'
              ? 'bg-neutral-800 text-neutral-100'
              : 'hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Timeline Studio</span>
        </button>

        <button
          onClick={() => onTabChange('ai')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-neutral-800 text-amber-300'
              : 'hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Assistant</span>
        </button>

        <button
          onClick={() => onTabChange('color')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'color'
              ? 'bg-neutral-800 text-neutral-100'
              : 'hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Color & LUTs</span>
        </button>

        <button
          onClick={() => onTabChange('captions')}
          className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeTab === 'captions'
              ? 'bg-neutral-800 text-neutral-100'
              : 'hover:text-neutral-200 hover:bg-neutral-800/50'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Captions & Text</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-md transition-colors whitespace-nowrap shrink-0 ml-1"
          title="Editing Shortcuts & Guide"
          aria-label="Editing shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
          <span>Duration</span>
          <span className="text-neutral-200 font-semibold">{formatTimecode(timelineDuration)}</span>
        </div>

        <button
          onClick={onOpenExport}
          className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-lg transition-all flex items-center gap-2 shadow-sm shadow-amber-500/20 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
