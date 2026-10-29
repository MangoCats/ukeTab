import { InstrumentId, InstrumentProfile } from '../types/tab';
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
