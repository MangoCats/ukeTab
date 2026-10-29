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

## Follow-ups (done)

All follow-ups found during this work are fixed, with regression tests:
- Ctrl/Alt/Meta combinations are left to the browser.
- The startup sample's first beat is selected.
- `1/32` has a duration button and the `d` shortcut.
- Triplet brackets clear the on-screen duration badge, and lyrics clear the brackets.
- Irregular meters beam as 2+…+2+3 (5/8 → 2+3, 7/8 → 2+2+3).
- String labels start every row on screen and in print.
- Chord shapes follow the current tuning, retuning re-fingers chord diagrams, and transposing renames and re-fingers chords.
- The ukulele library's `F#m7` (which duplicated D major) was corrected; found by the all-tunings chord-spelling test.

## Known Limitations (done)

The limitations left in the specification after the follow-ups are resolved:
- Playback note length follows the written duration (plus ties), capped at each instrument's natural sustain.
- Print row labels are images, so hidden ones no longer appear in the PDF text layer.
- A capo setting (0–12): frets relative to the capo; imported capos are kept as the document capo.
- **Convert** changes a song's instrument, keeping note pitches and mapping chords by name.
