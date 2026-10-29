import { ChordFretLibrary, InstrumentId, InstrumentProfile, TabDocument, TuningConfig } from '../types/tab';
import { adaptChordFrets } from '../utils/musicTheory';
import { UKULELE_PROFILE } from './ukulele';
import { GUITAR_PROFILE } from './guitar';
import { BASS_PROFILE } from './bass';

export const DEFAULT_INSTRUMENT_ID: InstrumentId = 'ukulele';

export const INSTRUMENT_PROFILES: Record<InstrumentId, InstrumentProfile> = {
  ukulele: UKULELE_PROFILE,
  guitar: GUITAR_PROFILE,
  bass: BASS_PROFILE
};

// Menu order for instrument pickers
export const INSTRUMENT_LIST: InstrumentProfile[] = [UKULELE_PROFILE, GUITAR_PROFILE, BASS_PROFILE];

/**
 * Resolves a document's instrument profile. Documents saved before instrument support have no
 * instrument field and resolve to the default (ukulele).
 */
export function getInstrumentProfile(id?: InstrumentId): InstrumentProfile {
  return (id && INSTRUMENT_PROFILES[id]) || INSTRUMENT_PROFILES[DEFAULT_INSTRUMENT_ID];
}

// Tuning-adapted profiles, cached per profile and tuning pitches so callers get the same object across renders
const adaptedProfiles = new WeakMap<InstrumentProfile, Map<string, InstrumentProfile>>();

/**
 * Returns the profile with its chord library moved from the default tuning to the given tuning (see
 * adaptChordFrets), or the profile itself when the tuning has the default tuning's pitches. Everything else,
 * including the default palette chord names, is the profile's own.
 */
export function getTuningProfile(profile: InstrumentProfile, tuning: TuningConfig): InstrumentProfile {
  const pitchesKey = tuning.pitches.join(',');
  if (pitchesKey === profile.defaultTuning.pitches.join(',')) return profile;

  let byTuning = adaptedProfiles.get(profile);
  if (!byTuning) {
    byTuning = new Map();
    adaptedProfiles.set(profile, byTuning);
  }

  let adapted = byTuning.get(pitchesKey);
  if (!adapted) {
    const chordLibrary: ChordFretLibrary = {};
    Object.entries(profile.chordLibrary).forEach(([name, frets]) => {
      chordLibrary[name] = adaptChordFrets(frets, profile.defaultTuning, tuning);
    });
    adapted = { ...profile, chordLibrary };
    byTuning.set(pitchesKey, adapted);
  }
  return adapted;
}

/**
 * Resolves the profile for chord work on a document: its instrument profile with chord shapes for its tuning.
 */
export function getDocumentProfile(doc: Pick<TabDocument, 'instrument' | 'tuning'>): InstrumentProfile {
  return getTuningProfile(getInstrumentProfile(doc.instrument), doc.tuning);
}
