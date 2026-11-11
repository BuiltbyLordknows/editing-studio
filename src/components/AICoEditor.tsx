import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  Type,
  Flame,
  Palette,
  Check,
  Send,
  Loader2,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  AIAnalysisReport,
  CaptionPreset,
  FilterSettings,
  SubtitleSegment,
  TextOverlay,
  VideoClip,
  ViralHook,
} from '../types/editor';
import { soundEngine } from '../utils/audioSynth';

interface AICoEditorProps {
  clips: VideoClip[];
  totalDuration: number;
  activeClip: VideoClip | null;
  onApplyTrimSuggestions: (trimPoints: { start: number; end: number; reason: string }[]) => void;
  onApplyCaptions: (captions: SubtitleSegment[]) => void;
  onAddTextOverlay: (overlay: TextOverlay) => void;
  onApplyColorGrade: (filters: FilterSettings) => void;
}

export const AICoEditor: React.FC<AICoEditorProps> = ({
  clips,
  totalDuration,
  activeClip,
  onApplyTrimSuggestions,
  onApplyCaptions,
  onAddTextOverlay,
  onApplyColorGrade,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'captions' | 'hooks' | 'color'>('audit');

  // Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AIAnalysisReport | null>(null);

  // Captions state
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionTopic, setCaptionTopic] = useState('');
  const [captionPreset, setCaptionPreset] = useState<CaptionPreset>('tiktok-bold');
  const [generatedCaptions, setGeneratedCaptions] = useState<SubtitleSegment[]>([]);

  // Viral Hooks state
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [hookTopic, setHookTopic] = useState('How to level up your video edits in 60 seconds');
  const [viralHooks, setViralHooks] = useState<ViralHook[]>([]);

  // Natural Language Color Grading state
  const [isGrading, setIsGrading] = useState(false);
  const [colorPrompt, setColorPrompt] = useState('Warm 1970s vintage film with rich shadows and gold highlights');
  const [appliedColorDesc, setAppliedColorDesc] = useState<string | null>(null);

  // 1. Run AI Scene & Pacing Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await fetch('/api/ai/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeClip?.name || 'Project Timeline',
          duration: totalDuration,
          sceneDescription: `${clips.length} clips in sequence with color grade and audio`,
          targetAudience: 'Social & Content Creators',
          currentPacing: totalDuration > 15 ? 'Relaxed' : 'Fast',
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAuditResult(data.analysis);
        soundEngine.playSFX('ding');
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // 2. Generate Captions
  const handleGenerateCaptions = async () => {
    setIsGeneratingCaptions(true);
    try {
      const response = await fetch('/api/ai/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDuration: totalDuration,
          promptOrTopic: captionTopic || activeClip?.name || 'Fast paced video highlights',
          style: captionPreset,
        }),
      });

      const data = await response.json();
      if (data.captions && Array.isArray(data.captions)) {
        const segments: SubtitleSegment[] = data.captions.map((c: any, idx: number) => ({
          id: `sub_${Date.now()}_${idx}`,
          start: c.start || idx * 2.5,
          end: c.end || (idx + 1) * 2.5,
          text: c.text,
          highlight: c.highlight,
          preset: captionPreset,
        }));
        setGeneratedCaptions(segments);
        soundEngine.playSFX('pop');
      }
    } catch (err) {
      console.error('Captions generation failed:', err);
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // 3. Generate Viral Hooks
  const handleGenerateHooks = async () => {
    setIsGeneratingHooks(true);
    try {
      const response = await fetch('/api/ai/viral-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTopic: hookTopic,
          niche: 'Creative Video Production',
        }),
      });

      const data = await response.json();
      if (data.hooks) {
        setViralHooks(data.hooks);
        soundEngine.playSFX('ding');
      }
    } catch (err) {
      console.error('Hooks generation failed:', err);
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  // 4. Generate Natural Language Color Grade
  const handleApplyAIColor = async () => {
    if (!colorPrompt.trim()) return;
    setIsGrading(true);
    try {
      const response = await fetch('/api/ai/color-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodPrompt: colorPrompt }),
      });

      const data = await response.json();
      if (data.filters) {
        onApplyColorGrade(data.filters);
        setAppliedColorDesc(data.description || data.presetName || 'Applied AI Grade');
        soundEngine.playSFX('ding');
      }
    } catch (err) {
      console.error('Color grade failed:', err);
    } finally {
      setIsGrading(false);
    }
  };

  // Export SRT format
  const exportSRT = () => {
    if (generatedCaptions.length === 0) return;
    const formatSrtTime = (sec: number) => {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      const pad = (n: number, z = 2) => ('00' + n).slice(-z);
      return `${pad(hrs)}:${pad(mins)}:${pad(s)},${('000' + ms).slice(-3)}`;
    };

    let srtText = '';
    generatedCaptions.forEach((c, idx) => {
      srtText += `${idx + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinecut_subtitles_${Date.now()}.srt`;
    a.click();
  };

  return (
    <div className="flex-1 bg-neutral-900 flex flex-col h-full overflow-hidden select-none">
      {/* Top Navigation Tabs */}
      <div className="h-11 px-6 bg-neutral-950 border-b border-neutral-800 flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'bg-neutral-800 text-amber-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Scene & Jump-Cut Audit</span>
        </button>

        <button
          onClick={() => setActiveSubTab('captions')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'captions'
              ? 'bg-neutral-800 text-sky-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Auto-Captions</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hooks')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'hooks'
              ? 'bg-neutral-800 text-rose-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Viral 3s Hooks</span>
        </button>

        <button
          onClick={() => setActiveSubTab('color')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'color'
              ? 'bg-neutral-800 text-emerald-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Prompt-to-Color Grade</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {/* TAB 1: SCENE AUDIT */}
        {activeSubTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 p-5 rounded-xl bg-neutral-950 border border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gemini Video Pacing & Cut Audit
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Analyzes your current timeline duration, pacing rhythm, visual balance, and
                  suggests dead-air trimming to increase audience watch retention.
                </p>
              </div>

              <button
                disabled={isAuditing}
                onClick={handleRunAudit}
                className="px-4 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Pacing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Run Video Audit
                  </>
                )}
              </button>
            </div>

            {auditResult && (
              <div className="space-y-4">
                {/* Metric Score Cards */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-500 uppercase font-mono">Overall Grade</span>
                    <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                      {auditResult.overallRating}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-500 uppercase font-mono">Pacing Score</span>
                    <p className="text-2xl font-extrabold text-neutral-100 mt-1 font-mono">
                      {auditResult.pacingScore}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-500 uppercase font-mono">Hook Strength</span>
                    <p className="text-2xl font-extrabold text-neutral-100 mt-1 font-mono">
                      {auditResult.hookStrength}%
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                    <span className="text-[11px] text-neutral-500 uppercase font-mono">Color Balance</span>
                    <p className="text-2xl font-extrabold text-neutral-100 mt-1 font-mono">
                      {auditResult.colorBalanceScore}%
                    </p>
                  </div>
                </div>

                {/* Editorial Recommendations & Strengths */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                    <h4 className="text-xs font-bold text-emerald-400 mb-2">Strengths Identified</h4>
                    <ul className="space-y-2 text-xs text-neutral-300">
                      {auditResult.strengths?.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                    <h4 className="text-xs font-bold text-amber-400 mb-2">Key Improvement Areas</h4>
                    <ul className="space-y-2 text-xs text-neutral-300">
                      {auditResult.improvementAreas?.map((area, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Trim Points & One-Click Trim */}
                {auditResult.recommendedTrimPoints?.length > 0 && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">Recommended Jump-Cut Trims</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {auditResult.recommendedTrimPoints.map((tp) => tp.reason).join(' · ')}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onApplyTrimSuggestions(auditResult.recommendedTrimPoints);
                        soundEngine.playSFX('whoosh');
                      }}
                      className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Apply Cut Suggestions</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTO-CAPTIONS */}
        {activeSubTab === 'captions' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Type className="w-4 h-4 text-sky-400" />
                  Auto-Captions & Subtitle Generator
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Generates synchronized subtitle chunks sized for mobile retention with highlighted power words.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Video Context / Topic (or leave blank to auto-detect)
                  </label>
                  <input
                    type="text"
                    value={captionTopic}
                    onChange={(e) => setCaptionTopic(e.target.value)}
                    placeholder="e.g. 3 secret tips to speed up video editing..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-200 outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Caption Visual Style
                  </label>
                  <select
                    value={captionPreset}
                    onChange={(e) => setCaptionPreset(e.target.value as CaptionPreset)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-200 outline-none"
                  >
                    <option value="tiktok-bold">TikTok Bold Yellow</option>
                    <option value="cinematic-lower-third">Cinematic Lower Third</option>
                    <option value="clean-minimal">Clean Minimal White</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral-500 font-mono">
                  Timeline Target: {totalDuration.toFixed(1)}s
                </span>

                <button
                  disabled={isGeneratingCaptions}
                  onClick={handleGenerateCaptions}
                  className="px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGeneratingCaptions ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating Subtitles...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Synced Captions
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Captions List */}
            {generatedCaptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-200">
                    Generated Subtitle Blocks ({generatedCaptions.length})
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportSRT}
                      className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 transition-colors"
                      title="Download SRT file"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export .SRT</span>
                    </button>

                    <button
                      onClick={() => {
                        onApplyCaptions(generatedCaptions);
                        soundEngine.playSFX('ding');
                      }}
                      className="px-3.5 py-1 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-neutral-950 rounded flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Insert on Timeline Track</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {generatedCaptions.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-neutral-500 text-[11px] w-20">
                          {sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s
                        </span>
                        <p className="text-neutral-200 font-medium">
                          {sub.text}
                          {sub.highlight && (
                            <span className="ml-2 text-[10px] text-amber-400 font-mono bg-amber-500/10 px-1 py-0.5 rounded">
                              ✨ {sub.highlight}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VIRAL 3S HOOKS */}
        {activeSubTab === 'hooks' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Viral 3-Second Retention Hook Generator
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  85% of social video drops off in the first 3 seconds. Gemini creates scroll-stopping hooks with visual action cues.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={hookTopic}
                  onChange={(e) => setHookTopic(e.target.value)}
                  placeholder="Video topic or niche..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 outline-none focus:border-rose-400"
                />
                <button
                  disabled={isGeneratingHooks}
                  onClick={handleGenerateHooks}
                  className="px-4 py-2 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-neutral-950 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  {isGeneratingHooks ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Writing Hooks...
                    </>
                  ) : (
                    <>
                      <Flame className="w-3.5 h-3.5" />
                      Generate Hooks
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Viral Hooks Cards */}
            {viralHooks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-200">Recommended Hook Sequences</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {viralHooks.map((hook, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                          {hook.type}
                        </span>
                        <p className="text-xs font-bold text-neutral-100 mt-1 leading-snug">
                          "{hook.text}"
                        </p>
                        <div className="mt-3 p-2 rounded bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400">
                          <span className="text-neutral-500 font-medium block text-[10px] uppercase">
                            Visual Cue:
                          </span>
                          {hook.visualCue}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-amber-300 font-bold">
                          {hook.screenText}
                        </span>
                        <button
                          onClick={() => {
                            onAddTextOverlay({
                              id: `hook_${Date.now()}`,
                              text: hook.screenText,
                              start: 0,
                              end: 3.0,
                              x: 50,
                              y: 28,
                              fontSize: 130,
                              textColor: '#ffffff',
                              bgColor: 'rgba(239, 68, 68, 0.85)',
                              fontFamily: 'Plus Jakarta Sans',
                            });
                            soundEngine.playSFX('ding');
                          }}
                          className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-rose-400 hover:text-neutral-950 text-neutral-200 rounded font-medium transition-colors"
                        >
                          + Add Overlay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: NATURAL LANGUAGE COLOR GRADING */}
        {activeSubTab === 'color' && (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  Prompt-to-Color Grade (Natural Language LUTs)
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Describe any cinematic mood, director style, era, or lighting atmosphere. Gemini translates it into real-time color grading filter parameters.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={colorPrompt}
                  onChange={(e) => setColorPrompt(e.target.value)}
                  placeholder="e.g. Bleak dystopian Sci-Fi with cyan shadows and green undertones..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-neutral-200 outline-none focus:border-emerald-400"
                />
                <button
                  disabled={isGrading}
                  onClick={handleApplyAIColor}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-neutral-950 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  {isGrading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Computing LUT...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Apply AI Grade
                    </>
                  )}
                </button>
              </div>

              {appliedColorDesc && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{appliedColorDesc}</span>
                </div>
              )}

              {/* Sample Prompts */}
              <div className="pt-2">
                <span className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1.5">
                  Try Inspiring Styles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '1980s VHS Camcorder nostalgia with tape grain',
                    'Blade Runner 2049 neon magenta and saturated teal',
                    'Golden California coastal sunlight with soft contrast',
                    'Moody Scandinavian Nordic Noir thriller with dark shadows',
                    'Clean minimalist Silicon Valley product commercial',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setColorPrompt(preset)}
                      className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors border border-neutral-800"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
