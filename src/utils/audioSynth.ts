import { BeatColumn, TuningConfig, SynthVoice } from '../types/tab';
import { calculatePitch } from './musicTheory';
import { UKULELE_PROFILE } from '../instruments/ukulele';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPluck(midiNote: number, durationSec: number = 0.5, voice: SynthVoice = UKULELE_PROFILE.synthVoice) {
  const ctx = getAudioContext();
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Plucked string timbre simulation: instrument oscillator shape with closing low-pass filter
  osc.type = voice.oscillatorType;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * voice.filterStartRatio, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(freq * voice.filterEndRatio, ctx.currentTime + durationSec);

  // Envelope
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(voice.peakGain, now + voice.attackSec); // Quick attack
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec); // Natural string decay

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec);
}

export function playMetronomeClick(isAccent: boolean = false) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const freq = isAccent ? 1200 : 800;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

export function playMutedClick() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ctx.currentTime);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.035);
}

export function playBeatChord(
  beat: BeatColumn,
  tuning: TuningConfig,
  enableMetronome: boolean = false,
  isFirstBeatInMeasure: boolean = false,
  voice: SynthVoice = UKULELE_PROFILE.synthVoice
) {
  if (enableMetronome) {
    playMetronomeClick(isFirstBeatInMeasure);
  }

  if (beat.isRest || !beat.notes.length) return;

  beat.notes.forEach(note => {
    if (note.isGhost) return;
    if (note.fret < 0) {
      playMutedClick();
      return;
    }
    const pitch = calculatePitch(note.string, note.fret, tuning);
    playPluck(pitch, voice.noteDurationSec, voice);
  });
}
