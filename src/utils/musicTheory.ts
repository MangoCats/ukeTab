import { TuningConfig, UkuleleNote, ChordMarker, ChordFretLibrary, InstrumentProfile } from '../types/ukulele';
import { UKULELE_PROFILE, UKULELE_TUNINGS, UKULELE_CHORD_LIBRARY, UKULELE_DEFAULT_CHORD_NAMES } from '../instruments/ukulele';

// Ukulele tuning and chord data live in the ukulele instrument profile; re-exported here for existing callers
export const TUNING_PRESETS = UKULELE_TUNINGS;
export { UKULELE_CHORD_LIBRARY };
export const DEFAULT_COMPOSITION_CHORD_NAMES = UKULELE_DEFAULT_CHORD_NAMES;

/**
 * Returns the default composition chord palette markers
 */
export function getDefaultChordPalette(profile: InstrumentProfile = UKULELE_PROFILE): ChordMarker[] {
  return profile.defaultChordNames.map(name => getChordPreset(name, profile) || createChordMarker(name, undefined, undefined, profile));
}

/**
 * Returns the provided palette if non-empty, otherwise falls back to the default chord palette
 */
export function getEffectiveChordPalette(palette?: ChordMarker[], profile: InstrumentProfile = UKULELE_PROFILE): ChordMarker[] {
  return palette && palette.length > 0 ? palette : getDefaultChordPalette(profile);
}

/**
 * Extracts 4-string fret array [S4, S3, S2, S1] from note objects if all 4 strings have notes defined.
 */
export function extract4StringFrets(notes: UkuleleNote[]): [number, number, number, number] | null {
  const activeNotes = notes.filter(n => !n.isGhost);
  const s1 = activeNotes.find(n => n.string === 1);
  const s2 = activeNotes.find(n => n.string === 2);
  const s3 = activeNotes.find(n => n.string === 3);
  const s4 = activeNotes.find(n => n.string === 4);

  if (!s1 || !s2 || !s3 || !s4) return null;
  return [s4.fret, s3.fret, s2.fret, s1.fret];
}

export function getChordPreset(name: string, profile: InstrumentProfile = UKULELE_PROFILE): ChordMarker | null {
  const normalized = name.trim();
  if (!normalized) return null;

  // Case-insensitive lookup match
  const libraryKey = Object.keys(profile.chordLibrary).find(
    k => k.toLowerCase() === normalized.toLowerCase()
  );

  const frets = libraryKey ? profile.chordLibrary[libraryKey] : null;
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
  customLibrary: ChordFretLibrary = {},
  profile: InstrumentProfile = UKULELE_PROFILE
): string[] {
  const combinedLibrary = { ...profile.chordLibrary, ...customLibrary };
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
  customPalette: ChordMarker[] = [],
  profile: InstrumentProfile = UKULELE_PROFILE
): ChordMarker | null {
  const frets = extract4StringFrets(notes);
  if (!frets) return null;

  const customLibrary: ChordFretLibrary = {};
  customPalette.forEach(c => {
    customLibrary[c.name] = c.frets;
  });

  const matches = findExistingChordsByFrets(frets, customLibrary, profile);
  if (matches.length > 0) {
    const firstMatchName = matches[0];
    const customMatch = customPalette.find(c => c.name.toLowerCase() === firstMatchName.toLowerCase());
    return customMatch || getChordPreset(firstMatchName, profile) || createChordMarker(firstMatchName, frets, undefined, profile);
  }

  return null;
}

export function createChordMarker(
  name: string,
  frets?: [number, number, number, number],
  baseFret?: number,
  profile: InstrumentProfile = UKULELE_PROFILE
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

  const preset = getChordPreset(name, profile);
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
  if (fret < 0) return -1;
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
    if (activeNote.fret < 0) return; // Muted X notes do not suggest alternate frets
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
    if (note.fret < 0) return note; // Muted X notes remain muted X
    const currentPitch = calculatePitch(note.string, note.fret, tuning);
    const newPitch = currentPitch + semitoneShift;
    const newFret = newPitch - tuning.pitches[note.string - 1];

    if (newFret >= 0 && newFret <= 20) {
      return { ...note, fret: newFret };
    }
    return { ...note, fret: Math.max(0, Math.min(20, newFret)) };
  });
}
