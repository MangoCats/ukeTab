import { Midi } from '@tonejs/midi';
import { UkuleleTabDocument, Measure, BeatColumn, UkuleleNote, DurationType, TuningConfig, ChordMarker } from '../types/ukulele';
import { TUNING_PRESETS, autoDetectChordFromBeatNotes, DEFAULT_COMPOSITION_CHORD_NAMES, getChordPreset, createChordMarker } from './musicTheory';

/**
 * Parses a MIDI ArrayBuffer and converts it into a draft UkuleleTabDocument.
 */
export function parseMidiToUkuleleTab(
  arrayBuffer: ArrayBuffer,
  fileName: string = 'Imported Song'
): UkuleleTabDocument {
  const midi = new Midi(arrayBuffer);

  const songTitle = midi.header.name || fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const tempo = Math.round(midi.header.tempos[0]?.bpm || 120);
  const timeSigNumerator = midi.header.timeSignatures[0]?.timeSignature[0] || 4;
  const timeSigDenominator = midi.header.timeSignatures[0]?.timeSignature[1] || 4;
  const timeSig: [number, number] = [timeSigNumerator, timeSigDenominator];

  const tuning: TuningConfig = TUNING_PRESETS.gCEA;

  // Flatten active note events across non-empty tracks
  interface FlatNote {
    midi: number;
    time: number; // in seconds
    duration: number; // in seconds
  }

  const allNotes: FlatNote[] = [];

  midi.tracks.forEach(track => {
    track.notes.forEach(note => {
      allNotes.push({
        midi: note.midi,
        time: note.time,
        duration: note.duration
      });
    });
  });

  // Sort notes chronologically
  allNotes.sort((a, b) => a.time - b.time);

  if (allNotes.length === 0) {
    throw new Error('MIDI file contains no note events.');
  }

  const secondsPerBeat = 60 / tempo;
  const secondsPerMeasure = secondsPerBeat * timeSigNumerator;

  // Group notes into measure buckets
  const measureBuckets: Map<number, FlatNote[]> = new Map();

  allNotes.forEach(n => {
    const mIdx = Math.floor(n.time / secondsPerMeasure);
    if (!measureBuckets.has(mIdx)) {
      measureBuckets.set(mIdx, []);
    }
    measureBuckets.get(mIdx)!.push(n);
  });

  const totalMeasures = Math.max(1, Math.max(...Array.from(measureBuckets.keys())) + 1);

  const measures: Measure[] = [];

  for (let mIdx = 0; mIdx < totalMeasures; mIdx++) {
    const notesInMeasure = measureBuckets.get(mIdx) || [];
    const measureStartTime = mIdx * secondsPerMeasure;

    // Subdivide measure into beats (4 beats for 4/4)
    const beatColumns: BeatColumn[] = [];

    for (let bIdx = 0; bIdx < timeSigNumerator; bIdx++) {
      const beatStartTime = measureStartTime + bIdx * secondsPerBeat;
      const beatEndTime = beatStartTime + secondsPerBeat;

      // Find notes that start within this beat window
      const beatNotes = notesInMeasure.filter(n => n.time >= beatStartTime - 0.05 && n.time < beatEndTime - 0.05);

      const ukeNotes: UkuleleNote[] = [];
      const assignedStrings = new Set<1 | 2 | 3 | 4>();

      if (beatNotes.length > 0) {
        // Sort beat notes descending by pitch to map higher notes to upper strings (String 1 A4)
        beatNotes.sort((a, b) => b.midi - a.midi);

        beatNotes.forEach((bn, nIdx) => {
          let pitch = bn.midi;

          // Transpose pitch into Ukulele High-G pitch range [60..84] if needed
          while (pitch < 60) pitch += 12;
          while (pitch > 84) pitch -= 12;

          // Solve optimal string assignment s in [1, 2, 3, 4]
          // String 1 (A4=69), String 2 (E4=64), String 3 (C4=60), String 4 (g4=67)
          const targetStrings: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
          let bestString: (1 | 2 | 3 | 4) | null = null;
          let bestFret = 999;

          for (const s of targetStrings) {
            if (!assignedStrings.has(s)) {
              const fret = pitch - tuning.pitches[s - 1];
              if (fret >= 0 && fret <= 15) {
                if (fret < bestFret) {
                  bestFret = fret;
                  bestString = s;
                }
              }
            }
          }

          // Fallback if exact match unavailable
          if (!bestString) {
            for (const s of targetStrings) {
              if (!assignedStrings.has(s)) {
                bestString = s;
                bestFret = Math.max(0, Math.min(15, pitch - tuning.pitches[s - 1]));
                break;
              }
            }
          }

          if (bestString) {
            assignedStrings.add(bestString);
            ukeNotes.push({
              id: `midi-n-${mIdx}-${bIdx}-${nIdx}`,
              string: bestString,
              fret: bestFret
            });
          }
        });
      }

      // Determine beat duration type
      let duration: DurationType = '1/4';
      let isRest = ukeNotes.length === 0;

      const autoChord = autoDetectChordFromBeatNotes(ukeNotes);

      beatColumns.push({
        id: `b-midi-${mIdx + 1}-${bIdx + 1}`,
        duration: duration,
        isRest: isRest,
        notes: ukeNotes,
        chord: autoChord || undefined
      });
    }

    measures.push({
      id: `m-midi-${mIdx + 1}`,
      index: mIdx + 1,
      timeSignature: timeSig,
      beats: beatColumns
    });
  }

  const chordPalette = DEFAULT_COMPOSITION_CHORD_NAMES.map(name => getChordPreset(name) || createChordMarker(name));

  return {
    id: `tab-midi-${Date.now()}`,
    title: songTitle,
    artist: 'MIDI Import',
    tempo: tempo,
    keySignature: 'C',
    tuning: tuning,
    layout: {
      stemsPlacement: 'below',
      zoomScale: 1.0,
      measuresPerSystem: 4,
      maxFretLimit: 12
    },
    measures: measures,
    chordPalette: chordPalette
  };
}
