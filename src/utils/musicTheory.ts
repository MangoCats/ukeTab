import { TuningConfig, TabNote, ChordMarker, ChordFretLibrary, InstrumentProfile } from '../types/tab';
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
 * Returns string numbers [1, 2, ..., N] for an instrument or tuning with N strings.
 */
export function getStringNumbers(stringCount: number): number[] {
  return Array.from({ length: stringCount }, (_, i) => i + 1);
}

/**
 * Extracts chord fret array [SN, ..., S2, S1] from note objects if every string has a note defined.
 */
export function extractChordFrets(notes: TabNote[], stringCount: number): number[] | null {
  const activeNotes = notes.filter(n => !n.isGhost);
  const frets: number[] = [];

  for (let s = stringCount; s >= 1; s--) {
    const note = activeNotes.find(n => n.string === s);
    if (!note) return null;
    frets.push(note.fret);
  }
  return frets;
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
    frets: [...frets],
    baseFret
  };
}

/**
 * Searches the library for any existing chord names that match the given fret pattern [SN, ..., S1].
 */
export function findExistingChordsByFrets(
  frets: number[],
  customLibrary: ChordFretLibrary = {},
  profile: InstrumentProfile = UKULELE_PROFILE
): string[] {
  const combinedLibrary = { ...profile.chordLibrary, ...customLibrary };
  const matches: string[] = [];

  Object.entries(combinedLibrary).forEach(([chordName, chordFrets]) => {
    if (chordFrets.length === frets.length && chordFrets.every((f, i) => f === frets[i])) {
      if (!matches.includes(chordName)) {
        matches.push(chordName);
      }
    }
  });

  return matches;
}

/**
 * Automatically detects a matching chord from the defined library when all strings have fingerings defined (including 0 for open).
 */
export function autoDetectChordFromBeatNotes(
  notes: TabNote[],
  customPalette: ChordMarker[] = [],
  profile: InstrumentProfile = UKULELE_PROFILE
): ChordMarker | null {
  const frets = extractChordFrets(notes, profile.stringCount);
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
  frets?: number[],
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
    frets: Array(profile.stringCount).fill(0),
    baseFret: 1
  };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export function calculatePitch(stringIndex: number, fret: number, tuning: TuningConfig): number {
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
  currentNotes: TabNote[],
  tuning: TuningConfig,
  maxFretLimit: number = 12
): TabNote[] {
  const ghostNotes: TabNote[] = [];
  const assignedStrings = new Set(currentNotes.map(n => n.string));

  currentNotes.forEach(activeNote => {
    if (activeNote.fret < 0) return; // Muted X notes do not suggest alternate frets
    const pitch = calculatePitch(activeNote.string, activeNote.fret, tuning);

    getStringNumbers(tuning.pitches.length).forEach(targetString => {
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
 * Shifts one beat's notes by a semitone amount, keeping each note's exact pitch where possible.
 * Muted notes are unchanged. A note whose new fret is within 0..maxFret stays on its string; otherwise (in order)
 * it moves to a string with no note placed in the beat yet that plays the new pitch at the lowest fret, ties going
 * to the lower string number. A note no string can play stays on its string with the fret clamped to 0..maxFret
 * and is counted as inexact.
 */
export function transposeBeatNotes(
  notes: TabNote[],
  semitoneShift: number,
  tuning: TuningConfig,
  maxFret: number
): { notes: TabNote[]; inexactCount: number } {
  const clampOnOwnString = (note: TabNote): TabNote =>
    ({ ...note, fret: Math.max(0, Math.min(maxFret, note.fret + semitoneShift)) });

  // Indices of notes clamped on their own string from the start. A clamped note normally takes its string when its
  // turn comes, but an earlier note may already have been relocated onto it; the clamped note is then reserved and
  // the placement re-run, so a beat never ends up with two notes on one string.
  const reserved = new Set<number>();

  for (;;) {
    const result: (TabNote | null)[] = notes.map((note, idx) => {
      if (note.fret < 0) return note; // Muted X notes remain muted X
      if (reserved.has(idx)) return clampOnOwnString(note);
      const newFret = note.fret + semitoneShift;
      return newFret >= 0 && newFret <= maxFret ? { ...note, fret: newFret } : null;
    });
    const occupied = new Set(result.filter((n): n is TabNote => n !== null).map(n => n.string));
    const relocatedStrings = new Set<number>();
    let collidingIdx = -1;

    notes.forEach((note, idx) => {
      if (result[idx] || collidingIdx !== -1) return;
      const newPitch = calculatePitch(note.string, note.fret, tuning) + semitoneShift;

      let best: { string: number; fret: number } | null = null;
      for (const s of getStringNumbers(tuning.pitches.length)) {
        const fret = newPitch - tuning.pitches[s - 1];
        if (!occupied.has(s) && fret >= 0 && fret <= maxFret && (!best || fret < best.fret)) best = { string: s, fret };
      }

      if (best) {
        result[idx] = { ...note, string: best.string, fret: best.fret };
        relocatedStrings.add(best.string);
      } else {
        if (relocatedStrings.has(note.string)) collidingIdx = idx;
        result[idx] = clampOnOwnString(note);
      }
      occupied.add(result[idx]!.string);
    });

    if (collidingIdx !== -1) {
      reserved.add(collidingIdx);
      continue;
    }

    const inexactCount = notes.filter((note, idx) => {
      const placed = result[idx]!;
      return note.fret >= 0 && calculatePitch(placed.string, placed.fret, tuning) !== calculatePitch(note.string, note.fret, tuning) + semitoneShift;
    }).length;
    return { notes: result as TabNote[], inexactCount };
  }
}

/**
 * Shifts a beat's notes by a semitone amount (see transposeBeatNotes); kept for existing callers.
 */
export function transposePitches(
  notes: TabNote[],
  semitoneShift: number,
  tuning: TuningConfig,
  maxFret: number = 20
): TabNote[] {
  return transposeBeatNotes(notes, semitoneShift, tuning, maxFret).notes;
}
