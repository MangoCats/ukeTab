# UkeTab Product Specification

This document specifies what UkeTab does, as seen by its user. How it is built is described in the [Software Architecture Document](SOFTWARE_ARCHITECTURE.md). Where the two overlap, both describe the same behaviour; the source code is the final reference.

## 1. Purpose & Scope

UkeTab is a browser application for writing, editing, playing back, printing and importing fretted-instrument tablature. It supports three instruments:

| Instrument | Strings | Staff lines |
|---|---|---|
| Ukulele | 4 | 4 |
| Guitar | 6 | 6 |
| Bass | 4 | 4 |

A tab shows fret numbers on staff lines, rhythm stems/flags/beams, rests, lyrics and chord diagrams. It can be played through a built-in synthesizer, saved and reopened as a `.uketab` file, imported from and saved as Guitar Pro files, and printed or saved as PDF through the browser's print dialog, either as the tab alone or with standard music notation above it (a piano grand staff for following along on piano, or the instrument's own staff).

On startup the application shows the built-in ukulele sample song "Conjunction Junction" with its first beat selected. Its chord markers (G, Em, C, Am, D7) name the shapes its tab strums, so its key is guessed as G.

---

## 2. Terminology

- **String number**: strings are numbered from the **top staff line (String 1)** to the **bottom staff line (String N)**, where N is the instrument's string count. String order follows the tuning (for example ukulele High-G: String 1 = A4, String 4 = g4).
- **Fret value**: `-1` = muted string, shown as `X`; `0` = open string; `1` and above = fretted.
- **Beat column**: one rhythmic event in a measure. It has one duration and holds zero or more notes (at most one per string), an optional chord diagram and an optional lyric.
- **Rest**: a beat column marked as a rest. It holds no notes.
- **Chord marker**: a named fingering (one fret value per string) drawn as a chord diagram above a beat column.
- **Chord palette**: the list of chord markers offered for quick assignment in a document.
- **Chord library**: the built-in chord shapes of an instrument.
- **Instrument profile**: the instrument-specific settings described in Section 3.

---

## 3. Instruments

Each document belongs to exactly one instrument, chosen when the document is created (**New Tab**) or imported (**Open Guitar Pro**) and changeable later with **Convert** (Section 5.4). Documents saved before instruments existed have no instrument field and open as ukulele.

### 3.1 Tunings

The **Tuning** menu lists the instrument's presets in the order below; the first is the default for new documents. Labels are listed String 1 (top line) first.

