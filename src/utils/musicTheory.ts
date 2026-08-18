import { TuningConfig, TuningPresetKey, UkuleleNote, ChordMarker } from '../types/ukulele';

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

/**
 * Standard Ukulele Chord Preset Library (gCEA Standard Tuning)
 * UkuTabs style chord catalog mapping chord name/abbreviation to fret array [String 4, String 3, String 2, String 1].
 * Values: -1 = Muted/Unplayed X, 0 = Open O, 1..20 = Fretted
 */
export const UKULELE_CHORD_LIBRARY: Record<string, [number, number, number, number]> = {
  'C': [0, 0, 0, 3],
  'C7': [0, 0, 0, 1],
  'Cm': [0, 3, 3, 3],
  'Cm7': [3, 3, 3, 3],
  'C7m': [3, 3, 3, 3],
  'Cmaj7': [0, 0, 0, 2],
  'Cadd9': [0, 0, 0, 5],
  'Csus4': [0, 0, 1, 3],

  'G': [0, 2, 3, 2],
  'G7': [0, 2, 1, 2],
  'Gm': [0, 2, 3, 1],
  'Gm7': [0, 2, 1, 1],
  'G7m': [0, 2, 1, 1],
  'Gmaj7': [0, 2, 2, 2],
  'Gsus4': [0, 2, 3, 3],

  'Am': [2, 0, 0, 0],
  'A': [2, 1, 0, 0],
  'A7': [0, 1, 0, 0],
  'Am7': [0, 0, 0, 0],
  'A7m': [0, 0, 0, 0],
  'Amaj7': [1, 1, 0, 0],
  'Asus4': [2, 2, 0, 0],

  'F': [2, 0, 1, 0],
  'F7': [2, 3, 1, 0],
  'Fm': [1, 0, 1, 3],
  'Fm7': [1, 3, 1, 3],
  'F7m': [1, 3, 1, 3],
  'Fmaj7': [2, 4, 1, 0],
  'Fadd9': [0, 0, 1, 0],

  'Em': [0, 4, 3, 2],
  'E': [4, 4, 4, 2],
  'E7': [1, 2, 0, 2],
  'Em7': [0, 2, 0, 2],
  'E7m': [0, 2, 0, 2], // UkuTabs alternative shorthand
  'Emaj7': [1, 3, 0, 2],

  'Dm': [2, 2, 1, 0],
  'D': [2, 2, 2, 0],
  'D7': [2, 2, 2, 3],
  'Dm7': [2, 2, 1, 3],
  'D7m': [2, 2, 1, 3],
  'Dmaj7': [2, 2, 2, 4],
  'Dsus4': [2, 2, 3, 0],

  'Bm': [4, 2, 2, 2],
  'B': [4, 3, 2, 2],
  'B7': [2, 3, 2, 2],
  'Bm7': [2, 2, 2, 2],
  'B7m': [2, 2, 2, 2],

  'Bb': [3, 2, 1, 1],
  'Bbm': [3, 1, 1, 1],
  'Bb7': [1, 2, 1, 1],

  'Eb': [0, 3, 3, 1],
  'Ab': [5, 3, 4, 3],
  'F#m': [2, 1, 2, 0],
  'F#m7': [2, 2, 2, 0],
  'C#m': [1, 1, 0, 4],
  'C#m7': [1, 1, 0, 2]
};

export const DEFAULT_COMPOSITION_CHORD_NAMES = ['C', 'G', 'Am', 'F', 'Em', 'Dm', 'D', 'E7', 'E7m'];

export function getChordPreset(name: string): ChordMarker | null {
  const normalized = name.trim();
  if (!normalized) return null;

  // Case-insensitive lookup match
  const libraryKey = Object.keys(UKULELE_CHORD_LIBRARY).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  const frets = libraryKey ? UKULELE_CHORD_LIBRARY[libraryKey] : null;
  if (!frets) return null;

  // Determine base fret if frets exceed 4
  const positiveFrets = frets.filter(f => f > 0);
  const maxFret = positiveFrets.length ? Math.max(...positiveFrets) : 0;
  const minFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
  const baseFret = maxFret > 4 ? minFret : 1;

  return {
    name: libraryKey || normalized,
    frets: [...frets] as [number, number, number, number],
    baseFret
  };
}

/**
 * Searches the library for any existing chord names that match the given 4-string fret pattern [S4, S3, S2, S1].
 */
export function findExistingChordsByFrets(
  frets: [number, number, number, number],
  customLibrary: Record<string, [number, number, number, number]> = {}
): string[] {
  const combinedLibrary = { ...UKULELE_CHORD_LIBRARY, ...customLibrary };
  const matches: string[] = [];

  Object.entries(combinedLibrary).forEach(([chordName, chordFrets]) => {
    if (
      chordFrets[0] === frets[0] &&
      chordFrets[1] === frets[1] &&
      chordFrets[2] === frets[2] &&
      chordFrets[3] === frets[3]
    ) {
      if (!matches.includes(chordName)) {
        matches.push(chordName);
      }
    }
  });

  return matches;
}

/**
 * Automatically detects a matching chord from the defined library when all 4 strings have fingerings defined (including 0 for open).
 */
export function autoDetectChordFromBeatNotes(
  notes: UkuleleNote[],
  customPalette: ChordMarker[] = []
): ChordMarker | null {
  const activeNotes = notes.filter(n => !n.isGhost);
  const s1 = activeNotes.find(n => n.string === 1);
  const s2 = activeNotes.find(n => n.string === 2);
  const s3 = activeNotes.find(n => n.string === 3);
  const s4 = activeNotes.find(n => n.string === 4);

  // Must have fingerings defined on all 4 strings (where fret >= 0)
  if (!s1 || !s2 || !s3 || !s4) return null;

  const frets: [number, number, number, number] = [s4.fret, s3.fret, s2.fret, s1.fret];

  const customLibrary: Record<string, [number, number, number, number]> = {};
  customPalette.forEach(c => {
    customLibrary[c.name] = c.frets;
  });

  const matches = findExistingChordsByFrets(frets, customLibrary);
  if (matches.length > 0) {
    const firstMatchName = matches[0];
    const customMatch = customPalette.find(c => c.name.toLowerCase() === firstMatchName.toLowerCase());
    return customMatch || getChordPreset(firstMatchName) || createChordMarker(firstMatchName, frets);
  }

  return null;
}

export function createChordMarker(
  name: string,
  frets?: [number, number, number, number],
  baseFret?: number
): ChordMarker {
  if (frets) {
    const positiveFrets = frets.filter(f => f > 0);
    const maxFret = positiveFrets.length ? Math.max(...positiveFrets) : 0;
    const minFret = positiveFrets.length ? Math.min(...positiveFrets) : 1;
    const computedBaseFret = baseFret || (maxFret > 4 ? minFret : 1);

    return {
      name,
      frets,
      baseFret: computedBaseFret
    };
  }

  const preset = getChordPreset(name);
  if (preset) return preset;

  return {
    name,
    frets: [0, 0, 0, 0],
    baseFret: 1
  };
}

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
