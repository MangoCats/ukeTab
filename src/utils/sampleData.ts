import { UkuleleTabDocument } from '../types/ukulele';
import { TUNING_PRESETS } from './musicTheory';

export const SAMPLE_TAB_DOCUMENT: UkuleleTabDocument = {
  id: 'tab-aloha-groove-001',
  title: 'Aloha Ukulele Groove',
  artist: 'Traditional Ukulele Spec',
  tempo: 100,
  keySignature: 'C',
  tuning: TUNING_PRESETS.gCEA,
  layout: {
    stemsPlacement: 'below',
    zoomScale: 1.0,
    measuresPerSystem: 4,
    maxFretLimit: 12 // Default max fret limit: 12
  },
  measures: [
    {
      id: 'm-1',
      index: 1,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'b1-1',
          duration: '1/4',
          notes: [{ id: 'n1-1', string: 4, fret: 0 }, { id: 'n1-2', string: 3, fret: 0 }],
          lyric: 'A-'
        },
        {
          id: 'b1-2',
          duration: '1/4',
          notes: [{ id: 'n1-3', string: 2, fret: 0 }],
          lyric: 'lo-'
        },
        {
          id: 'b1-3',
          duration: '1/8',
          notes: [{ id: 'n1-4', string: 1, fret: 3 }],
          lyric: 'ha'
        },
        {
          id: 'b1-4',
          duration: '1/8',
          notes: [{ id: 'n1-5', string: 1, fret: 0 }],
          lyric: 'Oe'
        }
      ]
    },
    {
      id: 'm-2',
      index: 2,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'b2-1',
          duration: '1/2',
          notes: [{ id: 'n2-1', string: 3, fret: 2 }, { id: 'n2-2', string: 1, fret: 3 }],
          lyric: 'Ku-'
        },
        {
          id: 'b2-2',
          duration: '1/4',
          notes: [{ id: 'n2-3', string: 2, fret: 1 }],
          lyric: 'u'
        },
        {
          id: 'b2-3',
          duration: '1/4',
          notes: [{ id: 'n2-4', string: 1, fret: 0 }],
          lyric: 'I-'
        }
      ]
    },
    {
      id: 'm-3',
      index: 3,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'b3-1',
          duration: '1/4',
          notes: [{ id: 'n3-1', string: 4, fret: 0 }, { id: 'n3-2', string: 2, fret: 3 }],
          lyric: 'po'
        },
        {
          id: 'b3-2',
          duration: '1/8',
          notes: [{ id: 'n3-3', string: 1, fret: 2 }]
        },
        {
          id: 'b3-3',
          duration: '1/8',
          notes: [{ id: 'n3-4', string: 1, fret: 3 }]
        },
        {
          id: 'b3-4',
          duration: '1/4',
          notes: [{ id: 'n3-5', string: 3, fret: 0 }]
        }
      ]
    },
    {
      id: 'm-4',
      index: 4,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'b4-1',
          duration: '1/1',
          notes: [
            { id: 'n4-1', string: 4, fret: 0 },
            { id: 'n4-2', string: 3, fret: 0 },
            { id: 'n4-3', string: 2, fret: 0 },
            { id: 'n4-4', string: 1, fret: 3 }
          ],
          lyric: 'Aloha!'
        }
      ]
    }
  ]
};