| Instrument | Tuning (menu name) | String labels, top to bottom |
|---|---|---|
| Ukulele | Standard High-G (gCEA) | A4 E4 C4 g4 |
| Ukulele | Linear Low-G (GCEA) | A4 E4 C4 G3 |
| Ukulele | Baritone (DGBE) | E4 B3 G3 D3 |
| Ukulele | Soprano D-Tuning (aDF#B) | B4 F#4 D4 a4 |
| Guitar | Standard (EADGBE) | E4 B3 G3 D3 A2 E2 |
| Guitar | Drop D (DADGBE) | E4 B3 G3 D3 A2 D2 |
| Guitar | Half-Step Down (Eb) | Eb4 Bb3 Gb3 Db3 Ab2 Eb2 |
| Guitar | Open G (DGDGBD) | D4 B3 G3 D3 G2 D2 |
| Guitar | Open D (DADF#AD) | D4 A3 F#3 D3 A2 D2 |
| Guitar | DADGAD | D4 A3 G3 D3 A2 D2 |
| Bass | Standard (EADG) | G2 D2 A1 E1 |
| Bass | Drop D (DADG) | G2 D2 A1 D1 |
| Bass | Half-Step Down (Eb) | Gb2 Db2 Ab1 Eb1 |
| Bass | BEAD | D2 A1 E1 B0 |

A lowercase label (`g4`, `a4`) marks a re-entrant string that is higher than the string above it.

A Guitar Pro import can also produce a **custom tuning** that is not a preset (Section 9.2). It is shown as an extra entry at the end of the Tuning menu, named after its notes from lowest to highest string, e.g. `Custom (C2 A2 D3 G3 B3 E4)`.

Selecting a different tuning changes the open-string pitches:
- **Notes keep their fret numbers**, so they sound at the new tuning's pitches; the tab is not re-fingered or transposed.
- **Chord diagrams** (beat chords and the chord palette) are re-fingered so they still sound the named chord in the new tuning (Section 3.2). A chord that was never set stays unset, and an explicitly cleared chord stays cleared.

### 3.1.1 Capo
A document may have a **capo** at fret 1–12 (none by default), set with the **Capo** menu next to **Tuning**:
- Fret numbers in the tab are **relative to the capo** (fret 0 = the capo), as in standard capo tabs. A note sounds at open string + capo + fret.
- Chord names and diagrams are **shapes relative to the capo**, as in capo chord charts ("Capo 2, G shape" sounds as A).
- Changing the capo keeps fret numbers and chord diagrams, so the sound shifts; a chosen key (Section 3.1.2) moves by the same number of frets.
- Playback, the inspector's pitch display and standard notation use the sounding pitch; alternate frets, chord detection and transposition work on the capo-relative frets.

### 3.1.2 Key
Standard notation (Section 9.3) and Guitar Pro export (Section 9.4) are written in a key signature, set with the **Key** menu next to **Capo**. The key is that of the music as it sounds (capo included).
- **Auto ({key} major)** (default): the key is guessed from the song's chord markers in playing order, each named as it sounds (a shape name under a capo is raised by the capo: capo 2 + `G` = `A`). A chord's root is its first letter and optional `#`/`b`; its quality is **minor** if the name continues with `m` or `min` (but not `maj`), **diminished** with `dim`, `°`, `m7b5` or `ø`, **either** with `5` or `sus`, otherwise **major**. Repeated consecutive chords count once. Each of the 12 major keys scores 1 per chord whose root is in the key's scale with the quality of that scale degree (major on degrees 1, 4, 5; minor on 2, 3, 6; diminished on 7; "either" fits any), plus ½ if the first chord and ½ if the last chord is the key's tonic (a major or "either" chord on degree 1, or a minor or "either" chord on degree 6, the relative minor). The highest score wins; ties go to the key with fewer sharps or flats, then to the earlier key in C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B. A song without chord markers is in **C**. Examples: G C D Em → G; Am Dm E Am → C (A minor); A7 D7 E7 → A.
- **A chosen key**: one of 12 signatures, shown as `{major} major / {minor} minor ({signature})` (e.g. `G major / E minor (1♯)`, `C major / A minor (no ♯/♭)`) and listed C, G, D, A, E, B, F#, F, Bb, Eb, Ab, Db. Transpose (Section 7) and capo changes move a chosen key with the music; **Convert** (Section 5.4) keeps it, since the pitches stay. Choosing **Auto** returns to guessing.

### 3.2 Chord Libraries & Default Palettes

| Instrument | Library | Default chord palette |
|---|---|---|
| Ukulele | 56 names in gCEA fingering (major, minor, 7, m7, maj7, sus4, add9 and others; `C7m`, `E7m` etc. are aliases of `m7` chords) | C G Am F Em Dm D E7 E7m |
| Guitar | 47 shapes in standard tuning: open chords, E-shape and A-shape barre chords, power chords (E5 A5 D5 G5) | G C D Em Am E A Dm F |
| Bass | 8 root-fifth / root-fifth-octave double stops in standard tuning (E5 F5 G5 A5 Bb5 B5 C5 D5) | E5 A5 D5 G5 C5 |

Library shapes are defined for the instrument's default tuning. In any other tuning (including a custom imported one) every chord lookup uses the shapes **adapted to the current tuning**: each string moves by the difference between its default and current open pitch, reduced to the nearest equivalent shift (−5 to +6 frets), so every string keeps its note name; muted strings stay muted. If a fret would go below 0 the whole shape moves up 12 frets, and if every played fret is 12 or more it moves down 12, so shapes stay compact. Examples: G in Drop D is `5 2 0 0 0 3`; Low-G ukulele uses the High-G shapes unchanged. Adapted shapes are used for the chord palette window, the default palette, chord auto-detection and Guitar Pro imports.

### 3.3 Other Instrument Settings

| Setting | Ukulele | Guitar | Bass |
|---|---|---|---|
| Default Max Fret Limit | 12 | 12 | 12 |
| Highest fret (transposition range) | 20 | 24 | 24 |
| Playback voice (longest a note rings) | triangle-wave pluck, 1.5 s | sawtooth pluck, 3 s | sawtooth pluck, 3 s |
| Guitar Pro import | keeps a matching 4-string ukulele track's fingering | keeps a matching 6-string track's fingering | keeps a matching 4-string bass track's fingering |
| Guitar Pro export sound (General MIDI program, 0-based) | 24, nylon-string guitar (General MIDI has no ukulele) | 25, steel-string guitar | 33, fingered electric bass |

---

## 4. Tab Display

### 4.1 Staff & Measures
- The staff has one horizontal line per string, 24 px apart at 100% zoom.
- **First measure of the document only**: string labels (from the tuning) at the far left inside the measure, and a heavy double barline.
- **Every other row start**: the string labels repeat in a 40 px gutter to the left of the row's first measure, without changing measure widths. On screen the rows are detected after layout; in print the labels show at each printed row start. In print these row labels are images, so the PDF's searchable text contains the string labels only once (first measure).
- **Time signature**: shown on the first measure and on every measure whose time signature differs from the previous measure's (either number).
- Each measure ends with a single barline. The last measure of the document also has a heavy final barline.
- On screen, each measure shows a small `M{n}` measure-number badge (not printed).
- Measure width is proportional to its number of beat columns: 62 px per column plus 15 px padding on each side, plus a 60 px string-label header on the first measure and 32 px on each measure that shows a time signature. All sizes scale with zoom.
- **Row wrapping**: measures are laid out left to right and wrap to a new row when the next measure does not fit the available width. A measure is never split across rows or pages.
- **Zoom**: 75%, 100% (default), 150% scales the whole tab.

### 4.2 Time Signature
- Drawn as two stacked bold numbers (26 px at 100% zoom, weight 800) centred vertically on the staff, with background masks so staff lines do not cross the digits.

### 4.3 Fret Numbers
- Each note is drawn as its fret number centred on its string line, on a mask so the line does not cross the digits. Muted notes are drawn as `X`.
- On-screen colours: white (normal), red (`X`), sky-blue (selected string of the selected beat, or tied), amber (beat currently playing).
- **Tied (continued) notes**: a note is shown as tied if the note is marked tied or its beat column is marked tied (Tie). A tied note is drawn in parentheses, e.g. `(12)` or `(X)`, with a sky-blue arc from the previous column.

### 4.4 Alternate Fret Suggestions (Ghost Notes)
- When a beat column is selected, every string without a note in that column shows any fret on that string that plays the same pitch as a note already in the column, if the fret is between 0 and the Max Fret Limit. Suggestions are shown in purple parentheses, e.g. `(3)`.
- Clicking a suggestion adds that note. The original note stays.
- Suggestions are also listed in the Inspector (Section 5.3). They are never printed or played.

### 4.5 Rhythm Notation
Stems are drawn below the staff by default; **Stems** toggles them above. For each non-rest beat column:

| Duration | Symbol |
|---|---|
| Whole (`1/1`) | Open ring, no stem |
| Half (`1/2`) | Stem ending in a hollow circle |
| Quarter (`1/4`) | Plain stem |
| Eighth (`1/8`) | Stem with one flag, or a beam (below) |
| Sixteenth (`1/16`) | Stem with two flags, or beams (below) |
| Thirty-second (`1/32`) | Stem with three flags, or beams (below) |

- **Dotted**: a dot beside the stem near the staff. A dotted rest has a dot beside the rest symbol.
- **Beams**: two adjacent beat columns of the same measure are joined when both are notes (not rests), both are `1/8`, `1/16` or `1/32`, and both start in the same **beat group**:
  - Beat groups: in compound time (beat unit 8 or 16 with the number of beats divisible by 3, e.g. 3/8, 6/8, 9/8, 12/8) groups of three beat units, i.e. dotted quarters for x/8. With beat unit 8 or 16 and an odd number of beats of 5 or more (not compound), groups of two units followed by one group of three (5/8 → 2+3, 7/8 → 2+2+3, 11/8 → 2+2+2+2+3). Otherwise one beat unit, but at least a quarter note (x/4: a quarter; x/2: a half; x/1: a whole; other x/8: a quarter). In a measure longer than its time signature the pattern repeats.
  - Positions in the measure count every column, including rests, dotted lengths (×1.5) and triplet lengths (×2/3).
  - Joined columns share one beam per flag they both have (eighth 1, sixteenth 2, thirty-second 3). A further beam level that only one column has is drawn as a 16 px stub pointing toward its previous joined neighbour, or toward the next one if there is no previous one.
  - Beam levels are 6 px apart, the first at the stem end. Beamed columns draw no flags.
- **Triplets**: consecutive triplet columns are marked in groups of three (a last group may have one or two columns) by a bracket with a "3", drawn on the stem side 22 px beyond the stem ends (clear of the on-screen duration badges). With stems below, lyrics in a measure that has triplets sit 14 px further from the staff so they clear the bracket. Triplets also shorten playback (Section 6).
- **On screen**, a small badge under each stem shows the duration, e.g. `1/8.` for a dotted eighth (not printed).

### 4.6 Rests
The two lines either side of the staff middle are called the upper and lower middle lines (lines 2 and 3 on a 4-line staff, lines 3 and 4 on a 6-line staff).

| Rest | Placement |
|---|---|
| Whole | Block hanging below the upper middle line |
| Half | Block sitting on the lower middle line |
| Quarter, eighth, sixteenth | Traditional symbol centred on the lower middle line |
| Thirty-second | Traditional three-hook symbol centred on the lower middle line |

### 4.7 Lyrics
Each beat column may carry one lyric syllable, centred under the column. It sits below the stems when stems are below, or below the staff when stems are above.

### 4.8 Chord Diagrams
- A beat column with a chord marker shows a chord diagram above the staff, centred on the column. When any beat in the document has a chord, extra space above the staff is reserved on every measure.
- Diagram layout: chord name on top; one vertical line per string, String N on the left to String 1 on the right; a 4-fret window; a filled dot per fretted string; `○` above open strings; `✕` above muted strings.
- **Base fret**: the chord's stored base fret, or, if none is stored, the lowest fretted value when any fret exceeds 4, otherwise 1. Base fret 1 draws a thick nut line. A higher base fret draws a thin top line and an `Nfr` label (e.g. `6fr`) at the left.
- Diagram width is 50 px for 4 strings and 5 px wider per additional string (60 px for guitar).
- A "Selected Beat Shape" panel above the tab shows a diagram of the selected beat's notes (screen only).

---

## 5. Editing

### 5.1 Selecting & Entering Notes
- Clicking a string at a beat column selects that beat and string. If the string has no note there, a note is added immediately: the suggested alternate fret shown there, if any, otherwise fret 0.
- Entering a note (by click, keyboard, popover or inspector) replaces any existing note on that string and clears the beat's rest flag. The beat **keeps its duration**.
- The **active duration** is the duration given to newly inserted beats and rests. It starts as `1/4` and is set by the duration keyboard shortcuts (Section 5.5) and by the popover duration buttons (Section 5.2).
- **Chord auto-detection**: when every string of a beat column has a note (muted `X` counts), the column's fret pattern is looked up in the instrument's chord library together with the document's chord palette. If the matching chord name is in the palette, the palette's chord is used. A match is assigned as the column's chord:
  - when a note is added, unless the chord was explicitly cleared;
  - when the column is selected, if it has never had a chord set;
  - when a note is removed and the new pattern matches.

  If a note is removed and the pattern no longer matches while fewer notes than strings remain, the chord is unset.

### 5.2 Floating Beat Popover (screen only)
Shown above the selected beat column:
- Duration buttons `1`, `1/2`, `1/4`, `1/8`, `1/16`, `1/32`: set the selected beat's duration and the active duration. A **Dot** toggle changes the selected beat only.
- **+ Beat** (insert a beat after it), **Del Beat**, and close (deselect).
- **Chord** dropdown: `(None)` clears the chord; the other entries are the palette chords, plus the beat's current chord if it is not in the palette.
- **Fret** buttons `X`, `0` … Max Fret Limit for the selected string, and a delete-note button.

### 5.3 Inspector Panel (screen only)
Fixed at the bottom of the window. It can be collapsed, and is closed by deselecting.
- Buttons: **+ Beat**, **+ Rest**, **Toggle Rest**, **Triplet (3:2)**, **Tie (Sustain)**, **Delete Beat**, **Close**. There is also a **Lyric** text field.
- **Measure {n} Time Signature**: number of beats (1–12) and beat unit (2, 4, 8, 16) of the selected beat's measure. Changing it affects that measure only and does not change its beats. A stored value outside these lists (e.g. from Guitar Pro import) is shown as an extra option.
- **Chord section** (`{Instrument} Chord Diagram`): palette chord buttons; **Manage Palette / Create Chord**; **Clear Chord**. A chord name field and one fret selector per string (`X`, `0`, `1`–`15`, listed String N first) edit the beat's chord marker; changing a fret recalculates its base fret.
- **String section**: fret pad `X`, `0` … Max Fret Limit for the selected string, **Clear Note**, and the selected note's sounding pitch including any capo (e.g. `Fret 3 (G4)`; with capo 2 on the A string, `Fret 3 (D5)`).
- **Alternate Frets** list: clicking one adds that note (Section 4.4).

### 5.4 Toolbar & Header
- **Title** and **Artist / Arranger** text fields.
- **Play / Pause**; **Metronome** toggle.
- **Chord Palette & Editor** (also **Manage Chord Palette** in the header): opens the chord palette window (Section 5.7).
- **New Tab**: a menu of instruments ("New Guitar Tab · 6 strings", …), with the current instrument first. After confirmation, it replaces the document with a blank one for that instrument: title `Untitled {Instrument} Tab`, default tuning, tempo 120, the default palette, and one 4/4 measure of four empty quarter beats.
- **Convert**: a menu of the *other* instruments ("Convert to Guitar · 6 strings"). After confirming (`Convert this tab to {Instrument} ({n} strings, {default tuning})? Notes are moved onto the new strings at the same pitch where possible.`) the song is converted:
  - Instrument, its default tuning, no capo, and its default Max Fret Limit.
  - **Notes**: each sounding note keeps its pitch, moved by octaves into the new instrument's range and placed on strings exactly like a re-fitted Guitar Pro import (Section 9.2, "all other cases"). Muted notes keep their string number if the new instrument has it. Notes that find no string are removed, and an alert reports how many (`{n} note(s) did not fit on the {Instrument} and were removed.`). Ties, rhythm, lyrics, time signatures, title and tempo are unchanged.
  - **Chords**: each beat and palette chord is first renamed to the chord it sounds (a shape under a capo is raised by the capo, since the converted song has none: capo 2 + `G` → `A`). A beat chord whose name is in the new instrument's library becomes that library shape; other beat chords become unset (auto-detection can apply later); explicitly cleared chords stay cleared. The palette keeps the chords the new library has, or becomes the new instrument's default palette if none remain.
  - The key (Section 3.1.2) is unchanged.
  - The selected beat stays selected; the selected string is limited to the new string count.
- **Open .uketab**, **Open Guitar Pro** (a menu of instruments to import as), **Save .uketab**, **Save Guitar Pro**, **Export PDF** (a menu: **Tab only**, **Piano grand staff + tab**, **Instrument staff + tab**) (Section 9).
- **+ Beat**: insert a beat after the selected beat. **Add Measure**: append a measure with the last measure's time signature (4/4 if the song is empty), holding one empty beat per beat unit (e.g. 3/4: three quarters; 6/8: six eighths; 2/2: two halves). **Duplicate Measures**: copy measures *start*–*end* (1-based, clamped to the song) and append the copies to the end of the song.
- Settings row:
  - **Tuning** (Section 3.1).
  - **Capo** (`None`, `1`–`12`; Section 3.1.1).
  - **Key** (`Auto ({key} major)` or one of 12 keys; Section 3.1.2).
  - **Stems** (below / above).
  - **Zoom** (75% / 100% / 150%).
  - **Max Fret Limit** (7, 10, 12, 15, 20).
  - **Transpose** −1 / +1 semitone (Section 7).
  - **Tempo** (40–240 BPM).
  - **Speed** (0.5×, 0.75×, 1.0×, 1.25×).
- **Shortcuts & Guide** (header): toggles a help panel listing every keyboard shortcut of Section 5.5.
- The **Max Fret Limit** sets the highest fret offered by the popover and inspector fret buttons, and the highest alternate-fret suggestion. It does not limit keyboard entry, the chord fret selectors, or imports.

### 5.5 Keyboard Shortcuts
Shortcuts are ignored while typing in a text field or menu, and whenever Ctrl, Alt or Meta is held (so browser combinations such as Ctrl+R and Ctrl+S keep working). Shortcuts that edit a beat require a selected beat; without one the key is left to the browser.

| Key | Action |
|---|---|
| `0`–`9` | Set the fret on the selected string. A second digit within 600 ms makes a two-digit fret if the result is ≤ 20 (e.g. `1` then `2` = 12). |
| `x` or `m` | Muted note (`X`) on the selected string |
| `Backspace`, `Delete` | Remove the note on the selected string |
| `w` `h` `q` `e` `s` `d` | Set the active duration and the selected beat to whole, half, quarter, eighth, sixteenth, thirty-second |
| `.` | Toggle dotted |
| `r` | Toggle rest (making a beat a rest removes its notes) |
| `t` | Toggle triplet |
| `l` | Toggle tie |
| `+` or `Shift+Enter` | Insert a beat after the selected beat |
| `←` | Previous beat column, across measures |
| `→` | Next beat column, across measures |
| `↑` | Previous string (stops at String 1) |
| `↓` | Next string (stops at String N) |
| `Space` | Play / pause (no selection needed) |

### 5.6 Beat & Measure Operations
- **Insert beat / Insert rest**: adds an empty beat (or rest) with the active duration directly after the selected beat in the same measure, and selects it.
- **Delete beat**: removes the selected beat. Deleting the only beat of a measure removes the measure. Deleting the only beat of the only measure replaces it with one empty quarter beat. Measures are renumbered after removal.

### 5.7 Chord Palette Window
- **Select tab**: every chord in the instrument's library is shown with its diagram. Clicking a chord adds it to, or removes it from, the document's palette.
- **Create tab**: chord name, one fret selector per string (`X`, `0`, `1`–`15`), and a live diagram preview. A notice warns when the same fret pattern already exists in the library. Saving adds the chord to the palette, replacing any palette chord with the same name.
- Opening the window while the selected beat has a note on every string pre-fills the Create tab with that pattern. If that pattern is not in the library, the window opens on the Create tab.
- Custom chords are stored only in the document's palette. A document whose palette is empty uses the instrument's default palette.

---

## 6. Playback
- Playback starts at the selected beat (or the first beat) and runs to the end of the song. Changing the document while playing restarts playback from the selected beat.
- Each beat column lasts `(60000 / tempo) × d × 1.5 (if dotted) × 2/3 (if triplet) ÷ speed` milliseconds, where d = 4, 2, 1, 0.5, 0.25, 0.125 for `1/1` … `1/32`.
- All notes of a column sound together, using the instrument's voice (Section 3.3). A note sounds for its written length — its column's duration plus every directly following column marked **Tie** — but never longer than the instrument's natural sustain (Section 3.3). Muted notes sound as a short click. Rests are silent.
- A column marked **Tie** is silent: its notes continue from the previous column.
- **Metronome**: one click per beat of the measure's time signature, i.e. every `(60000 / tempo) × (4 / beat unit) ÷ speed` ms (6/8 at 120 BPM: six clicks 250 ms apart), with beat 1 accented. Clicks stop at the measure's actual length: a measure shorter than its time signature gets fewer clicks and a longer one gets no extra clicks. When playback starts mid-measure, only that measure's remaining beat clicks sound. No click sounds after Stop.
- The playing column is highlighted and its fret numbers turn amber.

---

## 7. Transposition
- **Transpose −1 / +1** shifts every note of the song by one semitone and keeps its exact new pitch whenever some string can play it:
  1. A note whose new fret is within 0 and the instrument's highest fret minus the capo (Section 3.3) stays on its string.
  2. Otherwise, in the order of the notes in the beat, it moves to a string that has no note in that beat, choosing the lowest valid fret (ties: the lower string number).
  3. A note that no free string can play stays on its string with its fret clamped to the valid range; an alert then reports how many notes could not be transposed exactly.
- Muted notes are unchanged. Note ties are kept. Two notes never end up on one string.
- A chosen key (Section 3.1.2) moves by the same number of semitones; a guessed key follows the transposed chords.
- **Chords** move with the song: every beat chord (except unset or explicitly cleared ones) and every palette chord is renamed by the same number of semitones. The root and an optional slash bass are respelled as C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B, keeping the rest of the name (e.g. `F#m7` + 1 → `Gm7`, `G/B` + 1 → `Ab/C`); names that do not start with A–G are kept. The diagram becomes the (tuning-adapted) library shape of the new name if there is one; otherwise every played fret moves by the same number of semitones, and if one would go below 0 all played frets move up 12.

---

## 8. Document Data & `.uketab` File Format

A `.uketab` file is the document saved as JSON (2-space indented). The file name is the title in lower case with spaces replaced by `_`, plus `.uketab`.

```json
{
  "id": "tab-blank-1730000000000",
  "title": "Untitled Guitar Tab",
  "artist": "",
  "instrument": "guitar",
  "tempo": 120,
  "key": "G",
  "tuning": {
    "key": "EADGBE",
    "name": "Standard (EADGBE)",
    "pitches": [64, 59, 55, 50, 45, 40],
    "stringsDisplay": ["E4", "B3", "G3", "D3", "A2", "E2"]
  },
  "layout": { "stemsPlacement": "below", "zoomScale": 1, "measuresPerSystem": 4, "maxFretLimit": 12 },
  "chordPalette": [
    { "name": "G", "frets": [3, 2, 0, 0, 0, 3], "baseFret": 1 }
  ],
  "measures": [
    {
      "id": "m-1", "index": 1, "timeSignature": [4, 4],
      "beats": [
        { "id": "b-1", "duration": "1/4", "notes": [{ "id": "n-1", "string": 6, "fret": 3 }], "chord": null, "lyric": "Hey" },
        { "id": "b-2", "duration": "1/8", "isDotted": true, "notes": [] },
        { "id": "b-3", "duration": "1/16", "isRest": true, "notes": [] }
      ]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `instrument` | `"ukulele"`, `"guitar"` or `"bass"`. Optional; missing means ukulele. |
| `tuning.key` | Preset key from Section 3.1 (`gCEA`, `GCEA`, `DGBE`, `aDF#B`, `EADGBE`, `DADGBE`, `EbAbDbGbBbEb`, `DGDGBD`, `DADF#AD`, `DADGAD`, `EADG`, `DADG`, `EbAbDbGb`, `BEAD`) or `"custom"` |
| `tuning.pitches` | MIDI note number of each open string, String 1 first. Its length is the number of staff lines. |
| `tuning.stringsDisplay` | String labels, String 1 first |
| `capo` | Capo fret 0–12 (Section 3.1.1). Optional; missing means no capo. |
| `tempo` | Beats (quarter notes) per minute |
| `key` | Key signature for standard notation and Guitar Pro export (Section 3.1.2): `C`, `Db`, `D`, `Eb`, `E`, `F`, `F#`, `G`, `Ab`, `A`, `Bb` or `B`, named by its major key. Optional; missing means guessed from the chords. |
| `layout.stemsPlacement` | `"below"` or `"above"` |
| `layout.zoomScale` | `0.75`, `1` or `1.5` |
| `layout.measuresPerSystem` | Stored only; wrapping depends on available width |
| `layout.maxFretLimit` | 7, 10, 12, 15 or 20 |
| `chordPalette[].frets` | One fret value per string, **bottom line first** (String N … String 1) |
| `chordPalette[].baseFret` | First fret of the diagram window (optional) |
| `measures[].index` | 1-based measure number |
| `measures[].timeSignature` | `[beats, beat unit]`. Shown where it changes (Section 4.1); sets beam grouping and metronome clicks. Edits accept beats 1–16 and beat units 1, 2, 4, 8, 16, 32. |
| `beats[].duration` | `"1/1"`, `"1/2"`, `"1/4"`, `"1/8"`, `"1/16"` or `"1/32"` |
| `beats[].isDotted` / `isTriplet` / `isRest` / `isTied` | Optional flags (Sections 4–6) |
| `beats[].notes[]` | `{ id, string, fret, isTied? }`: string 1…N, fret per Section 2 |
| `beats[].chord` | Chord marker, `null` (explicitly cleared), or absent (never set) |
| `beats[].lyric` | Optional syllable |

**Opening a file**: the file must be JSON with a `title` and a `measures` array; otherwise it is rejected with an alert. A missing `instrument` becomes `"ukulele"`, and an empty or missing `chordPalette` becomes the instrument's default palette with shapes adapted to the file's tuning. Files from earlier versions may contain a `keySignature` field, which was never used; it is dropped on opening. The opened document replaces the current one and its first beat is selected.

---

## 9. Import & Export

### 9.1 Save / Open `.uketab`
See Section 8.

### 9.2 Guitar Pro Import (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`)
**Open Guitar Pro** first asks which instrument to import as, then opens a file picker. The imported song replaces the current document.

**Song data**:
- Title: from the file, otherwise the file name with its extension removed and `-`/`_` replaced by spaces.
- Artist: from the file, otherwise `Guitar Pro Import`.
- Tempo: rounded, otherwise 120.
- Key: the chosen track's first-bar key signature when it has sharps or flats (counted around the circle of fifths: 1♯ = G … 7♯ = Db; 1♭ = F … 7♭ = B); with none the key is not set, so it is guessed (Section 3.1.2).
- Stems below, zoom 100%, the instrument's default Max Fret Limit and default chord palette (with shapes adapted to the imported tuning).

**Track choice**:
- A track is *matching* if it has the instrument's string count and its lowest open string is within an octave of the instrument's default lowest string (C4 for ukulele, E2 for guitar, E1 for bass). A 4-string ukulele track therefore never matches bass, and a bass track never matches ukulele. The first matching track whose name contains one of the instrument's keywords is used (ukulele: "guitar", "ukulele" or "acoustic"; guitar: "guitar" or "acoustic"; bass: "bass"), otherwise the first matching track.
- If no track matches: the first track whose name contains a keyword is used, otherwise the first track.
- Only the first staff and first voice of the chosen track are imported.

**Notes, matching track**:
- The track's tuning is kept: the matching preset if the pitches are identical, otherwise a custom tuning (Section 3.1).
- Every note keeps its string and fret.
- The track's capo becomes the document's capo and notes keep their written frets (a capo above 12, outside the editor's range, is instead added to the fret numbers with no document capo).
- Dead notes become muted `X`.

**Notes, no matching track**:
- The document uses the instrument's default tuning and no capo (a source capo is already part of each note's pitch).
- Dead notes become muted `X` on the same string number (counted from the top line) when the instrument has that string, before the other notes are placed; otherwise they are dropped.
- Each other note's sounding pitch is moved by whole octaves into the instrument's range: ukulele C4–C6, guitar E2–E6, bass E1–G3.
- The beat's notes are placed together on distinct strings at frets between 0 and the import fret limit (ukulele 15, guitar and bass 24), choosing the most playable fingering: as many notes placed as possible, then the smallest distance between fretted notes (open strings don't count), then the lowest frets.
- A note no free string can play goes on the first unused string with its fret clamped into that range.
- A beat cannot hold more notes than the instrument has strings; extra notes are dropped.

**Rhythm, ties & lyrics**:
- Each Guitar Pro bar becomes one measure with that bar's time signature.
- Durations map to `1/1` … `1/32`; any number of dots becomes a single dot. Triplets (3 in the time of 2) are imported as triplets; other tuplets are not imported (notes keep their written duration).
- An empty beat becomes a rest. An empty bar becomes one quarter rest per beat of its time signature.
- A note that continues a tie is marked tied, and its whole beat column is marked tied, so the column does not re-sound in playback.
- Lyrics from all tracks are matched to beats by measure and time position; the first lyric found for a position is used.
- **Chords**: a beat with a chord in the file gets that chord. With a matching track it keeps the file's diagram when the diagram has one fret per string; otherwise it becomes the library shape of the chord's name (for a non-matching track, the name raised by the source capo, as the notes are), or no chord if the library has no such name. Every other beat is checked for an automatic chord match (Section 5.1).

### 9.3 Print & PDF Export
**Export PDF** is a menu of three printouts. Each opens the browser's print dialog; choosing "Save as PDF" produces a PDF. Printing from the browser's own menu (e.g. Ctrl+P) prints **Tab only**.

**All printouts**:
- **Page**: margins 0.5 in top, 0.75 in bottom, 0.25 in left, 0.5 in right.
- **Header**: song title (18 pt, bold), artist (10 pt, italic, if set), and `Tuning: {tuning name} ({labels joined by -}) • Capo {n} • Key: {major} major / {minor} minor • Tempo: {tempo} BPM` (8.5 pt; the `Capo {n} •` part only with a capo, the `Key: … •` part only in notation printouts), with a rule below.
- **Footer**: `{Title} {page} of {pages}` in 9 pt, centred in the bottom margin.
- **Not printed**: toolbar, inspector, popover, buttons, ghost notes, selection and playhead highlights, delete badges, duration badges and measure-number badges.

**Tab only** prints the tab as drawn in the editor:
- **Rows**: measure rows are right-aligned to the right margin, with a 0.5 in left inset and 0.15 in between rows. Every row starts with the string labels. A measure is never split across pages.
- **Text sizes**: fret numbers 18 pt on white masks, lyrics 14 pt, chord names 20.8 px.
- **Colour**: all notation (lines, digits, stems, flags, beams, dots, rests, ties, time signature, chord diagrams) is black on white; half-note circles are hollow.

**Piano grand staff + tab** and **Instrument staff + tab** print standard music notation with the tab joined below it, engraved by the alphaTab library instead of the editor's tab drawing:
- **Layout**: 7.5 in (720 px) wide at 85% of alphaTab's standard staff size. Measures flow into systems (rows of joined staves, each starting with clef and key signature) and every measure is numbered; a system is never split across pages. Everything is black on white. alphaTab's closing credit line ("rendered by alphaTab") is left out of the printout.
- **Chord diagrams**: every chord shape used in the song is drawn once, in a row at the top, named as in the tab.
- **Time and key**: time signatures where they change; the key signature (Section 3.1.2) on every system. Notes outside the key are spelled as the raised 1st and 4th or the lowered 3rd, 6th and 7th of the key (in C: C#, Eb, F#, Ab, Bb; in G: G#, Bb, C#, Eb, F♮), unless that would need a double sharp or flat.
- **Rhythm**: each beat column is one chord with its written duration, dot and triplet bracket; rest columns are rests.
- **Ties**: a note marked tied, or in a column marked **Tie**, is tied to the same note in the previous column (across bar lines too); if there is none, it is drawn as a new note. A tied column without notes repeats the previous column's notes, tied.
- **Tab staff**: fret numbers on the instrument's staff lines (`x` for muted notes), with the instrument's name at the left.
- **Not shown** (already in the header or not used): title, artist, tuning list, tempo marking, capo marking, dynamics.

**Piano grand staff + tab**, for following along on piano:
- A treble and a bass staff joined by a brace, labelled `Piano`, at **sounding pitch** (capo included). Notes from middle C (C4) up are on the treble staff, lower notes on the bass staff.
- Strings sounding the same pitch are one note. Muted notes are left out; a column without sounding notes on a staff is a rest there. A measure with no notes, lyrics or chord names on a staff is one whole-measure rest.
- Chord names above the treble staff are the chords as they sound (a shape under a capo is raised by the capo). Lyrics are between the two staves.
- Below, the tab staff. With a capo, the shape names are shown above it.

**Instrument staff + tab**:
- One notation staff for the instrument, joined to its tab. Its clef depends on the lowest open string: below C2 (basses) a bass clef with a small 8 below, below G3 (guitars, baritone ukulele) a treble clef with a small 8 below (both written an octave above sounding pitch, as is standard for these instruments), otherwise (ukuleles) a treble clef at sounding pitch.
- Every note of the tab is shown, including two strings in unison; muted notes are `x` noteheads. Chord names are as in the tab (shapes relative to any capo). Lyrics are below the notation staff.

### 9.4 Guitar Pro Export (`.gp`)
**Save Guitar Pro** downloads the song as a Guitar Pro 7 file named like a `.uketab` file but ending in `.gp`. It holds one track named after the instrument, with the instrument's sound (Section 3.3), tuning and capo, shown as a notation staff (clef as in **Instrument staff + tab**) with tab, and:
- title, artist and tempo; each measure's time signature; the key signature (Section 3.1.2, so a guessed key is written too);
- every beat column with its duration, dot, triplet and rest; notes with their strings and frets, muted notes as dead notes; ties as in Section 9.3 (a tied column without notes holds tied copies of the previous column's notes);
- chord names and diagrams, and lyrics.

Opening the file with **Open Guitar Pro** as the same instrument gives back the same song, except that ids are new, columns holding a whole chord shape also get a detected chord (Section 9.2), the key comes back as a chosen key unless it is C, and tied columns without notes come back holding their tied notes.

---

## 10. Known Limitations
Behaviour changes and newly found limitations are recorded here and in [ROADMAP.md](ROADMAP.md).
- Notation printouts use alphaTab's own page layout: systems break differently from the editor's rows, chord diagrams are listed at the top rather than above each beat, and the tab staff's string names are not repeated.
- Standard notation writes each beat column as one chord; separate melody and accompaniment voices, and notes left ringing past their written length, are not notated.
- The guessed key comes from chord markers only; a song without them is written in C until a key is chosen.

---

## 11. Quality Assurance
Automated tests (Vitest) cover music theory, keys, instrument profiles, chord shapes, the Guitar Pro importer and exporter (including a round trip), the standard-notation score and its rendering, and the main UI components. The test inventory is in the [Software Architecture Document](SOFTWARE_ARCHITECTURE.md#10-automated-testing). Run them with `npm test` (once) or `npm run test:watch` (watch mode).
