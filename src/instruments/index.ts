import { InstrumentId, InstrumentProfile } from '../types/ukulele';
import { UKULELE_PROFILE } from './ukulele';

export const DEFAULT_INSTRUMENT_ID: InstrumentId = 'ukulele';

export const INSTRUMENT_PROFILES: Record<InstrumentId, InstrumentProfile> = {
  ukulele: UKULELE_PROFILE
};

/**
 * Resolves a document's instrument profile. Documents saved before instrument support have no
 * instrument field and resolve to the default (ukulele).
 */
export function getInstrumentProfile(id?: InstrumentId): InstrumentProfile {
  return (id && INSTRUMENT_PROFILES[id]) || INSTRUMENT_PROFILES[DEFAULT_INSTRUMENT_ID];
}
