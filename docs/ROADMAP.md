# UkeTab Roadmap: Correctness & Notation Fixes

All phases below are complete. This records the work that fixed the application problems found while bringing the documentation in line with the implementation. Each item lists the decided behaviour, where it lives, and the tests that guard it.

## Problems Addressed

| # | Problem | Decided behaviour |
|---|---|---|
| 1 | Entering a note resets the beat to the active duration | Entering a note keeps the beat's duration. The active duration applies only to newly inserted beats and rests. Choosing a duration in the beat popover also sets the active duration. |
| 2 | Transposition clamps frets to 0–20, changing pitch | Each profile defines `maxFret` (ukulele 20, guitar 24, bass 24). A transposed note keeps its string if the new fret is within 0–`maxFret`; otherwise it moves to the free string of the same beat that gives the lowest valid fret. A note that fits nowhere is clamped and counted, and the user is told how many notes could not be transposed exactly. |
| 3 | Beams join rest columns and ignore beat grouping | Only non-rest `1/8`, `1/16` and `1/32` columns are beamed. Beams break at beat-group boundaries: one quarter note for x/4, one half note for x/2, one eighth note for x/8, and a dotted quarter for compound meters (6/8, 9/8, 12/8). |
| 4 | Time signatures cannot be changed; only the first is shown; Add Measure is always 4/4 | A measure shows its time signature when it is the first measure or differs from the previous one. The inspector edits the selected beat's measure's time signature. Add Measure copies the last measure's time signature and fills it with one empty beat per beat unit. |
| 5 | Triplets not drawn; `1/32` has no flags or rest symbol | Runs of triplet columns get a bracket with "3" in groups of three. `1/32` notes get three flags or third-level beams; `1/32` rests get a three-hook rest symbol. |
| 6 | Metronome clicks on every column | The metronome clicks once per time-signature beat unit (accent on beat 1), independent of the note columns. |
| 7 | Help panel lists only some shortcuts | One shortcut table drives both the keyboard handler and the help panel. |

## Phases

| Phase | Work | Owner | Status |
|---|---|---|---|
| 0 | Commit the documentation rewrite and this roadmap | lead | done |
| 1 | Move document edit operations from `App.tsx` into pure functions (`src/utils/documentEdits.ts`) with unit tests; fix problem 1 | lead | done |
| 2a | Notation: problems 3, 5 and the display part of 4 (`TabRenderer.tsx`, new `src/utils/notationLayout.ts`) | agent | done |
| 2b | Editing: problem 2 and the editing part of 4 (`documentEdits.ts`, `musicTheory.ts`, profiles, `InspectorPanel.tsx`) | agent | done |
| 2c | Playback & shortcuts: problems 6 and 7 (`App.tsx`, new `src/utils/shortcuts.ts`, new `src/utils/playbackTiming.ts`) | agent | done |
| 3 | Merge; update the specification and architecture documents; add documentation consistency tests; browser and print verification | lead | done |

## Regression Protection

- **Pure, unit-tested logic**: document edits, beaming, triplet grouping, time signature display, metronome timing, shortcut matching and transposition live in pure functions with unit tests. Components only render their results.
- **Regression tests named after the problem** they prevent (e.g. "entering a note keeps the beat duration").
- **Documentation consistency tests** (`src/docsConsistency.test.ts`). They fail when:
  - the specification's tuning table, chord-library counts or shortcut table differ from the code;
  - the architecture document's source layout or test inventory omits a file.
- **Render equivalence**: notation changes are checked against the previous renderer output, so only the intended differences change.

## Follow-ups (not yet scheduled)

Found while doing the work above; each is also listed in the specification's Known Limitations or noted here.

- Shortcuts ignore Ctrl/Alt/Meta, so with a beat selected Ctrl+R and Ctrl+S toggle a rest / set a sixteenth instead of reloading / saving.
- The app starts with `selectedBeatId = 'b1-1'`, which does not exist in the startup sample, so nothing is selected until a beat is clicked.
- On screen, a triplet bracket's "3" can overlap the middle column's duration badge (print is unaffected).
- `1/32` has no duration button or shortcut.
- Irregular meters (5/8, 7/8) beam in quarter-note groups.
- Only the first measure shows string labels.
- Chord shapes are not adjusted for alternate tunings, and chord names are not transposed.
