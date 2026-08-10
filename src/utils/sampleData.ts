import { UkuleleTabDocument } from '../types/ukulele';
import { TUNING_PRESETS } from './musicTheory';

export const THREE_IS_A_MAGIC_NUMBER_TAB: UkuleleTabDocument = {
  id: 'tab-three-is-a-magic-number-001',
  title: 'Three Is a Magic Number',
  artist: 'Bob Dorough (Schoolhouse Rock!)',
  tempo: 112,
  keySignature: 'G',
  tuning: TUNING_PRESETS.gCEA,
  layout: {
    stemsPlacement: 'below',
    zoomScale: 1.0,
    measuresPerSystem: 4,
    maxFretLimit: 12
  },
  measures: [
    {
      id: 'm1',
      index: 1,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b1-1',
          duration: '1/4',
          notes: [
            { id: 'n1-1', string: 4, fret: 0 },
            { id: 'n1-2', string: 3, fret: 2 },
            { id: 'n1-3', string: 2, fret: 3 },
            { id: 'n1-4', string: 1, fret: 2 }
          ],
          lyric: 'Three...'
        },
        {
          id: 'b1-2',
          duration: '1/4',
          notes: [{ id: 'n1-5', string: 3, fret: 2 }]
        },
        {
          id: 'b1-3',
          duration: '1/4',
          notes: [{ id: 'n1-6', string: 2, fret: 3 }]
        }
      ]
    },
    {
      id: 'm2',
      index: 2,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b2-1',
          duration: '1/4',
          notes: [
            { id: 'n2-1', string: 4, fret: 0 },
            { id: 'n2-2', string: 3, fret: 2 },
            { id: 'n2-3', string: 2, fret: 3 },
            { id: 'n2-4', string: 1, fret: 2 }
          ],
          lyric: 'is'
        },
        {
          id: 'b2-2',
          duration: '1/4',
          notes: [{ id: 'n2-5', string: 1, fret: 2 }],
          lyric: 'a'
        },
        {
          id: 'b2-3',
          duration: '1/4',
          notes: [{ id: 'n2-6', string: 1, fret: 5 }],
          lyric: 'ma-'
        }
      ]
    },
    {
      id: 'm3',
      index: 3,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b3-1',
          duration: '1/2',
          notes: [
            { id: 'n3-1', string: 4, fret: 0 },
            { id: 'n3-2', string: 3, fret: 0 },
            { id: 'n3-3', string: 2, fret: 0 },
            { id: 'n3-4', string: 1, fret: 3 }
          ],
          lyric: 'gic'
        },
        {
          id: 'b3-2',
          duration: '1/4',
          notes: [{ id: 'n3-5', string: 1, fret: 2 }],
          lyric: 'num-'
        }
      ]
    },
    {
      id: 'm4',
      index: 4,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b4-1',
          duration: '1/2',
          isDotted: true,
          notes: [
            { id: 'n4-1', string: 4, fret: 0 },
            { id: 'n4-2', string: 3, fret: 2 },
            { id: 'n4-3', string: 2, fret: 3 },
            { id: 'n4-4', string: 1, fret: 2 }
          ],
          lyric: 'ber.'
        }
      ]
    },
    {
      id: 'm5',
      index: 5,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b5-1',
          duration: '1/4',
          notes: [
            { id: 'n5-1', string: 4, fret: 2 },
            { id: 'n5-2', string: 3, fret: 0 },
            { id: 'n5-3', string: 2, fret: 2 },
            { id: 'n5-4', string: 1, fret: 0 }
          ],
          lyric: 'Yes'
        },
        {
          id: 'b5-2',
          duration: '1/4',
          notes: [{ id: 'n5-5', string: 2, fret: 2 }],
          lyric: 'it'
        },
        {
          id: 'b5-3',
          duration: '1/4',
          notes: [{ id: 'n5-6', string: 1, fret: 3 }],
          lyric: 'is,'
        }
      ]
    },
    {
      id: 'm6',
      index: 6,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b6-1',
          duration: '1/4',
          notes: [
            { id: 'n6-1', string: 4, fret: 2 },
            { id: 'n6-2', string: 3, fret: 0 },
            { id: 'n6-3', string: 2, fret: 2 },
            { id: 'n6-4', string: 1, fret: 0 }
          ],
          lyric: "it's"
        },
        {
          id: 'b6-2',
          duration: '1/4',
          notes: [{ id: 'n6-5', string: 1, fret: 2 }],
          lyric: 'a'
        },
        {
          id: 'b6-3',
          duration: '1/4',
          notes: [{ id: 'n6-6', string: 1, fret: 0 }],
          lyric: 'ma-'
        }
      ]
    },
    {
      id: 'm7',
      index: 7,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b7-1',
          duration: '1/4',
          notes: [
            { id: 'n7-1', string: 4, fret: 0 },
            { id: 'n7-2', string: 3, fret: 2 },
            { id: 'n7-3', string: 2, fret: 3 },
            { id: 'n7-4', string: 1, fret: 2 }
          ],
          lyric: 'gic'
        },
        {
          id: 'b7-2',
          duration: '1/4',
          notes: [{ id: 'n7-5', string: 1, fret: 2 }],
          lyric: 'num-'
        },
        {
          id: 'b7-3',
          duration: '1/4',
          notes: [{ id: 'n7-6', string: 2, fret: 3 }],
          lyric: 'ber!'
        }
      ]
    },
    {
      id: 'm8',
      index: 8,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b8-1',
          duration: '1/4',
          notes: [{ id: 'n8-1', string: 1, fret: 2 }]
        },
        {
          id: 'b8-2',
          duration: '1/4',
          notes: [{ id: 'n8-2', string: 1, fret: 5 }]
        },
        {
          id: 'b8-3',
          duration: '1/4',
          notes: [
            { id: 'n8-3', string: 4, fret: 0 },
            { id: 'n8-4', string: 3, fret: 2 },
            { id: 'n8-5', string: 2, fret: 3 },
            { id: 'n8-6', string: 1, fret: 2 }
          ]
        }
      ]
    },
    {
      id: 'm9',
      index: 9,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b9-1',
          duration: '1/4',
          notes: [
            { id: 'n9-1', string: 4, fret: 0 },
            { id: 'n9-2', string: 3, fret: 0 },
            { id: 'n9-3', string: 2, fret: 0 },
            { id: 'n9-4', string: 1, fret: 3 }
          ],
          lyric: 'Some-'
        },
        {
          id: 'b9-2',
          duration: '1/4',
          notes: [{ id: 'n9-5', string: 1, fret: 3 }],
          lyric: 'where'
        },
        {
          id: 'b9-3',
          duration: '1/4',
          notes: [{ id: 'n9-6', string: 1, fret: 5 }],
          lyric: 'in'
        }
      ]
    },
    {
      id: 'm10',
      index: 10,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b10-1',
          duration: '1/4',
          notes: [
            { id: 'n10-1', string: 4, fret: 0 },
            { id: 'n10-2', string: 3, fret: 2 },
            { id: 'n10-3', string: 2, fret: 3 },
            { id: 'n10-4', string: 1, fret: 2 }
          ],
          lyric: 'that'
        },
        {
          id: 'b10-2',
          duration: '1/4',
          notes: [{ id: 'n10-5', string: 1, fret: 2 }],
          lyric: 'mys-'
        },
        {
          id: 'b10-3',
          duration: '1/4',
          notes: [{ id: 'n10-6', string: 2, fret: 3 }],
          lyric: 'tic'
        }
      ]
    },
    {
      id: 'm11',
      index: 11,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b11-1',
          duration: '1/4',
          notes: [
            { id: 'n11-1', string: 4, fret: 2 },
            { id: 'n11-2', string: 3, fret: 0 },
            { id: 'n11-3', string: 2, fret: 2 },
            { id: 'n11-4', string: 1, fret: 0 }
          ],
          lyric: 'num-'
        },
        {
          id: 'b11-2',
          duration: '1/4',
          notes: [{ id: 'n11-5', string: 1, fret: 0 }],
          lyric: 'ber'
        },
        {
          id: 'b11-3',
          duration: '1/4',
          notes: [{ id: 'n11-6', string: 1, fret: 2 }],
          lyric: 'three!'
        }
      ]
    },
    {
      id: 'm12',
      index: 12,
      timeSignature: [3, 4],
      beats: [
        {
          id: 'b12-1',
          duration: '1/2',
          isDotted: true,
          notes: [
            { id: 'n12-1', string: 4, fret: 0 },
            { id: 'n12-2', string: 3, fret: 2 },
            { id: 'n12-3', string: 2, fret: 3 },
            { id: 'n12-4', string: 1, fret: 2 }
          ],
          lyric: '(3x3=9)'
        }
      ]
    }
  ]
};

