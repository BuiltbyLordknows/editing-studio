import { AudioTrack } from '../types/editor';

/**
 * Creates audio buffers using Web Audio API for royalty-free background tracks and SFX
 */
class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates a rhythmic Lofi chill beat audio buffer and returns an audio blob URL
   */
  async generateLofiBeat(duration: number = 16): Promise<string> {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    const bpm = 85;
    const beatInterval = 60 / bpm;
    const totalBeats = Math.floor(duration / beatInterval);

    // Chords (Fmaj7 - Em7 - Dm7 - Cmaj7)
    const chords = [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [329.63, 392.0, 493.88, 587.33], // Em7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
    ];

    for (let beat = 0; beat < totalBeats; beat++) {
      const time = beat * beatInterval;

      // Kick on beat 0 and 2.5
      if (beat % 4 === 0 || (beat % 4 === 2 && beat % 2 === 0)) {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(time);
        osc.stop(time + 0.25);
      }

      // Snare on beat 2 and 4
      if (beat % 2 === 1) {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
      }

      // Vinyl chord progression every 4 beats
      if (beat % 4 === 0) {
        const chordIndex = Math.floor(beat / 4) % chords.length;
        const chord = chords[chordIndex];

        chord.forEach((freq) => {
          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          const filter = offlineCtx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, time);

          gain.gain.setValueAtTime(0.08, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + beatInterval * 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(offlineCtx.destination);

          osc.start(time);
          osc.stop(time + beatInterval * 4);
        });
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return this.bufferToWaveBlobUrl(renderedBuffer);
  }

  /**
   * Generates a cinematic tension drone & swell
   */
  async generateCinematicDrone(duration: number = 16): Promise<string> {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

    // Deep sub bass drone (55Hz / A1)
    const baseFreqs = [55, 110, 164.81];
    baseFreqs.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);

      gain.gain.setValueAtTime(0.05, 0);
      gain.gain.linearRampToValueAtTime(0.2, duration * 0.5);
      gain.gain.linearRampToValueAtTime(0.01, duration);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(duration);
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return this.bufferToWaveBlobUrl(renderedBuffer);
  }

  /**
   * Synthesizes audio buffer into a playable WAV blob
   */
  private bufferToWaveBlobUrl(buffer: AudioBuffer): string {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new DataView(new ArrayBuffer(length));
    const channels: Float32Array[] = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    function setUint16(data: number) {
      out.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      out.setUint32(pos, data, true);
      pos += 4;
    }

    // RIFF identifier
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // format chunk identifier
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data chunk identifier
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4); // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        out.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    const blob = new Blob([out], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Plays a live sound effect (Whoosh, Pop, Ding)
   */
  playSFX(type: 'whoosh' | 'pop' | 'ding') {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'ding') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1318.5, now); // E6

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.82);
      }
    } catch (e) {
      console.warn('Audio effect playback not permitted or unavailable:', e);
    }
  }
}

export const soundEngine = new SoundEngine();

export const DEFAULT_AUDIO_PRESETS: AudioTrack[] = [
  {
    id: 'track_lofi_1',
    name: 'Late Night Lofi Chills',
    category: 'ambient',
    duration: 16,
    volume: 0.65,
    offset: 0,
    muted: false,
    synthPreset: 'lofi',
  },
  {
    id: 'track_cinematic_2',
    name: 'Cinematic Deep Drone',
    category: 'cinematic',
    duration: 16,
    volume: 0.5,
    offset: 0,
    muted: false,
    synthPreset: 'cinematic',
  },
];
