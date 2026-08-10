import { TuningConfig, TuningPresetKey, UkuleleNote } from '../types/ukulele';

// Standard Ukulele Tunings Catalog
export const TUNING_PRESETS: Record<TuningPresetKey, TuningConfig> = {
  gCEA: {
    key: 'gCEA',
    name: 'Standard High-G (gCEA)',
    pitches: [69, 64, 60, 67], // String 1: A4 (69), String 2: E4 (64), String 3: C4 (60), String 4: G4 (67)
    stringsDisplay: ['A4', 'E4', 'C4', 'g4']
  },
  GCEA: {
    key: 'GCEA',
    name: 'Linear Low-G (GCEA)',
    pitches: [69, 64, 60, 55], // String 4: G3 (55)
    stringsDisplay: ['A4', 'E4', 'C4', 'G3']
  },
  DGBE: {
    key: 'DGBE',
    name: 'Baritone (DGBE)',
    pitches: [64, 59, 55, 50], // String 1: E4 (64), String 2: B3 (59), String 3: G3 (55), String 4: D3 (50)
    stringsDisplay: ['E4', 'B3', 'G3', 'D3']
  },
  'aDF#B': {
    key: 'aDF#B',
    name: 'Soprano D-Tuning (aDF#B)',
    pitches: [71, 66, 62, 69], // String 1: B4 (71), String 2: F#4 (66), String 3: D4 (62), String 4: A4 (69)
    stringsDisplay: ['B4', 'F#4', 'D4', 'a4']
  },
  custom: {
    key: 'custom',
    name: 'Custom Tuning',
    pitches: [69, 64, 60, 67],
    stringsDisplay: ['S1', 'S2', 'S3', 'S4']
  }
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function calculatePitch(stringIndex: 1 | 2 | 3 | 4, fret: number, tuning: TuningConfig): number {
  return tuning.pitches[stringIndex - 1] + fret;
}

export function getBeatDurationMs(beat: { duration: string; isDotted?: boolean; isTriplet?: boolean }, tempo: number, playbackSpeed: number = 1.0): number {
  const quarterMs = 60000 / tempo;
  let multiplier = 1.0;
  switch (beat.duration) {
    case '1/1': multiplier = 4.0; break;
    case '1/2': multiplier = 2.0; break;
    case '1/4': multiplier = 1.0; break;
    case '1/8': multiplier = 0.5; break;
    case '1/16': multiplier = 0.25; break;
    case '1/32': multiplier = 0.125; break;
  }
  if (beat.isDotted) {
    multiplier *= 1.5;
  }
  if (beat.isTriplet) {
    multiplier *= (2 / 3);
  }
  return (quarterMs * multiplier) / playbackSpeed;
}

/**
 * Calculates alternate fret suggestions on unassigned strings for a given set of notes in a beat.
 * Capped by user-configured maxFretLimit (default 12).
 */
export function getAlternateFretSuggestions(
  currentNotes: UkuleleNote[],
  tuning: TuningConfig,
  maxFretLimit: number = 12
): UkuleleNote[] {
  const ghostNotes: UkuleleNote[] = [];
  const assignedStrings = new Set(currentNotes.map(n => n.string));

  currentNotes.forEach(activeNote => {
    const pitch = calculatePitch(activeNote.string, activeNote.fret, tuning);

    ([1, 2, 3, 4] as const).forEach(targetString => {
      if (!assignedStrings.has(targetString)) {
        const candidateFret = pitch - tuning.pitches[targetString - 1];
        if (candidateFret >= 0 && candidateFret <= maxFretLimit) {
          ghostNotes.push({
            id: `ghost-${activeNote.id}-s${targetString}-f${candidateFret}`,
            string: targetString,
            fret: candidateFret,
            isGhost: true
          });
        }
      }
    });
  });

  return ghostNotes;
}

/**
 * Shifts key by a given semitone amount, adjusting fret numbers across the document.
 */
export function transposePitches(
  notes: UkuleleNote[],
  semitoneShift: number,
  tuning: TuningConfig
): UkuleleNote[] {
  return notes.map(note => {
    const currentPitch = calculatePitch(note.string, note.fret, tuning);
    const newPitch = currentPitch + semitoneShift;
    const newFret = newPitch - tuning.pitches[note.string - 1];

    if (newFret >= 0 && newFret <= 20) {
      return { ...note, fret: newFret };
    }
    return { ...note, fret: Math.max(0, Math.min(20, newFret)) };
  });
}