export const ALOHA_GROOVE_TAB: UkuleleTabDocument = {
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
    maxFretLimit: 12
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

export const CONJUNCTION_JUNCTION_TAB: UkuleleTabDocument = {
  id: 'tab-conjunction-junction-001',
  title: 'Conjunction Junction',
  artist: 'Bob Dorough (Schoolhouse Rock!)',
  tempo: 120,
  keySignature: 'G',
  tuning: TUNING_PRESETS.gCEA,
  layout: {
    stemsPlacement: 'below',
    zoomScale: 1.0,
    measuresPerSystem: 4,
    maxFretLimit: 12
  },
  measures: [
    {
      id: 'cj-m1',
      index: 1,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b1-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n1-1', string: 4, fret: 0 },
            { id: 'cj-n1-2', string: 3, fret: 2 },
            { id: 'cj-n1-3', string: 2, fret: 3 },
            { id: 'cj-n1-4', string: 1, fret: 2 }
          ],
          lyric: 'Intro (G)'
        },
        { id: 'cj-b1-2', duration: '1/4', notes: [{ id: 'cj-n1-5', string: 4, fret: 0 }] },
        { id: 'cj-b1-3', duration: '1/4', notes: [{ id: 'cj-n1-6', string: 2, fret: 3 }] },
        { id: 'cj-b1-4', duration: '1/4', notes: [{ id: 'cj-n1-7', string: 3, fret: 2 }] }
      ]
    },
    {
      id: 'cj-m2',
      index: 2,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b2-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n2-1', string: 4, fret: 0 },
            { id: 'cj-n2-2', string: 3, fret: 4 },
            { id: 'cj-n2-3', string: 2, fret: 0 },
            { id: 'cj-n2-4', string: 1, fret: 2 }
          ],
          lyric: '(Em7)'
        },
        { id: 'cj-b2-2', duration: '1/4', notes: [{ id: 'cj-n2-5', string: 2, fret: 0 }] },
        { id: 'cj-b2-3', duration: '1/4', notes: [{ id: 'cj-n2-6', string: 4, fret: 0 }] },
        { id: 'cj-b2-4', duration: '1/4', notes: [{ id: 'cj-n2-7', string: 2, fret: 3 }] }
      ]
    },
    {
      id: 'cj-m3',
      index: 3,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b3-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n3-1', string: 4, fret: 0 },
            { id: 'cj-n3-2', string: 3, fret: 0 },
            { id: 'cj-n3-3', string: 2, fret: 0 },
            { id: 'cj-n3-4', string: 1, fret: 3 }
          ],
          lyric: '(C)'
        },
        { id: 'cj-b3-2', duration: '1/4', notes: [{ id: 'cj-n3-5', string: 2, fret: 0 }] },
        { id: 'cj-b3-3', duration: '1/4', notes: [{ id: 'cj-n3-6', string: 4, fret: 0 }] },
        { id: 'cj-b3-4', duration: '1/4', notes: [{ id: 'cj-n3-7', string: 1, fret: 3 }] }
      ]
    },
    {
      id: 'cj-m4',
      index: 4,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b4-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n4-1', string: 4, fret: 2 },
            { id: 'cj-n4-2', string: 3, fret: 0 },
            { id: 'cj-n4-3', string: 2, fret: 0 },
            { id: 'cj-n4-4', string: 1, fret: 0 }
          ],
          lyric: '(Am7 / D9)'
        },
        { id: 'cj-b4-2', duration: '1/4', notes: [{ id: 'cj-n4-5', string: 1, fret: 3 }] },
        {
          id: 'cj-b4-3',
          duration: '1/4',
          notes: [
            { id: 'cj-n4-6', string: 4, fret: 2 },
            { id: 'cj-n4-7', string: 3, fret: 2 },
            { id: 'cj-n4-8', string: 2, fret: 2 },
            { id: 'cj-n4-9', string: 1, fret: 3 }
          ]
        },
        { id: 'cj-b4-4', duration: '1/4', notes: [{ id: 'cj-n4-10', string: 2, fret: 2 }] }
      ]
    },
    {
      id: 'cj-m5',
      index: 5,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b5-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n5-1', string: 4, fret: 0 },
            { id: 'cj-n5-2', string: 3, fret: 2 },
            { id: 'cj-n5-3', string: 2, fret: 3 },
            { id: 'cj-n5-4', string: 1, fret: 2 }
          ],
          lyric: 'Con-junc-'
        },
        { id: 'cj-b5-2', duration: '1/4', notes: [{ id: 'cj-n5-5', string: 2, fret: 3 }], lyric: '-tion' },
        { id: 'cj-b5-3', duration: '1/4', notes: [{ id: 'cj-n5-6', string: 3, fret: 2 }], lyric: 'Junc-' },
        { id: 'cj-b5-4', duration: '1/4', notes: [{ id: 'cj-n5-7', string: 1, fret: 2 }], lyric: '-tion,' }
      ]
    },
    {
      id: 'cj-m6',
      index: 6,
      timeSignature: [4, 4],
      beats: [
        { id: 'cj-b6-1', duration: '1/4', notes: [{ id: 'cj-n6-1', string: 2, fret: 3 }], lyric: "what's" },
        { id: 'cj-b6-2', duration: '1/4', notes: [{ id: 'cj-n6-2', string: 4, fret: 2 }], lyric: 'your' },
        { id: 'cj-b6-3', duration: '1/2', notes: [{ id: 'cj-n6-3', string: 4, fret: 0 }], lyric: 'func-tion?' }
      ]
    },
    {
      id: 'cj-m7',
      index: 7,
      timeSignature: [4, 4],
      beats: [
        { id: 'cj-b7-1', duration: '1/4', notes: [{ id: 'cj-n7-1', string: 3, fret: 2 }], lyric: "Hook-in'" },
        { id: 'cj-b7-2', duration: '1/4', notes: [{ id: 'cj-n7-2', string: 4, fret: 0 }], lyric: 'up' },
        { id: 'cj-b7-3', duration: '1/4', notes: [{ id: 'cj-n7-3', string: 2, fret: 3 }], lyric: 'words' },
        { id: 'cj-b7-4', duration: '1/4', notes: [{ id: 'cj-n7-4', string: 3, fret: 2 }], lyric: 'and' }
      ]
    },
    {
      id: 'cj-m8',
      index: 8,
      timeSignature: [4, 4],
      beats: [
        { id: 'cj-b8-1', duration: '1/4', notes: [{ id: 'cj-n8-1', string: 1, fret: 3 }], lyric: 'phra-ses' },
        { id: 'cj-b8-2', duration: '1/4', notes: [{ id: 'cj-n8-2', string: 2, fret: 3 }], lyric: 'and' },
        { id: 'cj-b8-3', duration: '1/4', notes: [{ id: 'cj-n8-3', string: 4, fret: 2 }], lyric: 'clau-' },
        { id: 'cj-b8-4', duration: '1/4', notes: [{ id: 'cj-n8-4', string: 4, fret: 0 }], lyric: '-ses.' }
      ]
    },
    {
      id: 'cj-m9',
      index: 9,
      timeSignature: [4, 4],
      beats: [
        {
          id: 'cj-b9-1',
          duration: '1/4',
          notes: [
            { id: 'cj-n9-1', string: 4, fret: 0 },
            { id: 'cj-n9-2', string: 3, fret: 2 },
            { id: 'cj-n9-3', string: 2, fret: 3 },
            { id: 'cj-n9-4', string: 1, fret: 2 }
          ],
          lyric: 'Con-junc-'
        },
        { id: 'cj-b9-2', duration: '1/4', notes: [{ id: 'cj-n9-5', string: 2, fret: 3 }], lyric: '-tion' },
        { id: 'cj-b9-3', duration: '1/4', notes: [{ id: 'cj-n9-6', string: 3, fret: 2 }], lyric: 'Junc-' },
        { id: 'cj-b9-4', duration: '1/4', notes: [{ id: 'cj-n9-7', string: 1, fret: 2 }], lyric: '-tion,' }
      ]
    }
  ]
};

export const createBlankTabDocument = (): UkuleleTabDocument => ({
  id: `tab-blank-${Date.now()}`,
  title: 'Untitled Ukulele Tab',
  artist: '',
  tempo: 120,
  keySignature: 'C',
  tuning: TUNING_PRESETS.gCEA,
  layout: {
    stemsPlacement: 'below',
    zoomScale: 1.0,
    measuresPerSystem: 4,
    maxFretLimit: 12
  },
  measures: [
    {
      id: `m-${Date.now()}-1`,
      index: 1,
      timeSignature: [4, 4],
      beats: ([1, 2, 3, 4] as const).map(bNum => ({
        id: `b-${Date.now()}-${bNum}`,
        duration: '1/4',
        notes: []
      }))
    }
  ]
});

export const SAMPLE_TAB_DOCUMENT = CONJUNCTION_JUNCTION_TAB;
